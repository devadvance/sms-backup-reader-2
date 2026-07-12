import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSMSBackup } from '../contexts/SMSBackupContext';
import { ThreadList } from './ThreadList';
import { exportThreads, getSupportedCountryOverrides } from '@sms-backup-reader/lib';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const {
    parseFile,
    importVCFFile,
    parseMultipleFiles,
    importMultipleVCFFiles,
    parsingState,
    parsingProgress,
    searchQuery,
    setSearchQuery,
    clearData,
    threads,
    isSidebarOpen,
    setIsSidebarOpen,
    countryCode,
    setCountryCode
  } = useSMSBackup();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vcfInputRef = useRef<HTMLInputElement>(null);

  const countryOptions = React.useMemo(() => {
    const list = getSupportedCountryOverrides();
    let regionNames: Intl.DisplayNames | null = null;
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      // fallback
    }

    const mapped = list.map((opt) => {
      let countryName = opt.regionCode;
      if (regionNames) {
        try {
          countryName = regionNames.of(opt.regionCode) || opt.regionCode;
        } catch {
          // ignore
        }
      }
      return {
        value: opt.code,
        label: `${countryName} (+${opt.code})`
      };
    });

    const seen = new Set<string>();
    const unique = mapped.filter((item) => {
      if (seen.has(item.label)) return false;
      seen.add(item.label);
      return true;
    });

    return unique.sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const handleExportAll = async (format: 'csv' | 'text') => {
    if (threads.length === 0) return;
    let url: string | null = null;
    try {
      const data = await exportThreads(threads, format);
      const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_threads.${format === 'csv' ? 'csv' : 'txt'}`;
      a.click();
    } catch (err) {
      console.error('Export all failed:', err);
    } finally {
      if (url) {
        const urlToRevoke = url;
        setTimeout(() => {
          URL.revokeObjectURL(urlToRevoke);
        }, 1000);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        parseFile?.(files[0]);
      } else {
        parseMultipleFiles?.(Array.from(files));
      }
    }
  };

  const handleVcfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        importVCFFile?.(files[0]);
      } else {
        importMultipleVCFFiles?.(Array.from(files));
      }
    }
  };

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setIsSidebarOpen?.(false)}
          data-testid="sidebar-backdrop"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-80 flex flex-col border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#070A11] h-full shrink-0 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-800 dark:text-stone-300">{t('sidebar.title')}</h2>
            </div>
            <button
              onClick={() => setIsSidebarOpen?.(false)}
              className="md:hidden text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 p-1"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          {parsingState === 'error' && (
            <div
              data-testid="error-banner"
              className="p-3 bg-red-100 dark:bg-red-950/30 border border-red-400 dark:border-red-900 text-red-700 dark:text-red-400 rounded text-sm font-medium"
            >
              {t('sidebar.errorParsing')}
            </div>
          )}

          {parsingState === 'parsing' ? (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-600 dark:text-stone-400">{t('sidebar.readingXml')}</span>
                <span className="text-amber-800 dark:text-amber-400">{Math.round(parsingProgress)}%</span>
              </div>
              <div
                data-testid="progress-bar"
                className="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden"
              >
                <div
                  className="bg-amber-700 dark:bg-amber-500 h-full transition-all duration-200"
                  style={{ width: `${parsingProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="space-y-1">
                <label
                  htmlFor="country-code-select"
                  className="text-xs font-semibold text-stone-600 dark:text-stone-400"
                >
                  {t('sidebar.countryCodeLabel', 'Country Code Override')}
                </label>
                <select
                  id="country-code-select"
                  value={countryCode}
                  onChange={(e) => setCountryCode?.(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  data-testid="country-code-select"
                >
                  <option value="none">{t('sidebar.noOverride', 'No Override')}</option>
                  {countryOptions.map((opt) => (
                    <option key={`${opt.label}-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xml"
                multiple
                className="hidden"
                data-testid="file-upload-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 bg-amber-800 hover:bg-amber-900 text-stone-100 font-medium rounded text-sm transition-colors shadow-sm"
              >
                {t('sidebar.uploadButton')}
              </button>
              {threads.length > 0 && (
                <>
                  <input
                    type="file"
                    ref={vcfInputRef}
                    onChange={handleVcfChange}
                    accept=".vcf"
                    multiple
                    className="hidden"
                    data-testid="vcf-upload-input"
                  />
                  <button
                    onClick={() => vcfInputRef.current?.click()}
                    className="w-full py-1.5 px-3 border border-amber-800/30 text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded text-xs transition-colors font-medium"
                    data-testid="vcf-upload-button"
                  >
                    {t('sidebar.uploadVcfButton', 'Load Contacts (VCF)...')}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportAll('csv')}
                      data-testid="export-all-csv"
                      className="flex-1 py-1.5 px-2 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 rounded text-xs transition-colors font-medium"
                    >
                      {t('sidebar.exportAllCsv')}
                    </button>
                    <button
                      onClick={() => handleExportAll('text')}
                      data-testid="export-all-txt"
                      className="flex-1 py-1.5 px-2 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 rounded text-xs transition-colors font-medium"
                    >
                      {t('sidebar.exportAllTxt')}
                    </button>
                  </div>
                  <button
                    onClick={clearData}
                    className="w-full py-1.5 px-3 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 rounded text-xs transition-colors"
                  >
                    {t('sidebar.clearButton')}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('sidebar.searchPlaceholder')}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              data-testid="thread-search"
            />
            <span className="absolute left-2.5 top-2.5 text-stone-400 text-xs">🔍</span>
          </div>
        </div>

        <ThreadList />
      </aside>
    </>
  );
};
