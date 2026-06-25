// ─── Asteroid tile/zone configuration ─────────────────────

export enum TileType {
  VOID        = 0, // empty space (no tile)
  ROCK        = 1, // basic rock surface
  LANDING_PAD = 2, // central landing zone (always present)
  BUILDING    = 3, // has a building on it
  RESOURCE    = 4, // harvestable resource node
}

export interface AsteroidTile {
  col: number;
  row: number;
  type: TileType;
  elevation: number; // 0–3, used for stacking height
}

/**
 * Generate the initial asteroid layout.
 * The asteroid is a diamond shape around (0,0).
 * The centre tile is always the landing pad.
 */
export function generateAsteroid(radius: number): AsteroidTile[] {
  const tiles: AsteroidTile[] = [];

  for (let col = -radius; col <= radius; col++) {
    for (let row = -radius; row <= radius; row++) {
      const dist = Math.abs(col) + Math.abs(row);
      if (dist > radius) continue;

      const isCentre  = col === 0 && row === 0;
      const isRim     = dist === radius;

      // Thin out the rim to create a more organic shape
      if (isRim && Math.random() < 0.35 && !isCentre) continue;

      const elevation = isCentre ? 1 : Math.max(0, Math.floor((radius - dist) * 0.5));

      tiles.push({
        col, row,
        type: isCentre ? TileType.LANDING_PAD : TileType.ROCK,
        elevation,
      });
    }
  }

  return tiles;
}
