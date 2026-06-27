// ─── Interfaces et implémentations de définitions de bâtiments (SOLID & OCP) ───
// Source canonique : toute logique de coût/production côté serveur dépend de ce fichier,
// jamais d'un import vers le frontend.

export interface ICostCalculator {
  calculateCost(level: number): number;
}

export interface IProductionCalculator {
  calculateProduction(level: number, elapsedSeconds: number): number;
}

// OCP : modèle de coût générique via suite récursive u_n = u_{n-1} * multiplier + flatIncrease
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

// OCP : croissance de production linéaire par niveau
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
