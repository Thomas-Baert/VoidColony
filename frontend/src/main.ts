// ─── Void Colony — Frontend Entry Point ──────────────────
import './styles/index.css';

import Phaser from 'phaser';
import { initStarfield } from './ui/starfield';
import { showToast }     from './ui/toast';
import { apiLogin, apiRegister, apiVerifyEmail } from './network/api';
import { connectSocket, disconnectSocket }       from './network/socket';
import { GameScene } from './scenes/GameScene';
import { LobbyScene } from './scenes/LobbyScene';
import { ChatPanel } from './ui/chat-panel';
import { TravelPanel } from './ui/travel-panel';
import { MarketPanel, MarketOrderView } from './ui/market-panel';

// ─── State ───────────────────────────────────────────────
let token: string | null        = localStorage.getItem('vc_token');
let userEmail: string | null    = localStorage.getItem('vc_email');
let userId: string | null       = localStorage.getItem('vc_userid');
let pendingEmail: string | null = null;  // set after register, before verify
let phaserGame: Phaser.Game | null = null;
let gameScene: GameScene | null    = null;
let lobbyScene: LobbyScene | null  = null;

/** Room de présence/chat actuelle. null = colonie personnelle (pas de présence pour l'instant). */
let currentRoom: 'lobby' | string | null = null;

const chatPanel = new ChatPanel();
const travelPanel = new TravelPanel();
const marketPanel = new MarketPanel();

// ─── DOM references ───────────────────────────────────────
const $loading   = document.getElementById('loading-screen')!;
const $authScreen = document.getElementById('auth-screen')!;
const $gameScreen = document.getElementById('game-screen')!;

const $formLogin    = document.getElementById('form-login')!;
const $formRegister = document.getElementById('form-register')!;
const $formVerify   = document.getElementById('form-verify')!;

const $loginMsg   = document.getElementById('login-message')!;
const $registerMsg = document.getElementById('register-message')!;
const $verifyMsg  = document.getElementById('verify-message')!;

const $hudLeeks  = document.getElementById('hud-leeks')!;
const $hudPlayer = document.getElementById('hud-player-email')!;
const $btnLogout = document.getElementById('btn-logout')!;
const $btnToggleLobby = document.getElementById('btn-toggle-lobby')!;

// ─── UI helpers ───────────────────────────────────────────
function setMessage(el: HTMLElement, text: string, type: 'success' | 'error') {
  el.textContent = text;
  el.className = `auth-message ${type}`;
}

function clearMessage(el: HTMLElement) {
  el.textContent = '';
  el.className   = 'auth-message';
}

// Called from HTML (global scope needed)
(window as any).switchTab = (tab: 'login' | 'register') => {
  document.getElementById('tab-login')!.classList.toggle('active', tab === 'login');
  document.getElementById('tab-register')!.classList.toggle('active', tab === 'register');
  $formLogin.classList.toggle('hidden', tab !== 'login');
  $formRegister.classList.toggle('hidden', tab !== 'register');
  $formVerify.classList.add('hidden');
};

// ─── Présence / chat scoping par room ──────────────────────
function joinRoom(room: 'lobby' | string) {
  const socket = connectSocket(token!);
  currentRoom = room;
  chatPanel.clear();
  chatPanel.show();
  socket.emit('zone:join', { room });
}

function sendChatMessage(message: string) {
  if (!currentRoom) return;
  const socket = connectSocket(token!);
  socket.emit('chat:send', { room: currentRoom, message });
}

// ─── Voyage (visite d'îles) ─────────────────────────────────
function openTravelPanel() {
  const socket = connectSocket(token!);
  socket.emit('presence:list-online');
  travelPanel.show();
}

function visitColony(targetUserId: string) {
  if (!phaserGame || !gameScene) return;
  joinRoom(`colony:${targetUserId}`);
  phaserGame.scene.stop('LobbyScene');
  phaserGame.scene.start('GameScene', { ownerId: targetUserId, isOwner: false });
  const socket = connectSocket(token!);
  socket.emit('colony:request-state', { ownerId: targetUserId });
}

function returnToOwnColony() {
  if (!phaserGame || !gameScene) return;
  chatPanel.hide();
  currentRoom = null;
  phaserGame.scene.stop('LobbyScene');
  phaserGame.scene.start('GameScene', { ownerId: userId, isOwner: true });
  const socket = connectSocket(token!);
  socket.emit('colony:request-state', { ownerId: userId });
}

function goToLobby() {
  if (!phaserGame) return;
  phaserGame.scene.stop('GameScene');
  phaserGame.scene.start('LobbyScene');
  joinRoom('lobby');
}

