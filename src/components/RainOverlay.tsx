const DROP_COUNT = 55;

const drops = Array.from({ length: DROP_COUNT }, () => ({
  left:     2 + Math.random() * 96,
  delay:   -(Math.random() * 3.5),
  duration: 0.6 + Math.random() * 0.8,
  opacity:  0.07 + Math.random() * 0.2,
  height:   12 + Math.random() * 20,
  width:    0.6 + Math.random() * 0.8,
}));

export default function RainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <style>{`
        @keyframes wdrop {
          0%   { top: -4%; opacity: 0; }
          6%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { top: 102%; opacity: 0; }
        }
      `}</style>
      {drops.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${d.left}%`,
            top: '-4%',
            width: `${d.width}px`,
            height: `${d.height}px`,
            opacity: d.opacity,
            background: 'linear-gradient(to bottom, transparent, rgba(86,188,191,0.9), transparent)',
            borderRadius: '1px',
            animation: `wdrop ${d.duration}s ${d.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}