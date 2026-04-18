import { useEffect, useRef } from 'react';

interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
  depth: number;
}

function generateBolt(
  x1: number, y1: number,
  x2: number, y2: number,
  depth = 0,
  maxDepth = 8,
  segments: Segment[] = [],
): Segment[] {
  if (depth >= maxDepth) {
    segments.push({ x1, y1, x2, y2, depth });
    return segments;
  }

  const len = Math.hypot(x2 - x1, y2 - y1);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // perpendicular displacement, decreases with depth
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const disp = (Math.random() - 0.5) * len * (0.5 - depth * 0.04);

  const midX = mx + nx * disp;
  const midY = my + ny * disp;

  generateBolt(x1, y1, midX, midY, depth + 1, maxDepth, segments);
  generateBolt(midX, midY, x2, y2, depth + 1, maxDepth, segments);

  // random fork branch
  if (depth < 5 && Math.random() < 0.28) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const forkEndX = midX + dx * (0.4 + Math.random() * 0.5) + (Math.random() - 0.5) * len * 0.35;
    const forkEndY = midY + dy * (0.4 + Math.random() * 0.5) + (Math.random() - 0.5) * len * 0.35;
    generateBolt(midX, midY, forkEndX, forkEndY, depth + 3, maxDepth, segments);
  }

  return segments;
}

function drawBolt(ctx: CanvasRenderingContext2D, segments: Segment[], color: string, alpha: number) {
  const maxDepth = Math.max(...segments.map(s => s.depth));

  for (const seg of segments) {
    const depthRatio = seg.depth / maxDepth;
    const opacity = alpha * (1 - depthRatio * 0.65);
    const width = Math.max(0.4, (1 - depthRatio * 0.7) * 2.2);

    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

interface Strike {
  segments: Segment[];
  alpha: number;
  born: number;
  duration: number;
}

export default function LightningCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const strikesRef = useRef<Strike[]>([]);
  const rafRef = useRef<number>(0);
  const nextStrikeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function getColor() {
      const theme = document.documentElement.dataset.theme ?? 'storm';
      return theme === 'mist'
        ? 'rgba(20, 30, 40'    // dark bolt on light bg
        : 'rgba(230, 240, 255'; // bright bolt on dark bg
    }

    function spawnStrike(targetX?: number, targetY?: number) {
      const w = canvas!.width;
      const h = canvas!.height;

      const startX = w * (0.1 + Math.random() * 0.8);
      const startY = 0;
      const endX = targetX ?? w * (0.05 + Math.random() * 0.9);
      const endY = targetY ?? h * (0.6 + Math.random() * 0.4);

      const segs = generateBolt(startX, startY, endX, endY, 0, 8);
      strikesRef.current.push({
        segments: segs,
        alpha: 1,
        born: performance.now(),
        duration: 400 + Math.random() * 300,
      });
    }

    function loop(now: number) {
      const w = canvas!.width;
      const h = canvas!.height;

      ctx.clearRect(0, 0, w, h);

      // schedule next strike
      if (now > nextStrikeRef.current) {
        const mouse = mouseRef.current;
        if (mouse) {
          spawnStrike(mouse.x, mouse.y);
        } else {
          spawnStrike();
        }
        // random interval 1.2s–3.5s
        nextStrikeRef.current = now + 1200 + Math.random() * 2300;
      }

      const color = getColor();
      const alive: Strike[] = [];

      for (const strike of strikesRef.current) {
        const age = now - strike.born;
        const t = age / strike.duration;

        if (t >= 1) continue;

        // flash curve: quick in, slow fade
        let alpha: number;
        if (t < 0.1) {
          alpha = t / 0.1; // ramp in
        } else if (t < 0.3) {
          alpha = 1;        // hold
        } else {
          alpha = 1 - (t - 0.3) / 0.7; // fade out
        }

        // glow pass
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = `${color}, ${alpha * 0.9})`;
        drawBolt(ctx, strike.segments, `${color}, ${alpha * 0.6})`, alpha * 0.6);
        ctx.restore();

        // core pass
        drawBolt(ctx, strike.segments, `${color}, ${alpha})`, alpha);

        alive.push(strike);
      }

      strikesRef.current = alive;
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onMouseLeave() {
      mouseRef.current = null;
    }
    function onClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      spawnStrike(e.clientX - rect.left, e.clientY - rect.top);
    }

    const section = canvas.parentElement ?? canvas;
    section.addEventListener('mousemove', onMouseMove as EventListener);
    section.addEventListener('mouseleave', onMouseLeave);
    section.addEventListener('click', onClick as EventListener);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      section.removeEventListener('mousemove', onMouseMove as EventListener);
      section.removeEventListener('mouseleave', onMouseLeave);
      section.removeEventListener('click', onClick as EventListener);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: 'none', zIndex: 1 }}
    />
  );
}