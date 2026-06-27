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
}
