// ─── Définition de ressource (OCP) ─────────────────────────────────────────
// Toute nouvelle ressource s'ajoute en créant une définition et en l'enregistrant
// dans le registre (cf. resource-definition.registry.ts) — jamais en modifiant
// le moteur de tick, le marché, ou l'UI, qui ne connaissent que l'interface.

export type ResourceTier = 1 | 2 | 3 | 4;

/** 'currency' = monnaie globale (ex: leeks). 'material' = ressource de production normale. */
export type ResourceCategory = 'currency' | 'material';

export interface IResourceDefinition {
  readonly typeKey: string;
  readonly name: string;
  readonly description: string;
  /** Clé de texture/placeholder, jamais un emoji. Résolue par le renderer client. */
  readonly iconKey: string;
  readonly category: ResourceCategory;
  readonly tier: ResourceTier;
  /** Couleur de secours (hexadécimal Phaser) utilisée par le placeholder en attendant une vraie texture. */
  readonly placeholderColor: number;
}

export class ResourceDefinition implements IResourceDefinition {
  constructor(
    public readonly typeKey: string,
    public readonly name: string,
    public readonly description: string,
    public readonly iconKey: string,
    public readonly category: ResourceCategory,
    public readonly tier: ResourceTier,
    public readonly placeholderColor: number
  ) {}
}
