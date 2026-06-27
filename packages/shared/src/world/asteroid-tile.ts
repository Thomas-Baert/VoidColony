export enum TileType {
  VOID        = 0, // espace vide (aucune tuile)
  ROCK        = 1, // surface rocheuse basique
  LANDING_PAD = 2, // zone d'atterrissage centrale (toujours présente)
  BUILDING    = 3, // une construction occupe cette tuile
  RESOURCE    = 4, // nœud de ressource récoltable
}

export interface AsteroidTile {
  col: number;
  row: number;
  type: TileType;
  /** Hauteur relative de la tuile. 0 = sol plat. Négatif = cratère, positif = colline. */
  elevation: number;
}
