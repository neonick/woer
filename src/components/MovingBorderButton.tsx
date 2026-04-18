import { useRef } from 'react';
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion';

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export default function MovingBorderButton({ href, children, className = '', duration = 2400 }: Props) {
  const pathRef = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength?.() ?? 0;
    if (length) progress.set((time * (length / duration)) % length);
  });

  const x = useTransform(progress, (v) => pathRef.current?.getPointAtLength(v).x ?? 0);
  const y = useTransform(progress, (v) => pathRef.current?.getPointAtLength(v).y ?? 0);
  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <a
      href={href}
      className={`group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-lg px-7 text-sm font-semibold ${className}`}
    >
      {/* gradient fill background */}
      <span
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: 'linear-gradient(135deg, rgba(86,188,191,0.28) 0%, rgba(209,150,63,0.22) 100%)',
        }}
      />

      {/* moving border mask */}
      <div
        className="absolute inset-0 rounded-[inherit] transition-opacity duration-300 group-hover:opacity-100"
        style={{
          padding: '1.5px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      >
        <svg className="absolute h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <rect ref={pathRef} fill="none" stroke="none" className="h-full w-full" rx="8" ry="8" />
        </svg>
        <motion.div
          className="absolute h-16 w-16"
          style={{
            transform,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(209,150,63,0.8) 35%, rgba(86,188,191,0.5) 65%, transparent 80%)',
            filter: 'blur(2px)',
          }}
        />
      </div>

      {/* static border glow */}
      <span
        className="absolute inset-0 rounded-[inherit] opacity-40 group-hover:opacity-70 transition-opacity duration-300"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(209,150,63,0.5), inset 0 0 12px rgba(86,188,191,0.15)',
        }}
      />

      {/* content */}
      <span className="relative z-10 text-[color:rgb(var(--text-rgb))]">{children}</span>
    </a>
  );
}