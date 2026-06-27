import Phaser from 'phaser';
import { gridToScreen, screenToGrid, TILE_W, TILE_H } from '../game/world/iso.utils';
import { TileType, AsteroidTile, BuildingDefinitionRegistry, IBuildingDefinition } from '@voidcolony/shared';
import { PlayerEntity } from '../game/entities/PlayerEntity';
import { BuildingRenderer } from '../game/entities/BuildingRenderer';
import { createPlaceholderIconElement } from '../ui/placeholder-icon';
import { v4 as uuidv4 } from 'uuid';

// Colour palette per tile type
const TILE_COLORS: Record<number, { top: number; left: number; right: number }> = {
  [TileType.VOID]:        { top: 0x000000, left: 0x000000, right: 0x000000 },
  [TileType.ROCK]:        { top: 0x2e3454, left: 0x1a1e30, right: 0x141728 },
  [TileType.LANDING_PAD]: { top: 0x3dffa0, left: 0x1a7a50, right: 0x12593a },
  [TileType.BUILDING]:    { top: 0x4a5580, left: 0x252a42, right: 0x1a1e30 },
  [TileType.RESOURCE]:    { top: 0xa4e54a, left: 0x5a7a20, right: 0x3d5218 },
};

export class GameScene extends Phaser.Scene {
  private tiles: AsteroidTile[] = [];
  private walkableTiles: Set<string> = new Set();
  
