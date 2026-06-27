import { BuildingDefinitionRegistry } from './building-definition.registry';
import { BaseBuildingDefinition, RecursiveCostCalculator, LinearProductionCalculator } from './building-definition';

BuildingDefinitionRegistry.register(
  new BaseBuildingDefinition(
    'drill',
    'Foreuse de Roche',
    "Extrait des minéraux bruts de l'astéroïde.",
    'Extraction',
    '⛏️',
    1,
    0,
    {
      leeks: new RecursiveCostCalculator(10, 1.15, 2),
    },
    {
      resourceType: 'rock_ore',
      calc: new LinearProductionCalculator(0.5, 0.1),
    }
  )
);

BuildingDefinitionRegistry.register(
  new BaseBuildingDefinition(
    'foundry',
    'Fonderie',
    'Transforme le minerai brut en plaques de métal.',
    'Transformation',
    '🔥',
    2,
    0,
    {
      leeks: new RecursiveCostCalculator(100, 1.25, 10),
      rock_ore: new RecursiveCostCalculator(20, 1.20, 5),
    },
    {
      resourceType: 'metal_plate',
      calc: new LinearProductionCalculator(0.2, 0.15),
    }
  )
);

BuildingDefinitionRegistry.register(
  new BaseBuildingDefinition(
    'leek_farm',
    'Ferme Hydroponique de Poireaux',
    'Produit des poireaux en masse. Peut accueillir des robots.',
    'Agriculture',
    '🌿',
    4,
    3,
    {
      leeks: new RecursiveCostCalculator(1000, 1.5, 100),
      metal_plate: new RecursiveCostCalculator(200, 1.3, 20),
    },
    {
      resourceType: 'leeks_harvested',
      calc: new LinearProductionCalculator(1.0, 0.25),
    }
  )
);
