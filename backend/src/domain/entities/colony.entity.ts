import { DomainError } from '../../shared/errors/domain.error';

export class Building {
  constructor(
    public readonly id: string,
    public readonly typeKey: string,
    public readonly positionX: number,
    public readonly positionY: number,
    public readonly functionalState: {
      level: number;
      botCount: number;
      lastBotCheck?: string | Date;
      [key: string]: any;
    },
    public readonly createdAt: Date
  ) {}
}

export class Platform {
  constructor(
    public readonly id: string,
    public readonly platformType: string,
    public readonly positionX: number,
    public readonly positionY: number,
    public readonly gridState: any,
    public readonly unlockedAt: Date,
    public readonly buildings: Building[] = []
  ) {}
}

export class Colony {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly novaResetCount: number,
    public readonly basePlatformCount: number,
    /** Rayon de l'astéroïde généré. Ne doit être modifié que par un futur ApplyNovaResetUseCase. */
    public readonly asteroidRadius: number,
    public resources: Record<string, number>,
    public techUnlocked: string,
    public lastTick: Date,
    public readonly createdAt: Date,
    public readonly platforms: Platform[] = []
  ) {}

  /** Retire une quantité de ressource ; lève une DomainError si le stock est insuffisant. */
  public removeResource(resourceType: string, amount: number): void {
    if (amount <= 0) return;
    const current = this.resources[resourceType] ?? 0;
    if (current < amount) {
      throw new DomainError(`Stock de '${resourceType}' insuffisant.`);
    }
    this.resources[resourceType] = current - amount;
  }

  public addResource(resourceType: string, amount: number): void {
    if (amount <= 0) return;
    this.resources[resourceType] = (this.resources[resourceType] ?? 0) + amount;
  }
}
