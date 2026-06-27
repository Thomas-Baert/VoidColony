import Phaser from 'phaser';
import { gridToScreen, TILE_W, TILE_H } from '../world/iso.utils';
import { AsteroidTile, TileType } from '@voidcolony/shared';
import { BuildingDefinitionRegistry } from '@voidcolony/shared';

export interface PlacedBuilding {
  id: string;
  col: number;
  row: number;
  typeKey: string;
}

/** Assombrit/éclaircit une couleur hexadécimale d'un facteur donné (-1 à 1). */
function shade(color: number, factor: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const r = Phaser.Math.Clamp(Math.round(c.red * (1 + factor)), 0, 255);
  const g = Phaser.Math.Clamp(Math.round(c.green * (1 + factor)), 0, 255);
  const b = Phaser.Math.Clamp(Math.round(c.blue * (1 + factor)), 0, 255);
  return Phaser.Display.Color.GetColor(r, g, b);
}

export class BuildingRenderer {
  private readonly scene: Phaser.Scene;
  private readonly tiles: AsteroidTile[];
  private readonly buildings: Map<string, PlacedBuilding> = new Map();
  private readonly visualObjects: Map<string, Phaser.GameObjects.Graphics[]> = new Map();

  constructor(scene: Phaser.Scene, tiles: AsteroidTile[]) {
    this.scene = scene;
    this.tiles = tiles;
  }

  public placeBuilding(building: PlacedBuilding): void {
    if (this.buildings.has(building.id)) return;
    this.buildings.set(building.id, building);

    this.drawBuilding(building);

    const tile = this.tiles.find(t => t.col === building.col && t.row === building.row);
    if (tile && tile.type !== TileType.LANDING_PAD) {
       tile.type = TileType.BUILDING;
    }
  }

  private drawBuilding(building: PlacedBuilding): void {
    const tile = this.tiles.find(t => t.col === building.col && t.row === building.row);
    const elevation = tile ? tile.elevation : 0;

    const { x, y } = gridToScreen(building.col, building.row);
    const h = elevation * 8;

    const g = this.scene.add.graphics();
    // Depth sorting for building: slightly above the tile it sits on
    g.setDepth((building.col + building.row) * 10 + 5);

    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    // OCP : la couleur vient de la définition du bâtiment (registre), jamais
    // d'un if/else codé en dur — un nouveau bâtiment n'a rien à changer ici.
    const baseColor = BuildingDefinitionRegistry.get(building.typeKey).placeholderColor;
    const topColor = baseColor;
    const leftColor = shade(baseColor, -0.35);
    const rightColor = shade(baseColor, -0.55);

    const bh = 15;
    const baseY = y - h - 5;

    g.fillStyle(topColor, 1);
    g.beginPath();
    g.moveTo(x, baseY - bh);
    g.lineTo(x + hw - 10, baseY + hh - 5 - bh);
    g.lineTo(x, baseY + TILE_H - 10 - bh);
    g.lineTo(x - hw + 10, baseY + hh - 5 - bh);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0xffffff, 0.3);
    g.strokePath();

    g.fillStyle(leftColor, 1);
    g.beginPath();
    g.moveTo(x - hw + 10, baseY + hh - 5 - bh);
    g.lineTo(x, baseY + TILE_H - 10 - bh);
    g.lineTo(x, baseY + TILE_H - 10);
    g.lineTo(x - hw + 10, baseY + hh - 5);
    g.closePath();
    g.fillPath();

    g.fillStyle(rightColor, 1);
    g.beginPath();
    g.moveTo(x, baseY + TILE_H - 10 - bh);
    g.lineTo(x + hw - 10, baseY + hh - 5 - bh);
    g.lineTo(x + hw - 10, baseY + hh - 5);
    g.lineTo(x, baseY + TILE_H - 10);
    g.closePath();
    g.fillPath();

    g.setAlpha(0);
    g.y = -20;
    this.scene.tweens.add({
        targets: g,
        alpha: 1,
        y: 0,
        duration: 300,
        ease: 'Back.easeOut'
    });

    this.visualObjects.set(building.id, [g]);
  }
}
