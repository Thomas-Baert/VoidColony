import { v4 as uuidv4 } from 'uuid';
import { IColonyRepository } from '../../domain/interfaces/repositories/colony-repository.interface';
import { IUserRepository } from '../../domain/interfaces/repositories/user-repository.interface';
import { Building } from '../../domain/entities/colony.entity';
import { BuildingDefinitionRegistry } from '@voidcolony/shared';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { EnsureColonyExistsService } from './ensure-colony-exists.service';

export interface PlaceBuildingCommand {
  userId: string;
  typeKey: string;
  positionX: number;
  positionY: number;
}

export interface PlaceBuildingResult {
  buildingId: string;
  typeKey: string;
  positionX: number;
  positionY: number;
  remainingLeekBalance: string;
}

/**
 * Place un bâtiment sur la première plateforme de la colonie de l'utilisateur,
 * en débitant le coût en leeks. Crée la colonie de départ si elle n'existe pas encore.
 */
export class PlaceBuildingUseCase {
  constructor(
    private readonly colonyRepository: IColonyRepository,
    private readonly userRepository: IUserRepository,
    private readonly ensureColonyExistsService: EnsureColonyExistsService
  ) {}

  public async execute(command: PlaceBuildingCommand): Promise<PlaceBuildingResult> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundError('User', command.userId);
    }

    const colony = await this.ensureColonyExistsService.execute(command.userId);
    const definition = BuildingDefinitionRegistry.get(command.typeKey);
    const costInLeeks = BigInt(definition.getCost('leeks', 1));

    // Lève une DomainError si le solde est insuffisant — gérée par errorHandlerMiddleware/le gateway.
    user.spendLeeks(costInLeeks);

    const originPlatform = colony.platforms[0];
    const newBuilding = new Building(
      uuidv4(),
      command.typeKey,
      command.positionX,
      command.positionY,
      { level: 1, botCount: 0 },
      new Date()
    );
    originPlatform.buildings.push(newBuilding);

    await this.userRepository.save(user);
    await this.colonyRepository.save(colony);

    return {
      buildingId: newBuilding.id,
      typeKey: newBuilding.typeKey,
      positionX: newBuilding.positionX,
      positionY: newBuilding.positionY,
      remainingLeekBalance: user.leekBalance.toString(),
    };
  }
}
