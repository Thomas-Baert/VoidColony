import Phaser from 'phaser';
import { gridToScreen, TILE_W, TILE_H } from '../world/iso.utils';
import { AsteroidTile, TileType } from '../world/asteroid';

export interface PlacedBuilding {
  id: string;
  col: number;
  row: number;
  typeKey: string;
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
    
    let topColor = 0xb048ff;
    let leftColor = 0x6e2db3;
    let rightColor = 0x471d73;
    
    if (building.typeKey === 'drill') {
        topColor = 0xffb830;
        leftColor = 0xcc8a1a;
        rightColor = 0x996510;
    } else if (building.typeKey === 'leek_farm') {
        topColor = 0x3dffa0;
        leftColor = 0x22a664;
        rightColor = 0x125934;
    }
    
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
