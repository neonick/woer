import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function SpotlightCard({ href, children, className = '' }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  function onMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <a
      ref={ref}
      href={href}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`group relative overflow-hidden rounded-xl border border-[color:rgba(var(--line-rgb),0.12)] bg-[rgba(var(--panel-rgb),0.82)] transition-transform duration-300 hover:-translate-y-1 ${className}`}
    >
      {/* spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${pos.x}px ${pos.y}px, rgba(86,188,191,0.12), rgba(209,150,63,0.06) 40%, transparent 70%)`,
          transition: 'opacity 200ms',
        }}
      />
      {/* border glow follows spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(300px circle at ${pos.x}px ${pos.y}px, rgba(86,188,191,0.18), transparent 60%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1px',
        }}
      />
      {children}
    </a>
  );
}