// ─── Marché galactique (HDV) ────────────────────────────────
function openMarketPanel() {
  marketPanel.setCurrentUserId(userId!);
  const socket = connectSocket(token!);
  socket.emit('market:list-orders');
  marketPanel.show();
}

// ─── Phaser initialisation ───────────────────────────────
function startPhaser() {
  const container = document.getElementById('game-canvas-container')!;

  const scene = new GameScene();
  const lobby = new LobbyScene();
  gameScene = scene;
  lobbyScene = lobby;

  // Wire move → socket emit (déplacement sur la grille, placement de bâtiment)
  scene.setMoveCallback((col, row) => {
    const socket = connectSocket(token!);
    socket.emit('player:move', { col, row });
  });

  // Wire présence multijoueur (visite uniquement pour GameScene, toujours pour le lobby)
  const zoneMoveEmit = (worldX: number, worldY: number, facingLeft: boolean) => {
    const socket = connectSocket(token!);
    socket.emit('zone:move', { x: worldX, y: worldY, direction: facingLeft ? 'W' : 'E' });
  };
  scene.setZoneMoveCallback(zoneMoveEmit);
  lobby.setZoneMoveCallback(zoneMoveEmit);

  lobby.events.on('npc:interact', (npcId: 'travel' | 'market') => {
    if (npcId === 'travel') openTravelPanel();
    else openMarketPanel();
  });

  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#07080c',
    scene: [scene, lobby],
    parent: container,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      mouse: { preventDefaultWheel: false },
    },
    disableContextMenu: true,
  });

  // Démarre explicitement sur sa propre colonie (avec les bonnes données d'init)
  phaserGame.scene.stop('LobbyScene');
  phaserGame.scene.start('GameScene', { ownerId: userId, isOwner: true });

  // Socket connection
  const socket = connectSocket(token!);
  socket.on('leek:update', (balance: string) => {
    $hudLeeks.textContent = balance;
  });

  socket.on('colony:state', (state: { ownerId: string; asteroidRadius: number; tiles: any[]; buildings: any[] }) => {
    scene.applyColonyState(state.tiles, state.buildings);
  });

  socket.on('connect', () => {
    socket.emit('colony:request-state', { ownerId: userId });
  });
  if (socket.connected) {
    socket.emit('colony:request-state', { ownerId: userId });
  }

  scene.events.on('building:place', (data: { tile: any; typeKey: string }) => {
    socket.emit('building:place', {
      col: data.tile.col,
      row: data.tile.row,
      typeKey: data.typeKey
    });
  });

  // ── Présence multijoueur (lobby + visites) ──────────────────────────────
  socket.on('zone:player-joined', (p: { userId: string; email: string }) => {
    activeMultiplayerScene()?.addRemotePlayer(p.userId, p.email, 0, 0);
  });
  socket.on('zone:player-moved', (p: { userId: string; x: number; y: number; direction: string }) => {
    activeMultiplayerScene()?.updateRemotePlayerPosition(p.userId, p.x, p.y, p.direction === 'W');
  });
  socket.on('zone:player-left', (p: { userId: string }) => {
    activeMultiplayerScene()?.removeRemotePlayer(p.userId);
  });

  // ── Chat ─────────────────────────────────────────────────────────────────
  chatPanel.onSend((message) => sendChatMessage(message));
  socket.on('chat:message', (m: { userId: string; email: string; message: string; sentAt: string }) => {
    chatPanel.addMessage(m);
  });

  // ── Voyage ───────────────────────────────────────────────────────────────
  travelPanel.onVisit((targetUserId) => visitColony(targetUserId));
  socket.on('presence:online-list', (players: { userId: string; email: string }[]) => {
    travelPanel.setOnlinePlayers(players);
  });

  // ── Marché (HDV) ─────────────────────────────────────────────────────────
  function refreshMarketOrders() {
    socket.emit('market:list-orders');
  }
  marketPanel.onCreateOrder((resourceType, quantity, priceLeeks) => {
    socket.emit('market:create-order', { resourceType, quantity, priceLeeks });
  });
  marketPanel.onCancelOrder((orderId) => socket.emit('market:cancel-order', { orderId }));
  marketPanel.onFulfillOrder((orderId) => socket.emit('market:fulfill-order', { orderId }));
  socket.on('market:orders', (orders: MarketOrderView[]) => marketPanel.setOrders(orders));
  socket.on('market:should-refresh', () => refreshMarketOrders());
  socket.on('market:order-created', () => showToast('Offre publiée sur le marché', 'info'));
  socket.on('market:order-fulfilled', () => showToast('Achat effectué', 'info'));
  socket.on('market:order-cancelled', () => showToast('Offre annulée', 'info'));

  socket.on('error', (e: { message: string }) => showToast(e.message, 'error'));

  // ── Navigation lobby <-> colonie ─────────────────────────────────────────
  $btnToggleLobby.addEventListener('click', () => {
    if (phaserGame?.scene.isActive('LobbyScene')) {
      returnToOwnColony();
      $btnToggleLobby.textContent = 'Lobby';
    } else {
      goToLobby();
      $btnToggleLobby.textContent = 'Ma colonie';
    }
  });
}

