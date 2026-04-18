import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Entry {
  id: string;
  data: {
    title: string;
    order: number;
    emoji?: string;
  };
}

interface Props {
  currentId: string;
  entries: Entry[];
  toHref: (slug: string) => string;
}

export default function MobileSidebar({ currentId, entries, toHref }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[color:rgba(var(--accent-rgb),0.2)] bg-[color:rgba(var(--accent-rgb),0.08)] text-sm font-medium text-[color:rgb(var(--text-rgb))]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        Содержание
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[1000] bg-[color:rgb(var(--bg-rgb))]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[1001] w-[280px] bg-[color:rgba(var(--panel-rgb),0.98)] border-r border-[color:rgba(var(--line-rgb),0.12)] shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="section-kicker">Разделы вики</span>
                <button onClick={() => setIsOpen(false)} className="text-[color:rgba(var(--muted-rgb),0.6)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <nav className="space-y-1">
                {entries.map((entry) => (
                  <a
                    key={entry.id}
                    href={toHref(entry.id)}
                    className={`block rounded-md px-3 py-3 text-sm transition-colors ${
                      entry.id === currentId
                        ? 'bg-[color:rgba(var(--accent-rgb),0.14)] text-[color:rgb(var(--text-rgb))] border border-[color:rgba(var(--accent-rgb),0.2)]'
                        : 'text-[color:rgba(var(--muted-rgb),0.95)] hover:bg-[color:rgba(var(--panel-rgb),0.76)]'
                    }`}
                  >
                    <span className="mr-3 text-[color:rgba(var(--accent-rgb),0.88)] font-mono text-xs">
                      {entry.data.order.toString().padStart(2, '0')}
                    </span>
                    {entry.data.title}
                  </a>
                ))}
              </nav>

              <div className="mt-12 pt-6 border-t border-[color:rgba(var(--line-rgb),0.08)]">
                <p className="text-[10px] text-[color:rgba(var(--muted-rgb),0.4)] uppercase tracking-widest font-bold mb-4">Навигация</p>
                <a href={toHref('')} className="block text-sm text-[color:rgba(var(--muted-rgb),0.8)] hover:text-[color:rgb(var(--text-rgb))]">
                  ← На главную
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
