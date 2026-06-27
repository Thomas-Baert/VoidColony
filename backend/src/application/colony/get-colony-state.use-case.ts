import { AsteroidTile } from '@voidcolony/shared';
import { EnsureColonyExistsService } from './ensure-colony-exists.service';

export interface ColonyStateBuildingView {
  id: string;
  typeKey: string;
  positionX: number;
  positionY: number;
}

export interface ColonyStateView {
  asteroidRadius: number;
  tiles: AsteroidTile[];
  buildings: ColonyStateBuildingView[];
}

/**
 * Renvoie l'état persisté de la colonie (terrain + bâtiments) pour que le
 * client n'ait plus à régénérer l'astéroïde aléatoirement à chaque connexion.
 */
export class GetColonyStateUseCase {
  constructor(private readonly ensureColonyExistsService: EnsureColonyExistsService) {}

  public async execute(userId: string): Promise<ColonyStateView> {
    const colony = await this.ensureColonyExistsService.execute(userId);
    const originPlatform = colony.platforms[0];
    const tiles = (originPlatform?.gridState?.tiles as AsteroidTile[]) ?? [];

    const buildings: ColonyStateBuildingView[] = colony.platforms.flatMap(platform =>
      platform.buildings.map(building => ({
        id: building.id,
        typeKey: building.typeKey,
        positionX: building.positionX,
        positionY: building.positionY,
      }))
    );

    return {
      asteroidRadius: colony.asteroidRadius,
      tiles,
      buildings,
    };
  }
}
