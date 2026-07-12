import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSMSBackup } from '../contexts/SMSBackupContext';
import { ThemeToggle } from './ThemeToggle';
import { exportThreads } from '@sms-backup-reader/lib';

export const Header: React.FC = () => {
  const { selectedThread, messages, isSidebarOpen, setIsSidebarOpen, selectThread } = useSMSBackup();
  const { t, i18n } = useTranslation();

  const handleExport = async (format: 'csv' | 'text') => {
    if (!selectedThread) return;
    let url: string | null = null;
    try {
      const data = await exportThreads([selectedThread], format);
      const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedThread.contactName.replace(/\s+/g, '_')}_thread.${format === 'csv' ? 'csv' : 'txt'}`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      if (url) {
        const urlToRevoke = url;
        setTimeout(() => {
          URL.revokeObjectURL(urlToRevoke);
        }, 1000);
      }
    }
  };

  return (
    <header className="h-16 px-3 md:px-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-[#070A11] shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen?.(true)}
            className="md:hidden p-1 mr-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 text-lg font-bold"
            aria-label="Open menu"
            data-testid="sidebar-toggle"
          >
            ☰
          </button>
        )}
        {selectedThread ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => {
                selectThread(null);
                setIsSidebarOpen?.(true);
              }}
              className="md:hidden p-1 mr-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 text-lg font-bold"
              aria-label="Back to threads"
              data-testid="mobile-back-button"
            >
              ←
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-serif font-bold text-stone-800 dark:text-stone-200 truncate">
                {selectedThread.contactName || t('messageThread.unknownSender')}
              </h1>
              <p className="text-[0.6875rem] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                {t('header.messagesCount', { count: messages.length })} • ID: {selectedThread.id}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-sm font-serif font-bold text-stone-800 dark:text-stone-200">{t('sidebar.title')}</h1>
            <p className="text-[0.6875rem] text-stone-500 dark:text-stone-400 mt-0.5">{t('header.selectPrompt')}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {selectedThread && (
          <div className="flex items-center gap-1 md:gap-1.5 mr-1 md:mr-2">
            <button
              onClick={() => handleExport('csv')}
              data-testid="export-csv"
              className="px-1.5 py-1 md:px-2.5 md:py-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-900 rounded text-[10px] md:text-xs text-stone-700 dark:text-stone-300 font-medium transition-colors"
            >
              {t('header.exportCsv')}
            </button>
            <button
              onClick={() => handleExport('text')}
              data-testid="export-text"
              className="px-1.5 py-1 md:px-2.5 md:py-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-900 rounded text-[10px] md:text-xs text-stone-700 dark:text-stone-300 font-medium transition-colors"
            >
              {t('header.exportTxt')}
            </button>
          </div>
        )}

        <select
          value={i18n.language ? i18n.language.split('-')[0] : 'en'}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          data-testid="language-select"
          className="py-1 px-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 mr-2 font-medium"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="hi">हिन्दी</option>
          <option value="te">తెలుగు</option>
        </select>

        <ThemeToggle />
      </div>
    </header>
  );
};