/** Renvoie la scène actuellement responsable de l'affichage des joueurs distants. */
function activeMultiplayerScene(): GameScene | LobbyScene | null {
  if (phaserGame?.scene.isActive('LobbyScene')) return lobbyScene;
  if (phaserGame?.scene.isActive('GameScene') && gameScene && !gameScene.isOwnColony()) return gameScene;
  return null;
}

// ─── Show / Hide screens ──────────────────────────────────
function showGame() {
  $authScreen.classList.add('hidden');
  $gameScreen.classList.remove('hidden');
  $hudPlayer.textContent = userEmail ?? '';

  if (!phaserGame) startPhaser();
}

function showAuth() {
  $gameScreen.classList.add('hidden');
  $authScreen.classList.remove('hidden');
}

// ─── Logout ───────────────────────────────────────────────
$btnLogout.addEventListener('click', () => {
  localStorage.removeItem('vc_token');
  localStorage.removeItem('vc_email');
  localStorage.removeItem('vc_userid');
  token = null; userEmail = null; userId = null;
  disconnectSocket();
  phaserGame?.destroy(true);
  phaserGame = null;
  gameScene  = null;
  lobbyScene = null;
  chatPanel.hide();
  showAuth();
  showToast('Déconnecté', 'info');
});

// ─── Auth forms ───────────────────────────────────────────

// Login
$formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage($loginMsg);
  const email    = (document.getElementById('login-email')    as HTMLInputElement).value;
  const password = (document.getElementById('login-password') as HTMLInputElement).value;
  const btn = document.getElementById('btn-login')!;
  btn.setAttribute('disabled', 'true');
  btn.textContent = 'Connexion…';

  try {
    const res = await apiLogin(email, password);
    token     = res.token;
    userEmail = res.user.email;
    userId    = res.user.id;
    localStorage.setItem('vc_token', token);
    localStorage.setItem('vc_email', userEmail);
    localStorage.setItem('vc_userid', userId);
    $hudLeeks.textContent = res.user.leekBalance;
    showGame();
  } catch (err: any) {
    setMessage($loginMsg, err.message, 'error');
  } finally {
    btn.removeAttribute('disabled');
    btn.textContent = 'Se connecter';
  }
});

// Register
$formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage($registerMsg);
  const email    = (document.getElementById('register-email')    as HTMLInputElement).value;
  const password = (document.getElementById('register-password') as HTMLInputElement).value;
  const btn = document.getElementById('btn-register')!;
  btn.setAttribute('disabled', 'true');
  btn.textContent = 'Création…';

  try {
    await apiRegister(email, password);
    pendingEmail = email;
    setMessage($registerMsg, 'Email envoyé ! Entrez le code reçu.', 'success');
    $formRegister.classList.add('hidden');
    $formVerify.classList.remove('hidden');
  } catch (err: any) {
    setMessage($registerMsg, err.message, 'error');
  } finally {
    btn.removeAttribute('disabled');
    btn.textContent = 'Créer mon compte';
  }
});

// Verify nonce
$formVerify.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage($verifyMsg);
  const nonce = (document.getElementById('verify-nonce') as HTMLInputElement).value;
  const btn   = document.getElementById('btn-verify')!;
  btn.setAttribute('disabled', 'true');
  btn.textContent = 'Vérification…';

  try {
    await apiVerifyEmail(pendingEmail!, nonce);
    setMessage($verifyMsg, 'Email vérifié ! Vous pouvez vous connecter.', 'success');
    setTimeout(() => {
      $formVerify.classList.add('hidden');
      $formRegister.classList.add('hidden');
      (window as any).switchTab('login');
    }, 1500);
  } catch (err: any) {
    setMessage($verifyMsg, err.message, 'error');
  } finally {
    btn.removeAttribute('disabled');
    btn.textContent = 'Vérifier mon email';
  }
});

// ─── Boot sequence ────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Starfield always visible
  initStarfield(document.getElementById('starfield') as HTMLCanvasElement);

  // Simulate brief loading
  setTimeout(() => {
    $loading.style.transition = 'opacity 0.4s ease';
    $loading.style.opacity = '0';
    setTimeout(() => {
      $loading.classList.add('hidden');

      if (token) {
        // Already authenticated, go straight to game
        showGame();
      } else {
        showAuth();
      }
    }, 420);
  }, 1800);
});
