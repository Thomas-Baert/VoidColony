# Void Colony

Jeu de base building pseudo-infini, pixel art isométrique, sci-fi. Chaque joueur colonise un astéroïde qu'il développe seul ; le multi est asynchrone (visites, marché, corporations). Voir `void-colony-architecture.md` pour le détail de l'architecture (SOLID, conventions de nommage, schéma de données, plan d'implémentation).

## Stack

| Composant | Techno |
|---|---|
| Frontend | Phaser 3, TypeScript, Vite |
| Backend | Node.js, Express, Socket.io, TypeScript |
| Base de données | PostgreSQL via Prisma |
| Email | Nodemailer (SMTP) — nonce de vérification à l'inscription |

## Structure du dépôt

```
.
├── backend/            # API HTTP + serveur temps réel (Socket.io)
├── frontend/            # Client de jeu (Phaser 3 + Vite)
├── packages/
│   └── shared/         # Logique de jeu partagée front/back (bâtiments, ressources, terrain)
└── void-colony-architecture.md
```

C'est un monorepo géré par les **workspaces npm** (`frontend`, `backend`, `packages/*`) : une seule installation à la racine suffit pour tout le projet.

## Prérequis

- Node.js ≥ 20
- npm ≥ 10 (fourni avec Node 20+)
- PostgreSQL ≥ 14, accessible localement ou à distance

## Installation

```bash
git clone <url-du-dépôt>
cd VoidColony-main
npm install
```

Cette unique commande installe les dépendances de `frontend/`, `backend/` et `packages/shared/`.

## Configuration des variables d'environnement

Deux fichiers `.env` sont nécessaires : un pour le backend, un pour le frontend. Des modèles sont fournis (`*.env.example`) — copiez-les et adaptez les valeurs.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### `backend/.env`

| Variable | Description | Valeur de dev par défaut |
|---|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL (format Prisma) | — à renseigner |
| `PORT` | Port d'écoute du serveur HTTP/Socket.io | `3000` |
| `JWT_SECRET` | Secret de signature des JWT (auth HTTP + Socket.io). **À changer en production** (`openssl rand -hex 32`) | `dev_secret_please_change` |
| `SMTP_HOST` | Hôte du serveur SMTP utilisé pour l'envoi du nonce de vérification email | `ssl0.ovh.net` |
| `SMTP_PORT` | Port SMTP | `465` |
| `SMTP_SECURE` | `true` pour une connexion SMTP en TLS implicite | `true` |
| `SMTP_USER` | Compte d'envoi SMTP | `no-reply@thomasbaert.fr` |
| `SMTP_PASS` | Mot de passe du compte SMTP | — à renseigner |

### `frontend/.env`

| Variable | Description | Valeur de dev par défaut |
|---|---|---|
| `VITE_API_URL` | Base URL de l'API HTTP | `/api` (proxy Vite vers le backend en dev) |
| `VITE_SOCKET_URL` | URL du serveur Socket.io | `/` (proxy Vite vers le backend en dev) |

En développement, le proxy configuré dans `frontend/vite.config.ts` redirige déjà `/api` et `/socket.io` vers `http://localhost:3000` — les valeurs par défaut fonctionnent donc sans modification tant que le backend tourne sur le port 3000. Ces variables ne sont à surcharger explicitement que pour un build de production servi depuis un domaine/port différent du backend.

Il n'y a pas de `.env` à la racine du dépôt : seuls `backend/` et `frontend/` lisent des variables d'environnement.

## Base de données

Une fois `backend/.env` renseigné :

```bash
cd backend
npx prisma migrate dev    # crée le schéma en base (dev)
npx prisma generate       # régénère le client Prisma (fait automatiquement par migrate dev)
```

Pour un environnement de production, préférez `npx prisma migrate deploy`.

## Lancer le projet en développement

Deux process à lancer en parallèle, depuis la racine du dépôt :

```bash
# Terminal 1 — backend (API + WebSocket), avec rechargement à chaud
npm run dev --workspace=backend

# Terminal 2 — frontend (Vite), avec rechargement à chaud
npm run dev --workspace=frontend
```

Le frontend est servi sur `http://localhost:5173`, le backend sur `http://localhost:3000`.

## Build de production

```bash
npm run build --workspace=backend    # compile vers backend/dist
npm run build --workspace=frontend   # build statique vers frontend/dist
```

Démarrage du backend compilé :

```bash
npm run start --workspace=backend
```

Le contenu de `frontend/dist` est à servir comme un site statique (Nginx, etc.), en pointant `VITE_API_URL`/`VITE_SOCKET_URL` vers l'adresse publique du backend si celui-ci n'est pas sur le même domaine.

## Package partagé (`packages/shared`)

Contient toute la logique de jeu commune au frontend et au backend (définitions de bâtiments, de ressources, génération de terrain, erreurs de domaine) — voir `void-colony-architecture.md` section 1–2 pour les principes d'architecture (SOLID/OCP) appliqués. Ce package n'a pas d'étape de build séparée : il est consommé directement en TypeScript source via les `paths` configurés dans les `tsconfig.json` de `backend/` et `frontend/` (et l'alias Vite correspondant).
