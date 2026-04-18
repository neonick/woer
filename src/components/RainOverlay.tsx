import { useEffect, useRef } from 'react';

const DROP_COUNT = 60;

function makeDrops() {
  return Array.from({ length: DROP_COUNT }, (_, i) => ({
    left:     2 + Math.random() * 96,         // % across width
    delay:   -Math.random() * 4,              // s, negative = pre-started
    duration: 0.55 + Math.random() * 0.7,     // s
    opacity:  0.06 + Math.random() * 0.18,
    height:   10 + Math.random() * 18,        // px
    width:    0.6 + Math.random() * 0.7,
    skewX:   -3 + Math.random() * 6,          // slight diagonal
  }));
}

const drops = makeDrops();

export default function RainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {drops.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${d.left}%`,
            top: '-5%',
            width: `${d.width}px`,
            height: `${d.height}px`,
            opacity: d.opacity,
            transform: `skewX(${d.skewX}deg)`,
            background: 'linear-gradient(to bottom, transparent, rgba(var(--accent-rgb), 0.9), transparent)',
            borderRadius: '1px',
            animation: `rain-fall ${d.duration}s ${d.delay}s linear infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes rain-fall {
          0%   { transform: translateY(-5vh) skewX(var(--skew, -2deg)); opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(105vh) skewX(var(--skew, -2deg)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}