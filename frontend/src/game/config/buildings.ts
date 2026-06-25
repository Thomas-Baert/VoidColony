// ─── Interfaces for recursive suites and cost definitions (SOLID & OCP friendly) ───

export interface ICostCalculator {
  calculateCost(level: number): number;
}

export interface IProductionCalculator {
  calculateProduction(level: number, elapsedSeconds: number): number;
}

// OCP implementation: General cost model using a linear/exponential recursive suite:
// u_n = u_{n-1} * multiplier + flatIncrease
export class RecursiveCostCalculator implements ICostCalculator {
  constructor(
    private readonly baseCost: number,
    private readonly multiplier: number,
    private readonly flatIncrease: number
  ) {}

  calculateCost(level: number): number {
    let cost = this.baseCost;
    for (let i = 0; i < level; i++) {
      cost = Math.floor(cost * this.multiplier + this.flatIncrease);
    }
    return cost;
  }
}

// OCP implementation: Linear production growth per level
export class LinearProductionCalculator implements IProductionCalculator {
  constructor(
    private readonly baseRatePerSecond: number,
    private readonly multiplierPerLevel: number
  ) {}

  calculateProduction(level: number, elapsedSeconds: number): number {
    const rate = this.baseRatePerSecond * (1 + (level - 1) * this.multiplierPerLevel);
    return rate * elapsedSeconds;
  }
}

export interface IBuildingDefinition {
  readonly typeKey: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly icon: string;
  readonly tier: 1 | 2 | 3 | 4;
  readonly maxBots: number;
  
  getCost(resource: string, level: number): number;
  getProduction(level: number, elapsedSeconds: number): { resourceType: string; amount: number } | null;
}

// Base implementation of IBuildingDefinition representing OCP extensions
export class BaseBuildingDefinition implements IBuildingDefinition {
  constructor(
    public readonly typeKey: string,
    public readonly name: string,
    public readonly description: string,
    public readonly category: string,
    public readonly icon: string,
    public readonly tier: 1 | 2 | 3 | 4,
    public readonly maxBots: number,
    private readonly costCalculators: Record<string, ICostCalculator>,
    private readonly productionCalculator: { resourceType: string; calc: IProductionCalculator } | null
  ) {}

  getCost(resource: string, level: number): number {
    const calculator = this.costCalculators[resource];
    if (!calculator) return 0;
    return calculator.calculateCost(level);
  }

  getProduction(level: number, elapsedSeconds: number): { resourceType: string; amount: number } | null {
    if (!this.productionCalculator) return null;
    const amount = this.productionCalculator.calc.calculateProduction(level, elapsedSeconds);
    return {
      resourceType: this.productionCalculator.resourceType,
      amount,
    };
  }
}

// Registry containing all building definitions to respect OCP
export class BuildingDefinitionRegistry {
  private static readonly definitions = new Map<string, IBuildingDefinition>();

  public static register(definition: IBuildingDefinition): void {
    this.definitions.set(definition.typeKey, definition);
  }

  public static get(typeKey: string): IBuildingDefinition {
    const definition = this.definitions.get(typeKey);
    if (!definition) {
      throw new Error(`Building definition not found: ${typeKey}`);
    }
    return definition;
  }

  public static getAll(): IBuildingDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Returns all unique category names, in the order they were first registered. */
  public static getCategories(): string[] {
    const seen = new Set<string>();
    const categories: string[] = [];
    for (const def of this.definitions.values()) {
      if (!seen.has(def.category)) {
        seen.add(def.category);
        categories.push(def.category);
      }
    }
    return categories;
  }

  /** Returns all buildings belonging to a given category. */
  public static getByCategory(category: string): IBuildingDefinition[] {
    return this.getAll().filter(d => d.category === category);
  }
}

// Register default buildings
BuildingDefinitionRegistry.register(
  new BaseBuildingDefinition(
    'drill',
    'Foreuse de Roche',
    'Extrait des minéraux bruts de l\'astéroïde.',
    'Extraction',
    '⛏️',
    1,
    0,
    {
      leeks: new RecursiveCostCalculator(10, 1.15, 2),
    },
    {
      resourceType: 'rock_ore',
      calc: new LinearProductionCalculator(0.5, 0.1),
    }
  )
);

BuildingDefinitionRegistry.register(
  new BaseBuildingDefinition(
    'foundry',
    'Fonderie',
    'Transforme le minerai brut en plaques de métal.',
    'Transformation',
    '🔥',
    2,
    0,
    {
      leeks: new RecursiveCostCalculator(100, 1.25, 10),
      rock_ore: new RecursiveCostCalculator(20, 1.20, 5),
    },
    {
      resourceType: 'metal_plate',
      calc: new LinearProductionCalculator(0.2, 0.15),
    }
  )
);

BuildingDefinitionRegistry.register(
  new BaseBuildingDefinition(
    'leek_farm',
    'Ferme Hydroponique de Poireaux',
    'Produit des poireaux en masse. Peut accueillir des robots.',
    'Agriculture',
    '🌿',
    4,
    3,
    {
      leeks: new RecursiveCostCalculator(1000, 1.5, 100),
      metal_plate: new RecursiveCostCalculator(200, 1.3, 20),
    },
    {
      resourceType: 'leeks_harvested',
      calc: new LinearProductionCalculator(1.0, 0.25),
    }
  )
);
