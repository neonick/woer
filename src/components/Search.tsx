import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { withBasePath } from '../lib/base-path';

export default function Search() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [pagefind, setPagefind] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const initPagefind = async () => {
      try {
        // @ts-ignore
        if (typeof window.pagefind === 'undefined') {
          const pf = await import(/* @vite-ignore */ withBasePath('pagefind/pagefind.js'));
          await pf.options({
            bundlePath: withBasePath('pagefind/')
          });
          setPagefind(pf);
        } else {
          // @ts-ignore
          setPagefind(window.pagefind);
        }
      } catch (e) {
        console.warn('Pagefind not found', e);
      }
    };

    if (isOpen && !pagefind) {
      initPagefind();
    }
  }, [isOpen, pagefind]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isOpen && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (!pagefind || !query) {
        setResults([]);
        return;
      }
      const searchRes = await pagefind.search(query);
      const data = await Promise.all(searchRes.results.slice(0, 8).map((r: any) => r.data()));
      setResults(data);
    };

    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [query, pagefind]);

  const searchModal = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-6 md:pt-32">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-[color:rgba(var(--panel-strong-rgb),0.98)] border border-[color:rgba(var(--line-rgb),0.15)] rounded-2xl shadow-[0_32px_80px_-16px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="p-4 border-b border-[color:rgba(var(--line-rgb),0.1)] flex items-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[color:rgba(var(--accent-rgb),0.9)]">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по вики..."
                className="flex-1 bg-transparent border-none outline-none text-[color:rgb(var(--text-rgb))] placeholder:text-[color:rgba(var(--muted-rgb),0.4)] text-lg"
              />
              <button onClick={() => setIsOpen(false)} className="text-[color:rgba(var(--muted-rgb),0.6)] hover:text-[color:rgb(var(--text-rgb))] p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {query === '' ? (
                <div className="py-12 text-center text-[color:rgba(var(--muted-rgb),0.5)] text-sm italic">
                  Введите запрос...
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-[color:rgba(var(--muted-rgb),0.5)] text-sm">
                  Ничего не найдено
                </div>
              ) : (
                <div className="grid gap-1 search-results">
                  {results.map((res) => (
                    <a
                      key={res.url}
                      href={res.url}
                      className="flex flex-col gap-1 p-3 rounded-xl hover:bg-[color:rgba(var(--accent-rgb),0.06)] transition-colors group text-left"
                    >
                      <span className="font-semibold text-[color:rgb(var(--text-rgb))] group-hover:text-[color:rgb(var(--accent-rgb))]">
                        {res.meta.title}
                      </span>
                      <div 
                        className="text-sm text-[color:rgba(var(--muted-rgb),0.8)] leading-relaxed line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: res.excerpt }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-[color:rgba(var(--line-rgb),0.08)] bg-[color:rgba(var(--bg-soft-rgb),0.4)] flex justify-between items-center text-[10px] text-[color:rgba(var(--muted-rgb),0.4)] uppercase tracking-widest font-medium">
              <span></span>
              <div className="flex gap-3 text-right">
                <span>Esc - закрыть</span>
                <span>Enter - перейти</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      <style>{`
        .search-results mark {
          background: rgba(var(--accent-rgb), 0.25);
          color: rgb(var(--accent-rgb));
          font-weight: 600;
          border-radius: 2px;
          padding: 0 1px;
        }
      `}</style>
    </AnimatePresence>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 h-9 px-3 rounded-md border border-[color:rgba(var(--line-rgb),0.12)] bg-[color:rgba(var(--panel-rgb),0.5)] text-xs text-[color:rgba(var(--muted-rgb),0.8)] hover:border-[color:rgba(var(--accent-rgb),0.25)] hover:text-[color:rgb(var(--text-rgb))] transition-all group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <span>Поиск...</span>
        <kbd className="ml-2 font-sans opacity-40 text-[10px] border border-current px-1 rounded">/</kbd>
      </button>

      {mounted && createPortal(searchModal, document.body)}
    </>
  );
}
