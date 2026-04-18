import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

interface EntityData {
  id: string;
  name: string;
  title?: string;
  description: string;
  faction?: string;
}

interface Props {
  characters: EntityData[];
  factions: EntityData[];
}

export default function LoreHydrator({ characters, factions }: Props) {
  const [hovered, setHovered] = useState<{ id: string; type: 'char' | 'faction'; rect: DOMRect } | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-character-link], [data-faction-link]') as HTMLElement;
      if (!target) return;

      const charId = target.getAttribute('data-character-link');
      const factionId = target.getAttribute('data-faction-link');

      if (charId) {
        setHovered({ id: charId, type: 'char', rect: target.getBoundingClientRect() });
      } else if (factionId) {
        setHovered({ id: factionId, type: 'faction', rect: target.getBoundingClientRect() });
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-character-link], [data-faction-link]') as HTMLElement;
      if (target) setHovered(null);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  const activeEntity = hovered 
    ? (hovered.type === 'char' 
        ? characters.find(c => c.id === hovered.id) 
        : factions.find(f => f.id === hovered.id))
    : null;

  return (
    <>
      <AnimatePresence>
        {hovered && activeEntity && (
          <Tooltip 
            entity={activeEntity} 
            rect={hovered.rect} 
            type={hovered.type} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Tooltip({ entity, rect, type }: { entity: EntityData, rect: DOMRect, type: 'char' | 'faction' }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: any) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  // Calculate position
  const top = rect.bottom + window.scrollY + 8;
  const left = Math.max(16, Math.min(window.innerWidth - 280, rect.left + window.scrollX));

  const background = useMotionTemplate`radial-gradient(120px circle at ${mouseX}px ${mouseY}px, rgba(var(--accent-rgb), 0.15), transparent 80%)`;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        top,
        left,
        zIndex: 1000,
      }}
      className="w-64"
      onMouseMove={handleMouseMove}
    >
      <div className="relative group overflow-hidden rounded-xl border border-[color:rgba(var(--line-rgb),0.16)] bg-[color:rgba(var(--panel-strong-rgb),0.92)] p-4 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background }}
        />
        
        <div className="relative z-10 pointer-events-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-[0.2em] text-[color:rgba(var(--accent-rgb),0.85)] font-bold">
              {type === 'char' ? 'Персонаж' : 'Фракция'}
            </span>
            {entity.faction && (
              <span className="text-[10px] text-[color:rgba(var(--muted-rgb),0.5)] truncate ml-2">
                {entity.faction}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-[color:rgb(var(--text-rgb))] mb-1">
            {entity.name}
          </h4>
          {entity.title && (
            <p className="text-[11px] text-[color:rgb(var(--accent-strong-rgb))] mb-2 font-medium">
              {entity.title}
            </p>
          )}
          <p className="text-xs text-[color:rgba(var(--muted-rgb),0.92)] leading-relaxed line-clamp-5">
            {entity.description}
          </p>
        </div>

        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
           <div className="absolute top-3 right-3 w-1 h-1 rounded-full bg-[color:rgba(var(--accent-rgb),0.4)] shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]" />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[color:rgba(var(--accent-rgb),0.4)] to-transparent" />
      </div>
    </motion.div>,
    document.body
  );
}
