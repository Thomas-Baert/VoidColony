// ─── Void Colony — Frontend Entry Point ──────────────────
import './styles/index.css';

import Phaser from 'phaser';
import { initStarfield } from './ui/starfield';
import { showToast }     from './ui/toast';
import { apiLogin, apiRegister, apiVerifyEmail } from './network/api';
import { connectSocket, disconnectSocket }       from './network/socket';
import { GameScene } from './scenes/GameScene';

// ─── State ───────────────────────────────────────────────
let token: string | null        = localStorage.getItem('vc_token');
let userEmail: string | null    = localStorage.getItem('vc_email');
let pendingEmail: string | null = null;  // set after register, before verify
let phaserGame: Phaser.Game | null = null;
let gameScene: GameScene | null    = null;

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

// ─── Phaser initialisation ───────────────────────────────
function startPhaser() {
  const container = document.getElementById('game-canvas-container')!;

  const scene = new GameScene();
  gameScene = scene;

  // Wire move → socket emit
  scene.setMoveCallback((col, row) => {
    const socket = connectSocket(token!);
    socket.emit('player:move', { col, row });
  });

  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#07080c',
    scene: [scene],
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

  // Socket connection
  const socket = connectSocket(token!);
  socket.on('leek:update', (balance: string) => {
    $hudLeeks.textContent = balance;
  });

  socket.on('colony:state', (state: { asteroidRadius: number; tiles: any[]; buildings: any[] }) => {
    scene.applyColonyState(state.tiles, state.buildings);
  });

  socket.on('connect', () => {
    socket.emit('colony:request-state');
  });
  if (socket.connected) {
    socket.emit('colony:request-state');
  }

  scene.events.on('building:place', (data: { tile: any; typeKey: string }) => {
    socket.emit('building:place', {
      col: data.tile.col,
      row: data.tile.row,
      typeKey: data.typeKey
    });
  });
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
  token = null; userEmail = null;
  disconnectSocket();
  phaserGame?.destroy(true);
  phaserGame = null;
  gameScene  = null;
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
    localStorage.setItem('vc_token', token);
    localStorage.setItem('vc_email', userEmail);
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