  private player!: PlayerEntity;
  private buildingRenderer!: BuildingRenderer;
  
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    Z: Phaser.Input.Keyboard.Key;
    Q: Phaser.Input.Keyboard.Key;
  };
  
  private blueprintGraphics!: Phaser.GameObjects.Graphics;
  private selectedBlueprintKey: string | null = null;
  private hoveredTileCoords: { col: number; row: number } | null = null;

  // Build bar DOM references
  private buildBarEl: HTMLElement | null = null;
  private activeCategory: string | null = null;
  
  // Camera drag state
  private camDragStart: { x: number; y: number } | null = null;
  private camOrigin: { x: number; y: number } = { x: 0, y: 0 };
  
  // HUD references
  private coordsEl: HTMLElement | null = null;
  private onPlayerMove?: (col: number, row: number) => void;

  constructor() {
    super({ key: 'GameScene' });
  }

  setMoveCallback(cb: (col: number, row: number) => void) {
    this.onPlayerMove = cb;
  }

  /**
   * Applique l'état de colonie reçu du serveur (terrain persisté + bâtiments).
   * Appelée une fois, dès la réception de l'événement socket 'colony:state'.
   */
  public applyColonyState(tiles: AsteroidTile[], buildings: { id: string; col: number; row: number; typeKey: string }[]): void {
    this.tiles.push(...tiles);
    this.updateWalkableTiles();

    for (const tile of this.tiles) {
      this.drawTile(tile);
    }

    for (const building of buildings) {
      this.buildingRenderer.placeBuilding(building);
    }

    this.updateWalkableTiles();
  }

  create() {
    this.coordsEl = document.getElementById('hud-coords');

    // Le terrain est désormais fourni par le serveur (persisté en BDD) via
    // applyColonyState(), appelée depuis main.ts à la réception de l'événement
    // socket 'colony:state'. Tant qu'aucune donnée n'est arrivée, la scène
    // reste vide — pas de génération locale aléatoire.
    this.tiles = [];
    this.updateWalkableTiles();

    this.buildingRenderer = new BuildingRenderer(this, this.tiles);

    // Initialise player at origin (0, 0)
    // gridToScreen returns the top vertex of the diamond; offset to center
    const originScreen = gridToScreen(0, 0);
    this.player = new PlayerEntity(this, originScreen.x, originScreen.y + TILE_H / 2);

    // Create blueprint graphics for placement preview
    this.blueprintGraphics = this.add.graphics();
    this.blueprintGraphics.setAlpha(0.6);
    this.blueprintGraphics.setVisible(false);
    this.blueprintGraphics.setDepth(9999);

    // Camera setup
    this.cameras.main.centerOn(originScreen.x, originScreen.y);

    // Keyboard inputs
    if (this.input.keyboard) {
        this.keys = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            Z: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
            Q: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
        };
    }

    // Input handlers — right-click drag only (no build menu on right-click)
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.rightButtonDown()) {
        this.camDragStart = { x: ptr.x, y: ptr.y };
        this.camOrigin = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
      }
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.camDragStart && ptr.rightButtonDown()) {
        const dx = ptr.x - this.camDragStart.x;
        const dy = ptr.y - this.camDragStart.y;
        this.cameras.main.setScroll(this.camOrigin.x - dx, this.camOrigin.y - dy);
      }

      const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const hoveredTile = this.getHoveredTile(world.x, world.y);
      
      if (hoveredTile) {
          this.hoveredTileCoords = { col: hoveredTile.col, row: hoveredTile.row };
          if (this.coordsEl) this.coordsEl.textContent = `col: ${hoveredTile.col}  row: ${hoveredTile.row}`;
          
          if (this.selectedBlueprintKey) {
              this.updateBlueprint(hoveredTile.col, hoveredTile.row);
          }
      } else {
          this.hoveredTileCoords = null;
          if (this.coordsEl) this.coordsEl.textContent = ``;
          if (this.selectedBlueprintKey) {
              this.blueprintGraphics.setVisible(false);
          }
      }
    });

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const dx = this.camDragStart ? Math.abs(ptr.x - this.camDragStart.x) : 0;
      const dy = this.camDragStart ? Math.abs(ptr.y - this.camDragStart.y) : 0;
      const isDrag = dx > 5 || dy > 5;
      
      this.camDragStart = null;

      if (ptr.leftButtonReleased() && !isDrag) {
          const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
          const validTile = this.getHoveredTile(world.x, world.y);
          if (this.selectedBlueprintKey && validTile) {
              this.placeBlueprint(validTile);
          }
      }
    });

    this.input.on('wheel', (_ptr: unknown, _gos: unknown, _dx: number, dy: number) => {
      const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.001, 0.4, 2.0);
      this.cameras.main.setZoom(newZoom);
    });

    this.events.on('building:placed:success', (data: any) => {
        this.buildingRenderer.placeBuilding({
            id: data.id || uuidv4(),
            col: data.col,
            row: data.row,
            typeKey: data.typeKey
        });
        this.updateWalkableTiles();
    });

    // Initialize the bottom build bar
    this.initBuildBar();
  }
  
  private updateWalkableTiles() {
      this.walkableTiles.clear();
      for (const tile of this.tiles) {
          if (tile.type === TileType.ROCK || tile.type === TileType.LANDING_PAD || tile.type === TileType.RESOURCE) {
              this.walkableTiles.add(`${tile.col},${tile.row}`);
          }
      }
  }

  // ── Build Bar (OCP — auto-generated from BuildingDefinitionRegistry) ───

  private initBuildBar() {
    this.buildBarEl = document.getElementById('build-bar');
    if (!this.buildBarEl) return;
    
    this.buildBarEl.innerHTML = '';

    const categories = BuildingDefinitionRegistry.getCategories();

    // Tab strip
    const tabStrip = document.createElement('div');
    tabStrip.className = 'build-bar-tabs';
    
    categories.forEach(cat => {
      const tab = document.createElement('button');
      tab.className = 'build-bar-tab';
      tab.textContent = cat;
      tab.addEventListener('click', () => this.selectCategory(cat));
      tabStrip.appendChild(tab);
    });

    this.buildBarEl.appendChild(tabStrip);

    // Tray (shows buildings for active category)
    const tray = document.createElement('div');
    tray.className = 'build-bar-tray collapsed';
    tray.id = 'build-bar-tray';
    this.buildBarEl.appendChild(tray);
  }

  private selectCategory(category: string) {
    if (!this.buildBarEl) return;

    const tray = this.buildBarEl.querySelector('#build-bar-tray') as HTMLElement;
    if (!tray) return;

    // Toggle: clicking the same category closes the tray
    if (this.activeCategory === category) {
      this.activeCategory = null;
      tray.classList.add('collapsed');
      this.buildBarEl.querySelectorAll('.build-bar-tab').forEach(t => t.classList.remove('active'));
      this.cancelBlueprint();
      return;
    }

    this.activeCategory = category;

    // Update tab active states
    this.buildBarEl.querySelectorAll('.build-bar-tab').forEach(t => {
      t.classList.toggle('active', t.textContent === category);
    });

    // Populate tray with building cards
    tray.innerHTML = '';
    tray.classList.remove('collapsed');

    const buildings = BuildingDefinitionRegistry.getByCategory(category);
    
    buildings.forEach((def: IBuildingDefinition) => {
      const card = document.createElement('div');
      card.className = 'build-card';
      if (this.selectedBlueprintKey === def.typeKey) card.classList.add('selected');

      const icon = createPlaceholderIconElement(def.iconKey, def.name, def.placeholderColor);
      icon.classList.add('build-card-icon');
      card.appendChild(icon);

      const name = document.createElement('div');
      name.className = 'build-card-name';
      name.textContent = def.name;
      card.appendChild(name);

      const cost = document.createElement('div');
      cost.className = 'build-card-cost';
      cost.textContent = `Tier ${def.tier}`;
      card.appendChild(cost);

      card.addEventListener('click', () => {
        if (this.selectedBlueprintKey === def.typeKey) {
          // Clicking same building deselects
          this.cancelBlueprint();
          card.classList.remove('selected');
        } else {
          // Select this building
          this.selectedBlueprintKey = def.typeKey;
          this.blueprintGraphics.setVisible(true);
          if (this.hoveredTileCoords) {
            this.updateBlueprint(this.hoveredTileCoords.col, this.hoveredTileCoords.row);
          }
          // Update all card selected states
          tray.querySelectorAll('.build-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        }
      });

      tray.appendChild(card);
    });

    // Add cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'build-bar-cancel';
    cancelBtn.textContent = '✕ Annuler';
    cancelBtn.addEventListener('click', () => {
      this.cancelBlueprint();
      this.selectCategory(category); // Toggle close
    });
    tray.appendChild(cancelBtn);
  }

  private cancelBlueprint() {
    this.selectedBlueprintKey = null;
    this.blueprintGraphics.setVisible(false);
    this.blueprintGraphics.clear();
    // Deselect any build card
    const tray = document.getElementById('build-bar-tray');
    if (tray) tray.querySelectorAll('.build-card').forEach(c => c.classList.remove('selected'));
  }

  // ── Tile Rendering ────────────────────────────────────────────────────

  private drawTile(tile: AsteroidTile) {
    const { x, y } = gridToScreen(tile.col, tile.row);
    const h      = tile.elevation * 8;
    const colors = TILE_COLORS[tile.type];

    const g  = this.add.graphics();
    g.setDepth((tile.col + tile.row) * 10);
    
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    const topFace = [
      x,      y - h,
      x + hw, y + hh - h,
      x,      y + TILE_H - h,
      x - hw, y + hh - h,
    ];

    g.fillStyle(colors.top, 1);
    g.fillTriangle(topFace[0], topFace[1], topFace[2], topFace[3], topFace[4], topFace[5]);
    g.fillTriangle(topFace[0], topFace[1], topFace[4], topFace[5], topFace[6], topFace[7]);

    if (h > 0) {
      g.fillStyle(colors.left, 1);
      g.fillTriangle(x - hw, y + hh - h, x, y + TILE_H - h, x, y + TILE_H);
      g.fillTriangle(x - hw, y + hh - h, x, y + TILE_H,     x - hw, y + hh);
      
      g.fillStyle(colors.right, 1);
      g.fillTriangle(x, y + TILE_H - h, x + hw, y + hh - h, x + hw, y + hh);
      g.fillTriangle(x, y + TILE_H - h, x + hw, y + hh,     x, y + TILE_H);
    }

    g.lineStyle(1, 0x0a0d1a, 0.7);
    g.beginPath();
    g.moveTo(x,      y - h);
    g.lineTo(x + hw, y + hh - h);
    g.lineTo(x,      y + TILE_H - h);
    g.lineTo(x - hw, y + hh - h);
    g.closePath();
    g.strokePath();

    if (tile.type === TileType.LANDING_PAD) {
      const innerG = this.add.graphics();
      innerG.setDepth((tile.col + tile.row) * 10 + 1);
      innerG.lineStyle(2, 0x4dffa6, 0.9);
      innerG.beginPath();
      innerG.moveTo(x,         y - h + 6);
      innerG.lineTo(x + hw - 8, y + hh - h);
      innerG.lineTo(x,         y + TILE_H - h - 6);
      innerG.lineTo(x - hw + 8, y + hh - h);
      innerG.closePath();
      innerG.strokePath();

      this.tweens.add({
        targets: innerG,
        alpha: { from: 0.9, to: 0.3 },
        yoyo: true, repeat: -1,
        duration: 1200,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ── Blueprint ─────────────────────────────────────────────────────────

  private updateBlueprint(col: number, row: number) {
      const tile = this.tiles.find(t => t.col === col && t.row === row);
      const { x, y } = gridToScreen(col, row);
      
      this.blueprintGraphics.clear();
      
      if (!tile) {
          this.blueprintGraphics.setVisible(false);
          return;
      }
      this.blueprintGraphics.setVisible(true);

      const canBuild = tile.type === TileType.ROCK || tile.type === TileType.RESOURCE;
      const h = tile.elevation * 8;
      const hw = TILE_W / 2;
      const hh = TILE_H / 2;
      const baseY = y - h;

      // Draw exactly on the tile's top face
      this.blueprintGraphics.fillStyle(canBuild ? 0x00aaff : 0xff0000, 0.5);
      
      this.blueprintGraphics.beginPath();
      this.blueprintGraphics.moveTo(x, baseY);
      this.blueprintGraphics.lineTo(x + hw, baseY + hh);
      this.blueprintGraphics.lineTo(x, baseY + TILE_H);
      this.blueprintGraphics.lineTo(x - hw, baseY + hh);
      this.blueprintGraphics.closePath();
      this.blueprintGraphics.fillPath();

      // Add a small outline for better visibility
      this.blueprintGraphics.lineStyle(2, canBuild ? 0x00ffff : 0xff0000, 0.8);
      this.blueprintGraphics.strokePath();
      
      // Depth must be just above the tile
      this.blueprintGraphics.setDepth((tile.col + tile.row) * 10 + 1);
  }

  private placeBlueprint(tile: AsteroidTile) {
      if (!this.selectedBlueprintKey) return;
      
      const canBuild = tile.type === TileType.ROCK || tile.type === TileType.RESOURCE;
      if (!canBuild) return;

      this.events.emit('building:place', { tile, typeKey: this.selectedBlueprintKey });
      
      // Optimistic visual placement
      this.events.emit('building:placed:success', {
          col: tile.col,
          row: tile.row,
          typeKey: this.selectedBlueprintKey
      });

      // Don't cancel blueprint — allow placing multiple buildings of same type
      // The user can cancel explicitly via the cancel button or clicking the card again
  }

  // ── Tile Hit-Testing (Point-in-Polygon) ───────────────────────────────

  private getHoveredTile(worldX: number, worldY: number): AsteroidTile | null {
      // Sort tiles from front to back (highest col+row first) to handle overlaps
      const sorted = [...this.tiles].sort((a, b) => (b.col + b.row) - (a.col + a.row));
      
      for (const tile of sorted) {
          const { x, y } = gridToScreen(tile.col, tile.row);
          const h = tile.elevation * 8;
          const hw = TILE_W / 2;
          const hh = TILE_H / 2;
          
          // Top face polygon
          const poly = new Phaser.Geom.Polygon([
              x,      y - h,
              x + hw, y + hh - h,
              x,      y + TILE_H - h,
              x - hw, y + hh - h,
          ]);
          
          if (poly.contains(worldX, worldY)) {
              return tile;
          }
      }
      return null;
  }

  // ── Game Loop ─────────────────────────────────────────────────────────

  update() {
    let dx = 0;
    let dy = 0;

    if (this.keys.W.isDown || this.keys.Z.isDown) dy -= 1;
    if (this.keys.S.isDown) dy += 1;
    if (this.keys.A.isDown || this.keys.Q.isDown) dx -= 1;
    if (this.keys.D.isDown) dx += 1;

    this.player.update(dx, dy, this.walkableTiles);

    // Find player's current logical tile to get elevation
    const { col, row } = screenToGrid(this.player.worldX, this.player.worldY);
    const tile = this.tiles.find(t => t.col === col && t.row === row);
    const elevation = tile ? tile.elevation : 0;

    this.player.syncGraphics(elevation);
    this.player.setDepth((col + row) * 10 + 2);

    if (dx !== 0 || dy !== 0) {
        this.onPlayerMove?.(col, row);

        // Follow the visual center of the player, not logical base
        this.cameras.main.pan(this.player.worldX, this.player.worldY - (elevation * 8), 100, 'Linear', true);
    }
  }
}
