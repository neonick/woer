import { useEffect, useState } from 'react';

type Theme = 'storm' | 'mist';

const STORAGE_KEY = 'woer-theme';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'mist' ? 'light' : 'dark';
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('storm');

  useEffect(() => {
    const currentTheme =
      document.documentElement.dataset.theme === 'mist' ? 'mist' : 'storm';
    setTheme(currentTheme);
  }, []);

  function handleThemeChange(nextTheme: Theme) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-[color:rgba(var(--line-rgb),0.14)] bg-[color:rgba(var(--panel-rgb),0.82)] p-1"
      aria-label="Тема сайта"
    >
      <button
        type="button"
        onClick={() => handleThemeChange('storm')}
        className={`rounded-[6px] px-3 py-2 text-xs ${
          theme === 'storm'
            ? 'bg-[color:rgba(var(--accent-rgb),0.16)] text-[color:rgb(var(--text-rgb))]'
            : 'text-[color:rgba(var(--muted-rgb),0.92)] hover:text-[color:rgb(var(--text-rgb))]'
        }`}
      >
        Тьма
      </button>
      <button
        type="button"
        onClick={() => handleThemeChange('mist')}
        className={`rounded-[6px] px-3 py-2 text-xs ${
          theme === 'mist'
            ? 'bg-[color:rgba(var(--accent-rgb),0.16)] text-[color:rgb(var(--text-rgb))]'
            : 'text-[color:rgba(var(--muted-rgb),0.92)] hover:text-[color:rgb(var(--text-rgb))]'
        }`}
      >
        Свет
      </button>
    </div>
  );
}
