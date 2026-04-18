import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

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
    <div className="theme-toggle" aria-label="Тема сайта">
      <button
        type="button"
        onClick={() => handleThemeChange('storm')}
        className={`theme-btn${theme === 'storm' ? ' theme-btn--active' : ''}`}
      >
        <Moon size={13} />
      </button>
      <button
        type="button"
        onClick={() => handleThemeChange('mist')}
        className={`theme-btn${theme === 'mist' ? ' theme-btn--active' : ''}`}
      >
        <Sun size={13} />
      </button>
    </div>
  );
}