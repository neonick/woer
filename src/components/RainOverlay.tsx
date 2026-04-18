import { useEffect, useRef } from 'react';

// Алгоритм дождя — адаптация geoffb/canvas-rain-demo (fixed-step physics,
// правильно ориентированный хвост капли, additive blending).
// Splash — канонический паттерн из dev.to/soorajsnblaze333/make-it-rain:
// при ударе о «пол» спавним N мелких частиц с начальным прыжком вверх,
// они падают под гравитацией и затухают по alpha.

const FIXED_STEP = 16; // ms на шаг симуляции, не зависит от refresh rate
const DROP_COUNT = 220;

// 3 слоя глубины: back → медленные и полупрозрачные, front → быстрые и яркие
const LAYERS = [
  { speedMin: 0.18, speedMax: 0.30, lenMin: 6,  lenMax: 12, alphaMin: 0.05, alphaMax: 0.15, width: 0.65 },
  { speedMin: 0.40, speedMax: 0.65, lenMin: 14, lenMax: 22, alphaMin: 0.18, alphaMax: 0.34, width: 0.9  },
  { speedMin: 0.85, speedMax: 1.25, lenMin: 26, lenMax: 42, alphaMin: 0.42, alphaMax: 0.70, width: 1.3  },
];
const LAYER_WEIGHTS = [0.45, 0.35, 0.20];

const WIND_VX = -0.12; // drift per ms, отрицательный = дождь слегка в сторону
const FLOOR_OFFSET = 4; // отступ «пола» от низа canvas

// Splash
const SPLASH_PER_HIT = 4;
const SPLASH_VY_MIN = -0.18; // прыжок вверх
const SPLASH_VY_MAX = -0.06;
const SPLASH_VX_SPREAD = 0.12;
const SPLASH_GRAVITY = 0.0018; // px/ms²
const SPLASH_LIFE_MIN = 280;
const SPLASH_LIFE_MAX = 520;

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  alpha: number;
  width: number;
}

interface Splash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

function pickLayer(): number {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < LAYER_WEIGHTS.length; i++) {
    acc += LAYER_WEIGHTS[i];
    if (r < acc) return i;
  }
  return LAYER_WEIGHTS.length - 1;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function RainOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let w = 0, h = 0;
    const drops: Drop[] = [];
    const splashes: Splash[] = [];
    let raf = 0;
    let lastTime = 0;
    let accumulator = 0;

    function resetDrop(drop: Drop, aboveScreen: boolean) {
      const idx = pickLayer();
      const L = LAYERS[idx];
      const t = Math.random();
      const speed = lerp(L.speedMin, L.speedMax, t);
      drop.vx = WIND_VX;
      drop.vy = speed;
      drop.len = lerp(L.lenMin, L.lenMax, t);
      drop.alpha = lerp(L.alphaMin, L.alphaMax, t);
      drop.width = L.width;
      drop.x = Math.random() * (w + 100) - 50;
      drop.y = aboveScreen
        ? -drop.len - Math.random() * h * 0.5
        : Math.random() * h;
    }

    function initDrops() {
      drops.length = 0;
      for (let i = 0; i < DROP_COUNT; i++) {
        const d: Drop = { x: 0, y: 0, vx: 0, vy: 0, len: 0, alpha: 0, width: 1 };
        resetDrop(d, false);
        drops.push(d);
      }
    }

    function resize() {
      if (!canvas) return;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      initDrops();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function getColor() {
      const theme = document.documentElement.dataset.theme ?? 'storm';
      return theme === 'mist' ? '120,140,160' : '140,210,215';
    }

    function spawnSplash(x: number, y: number) {
      for (let i = 0; i < SPLASH_PER_HIT; i++) {
        const maxLife = lerp(SPLASH_LIFE_MIN, SPLASH_LIFE_MAX, Math.random());
        splashes.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 2 * SPLASH_VX_SPREAD,
          vy: lerp(SPLASH_VY_MIN, SPLASH_VY_MAX, Math.random()),
          life: maxLife,
          maxLife,
        });
      }
    }

    function step(dt: number) {
      const floorY = h - FLOOR_OFFSET;

      for (const d of drops) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.y >= floorY) {
          if (d.alpha > 0.15) spawnSplash(d.x, floorY);
          resetDrop(d, true);
        } else if (d.x < -60 || d.x > w + 60) {
          resetDrop(d, true);
        }
      }

      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += SPLASH_GRAVITY * dt;
        s.life -= dt;
        if (s.life <= 0 || s.y > h) splashes.splice(i, 1);
      }
    }

    function render() {
      ctx.clearRect(0, 0, w, h);
      const color = getColor();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgb(${color})`;
      ctx.lineCap = 'round';

      for (const d of drops) {
        // хвост тянется против вектора скорости (капля «летит головой вниз»)
        const mag = Math.hypot(d.vx, d.vy);
        const nx = d.vx / mag;
        const ny = d.vy / mag;
        const x1 = Math.round(d.x);
        const y1 = Math.round(d.y);
        const x2 = Math.round(d.x - nx * d.len);
        const y2 = Math.round(d.y - ny * d.len);

        ctx.globalAlpha = d.alpha;
        ctx.lineWidth = d.width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.fillStyle = `rgb(${color})`;
      for (const s of splashes) {
        ctx.globalAlpha = (s.life / s.maxLife) * 0.55;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function tick(now: number) {
      const delta = lastTime === 0 ? FIXED_STEP : Math.min(now - lastTime, 100);
      lastTime = now;
      accumulator += delta;
      while (accumulator >= FIXED_STEP) {
        step(FIXED_STEP);
        accumulator -= FIXED_STEP;
      }
      render();
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 1 }}
    />
  );
}
