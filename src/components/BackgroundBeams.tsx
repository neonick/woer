import { motion } from 'framer-motion';

const beams = [
  { x1: '20%', x2: '50%', delay: 0, duration: 6 },
  { x1: '35%', x2: '50%', delay: 1.2, duration: 5.5 },
  { x1: '50%', x2: '50%', delay: 0.4, duration: 7 },
  { x1: '65%', x2: '50%', delay: 2, duration: 5.8 },
  { x1: '80%', x2: '50%', delay: 0.8, duration: 6.5 },
  { x1: '12%', x2: '48%', delay: 1.6, duration: 8 },
  { x1: '90%', x2: '52%', delay: 2.8, duration: 6.2 },
];

export default function BackgroundBeams() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="beam-a" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(86,188,191,0)" />
            <stop offset="40%" stopColor="rgba(86,188,191,0.7)" />
            <stop offset="70%" stopColor="rgba(209,150,63,0.4)" />
            <stop offset="100%" stopColor="rgba(209,150,63,0)" />
          </linearGradient>
          <linearGradient id="beam-b" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(86,188,191,0)" />
            <stop offset="50%" stopColor="rgba(86,188,191,0.5)" />
            <stop offset="100%" stopColor="rgba(86,188,191,0)" />
          </linearGradient>
        </defs>

        {beams.map((b, i) => (
          <motion.line
            key={i}
            x1={b.x1}
            y1="0"
            x2={b.x2}
            y2="100"
            stroke={i % 2 === 0 ? 'url(#beam-a)' : 'url(#beam-b)'}
            strokeWidth="0.3"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{
              opacity: [0, 0.8, 0.3, 0.9, 0],
              pathLength: [0, 1],
            }}
            transition={{
              opacity: { duration: b.duration, repeat: Infinity, delay: b.delay, ease: 'easeInOut' },
              pathLength: { duration: b.duration * 0.6, repeat: Infinity, delay: b.delay, ease: 'easeIn' },
            }}
          />
        ))}
      </svg>

      {/* horizontal flash — occasional lightning */}
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(209,150,63,0.6) 50%, transparent 100%)',
          top: '30%',
        }}
        animate={{ opacity: [0, 0, 0, 0, 0.7, 0, 0, 0, 0.4, 0], top: ['30%', '32%', '35%', '38%'] }}
        transition={{ duration: 9, repeat: Infinity, delay: 2, ease: 'easeOut' }}
      />

      {/* bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[rgb(var(--bg-rgb))] to-transparent" />
      {/* top fade */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[rgba(var(--hero-wash-rgb),0.12)] to-transparent" />
    </div>
  );
}