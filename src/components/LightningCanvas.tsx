import { useEffect, useRef } from 'react';

// ── geometry ──────────────────────────────────────────────────────────────────
// Tree-correct algorithm: forks always start from midpoints on existing path,
// using angle-based direction so every branch visibly connects to the trunk.

interface Seg { x1: number; y1: number; x2: number; y2: number; depth: number }

function buildBolt(
  x1: number, y1: number,
  x2: number, y2: number,
  depth = 0, max = 7,
  out: Seg[] = [],
): Seg[] {
  if (depth >= max) {
    out.push({ x1, y1, x2, y2, depth });
    return out;
  }

  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 3) { out.push({ x1, y1, x2, y2, depth }); return out; }

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // perpendicular displacement — jagged but shrinks with depth
  const nx = -(y2 - y1) / len;
  const ny =  (x2 - x1) / len;
  const disp = (Math.random() - 0.5) * len * Math.max(0.1, 0.55 - depth * 0.055);
  const px = mx + nx * disp;
  const py = my + ny * disp;

  buildBolt(x1, y1, px, py, depth + 1, max, out);
  buildBolt(px, py, x2, y2, depth + 1, max, out);

  // fork — angle-based from the midpoint on the path
  if (depth < 5 && Math.random() < 0.38) {
    const parentAngle = Math.atan2(y2 - y1, x2 - x1);
    const side = Math.random() < 0.5 ? 1 : -1;
    const dev = (Math.PI / 6 + Math.random() * Math.PI / 4) * side; // 30°–75°
    const forkAngle = parentAngle + dev;
    const forkLen = len * (0.6 + Math.random() * 0.7);
    const fx = px + Math.cos(forkAngle) * forkLen;
    const fy = py + Math.sin(forkAngle) * forkLen;
    buildBolt(px, py, fx, fy, depth + 2, max, out);
  }

  return out;
}

// ── batch render (50× fewer canvas calls than per-segment) ───────────────────

function drawStrike(
  ctx: CanvasRenderingContext2D,
  segs: Seg[],
  coreColor: string,
  glowColor: string,
  alpha: number,
) {
  if (segs.length === 0) return;
  const maxD = Math.max(...segs.map(s => s.depth));

  // group by depth so we draw one path per depth level
  const byDepth = new Map<number, Seg[]>();
  for (const s of segs) {
    let arr = byDepth.get(s.depth);
    if (!arr) { arr = []; byDepth.set(s.depth, arr); }
    arr.push(s);
  }

  // glow pass (one path per depth)
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = `rgba(${glowColor},${alpha * 0.8})`;
  for (const [d, group] of byDepth) {
    const dr = d / maxD;
    ctx.globalAlpha = alpha * (1 - dr * 0.55) * 0.5;
    ctx.lineWidth = Math.max(0.5, (1 - dr * 0.6) * 5.5);
    ctx.strokeStyle = `rgba(${glowColor},1)`;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const s of group) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
    ctx.stroke();
  }
  ctx.restore();

  // core pass
  for (const [d, group] of byDepth) {
    const dr = d / maxD;
    ctx.globalAlpha = alpha * (1 - dr * 0.45);
    ctx.lineWidth = Math.max(0.3, (1 - dr * 0.7) * 2.5);
    ctx.strokeStyle = `rgba(${coreColor},1)`;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const s of group) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── palettes ─────────────────────────────────────────────────────────────────

const PALETTES = [
  { core: '200,225,255', glow: '80,150,255' },   // electric blue
  { core: '225,190,255', glow: '160,80,255' },   // violet
  { core: '180,255,245', glow: '56,188,191' },   // cyan (accent)
  { core: '255,245,180', glow: '209,150,63' },   // amber (accent-strong)
  { core: '255,255,255', glow: '180,210,255' },  // pure white
];

// ── multi-flash strike ───────────────────────────────────────────────────────

interface Strike {
  segs: Seg[];
  core: string;
  glow: string;
  flashes: number[];   // absolute timestamps of each flash
  done: boolean;
}

const FLASH_MS = 130;

