// ─── Isometric utility functions ─────────────────────────
// Standard 2:1 isometric projection

export const TILE_W = 64; // tile width  (pixels)
export const TILE_H = 32; // tile height (pixels) = TILE_W / 2

/**
 * Convert a grid coordinate (col, row) to screen (pixel) position.
 * Origin is at the centre of the asteroid landing zone.
 */
export function gridToScreen(col: number, row: number): { x: number; y: number } {
  const x = (col - row) * (TILE_W / 2);
  const y = (col + row) * (TILE_H / 2);
  return { x, y };
}

/**
 * Convert a screen position back to the closest grid cell.
 */
export function screenToGrid(sx: number, sy: number): { col: number; row: number } {
  const col = Math.round((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2);
  const row = Math.round((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2);
  return { col, row };
}
