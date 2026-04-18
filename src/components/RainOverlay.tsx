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

function makeDrop(): Drop {
  const layer   = Math.random() < 0.40 ? 0 : Math.random() < 0.70 ? 1 : 2;
  const configs = [
    { lenMin: 5,  lenMax: 10, speedMin: 2.1, speedMax: 4.2, opMin: 0.03, opMax: 0.08 }, // back
    { lenMin: 14, lenMax: 24, speedMin: 8.4, speedMax: 12.6, opMin: 0.14, opMax: 0.26 }, // mid
    { lenMin: 34, lenMax: 60, speedMin: 18.2, speedMax: 28.0, opMin: 0.44, opMax: 0.70 }, // front
  ];
  const c = configs[layer];
  const len   = c.lenMin + Math.random() * (c.lenMax - c.lenMin);
  const speed = c.speedMin + Math.random() * (c.speedMax - c.speedMin);
  return {
    x:       Math.random(),
    y:      0, // overridden by caller on init; on reset set via tick()
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
      const N = 180;
      drops = Array.from({ length: N }, (_, i) => {
        const d = makeDrop();
        // Stratify y evenly across visible height so no two drops start in sync
        d.y = (i / N) * (h + d.len) - d.len;
        return d;
      });
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
        ctx.lineWidth   = d.layer === 2 ? 1.3 : d.layer === 1 ? 0.9 : 0.65;
        ctx.lineCap     = 'round';
        ctx.stroke();

        // advance
        d.y += d.speed;
        d.x += d.speed * DX_RATIO / h; // drift right proportional to fall

        // reset when below canvas — случайный разброс по y выше экрана,
        // чтобы капли не сбрасывались в одну точку и не шли группами
        if (d.y > h + d.len) {
          d.y = -d.len - Math.random() * h * 1.5;
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
      style={{ zIndex: 1 }}
    />
  );
}