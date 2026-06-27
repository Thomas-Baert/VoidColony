import { IResourceDefinition } from './resource-definition';
import { NotFoundError } from '../errors/not-found.error';

export class ResourceDefinitionRegistry {
  private static readonly definitions = new Map<string, IResourceDefinition>();

  public static register(definition: IResourceDefinition): void {
    this.definitions.set(definition.typeKey, definition);
  }

  public static get(typeKey: string): IResourceDefinition {
    const definition = this.definitions.get(typeKey);
    if (!definition) {
      throw new NotFoundError('ResourceDefinition', typeKey);
    }
    return definition;
  }

  public static tryGet(typeKey: string): IResourceDefinition | null {
    return this.definitions.get(typeKey) ?? null;
  }

  public static getAll(): IResourceDefinition[] {
    return Array.from(this.definitions.values());
  }

  public static getByTier(tier: number): IResourceDefinition[] {
    return this.getAll().filter(d => d.tier === tier);
  }
}
