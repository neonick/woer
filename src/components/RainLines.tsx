import { motion } from 'framer-motion';

const lines = [
  { left: '6%', duration: 8.4, delay: 0.2, height: '132%' },
  { left: '14%', duration: 7.2, delay: 1.1, height: '118%' },
  { left: '23%', duration: 9.1, delay: 0.7, height: '140%' },
  { left: '34%', duration: 6.8, delay: 0.5, height: '124%' },
  { left: '46%', duration: 8.9, delay: 1.6, height: '136%' },
  { left: '58%', duration: 7.5, delay: 0.9, height: '128%' },
  { left: '69%', duration: 9.5, delay: 0.1, height: '142%' },
  { left: '79%', duration: 6.9, delay: 1.8, height: '120%' },
  { left: '88%', duration: 8.1, delay: 1.2, height: '130%' },
  { left: '95%', duration: 7.7, delay: 0.4, height: '126%' },
];

export default function RainLines() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(var(--hero-wash-rgb),0.18),transparent_42%,rgba(var(--bg-rgb),0.22))]" />
      {lines.map((line, index) => (
        <motion.span
          key={line.left}
          className="absolute top-[-18%] w-px"
          style={{
            left: line.left,
            height: line.height,
            background:
              'linear-gradient(to bottom, transparent, rgba(var(--accent-rgb), 0.02), rgba(var(--accent-rgb), 0.56), rgba(var(--accent-strong-rgb), 0.18), transparent)',
            opacity: 0.24,
          }}
          animate={{
            y: ['-4%', '8%', '-4%'],
            opacity: [0.16, 0.52, 0.16],
          }}
          transition={{
            duration: line.duration,
            delay: line.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      <motion.div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent)',
        }}
        animate={{
          y: ['8%', '70%', '8%'],
          opacity: [0, 0.45, 0],
        }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />
      <div className="absolute inset-y-0 right-0 w-40 bg-[linear-gradient(90deg,transparent,rgba(var(--bg-rgb),0.72))]" />
    </div>
  );
}
