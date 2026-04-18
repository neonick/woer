import { useEffect, useRef } from 'react';

// ── bolt geometry ─────────────────────────────────────────────────────────────

interface Seg { x1: number; y1: number; x2: number; y2: number; depth: number }

function buildBolt(x1: number, y1: number, x2: number, y2: number, depth = 0, max = 7, out: Seg[] = []): Seg[] {
  if (depth >= max) { out.push({ x1, y1, x2, y2, depth }); return out; }

  const len = Math.hypot(x2 - x1, y2 - y1);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const nx = -(y2 - y1) / len;
  const ny =  (x2 - x1) / len;
  const d  = (Math.random() - 0.5) * len * Math.max(0.1, 0.45 - depth * 0.04);

  const px = mx + nx * d;
  const py = my + ny * d;

  buildBolt(x1, y1, px, py, depth + 1, max, out);
  buildBolt(px, py, x2, y2, depth + 1, max, out);

  // branch fork
  if (depth < 4 && Math.random() < 0.3) {
    const dx = x2 - x1, dy = y2 - y1;
    const fx = px + dx * (0.35 + Math.random() * 0.45) + (Math.random() - 0.5) * len * 0.3;
    const fy = py + dy * (0.35 + Math.random() * 0.45) + (Math.random() - 0.5) * len * 0.3;
    buildBolt(px, py, fx, fy, depth + 3, max, out);
  }

  return out;
}

// ── color palette ────────────────────────────────────────────────────────────

const PALETTES = [
  { core: '200,220,255', glow: '100,160,255' },  // electric blue
  { core: '220,180,255', glow: '160, 80,255' },  // violet
  { core: '180,255,240', glow: ' 56,188,191' },  // cyan (accent)
  { core: '255,240,180', glow: '209,150, 63' },  // amber (accent-strong)
  { core: '255,255,255', glow: '180,220,255' },  // white-blue
];

// ── single strike: multi-flash sequence ──────────────────────────────────────

interface Strike {
  segs: Seg[];
  palette: typeof PALETTES[0];
  flashes: number[];   // timestamps of each flash
  flashIdx: number;
  flashAlpha: number;
  born: number;
}

function scheduleFlashes(now: number): number[] {
  const count = 2 + Math.floor(Math.random() * 3); // 2–4 flashes
  const times: number[] = [now];
  for (let i = 1; i < count; i++) {
    times.push(times[i - 1] + 60 + Math.random() * 80);
  }
  return times;
}

// ── component ────────────────────────────────────────────────────────────────

