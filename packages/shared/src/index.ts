// Erreurs de domaine
export { DomainError } from './errors/domain.error';
export { NotFoundError } from './errors/not-found.error';

// Bâtiments
export type {
  IBuildingDefinition,
  ICostCalculator,
  IProductionCalculator,
} from './buildings/building-definition';
export {
  BaseBuildingDefinition,
  RecursiveCostCalculator,
  LinearProductionCalculator,
} from './buildings/building-definition';
export { BuildingDefinitionRegistry } from './buildings/building-definition.registry';
import './buildings/default-buildings';

// Ressources
export type {
  IResourceDefinition,
  ResourceTier,
  ResourceCategory,
} from './resources/resource-definition';
export { ResourceDefinition } from './resources/resource-definition';
export { ResourceDefinitionRegistry } from './resources/resource-definition.registry';
import './resources/default-resources';

// Monde / terrain
export type { AsteroidTile } from './world/asteroid-tile';
export { TileType } from './world/asteroid-tile';
export type { IAsteroidGenerator } from './world/asteroid-generator';
export { FlatTerrainAsteroidGenerator } from './world/asteroid-generator';
