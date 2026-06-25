// ─── API Communication Layer ──────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; leekBalance: string };
}

export async function apiRegister(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur inscription');
}

export async function apiVerifyEmail(email: string, nonce: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, nonce }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Code invalide');
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur connexion');
  return data as AuthResponse;
}
