import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PlaceBuildingUseCase } from '../../application/colony/place-building.use-case';
import { GetColonyStateUseCase } from '../../application/colony/get-colony-state.use-case';
import { DomainError } from '../../shared/errors/domain.error';

interface PlaceBuildingPayload {
  typeKey: string;
  col: number;
  row: number;
}

/**
 * Gère l'authentification des connexions Socket.io et le routage des événements
 * de jeu vers les use cases applicatifs. Ne contient aucune logique métier elle-même.
 */
export class SocketGameGateway {
  constructor(
    private readonly io: Server,
    private readonly jwtSecret: string,
    private readonly placeBuildingUseCase: PlaceBuildingUseCase,
    private readonly getColonyStateUseCase: GetColonyStateUseCase
  ) {}

  public register(): void {
    this.io.use((socket, next) => this.authenticate(socket, next));
    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  private authenticate(socket: Socket, next: (err?: Error) => void): void {
    const token = socket.handshake.auth?.token;
    if (!token) {
      next(new Error('Authentication error'));
      return;
    }
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { sub: string };
      socket.data.userId = decoded.sub;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  }

  private handleConnection(socket: Socket): void {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on('building:place', (payload: PlaceBuildingPayload) =>
      this.handlePlaceBuilding(socket, userId, payload)
    );
    socket.on('colony:request-state', () => this.handleRequestState(socket, userId));
  }

  private async handleRequestState(socket: Socket, userId: string): Promise<void> {
    try {
      const state = await this.getColonyStateUseCase.execute(userId);
      socket.emit('colony:state', state);
    } catch (error) {
      const message = error instanceof DomainError ? error.message : 'Impossible de charger la colonie.';
      socket.emit('error', { message });
    }
  }

  private async handlePlaceBuilding(
    socket: Socket,
    userId: string,
    payload: PlaceBuildingPayload
  ): Promise<void> {
    try {
      const result = await this.placeBuildingUseCase.execute({
        userId,
        typeKey: payload.typeKey,
        positionX: payload.col,
        positionY: payload.row,
      });

      socket.emit('building:placed:success', {
        id: result.buildingId,
        col: result.positionX,
        row: result.positionY,
        typeKey: result.typeKey,
      });
      socket.emit('leek:update', result.remainingLeekBalance);
    } catch (error) {
      const message = error instanceof DomainError ? error.message : 'Une erreur est survenue.';
      socket.emit('error', { message });
    }
  }
}
