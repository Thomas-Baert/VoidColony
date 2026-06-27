import Phaser from 'phaser';

/**
 * AvatarRenderer manages the visual multi-layer representation of a character.
 * It uses a Phaser Container to hold multiple sprites (body, head, etc.) so they
 * share the same coordinate system, depth, and can be animated in sync.
 */
export class AvatarRenderer {
    public readonly container: Phaser.GameObjects.Container;

    // Layers
    private readonly shadowGraphic: Phaser.GameObjects.Graphics;
    private readonly bodyGraphic: Phaser.GameObjects.Graphics;
    private readonly headGraphic: Phaser.GameObjects.Graphics;

    private isFacingLeft: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        // We still use Graphics placeholders, but separated into distinct logical layers
        this.shadowGraphic = scene.add.graphics();
        this.drawShadow();

        this.bodyGraphic = scene.add.graphics();
        this.headGraphic = scene.add.graphics();

        this.drawBodyPlaceholder();
        this.drawHeadPlaceholder();

        this.container = scene.add.container(x, y, [this.bodyGraphic, this.headGraphic]);
        this.shadowGraphic.setPosition(x, y);
    }

    /**
     * Oriente visuellement l'avatar selon la direction de déplacement.
     * Les directions "ouest" (NW/SW) inversent l'avatar horizontalement.
     */
    public setOrientation(facingLeft: boolean): void {
        if (facingLeft === this.isFacingLeft) return;
        this.isFacingLeft = facingLeft;
        this.container.setScale(facingLeft ? -1 : 1, 1);
    }

    /**
     * Sets the physical ground position (2D flat logic).
     * @param x Flat world X
     * @param y Flat world Y
     * @param visualElevation The current elevation height (in tile elevation units)
     * @param bobOffset Décalage vertical du cycle de marche (0 à l'arrêt)
     */
    public setPosition(x: number, y: number, visualElevation: number, bobOffset: number = 0): void {
        const visualY = y - (visualElevation * 8) - bobOffset;

        // Shadow stays on the ground plane (y) but we offset it slightly so it looks right
        this.shadowGraphic.setPosition(x, y - (visualElevation * 8) + 10);

        // The container (body + head) moves up based on elevation and walk bob
        this.container.setPosition(x, visualY);
    }

    public setDepth(depth: number): void {
        this.shadowGraphic.setDepth(depth - 0.1);
        this.container.setDepth(depth);
    }

    public destroy(): void {
        this.shadowGraphic.destroy();
        this.container.destroy();
    }

    // ── Placeholder Drawings ──────────────────────────────────────────────

    private drawShadow(): void {
        this.shadowGraphic.fillStyle(0x000000, 0.25);
        this.shadowGraphic.fillEllipse(0, 0, 22, 9);
    }

    private drawBodyPlaceholder(): void {
        const g = this.bodyGraphic;
        g.clear();
        
        // Legs
        g.fillStyle(0x2a7a56, 1);
        g.fillRect(-5, -4, 4, 10);
        g.fillRect(1,  -4, 4, 10);

        // Body / suit
        g.fillStyle(0x4dffa6, 1);
        g.fillRect(-6, -18, 12, 15);
    }

    private drawHeadPlaceholder(): void {
        const g = this.headGraphic;
        g.clear();

        // Helmet/Head base
        g.fillStyle(0xd0fff0, 1);
        g.fillCircle(0, -24, 7);

        // Visor/Face
        g.fillStyle(0x07080c, 0.92);
        g.fillRoundedRect(-4, -27, 8, 5, 2);

        // Helmet accent
        g.lineStyle(1, 0x4dffa6, 0.7);
        g.beginPath();
        g.arc(0, -24, 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
        g.strokePath();
    }
}
