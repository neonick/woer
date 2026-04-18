import { useRef } from 'react';
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion';

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export default function MovingBorderButton({ href, children, className = '', duration = 2800 }: Props) {
  const pathRef = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength?.() ?? 0;
    if (length) {
      progress.set((time * (length / duration)) % length);
    }
  });

  const x = useTransform(progress, (v) => pathRef.current?.getPointAtLength(v).x ?? 0);
  const y = useTransform(progress, (v) => pathRef.current?.getPointAtLength(v).y ?? 0);
  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <a
      href={href}
      className={`relative inline-flex h-11 items-center justify-center overflow-hidden rounded-lg px-6 text-sm font-medium text-[color:rgb(var(--text-rgb))] ${className}`}
    >
      {/* moving border layer */}
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          padding: '1px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      >
        <svg className="absolute h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <rect
            ref={pathRef}
            fill="none"
            stroke="none"
            strokeWidth="0"
            className="h-full w-full"
            rx="8"
            ry="8"
          />
        </svg>
        <motion.div
          className="absolute h-12 w-12 opacity-90"
          style={{
            transform,
            background: 'radial-gradient(ellipse at center, rgba(209,150,63,0.9) 0%, rgba(86,188,191,0.5) 40%, transparent 70%)',
          }}
        />
      </div>

      {/* bg fill */}
      <span className="absolute inset-[1px] rounded-[7px] bg-[rgba(var(--panel-strong-rgb),0.9)]" />

      {/* content */}
      <span className="relative z-10">{children}</span>
    </a>
  );
}