function makeFlashes(now: number): number[] {
  const n = 2 + Math.floor(Math.random() * 3);
  const ts = [now];
  for (let i = 1; i < n; i++) ts.push(ts[i - 1] + 55 + Math.random() * 70);
  return ts;
}

// ── component ────────────────────────────────────────────────────────────────

export default function LightningCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const strikes: Strike[] = [];
    let raf = 0;
    let rafRunning = false;
    let nextTimer: ReturnType<typeof setTimeout> | null = null;

    function spawn(ex?: number, ey?: number) {
      const w = canvas.width, h = canvas.height;
      const sx = w * (0.08 + Math.random() * 0.84);
      const tx = ex ?? w * (0.05 + Math.random() * 0.9);
      const ty = ey ?? h * (0.5 + Math.random() * 0.5);
      const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      strikes.push({
        segs: buildBolt(sx, 0, tx, ty),
        core: p.core, glow: p.glow,
        flashes: makeFlashes(performance.now()),
        done: false,
      });
      if (!rafRunning) { rafRunning = true; raf = requestAnimationFrame(tick); }
    }

    function scheduleNext() {
      // Poisson-ish: mostly short waits, occasional long pauses
      const gap = 700 + Math.random() * Math.random() * 4000;
      nextTimer = setTimeout(() => { spawn(); scheduleNext(); }, gap);
    }

    function tick(now: number) {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      let anyAlive = false;

      for (const s of strikes) {
        if (s.done) continue;

        // find current flash
        let flashStart = s.flashes[0];
        let flashIdx = 0;
        for (let i = 0; i < s.flashes.length; i++) {
          if (now >= s.flashes[i]) { flashStart = s.flashes[i]; flashIdx = i; }
        }
        const age = now - flashStart;
        const isLast = flashIdx === s.flashes.length - 1;

        let alpha: number;
        if (age < FLASH_MS * 0.1) {
          alpha = age / (FLASH_MS * 0.1);             // ramp in
        } else if (age < FLASH_MS * 0.35) {
          alpha = 1;                                   // hold peak
        } else if (age < FLASH_MS) {
          alpha = 1 - (age - FLASH_MS * 0.35) / (FLASH_MS * 0.65); // decay
        } else if (!isLast) {
          // dim ghost between flashes
          const nextFlash = s.flashes[flashIdx + 1];
          const between = now - (flashStart + FLASH_MS);
          const gap = nextFlash - (flashStart + FLASH_MS);
          alpha = 0.06 * Math.max(0, 1 - between / gap);
        } else {
          s.done = true;
          continue;
        }

        if (alpha > 0.005) {
          drawStrike(ctx, s.segs, s.core, s.glow, alpha);
          anyAlive = true;
        }
      }

      // compact done strikes
      for (let i = strikes.length - 1; i >= 0; i--) {
        if (strikes[i].done) strikes.splice(i, 1);
      }

      if (anyAlive) {
        raf = requestAnimationFrame(tick);
      } else {
        rafRunning = false;
        ctx.clearRect(0, 0, w, h);
      }
    }

    // mouse → aim
    const section = canvas.parentElement ?? canvas;
    function onMouseMove(e: Event) {
      // next scheduled spawn will aim here; store loosely
      (canvas as any)._mx = (e as MouseEvent).clientX - canvas.getBoundingClientRect().left;
      (canvas as any)._my = (e as MouseEvent).clientY - canvas.getBoundingClientRect().top;
    }
    function onClick(e: Event) {
      const me = e as MouseEvent;
      const r = canvas.getBoundingClientRect();
      spawn(me.clientX - r.left, me.clientY - r.top);
    }

    // wrap spawn to use current mouse position if available
    const origSpawn = spawn;
    function spawnMaybeAimed() {
      const mx = (canvas as any)._mx;
      const my = (canvas as any)._my;
      if (mx != null) origSpawn(mx, my); else origSpawn();
    }

    section.addEventListener('mousemove', onMouseMove);
    section.addEventListener('click', onClick);

    nextTimer = setTimeout(() => { spawn(); scheduleNext(); }, 500 + Math.random() * 600);

    return () => {
      cancelAnimationFrame(raf);
      if (nextTimer) clearTimeout(nextTimer);
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