export default function LightningCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // resize
    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // state
    const strikes: Strike[] = [];
    let raf = 0;
    let loopRunning = false;
    let nextTimeout: ReturnType<typeof setTimeout> | null = null;

    function spawnAt(ex: number, ey: number) {
      const w = canvas.width;
      const sx = w * (0.05 + Math.random() * 0.9);
      const now = performance.now();
      strikes.push({
        segs: buildBolt(sx, 0, ex, ey),
        palette: PALETTES[Math.floor(Math.random() * PALETTES.length)],
        flashes: scheduleFlashes(now),
        flashIdx: 0,
        flashAlpha: 0,
        born: now,
      });
      if (!loopRunning) startLoop();
    }

    function spawnRandom() {
      const w = canvas.width, h = canvas.height;
      spawnAt(
        w * (0.05 + Math.random() * 0.9),
        h * (0.45 + Math.random() * 0.55),
      );
      scheduleNext();
    }

    function scheduleNext() {
      // Poisson-like: gaps between 0.8s and 5s, skewed toward shorter gaps
      const gap = 800 + Math.random() * Math.random() * 4200;
      nextTimeout = setTimeout(spawnRandom, gap);
    }

    // ── draw loop (only runs while strikes are active) ───────────────────────

    const FLASH_DURATION = 140; // ms each flash lasts

    function startLoop() {
      loopRunning = true;
      raf = requestAnimationFrame(tick);
    }

    function tick(now: number) {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      let any = false;

      for (const s of strikes) {
        // advance flash index
        while (s.flashIdx < s.flashes.length - 1 && now >= s.flashes[s.flashIdx + 1]) {
          s.flashIdx++;
        }
        const flashStart = s.flashes[s.flashIdx];
        const age = now - flashStart;
        const t = Math.min(age / FLASH_DURATION, 1);

        // flicker curve: sharp spike then decay
        let alpha: number;
        if (t < 0.08) alpha = t / 0.08;           // 8ms ramp
        else if (t < 0.25) alpha = 1;              // hold bright
        else alpha = Math.pow(1 - (t - 0.25) / 0.75, 1.6); // decay

        // between flashes — faint ghost
        if (s.flashIdx < s.flashes.length - 1 && age > FLASH_DURATION) {
          const wait = (s.flashes[s.flashIdx + 1] - (flashStart + FLASH_DURATION));
          const between = age - FLASH_DURATION;
          alpha = 0.08 * (1 - between / wait);
        }

        if (alpha <= 0.01 && s.flashIdx >= s.flashes.length - 1 && age > FLASH_DURATION) continue;
        any = true;

        const { core, glow } = s.palette;
        const maxD = Math.max(...s.segs.map(sg => sg.depth));

        // glow pass
        ctx.save();
        ctx.shadowBlur = 22 * alpha;
        ctx.shadowColor = `rgba(${glow},${alpha})`;
        for (const sg of s.segs) {
          const dr = sg.depth / maxD;
          ctx.globalAlpha = alpha * (1 - dr * 0.6) * 0.55;
          ctx.lineWidth = Math.max(0.3, (1 - dr * 0.7) * 3.5);
          ctx.strokeStyle = `rgba(${glow},1)`;
          ctx.beginPath(); ctx.moveTo(sg.x1, sg.y1); ctx.lineTo(sg.x2, sg.y2); ctx.stroke();
        }
        ctx.restore();

        // core pass
        for (const sg of s.segs) {
          const dr = sg.depth / maxD;
          ctx.globalAlpha = alpha * (1 - dr * 0.5);
          ctx.lineWidth = Math.max(0.2, (1 - dr * 0.75) * 1.8);
          ctx.strokeStyle = `rgba(${core},1)`;
          ctx.beginPath(); ctx.moveTo(sg.x1, sg.y1); ctx.lineTo(sg.x2, sg.y2); ctx.stroke();
        }
      }

      // remove dead strikes
      for (let i = strikes.length - 1; i >= 0; i--) {
        const s = strikes[i];
        const age = performance.now() - s.flashes[s.flashes.length - 1];
        if (age > FLASH_DURATION) strikes.splice(i, 1);
      }

      ctx.globalAlpha = 1;

      if (any) {
        raf = requestAnimationFrame(tick);
      } else {
        loopRunning = false;
        ctx.clearRect(0, 0, w, h);
      }
    }

    // mouse tracking for aim
    const mouseRef = { x: -1, y: -1 };
    const section = canvas.parentElement ?? canvas;

    function onMouseMove(e: Event) {
      const me = e as MouseEvent;
      const rect = canvas.getBoundingClientRect();
      mouseRef.x = me.clientX - rect.left;
      mouseRef.y = me.clientY - rect.top;
    }
    function onClick(e: Event) {
      const me = e as MouseEvent;
      const rect = canvas.getBoundingClientRect();
      spawnAt(me.clientX - rect.left, me.clientY - rect.top);
    }

    section.addEventListener('mousemove', onMouseMove);
    section.addEventListener('click', onClick);

    // first strike delayed slightly, then random schedule
    nextTimeout = setTimeout(() => { spawnRandom(); }, 600 + Math.random() * 800);

    return () => {
      cancelAnimationFrame(raf);
      if (nextTimeout) clearTimeout(nextTimeout);
      ro.disconnect();
      section.removeEventListener('mousemove', onMouseMove);
      section.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: 'none', zIndex: 0 }}
    />
  );
}