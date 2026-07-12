/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  parseSMSBackupFile,
  getAllThreads,
  getMessagesForThread,
  getAttachment,
  clearDB,
  Thread,
  Message,
  parseVCF,
  updateContactNamesWithVCF
} from '@sms-backup-reader/lib';

export interface SMSBackupContextType {
  threads: Thread[];
  selectedThreadId: string | null;
  selectedThread: Thread | null;
  messages: Message[];
  parsingState: 'idle' | 'parsing' | 'completed' | 'error';
  parsingProgress: number;
  theme: 'light' | 'dark';
  searchQuery: string;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  countryCode?: string;
  setCountryCode?: React.Dispatch<React.SetStateAction<string>>;
  selectThread: (threadId: string | null) => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleTheme: () => void;
  parseFile: (file: File, countryCode?: string) => Promise<void>;
  importVCFFile: (file: File, countryCode?: string) => Promise<void>;
  parseMultipleFiles?: (files: File[], overrideCC?: string) => Promise<void>;
  importMultipleVCFFiles?: (files: File[], overrideCC?: string) => Promise<void>;
  getAttachmentBlob: (id: string) => Promise<Blob | undefined>;
  clearData: () => Promise<void>;
}

const SMSBackupContext = createContext<SMSBackupContextType | undefined>(undefined);

export const SMSBackupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [parsingState, setParsingState] = useState<'idle' | 'parsing' | 'completed' | 'error'>('idle');
  const [parsingProgress, setParsingProgress] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [countryCode, setCountryCode] = useState<string>('none');

  // Apply theme class to HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // System preference change listener
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const selectThread = useCallback(async (threadId: string | null) => {
    setSelectedThreadId(threadId);
    if (threadId) {
      try {
        const msgs = await getMessagesForThread(threadId);
        setMessages(msgs);
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setIsSidebarOpen(false);
        }
      } catch (err) {
        console.error('Error fetching messages for thread:', err);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, []);

  const parseFile = useCallback(
    async (file: File, overrideCC?: string) => {
      setParsingState('parsing');
      setParsingProgress(0);
      setThreads([]);
      setSelectedThreadId(null);
      setMessages([]);

      const cc = overrideCC !== undefined ? overrideCC : countryCode;

      try {
        await clearDB();
        await parseSMSBackupFile(
          file,
          { countryCode: cc },
          {
            onProgress: (percent) => {
              setParsingProgress(percent);
            },
            onThreadParsed: () => {
              // Can optionally load threads incrementally, but we'll do it on complete
            },
            onComplete: async () => {
              try {
                const allThreads = await getAllThreads();
                setThreads(allThreads);
                setParsingState('completed');
              } catch (err) {
                console.error('Error fetching threads after completion:', err);
                setParsingState('error');
              }
            },
            onError: (err) => {
              console.error('Parsing error:', err);
              setParsingState('error');
            }
          }
        );
      } catch (err) {
        console.error('Error parsing file:', err);
        setParsingState('error');
      }
    },
    [countryCode]
  );

  const importVCFFile = useCallback(
    async (file: File, overrideCC?: string) => {
      const cc = overrideCC !== undefined ? overrideCC : countryCode;
      try {
        const vcfText = await file.text();
        const contactMap = parseVCF(vcfText, cc);
        await updateContactNamesWithVCF(contactMap, cc);

        const allThreads = await getAllThreads();
        setThreads(allThreads);

        if (selectedThreadId) {
          const msgs = await getMessagesForThread(selectedThreadId);
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Error importing VCF file:', err);
      }
    },
    [selectedThreadId, countryCode]
  );

  const parseMultipleFiles = useCallback(
    async (files: File[], overrideCC?: string) => {
      if (files.length === 0) return;
      setParsingState('parsing');
      setParsingProgress(0);
      setThreads([]);
      setSelectedThreadId(null);
      setMessages([]);

      const cc = overrideCC !== undefined ? overrideCC : countryCode;

      try {
        await clearDB();
        const totalFiles = files.length;
        for (let i = 0; i < totalFiles; i++) {
          const file = files[i];
          await parseSMSBackupFile(
            file,
            { countryCode: cc },
            {
              onProgress: (percent) => {
                const overallPercent = (i * 100 + percent) / totalFiles;
                setParsingProgress(overallPercent);
              },
              onThreadParsed: () => {},
              onComplete: () => {},
              onError: (err) => {
                throw err;
              }
            }
          );
        }
        try {
          const allThreads = await getAllThreads();
          setThreads(allThreads);
          setParsingState('completed');
        } catch (err) {
          console.error('Error fetching threads after multiple parsing completion:', err);
          setParsingState('error');
        }
      } catch (err) {
        console.error('Error parsing multiple files:', err);
        setParsingState('error');
      }
    },
    [countryCode]
  );

  const importMultipleVCFFiles = useCallback(
    async (files: File[], overrideCC?: string) => {
      if (files.length === 0) return;
      const cc = overrideCC !== undefined ? overrideCC : countryCode;
      try {
        let combinedContactMap: Record<string, string> = {};
        for (const file of files) {
          const vcfText = await file.text();
          const contactMap = parseVCF(vcfText, cc);
          combinedContactMap = { ...combinedContactMap, ...contactMap };
        }

        await updateContactNamesWithVCF(combinedContactMap, cc);

        const allThreads = await getAllThreads();
        setThreads(allThreads);

        if (selectedThreadId) {
          const msgs = await getMessagesForThread(selectedThreadId);
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Error importing multiple VCF files:', err);
      }
    },
    [selectedThreadId, countryCode]
  );

  const getAttachmentBlob = useCallback(async (id: string) => {
    return getAttachment(id);
  }, []);

  const clearData = useCallback(async () => {
    try {
      await clearDB();
    } catch (err) {
      console.error('Failed to clear database:', err);
    } finally {
      setThreads([]);
      setSelectedThreadId(null);
      setMessages([]);
      setParsingState('idle');
      setParsingProgress(0);
      setSearchQuery('');
    }
  }, []);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || null;

  return (
    <SMSBackupContext.Provider
      value={{
        threads,
        selectedThreadId,
        selectedThread,
        messages,
        parsingState,
        parsingProgress,
        theme,
        searchQuery,
        isSidebarOpen,
        setIsSidebarOpen,
        countryCode,
        setCountryCode,
        selectThread,
        setSearchQuery,
        toggleTheme,
        parseFile,
        importVCFFile,
        parseMultipleFiles,
        importMultipleVCFFiles,
        getAttachmentBlob,
        clearData
      }}
    >
      {children}
    </SMSBackupContext.Provider>
  );
};

export const useSMSBackup = () => {
  const context = useContext(SMSBackupContext);
  if (!context) {
    throw new Error('useSMSBackup must be used within a SMSBackupProvider');
  }
  return context;
};
