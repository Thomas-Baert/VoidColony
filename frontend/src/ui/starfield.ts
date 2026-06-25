// ─── Starfield background canvas animation ────────────────

interface Star {
  x: number; y: number;
  r: number; alpha: number;
  speed: number;
}

export function initStarfield(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  const COUNT = 200;
  const stars: Star[] = Array.from({ length: COUNT }, () => ({
    x:     Math.random() * W,
    y:     Math.random() * H,
    r:     Math.random() * 1.2 + 0.3,
    alpha: Math.random() * 0.7 + 0.1,
    speed: Math.random() * 0.4 + 0.05,
  }));

  window.addEventListener('resize', () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.alpha += (Math.random() - 0.5) * 0.02;
      s.alpha  = Math.max(0.05, Math.min(0.9, s.alpha));

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${s.alpha.toFixed(2)})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  tick();
}
