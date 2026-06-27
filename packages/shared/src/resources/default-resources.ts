import { ResourceDefinitionRegistry } from './resource-definition.registry';
import { ResourceDefinition } from './resource-definition';

// Monnaie globale
ResourceDefinitionRegistry.register(
  new ResourceDefinition(
    'leeks',
    'Poireaux',
    'Monnaie universelle de la colonie.',
    'icon_resource_leeks',
    'currency',
    1,
    0x4dffa6
  )
);

// T1
ResourceDefinitionRegistry.register(
  new ResourceDefinition(
    'rock_ore',
    'Minerai Brut',
    "Extrait directement de la roche de l'astéroïde.",
    'icon_resource_rock_ore',
    'material',
    1,
    0x8a8f9e
  )
);

// T2
ResourceDefinitionRegistry.register(
  new ResourceDefinition(
    'metal_plate',
    'Plaque de Métal',
    'Minerai raffiné en plaques utilisables.',
    'icon_resource_metal_plate',
    'material',
    2,
    0xc7ccd8
  )
);

// T1 (produit consommable, pas une monnaie)
ResourceDefinitionRegistry.register(
  new ResourceDefinition(
    'leeks_harvested',
    'Poireaux Récoltés',
    'Récolte brute avant conversion en monnaie.',
    'icon_resource_leeks_harvested',
    'material',
    1,
    0x3dffa0
  )
);

// Pour ajouter une ressource T3/T4 plus tard, il suffit d'ajouter un bloc ici —
// aucune autre partie du code (tick, marché, UI) n'a besoin d'être modifiée.
