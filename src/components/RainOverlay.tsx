import { useEffect, useRef } from 'react';

interface Drop {
  x: number;       // fractional 0-1 of width
  y: number;       // current y px
  len: number;     // px
  speed: number;   // px per frame
  opacity: number;
  layer: number;   // 0=back 1=mid 2=front
}

const ANGLE_RAD = 12 * (Math.PI / 180); // 12° diagonal
const DX_RATIO  = Math.tan(ANGLE_RAD);  // horizontal shift per vertical px

function makeDrop(h: number): Drop {
  const layer   = Math.random() < 0.45 ? 0 : Math.random() < 0.65 ? 1 : 2;
  const configs = [
    { lenMin: 8,  lenMax: 15, speedMin: 6,  speedMax: 10, opMin: 0.04, opMax: 0.10 }, // back
    { lenMin: 14, lenMax: 24, speedMin: 11, speedMax: 17, opMin: 0.11, opMax: 0.20 }, // mid
    { lenMin: 22, lenMax: 38, speedMin: 18, speedMax: 28, opMin: 0.22, opMax: 0.42 }, // front
  ];
  const c = configs[layer];
  const len   = c.lenMin + Math.random() * (c.lenMax - c.lenMin);
  const speed = c.speedMin + Math.random() * (c.speedMax - c.speedMin);
  return {
    x:       Math.random(),
    y:      -len - Math.random() * h,     // start above canvas, spread out
    len,
    speed,
    opacity: c.opMin + Math.random() * (c.opMax - c.opMin),
    layer,
  };
}

export default function RainOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let w = 0, h = 0;
    let drops: Drop[] = [];
    let raf = 0;

    function resize() {
      if (!canvas) return;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width  = w;
      canvas.height = h;
      drops = Array.from({ length: 57 }, () => makeDrop(h));
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function getColor() {
      const theme = document.documentElement.dataset.theme ?? 'storm';
      // storm: cyan tint; mist: dark blue-grey
      return theme === 'mist' ? '60,80,100' : '86,188,191';
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);

      const color = getColor();

      for (const d of drops) {
        const x1 = d.x * w;
        const y1 = d.y;
        const x2 = x1 + d.len * DX_RATIO;   // diagonal tip
        const y2 = y1 + d.len;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${color},1)`;
        ctx.globalAlpha = d.opacity;
        ctx.lineWidth   = d.layer === 2 ? 1.1 : d.layer === 1 ? 0.8 : 0.6;
        ctx.lineCap     = 'round';
        ctx.stroke();

        // advance
        d.y += d.speed;
        d.x += d.speed * DX_RATIO / h; // drift right proportional to fall

        // reset when below canvas
        if (d.y > h + d.len) {
          d.y = -d.len;
          d.x = Math.random();
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  );
}