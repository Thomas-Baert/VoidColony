# Void Colony — Document d'architecture technique

Référence de conception. Couvre l'architecture logicielle (principes SOLID), les conventions de nommage, le schéma de données final et le plan d'implémentation par phases.

---

## 1. Principes directeurs

### 1.1 SOLID appliqué au projet

| Principe | Application concrète dans Void Colony |
|---|---|
| **S**ingle Responsibility | Chaque classe a une seule raison de changer. Ex: `TickCalculator` calcule la production offline, il ne lit/écrit jamais en base lui-même — c'est le rôle d'un `Repository` séparé. |
| **O**pen/Closed | Les nouveaux types de bâtiments, ressources, ou récompenses s'ajoutent par extension (nouvelles classes implémentant une interface), jamais par modification de switch/if existants. Ex: ajouter un bâtiment = créer une classe `BuildingDefinition`, pas modifier `BuildingFactory`. |
| **L**iskov Substitution | Toute implémentation d'une interface (`IResourceProducer`, `IMarketOrderHandler`) doit être substituable sans casser le comportement attendu par l'appelant. |
| **I**nterface Segregation | Des interfaces fines et ciblées plutôt qu'une interface `IBuilding` monolithique. Ex: `IPlaceable`, `IProducer`, `IStorable`, `IDecoratable` — un bâtiment implémente seulement ce dont il a besoin. |
| **D**ependency Inversion | Les couches haut niveau (services métier) dépendent d'abstractions (`IColonyRepository`), jamais d'implémentations concrètes (`PostgresColonyRepository`). Injection de dépendances via constructeur, pas d'`import` direct de l'implémentation dans la logique métier. |

### 1.2 Conventions de nommage

