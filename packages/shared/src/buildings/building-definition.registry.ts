import { IBuildingDefinition } from './building-definition';
import { NotFoundError } from '../errors/not-found.error';

export class BuildingDefinitionRegistry {
  private static readonly definitions = new Map<string, IBuildingDefinition>();

  public static register(definition: IBuildingDefinition): void {
    this.definitions.set(definition.typeKey, definition);
  }

  public static get(typeKey: string): IBuildingDefinition {
    const definition = this.definitions.get(typeKey);
    if (!definition) {
      throw new NotFoundError('BuildingDefinition', typeKey);
    }
    return definition;
  }

  public static getAll(): IBuildingDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Catégories uniques, dans l'ordre de premier enregistrement. */
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

  public static getByCategory(category: string): IBuildingDefinition[] {
    return this.getAll().filter(d => d.category === category);
  }
}
