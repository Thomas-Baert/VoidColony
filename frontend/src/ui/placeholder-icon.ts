// ─── Placeholder d'icône ───────────────────────────────────────────────────
// Tant que les vraies textures ne sont pas prêtes, on affiche un carré coloré
// avec les initiales du nom. La clé `iconKey` est conservée dans le DOM
// (data-icon-key) pour pouvoir basculer vers une vraie texture plus tard
// sans toucher au code appelant.

export function createPlaceholderIconElement(
  iconKey: string,
  label: string,
  colorHex: number
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'placeholder-icon';
  el.dataset.iconKey = iconKey;
  el.style.backgroundColor = `#${colorHex.toString(16).padStart(6, '0')}`;
  el.textContent = getInitials(label);
  return el;
}

function getInitials(label: string): string {
  const words = label.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