| Élément | Convention | Exemple |
|---|---|---|
| Fichiers TypeScript | `kebab-case`, suffixe de rôle | `colony-repository.ts`, `tick-calculator.service.ts`, `building.entity.ts` |
| Classes | `PascalCase`, nom = responsabilité | `ColonyTickService`, `MarketOrderRepository`, `NovaResetUseCase` |
| Interfaces | Préfixe `I` | `IColonyRepository`, `IResourceProducer` |
| Types/DTO | `PascalCase` + suffixe explicite | `CreateColonyDto`, `ColonySnapshot`, `MarketOrderView` |
| Fonctions/méthodes | `camelCase`, verbe d'action | `calculateOfflineProduction()`, `applyNovaReset()` |
| Variables | `camelCase`, nom explicite (jamais d'abréviation cryptique) | `pendingResourceDelta`, pas `prd` |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_OFFLINE_TICK_HOURS`, `BCRYPT_COST_FACTOR` |
| Tables SQL | `snake_case`, pluriel | `corporation_contributions` |
| Colonnes SQL | `snake_case` | `created_at`, `resource_type` |
| Events Socket.io | `namespace:action` | `zone:player-moved`, `chat:message-sent`, `corporation:objective-completed` |
| Routes API | `/api/v1/resource-pluriel/:id/action` | `/api/v1/colonies/:id/nova-reset` |

### 1.3 Règle de structure générale

- Un fichier = une classe/interface/type principal (pas de fichiers fourre-tout `utils.ts` géants — découper par domaine : `string-format.util.ts`, `date-format.util.ts`)
- Pas de logique métier dans les controllers/routes — ils ne font que valider l'input et déléguer à un `UseCase`/`Service`
- Pas d'accès direct à la base depuis les services métier — toujours via un `Repository` derrière une interface

---

## 2. Architecture backend (Node.js / TypeScript)

### 2.1 Structure de dossiers

```
backend/
├── src/
│   ├── domain/                      # Logique métier pure, zéro dépendance externe
│   │   ├── entities/
│   │   │   ├── colony.entity.ts
│   │   │   ├── platform.entity.ts
│   │   │   ├── building.entity.ts
│   │   │   ├── corporation.entity.ts
│   │   │   └── user.entity.ts
│   │   ├── value-objects/
│   │   │   ├── resource-bundle.value-object.ts
│   │   │   └── flux-amount.value-object.ts
│   │   └── interfaces/
│   │       ├── repositories/
│   │       │   ├── colony-repository.interface.ts
│   │       │   ├── user-repository.interface.ts
│   │       │   └── corporation-repository.interface.ts
│   │       └── services/
│   │           ├── resource-producer.interface.ts
│   │           └── notification-sender.interface.ts
│   │
│   ├── application/                 # Use cases, orchestration métier
│   │   ├── colony/
│   │   │   ├── calculate-offline-production.use-case.ts
│   │   │   ├── apply-nova-reset.use-case.ts
│   │   │   └── place-building.use-case.ts
│   │   ├── auth/
│   │   │   ├── register-user.use-case.ts
│   │   │   ├── verify-email-nonce.use-case.ts
│   │   │   └── login-user.use-case.ts
│   │   ├── market/
│   │   │   ├── create-market-order.use-case.ts
│   │   │   └── fulfill-market-order.use-case.ts
│   │   └── corporation/
│   │       ├── donate-to-objective.use-case.ts
│   │       └── complete-objective.use-case.ts
│   │
│   ├── infrastructure/              # Implémentations concrètes
│   │   ├── database/
│   │   │   ├── postgres-colony-repository.ts
│   │   │   ├── postgres-user-repository.ts
│   │   │   ├── postgres-corporation-repository.ts
│   │   │   └── migrations/
│   │   ├── cache/
│   │   │   └── in-memory-market-cache.ts      # node-cache, TTL 30s
│   │   ├── email/
│   │   │   └── nodemailer-notification-sender.ts
│   │   └── realtime/
│   │       ├── socket-zone-gateway.ts          # positions avatars par room
│   │       └── socket-chat-gateway.ts
│   │
│   ├── presentation/                # HTTP/WS, validation entrée, sérialisation sortie
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   │   ├── colony.controller.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── market.controller.ts
│   │   │   │   └── corporation.controller.ts
│   │   │   ├── middlewares/
│   │   │   │   ├── jwt-auth.middleware.ts
│   │   │   │   ├── rate-limit.middleware.ts
│   │   │   │   └── error-handler.middleware.ts
│   │   │   └── dtos/
│   │   │       ├── create-colony.dto.ts
│   │   │       └── donate-to-objective.dto.ts
│   │   └── websocket/
│   │       └── socket-server.bootstrap.ts
│   │
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── domain.error.ts
│   │   │   └── not-found.error.ts
│   │   └── config/
│   │       └── env.config.ts
│   │
│   └── main.ts                      # composition root : instancie tout, injecte les dépendances
│
└── test/
    ├── unit/                        # domain + application, sans IO
    └── integration/                 # avec base de test
```

### 2.2 Exemple d'application du DIP (Dependency Inversion)

```typescript
// domain/interfaces/repositories/colony-repository.interface.ts
export interface IColonyRepository {
  findById(colonyId: string): Promise<Colony | null>;
  save(colony: Colony): Promise<void>;
}

// application/colony/calculate-offline-production.use-case.ts
export class CalculateOfflineProductionUseCase {
  constructor(
    private readonly colonyRepository: IColonyRepository,   // abstraction, pas Postgres directement
    private readonly clock: IClock                          // testable, pas Date.now() en dur
  ) {}

  async execute(colonyId: string): Promise<ColonySnapshot> {
    const colony = await this.colonyRepository.findById(colonyId);
    if (!colony) throw new NotFoundError('Colony', colonyId);

    const elapsedMs = this.clock.now() - colony.lastTick.getTime();
    const cappedElapsedMs = Math.min(elapsedMs, MAX_OFFLINE_TICK_HOURS * 3_600_000);

    colony.applyProduction(cappedElapsedMs);
    await this.colonyRepository.save(colony);

    return colony.toSnapshot();
  }
}

// main.ts (composition root)
const colonyRepository = new PostgresColonyRepository(dbPool);
const useCase = new CalculateOfflineProductionUseCase(colonyRepository, new SystemClock());
```

Le `use-case` ne sait jamais qu'il parle à PostgreSQL — on peut le tester avec un `InMemoryColonyRepository` factice, et changer de base de données plus tard sans toucher à la logique métier.

### 2.3 Exemple d'ISP (Interface Segregation) pour les bâtiments

```typescript
// Interfaces fines plutôt qu'une interface IBuilding fourre-tout
export interface IPlaceable {
  readonly footprint: { width: number; height: number };
  canBePlacedAt(position: GridPosition, platform: Platform): boolean;
}

export interface IResourceProducer {
  produce(elapsedMs: number, inputResources: ResourceBundle): ResourceBundle;
}

export interface IDecoratable {
  readonly interiorTemplate: InteriorTemplate;
  getFreeDecorationTiles(): GridPosition[];
}

// Un Drill implémente IPlaceable + IResourceProducer, mais pas IDecoratable
export class DrillBuilding implements IPlaceable, IResourceProducer { /* ... */ }

// Un Habitat implémente les trois
export class HabitatBuilding implements IPlaceable, IResourceProducer, IDecoratable { /* ... */ }
```

### 2.4 Extensibilité OCP pour les définitions de bâtiments

Ajouter un bâtiment ne doit jamais nécessiter de modifier un fichier central avec un `switch`. À la place, un registre :

```typescript
// domain/building-definitions/building-definition.registry.ts
export class BuildingDefinitionRegistry {
  private readonly definitions = new Map<string, BuildingDefinition>();

  register(definition: BuildingDefinition): void {
    this.definitions.set(definition.typeKey, definition);
  }

  getByTypeKey(typeKey: string): BuildingDefinition {
    const definition = this.definitions.get(typeKey);
    if (!definition) throw new NotFoundError('BuildingDefinition', typeKey);
    return definition;
  }
}

// Chaque nouveau bâtiment s'enregistre dans son propre fichier
// domain/building-definitions/foundry.definition.ts
export const foundryDefinition: BuildingDefinition = {
  typeKey: 'foundry',
  footprint: { width: 2, height: 2 },
  tier: 2,
  // ...
};
```

---

## 3. Architecture frontend (Phaser 3 / TypeScript)

### 3.1 Structure de dossiers

```
frontend/
├── src/
│   ├── scenes/
│   │   ├── asteroid-management.scene.ts     # mode gestion (clic direct)
│   │   ├── asteroid-avatar.scene.ts         # mode avatar matérialisé
│   │   ├── building-interior.scene.ts
│   │   ├── lobby.scene.ts
│   │   └── boot.scene.ts
│   │
│   ├── entities/
│   │   ├── player-avatar.entity.ts
│   │   ├── remote-player.entity.ts          # avatars des autres joueurs (lobby/visite)
│   │   └── npc.entity.ts
│   │
│   ├── systems/                              # logique réutilisable indépendante des scènes
│   │   ├── isometric-grid.system.ts          # conversion coords iso <-> écran
│   │   ├── camera-follow.system.ts
│   │   ├── scene-transition.system.ts
│   │   └── building-interaction.system.ts
│   │
│   ├── services/                              # communication avec le backend
│   │   ├── api/
│   │   │   ├── colony-api.service.ts
│   │   │   ├── market-api.service.ts
│   │   │   └── auth-api.service.ts
│   │   └── realtime/
│   │       ├── zone-socket.service.ts         # positions avatars
│   │       └── chat-socket.service.ts
│   │
│   ├── state/                                 # état client (pas de logique métier dupliquée)
│   │   ├── colony-state.store.ts
│   │   └── session-state.store.ts
│   │
│   └── ui/
│       ├── components/
│       │   ├── resource-bar.component.ts
│       │   ├── chat-panel.component.ts
│       │   └── market-overlay.component.ts
│       └── overlays/
│           └── tech-tree-overlay.component.ts
```

### 3.2 Séparation des responsabilités clé côté client

- **`IsometricGridSystem`** : uniquement les conversions de coordonnées (grille ↔ pixels écran). Ne connaît rien du jeu (pas de notion de "bâtiment" ou "ressource").
- **`BuildingInteractionSystem`** : détecte la proximité avatar/bâtiment et déclenche l'action — mais ne connaît pas la logique de production (ça reste côté serveur, le client ne fait qu'afficher l'état reçu).
- Le client **ne simule jamais** la production réelle : il affiche l'état renvoyé par le backend après calcul de tick. Évite toute divergence client/serveur et toute triche.

---

## 4. Schéma de données final (PostgreSQL)

```sql
-- Comptes
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  email_verification_nonce  VARCHAR(64),
  nonce_expires_at  TIMESTAMPTZ,
  flux_balance      BIGINT NOT NULL DEFAULT 0,
  avatar_config     JSONB NOT NULL DEFAULT '{}',
  corporation_id    UUID REFERENCES corporations(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at     TIMESTAMPTZ
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colonie active (une seule par utilisateur, recréée à chaque reset)
CREATE TABLE colonies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nova_reset_count    INT NOT NULL DEFAULT 0,
  base_platform_count INT NOT NULL DEFAULT 1,
  resources           JSONB NOT NULL DEFAULT '{}',
  tech_unlocked       BIT(128) NOT NULL DEFAULT B'0',
  last_tick           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platforms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colony_id     UUID NOT NULL REFERENCES colonies(id) ON DELETE CASCADE,
  platform_type VARCHAR(32) NOT NULL,          -- rocheuse / glacée / métallique
  position_x    INT NOT NULL,
  position_y    INT NOT NULL,
  grid_state    JSONB NOT NULL DEFAULT '{}',
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE buildings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id     UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  type_key        VARCHAR(64) NOT NULL,        -- correspond au BuildingDefinitionRegistry
  position_x      INT NOT NULL,
  position_y      INT NOT NULL,
  functional_state JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE building_interiors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id         UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  deco_blocks         JSONB NOT NULL DEFAULT '[]',   -- tableau 3D compact de block IDs
  likes_count         INT NOT NULL DEFAULT 0
);

-- Archives (snapshot complet à chaque Nova Reset)
CREATE TABLE colony_archives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reset_number  INT NOT NULL,
  snapshot      JSONB NOT NULL,                -- état complet compressé (gzip applicatif avant insert)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marché
CREATE TABLE market_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type VARCHAR(64) NOT NULL,
  quantity      BIGINT NOT NULL,
  price_flux    BIGINT NOT NULL,
  order_type    VARCHAR(4) NOT NULL CHECK (order_type IN ('buy', 'sell')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);

-- Succès
CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_key VARCHAR(64) NOT NULL,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

-- Corporations
CREATE TABLE corporations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(64) UNIQUE NOT NULL,
  level       INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE corporation_objectives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id  UUID NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
  resource_type   VARCHAR(64) NOT NULL,
  target_amount   BIGINT NOT NULL,
  current_amount  BIGINT NOT NULL DEFAULT 0,
  reward_key      VARCHAR(64) NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE corporation_contributions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id  UUID NOT NULL REFERENCES corporation_objectives(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  amount        BIGINT NOT NULL,
  donated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index essentiels
CREATE INDEX idx_market_orders_resource_type ON market_orders(resource_type, order_type);
CREATE INDEX idx_buildings_platform_id ON buildings(platform_id);
CREATE INDEX idx_colony_archives_user_id ON colony_archives(user_id);
```

---

## 5. Temps réel (Socket.io)

### 5.1 Rooms et scoping

| Room | Contenu diffusé | Membres |
|---|---|---|
| `lobby` | Positions avatars + chat lobby | Tout joueur ayant rejoint le lobby |
| `colony:{colonyId}` | Positions avatars visiteurs + chat de zone | Joueur propriétaire (si matérialisé) + visiteurs |
| `corporation:{corporationId}` | Chat de corporation uniquement | Membres de la corporation |

Aucun broadcast global — toute diffusion est scoping à une room précise (cf. `SocketZoneGateway` en infra).

### 5.2 Fréquence et throttling

- Position avatar : throttle serveur à 10 Hz, interpolation linéaire côté client entre deux updates
- Le serveur ne fait tourner la boucle de diffusion d'une room que si elle contient au moins un avatar matérialisé (pas de tick permanent global)

---

## 6. Plan d'implémentation par phases

### Phase A — Fondations (≈2 semaines)
- Structure du projet (domain/application/infrastructure/presentation), composition root
- `RegisterUserUseCase`, `VerifyEmailNonceUseCase`, `LoginUserUseCase`
- `PostgresUserRepository` + migrations
- JWT (RS256) + refresh token, `JwtAuthMiddleware`, `RateLimitMiddleware`
- Tests unitaires des use cases avec repositories en mémoire

### Phase B — Moteur iso & navigation (≈3 semaines)
- `IsometricGridSystem`, `CameraFollowSystem`, `SceneTransitionSystem`
- `AsteroidManagementScene` (mode gestion) + `AsteroidAvatarScene` (mode avatar) + toggle entre les deux
- `PlayerAvatarEntity` contrôlable clavier
- Placement de bâtiments (`PlaceBuildingUseCase` + `BuildingDefinitionRegistry`)
- Sauvegarde/chargement via `IColonyRepository`

### Phase C — Game loop core (≈4 semaines)
- `CalculateOfflineProductionUseCase`, ressources T1/T2
- 12-15 `BuildingDefinition` (Drill, Foundry, Storage, etc.) avec interfaces `IPlaceable`/`IResourceProducer`
- Arbre technologique v1 (~50 nœuds), `UnlockTechNodeUseCase`
- `BuildingInteriorScene` + templates d'intérieur

### Phase D — Profondeur & Nova Reset (≈4 semaines)
- Ressources T3/T4, convoyeurs, réseau électrique
- `ApplyNovaResetUseCase` (archive + régénération colonie agrandie) + `colony_archives`
- Succès (100 premiers), `UnlockAchievementUseCase`

### Phase E — Multi asynchrone & social (≈4 semaines)
- `LobbyScene` + PNJ d'accès (voyage, HDV)
- `SocketZoneGateway`, `SocketChatGateway`, `RemotePlayerEntity`
- `MarketApiService` côté client + `CreateMarketOrderUseCase`/`FulfillMarketOrderUseCase` côté serveur
- Corporations : `DonateToObjectiveUseCase`, `CompleteObjectiveUseCase`, chat de corporation

### Phase F — Blueprint Studio & déco (≈3 semaines)
- Éditeur de blocs dans `BuildingInteriorScene`
- Coût ressources + Flux par bloc, déblocage via tech/succès
- Système de likes sur intérieurs visités

### Phase G — Polish & contenu (continu)
- Sprites définitifs (Aseprite), animations idle
- Équilibrage économique, événements communautaires
- Couverture de tests (objectif : 100% des use cases du domaine, tests d'intégration sur les flows critiques : reset, tick offline, transactions marché)

---

## 7. Risques techniques et mitigations

| Risque | Mitigation |
|---|---|
| Dérive vers du code procédural sous pression de deadline | Revue systématique : tout nouveau fichier dans `application/` doit dépendre d'interfaces, jamais d'implémentations concrètes |
| Couplage rampant entre Phaser et logique métier | Règle stricte : aucune classe dans `systems/` ou `entities/` ne fait d'appel réseau direct — toujours via `services/api` |
| JSONB des colonies qui grossit trop | Limite de taille appliquée en validation avant `save()`, compression gzip appliquée en couche infra avant insertion des archives |
| Charge Socket.io sous-estimée | Limiter dès le départ la fréquence à 10Hz et scoper strictement par room ; mesurer en charge avant d'optimiser davantage |
