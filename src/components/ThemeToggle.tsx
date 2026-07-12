import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSMSBackup } from '../contexts/SMSBackupContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useSMSBackup();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleTheme}
      data-testid="theme-toggle"
      aria-label={t('header.toggleTheme')}
      className="p-2 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-stone-800 dark:text-stone-200"
    >
      {theme === 'light' ? <span className="text-xl">🌙</span> : <span className="text-xl">☀️</span>}
    </button>
  );
};
