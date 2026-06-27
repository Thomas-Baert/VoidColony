import { AsteroidTile, TileType } from './asteroid-tile';

/**
 * Contrat de génération de terrain — permet d'ajouter de nouveaux types de
 * génération (ex: champ d'astéroïdes fracturé, terrain glacé) sans modifier
 * le code appelant (OCP). Le code appelant ne dépend que de cette interface.
 */
export interface IAsteroidGenerator {
  generate(radius: number): AsteroidTile[];
}

interface TerrainBump {
  col: number;
  row: number;
  /** Rayon d'influence de la bosse/du cratère. */
  influenceRadius: number;
  /** Hauteur ajoutée au centre (positif = colline, négatif = cratère). */
  intensity: number;
}

/**
 * Génère un astéroïde en forme de diamant organique, principalement plat,
 * avec un petit nombre de collines et de cratères dispersés aléatoirement.
 * Le centre est toujours une plateforme d'atterrissage plate.
 */
export class FlatTerrainAsteroidGenerator implements IAsteroidGenerator {
  constructor(
    /** Probabilité qu'une tuile du pourtour soit retirée, pour une silhouette organique. */
    private readonly rimErosionChance: number = 0.35,
    /** Nombre approximatif de collines/cratères pour 100 tuiles de surface. */
    private readonly bumpsPer100Tiles: number = 2.5
  ) {}

  public generate(radius: number): AsteroidTile[] {
    const tiles: AsteroidTile[] = [];
    const candidatePositions: Array<{ col: number; row: number; dist: number }> = [];

    for (let col = -radius; col <= radius; col++) {
      for (let row = -radius; row <= radius; row++) {
        const dist = Math.abs(col) + Math.abs(row);
        if (dist > radius) continue;

        const isCentre = col === 0 && row === 0;
        const isRim = dist === radius;

        // Érosion du pourtour pour une forme organique plutôt qu'un losange parfait
        if (isRim && !isCentre && Math.random() < this.rimErosionChance) continue;

        candidatePositions.push({ col, row, dist });
      }
    }

    const bumps = this.generateBumps(candidatePositions.length, radius);

    for (const pos of candidatePositions) {
      const isCentre = pos.col === 0 && pos.row === 0;
      let elevation = 0;

      if (!isCentre) {
        elevation = this.computeElevationFromBumps(pos.col, pos.row, bumps);
      }

      tiles.push({
        col: pos.col,
        row: pos.row,
        type: isCentre ? TileType.LANDING_PAD : TileType.ROCK,
        elevation,
      });
    }

    return tiles;
  }

  private generateBumps(surfaceTileCount: number, radius: number): TerrainBump[] {
    const bumpCount = Math.max(1, Math.round((surfaceTileCount / 100) * this.bumpsPer100Tiles));
    const bumps: TerrainBump[] = [];

    for (let i = 0; i < bumpCount; i++) {
      // Évite de placer une bosse exactement sur le centre (zone d'atterrissage)
      const col = randomIntInclusive(-radius + 1, radius - 1);
      const row = randomIntInclusive(-radius + 1, radius - 1);
      if (col === 0 && row === 0) continue;

      const isHill = Math.random() < 0.6; // un peu plus de collines que de cratères
      bumps.push({
        col,
        row,
        influenceRadius: 2 + Math.floor(Math.random() * 2), // 2–3 tuiles
        intensity: isHill ? 1 : -1,
      });
    }

    return bumps;
  }

  private computeElevationFromBumps(col: number, row: number, bumps: TerrainBump[]): number {
    let elevation = 0;
    for (const bump of bumps) {
      const dist = Math.abs(col - bump.col) + Math.abs(row - bump.row);
      if (dist > bump.influenceRadius) continue;
      const falloff = 1 - dist / (bump.influenceRadius + 1);
      elevation += bump.intensity * falloff;
    }
    // Reste majoritairement plat : on arrondit et on borne à un relief discret et léger
    return Math.max(-1, Math.min(2, Math.round(elevation)));
  }
}

/** Entier aléatoire inclusif, sans dépendance externe. */
function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
