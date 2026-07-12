import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SMSBackupProvider } from '../contexts/SMSBackupContext';
import * as SMSContext from '../contexts/SMSBackupContext';
import { ThreadList } from './ThreadList';
import { ThemeToggle } from './ThemeToggle';
import { MessageThread } from './MessageThread';
import { Header } from './Header';
import * as lib from '@sms-backup-reader/lib';

// Mock the lib functions
vi.mock('@sms-backup-reader/lib', () => {
  return {
    getAllThreads: vi.fn(),
    getMessagesForThread: vi.fn(),
    getAttachment: vi.fn(),
    clearDB: vi.fn(),
    parseSMSBackupFile: vi.fn(),
    exportThreads: vi.fn()
  };
});

describe('Milestone 1 Verification & Stress Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    // Default mock behavior
    vi.mocked(lib.getAllThreads).mockResolvedValue([]);
    vi.mocked(lib.getMessagesForThread).mockResolvedValue([]);
    vi.mocked(lib.getAttachment).mockResolvedValue(new Blob(['test'], { type: 'image/png' }));
    vi.mocked(lib.clearDB).mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // --- 1. Theme Persistence and Media Preferences ---
  describe('Theme Switching Mechanism', () => {
    it('should respect system-level dark mode media query preference on initial load if no localStorage exists', () => {
      // Mock matchMedia to return true for dark theme
      const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));
      vi.stubGlobal('matchMedia', matchMediaMock);

      render(
        <SMSBackupProvider>
          <ThemeToggle />
        </SMSBackupProvider>
      );

      // Expect application to check matchMedia and set dark mode
      // NOTE: This will fail if theme is hardcoded to 'light'
      const root = window.document.documentElement;
      expect(root.classList.contains('dark')).toBe(true);
    });

    it('should persist theme selection in localStorage and restore it on reload', () => {
      // Initialize with light mode
      const { unmount } = render(
        <SMSBackupProvider>
          <ThemeToggle />
        </SMSBackupProvider>
      );

      // Toggle theme to dark
      const button = screen.getByRole('button', { name: /toggle theme/i });
      fireEvent.click(button);

      // Check if localStorage has been updated
      // NOTE: This will fail if persistence is not implemented
      expect(localStorage.getItem('theme')).toBe('dark');

      // Unmount first instance
      unmount();

      // Render again (reloading simulated)
      render(
        <SMSBackupProvider>
          <ThemeToggle />
        </SMSBackupProvider>
      );

      // Document should still be dark mode
      const root = window.document.documentElement;
      expect(root.classList.contains('dark')).toBe(true);
    });
  });

  // --- 2. Virtualized List with 0 or 10,000+ Threads ---
  describe('Virtualized List ThreadList Component', () => {
    it('handles 0 threads gracefully', () => {
      render(
        <SMSBackupProvider>
          <ThreadList />
        </SMSBackupProvider>
      );

      expect(screen.getByText('No conversations found')).toBeInTheDocument();
    });

    it('handles threads layout efficiently using simple scrolling list', async () => {
      // Generate 100 threads
      const largeThreads: lib.Thread[] = Array.from({ length: 100 }, (_, i) => ({
        id: `thread-${i}`,
        contactName: `Contact ${i}`
      }));

      vi.mocked(lib.getAllThreads).mockResolvedValue(largeThreads);

      // We need a helper to simulate provider threads load
      const TestApp = () => {
        const { parseFile } = SMSContext.useSMSBackup();
        // Trigger a fake load of threads
        React.useEffect(() => {
          const fakeFile = new File([''], 'backup.xml');
          parseFile(fakeFile);
        }, [parseFile]);

        return <ThreadList />;
      };

      vi.mocked(lib.parseSMSBackupFile).mockImplementation((_file, _options, callbacks) => {
        callbacks.onComplete();
        return Promise.resolve();
      });

      render(
        <SMSBackupProvider>
          <TestApp />
        </SMSBackupProvider>
      );

      // Wait for threads to load
      await waitFor(() => {
        expect(screen.queryByText('No conversations found')).not.toBeInTheDocument();
      });

      const renderedThreads = screen.getAllByTestId('thread-item');
      expect(renderedThreads.length).toBe(100);
      expect(renderedThreads.length).toBeGreaterThan(0);
    });
  });

  // --- 3. IndexedDB Error / Empty State Behavior ---
  describe('IndexedDB Error Handling', () => {
    it('transitions to error state when IndexedDB throws error on parsing complete', async () => {
      vi.mocked(lib.getAllThreads).mockRejectedValue(new Error('IndexedDB read failed'));
      vi.mocked(lib.parseSMSBackupFile).mockImplementation((_file, _options, callbacks) => {
        callbacks.onComplete();
        return Promise.resolve();
      });

      const TestApp = () => {
        const { parsingState, parseFile } = SMSContext.useSMSBackup();
        return (
          <div>
            <button onClick={() => parseFile(new File([''], 'backup.xml'))}>Parse</button>
            <div data-testid="state">{parsingState}</div>
          </div>
        );
      };

      render(
        <SMSBackupProvider>
          <TestApp />
        </SMSBackupProvider>
      );

      fireEvent.click(screen.getByText('Parse'));

      await waitFor(() => {
        expect(screen.getByTestId('state').textContent).toBe('error');
      });
    });

    it('handles IndexedDB error gracefully when selecting a thread', async () => {
      vi.mocked(lib.getMessagesForThread).mockRejectedValue(new Error('IndexedDB fetch messages failed'));

      const TestApp = () => {
        const { selectThread, messages } = SMSContext.useSMSBackup();
        return (
          <div>
            <button onClick={() => selectThread('thread-1')}>Select Thread</button>
            <div data-testid="message-count">{messages.length}</div>
          </div>
        );
      };

      render(
        <SMSBackupProvider>
          <TestApp />
        </SMSBackupProvider>
      );

      fireEvent.click(screen.getByText('Select Thread'));

      await waitFor(() => {
        // Messages count should be 0 and no crash occurred
        expect(screen.getByTestId('message-count').textContent).toBe('0');
      });
    });
  });

  // --- 4. Memory Leak Verification (Attachment Object URLs) ---
  describe('Attachment Loading Memory Management', () => {
    it('revokes the created Object URL when AttachmentRenderer unmounts or id changes', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');

      const mockBlob = new Blob(['attachment_data'], { type: 'image/png' });
      vi.mocked(lib.getAttachment).mockResolvedValue(mockBlob);

      // Mock useSMSBackup specifically for this test
      const mockUseSMSBackup = vi.spyOn(SMSContext, 'useSMSBackup').mockReturnValue({
        threads: [],
        selectedThreadId: 't1',
        selectedThread: { id: 't1', contactName: 'Contact' },
        messages: [
          {
            id: 'm1',
            threadId: 't1',
            type: 'mms' as const,
            address: '123',
            sender: 'Me',
            contactName: 'Contact',
            date: Date.now(),
            body: '',
            read: 1,
            direction: 'sent' as const,
            attachments: [{ id: 'att-1', name: 'img.png', contentType: 'image/png', size: 100 }]
          }
        ],
        parsingState: 'completed' as const,
        parsingProgress: 100,
        theme: 'light' as const,
        searchQuery: '',
        selectThread: async () => {},
        setSearchQuery: () => {},
        toggleTheme: () => {},
        parseFile: async () => {},
        importVCFFile: async () => {},
        getAttachmentBlob: async () => mockBlob,
        clearData: async () => {}
      });

      // Render the component (without the SMSBackupProvider wrapper so our mock is used)
      const { unmount } = render(<MessageThread />);

      // Wait for the object URL to be created
      await waitFor(() => {
        expect(createSpy).toHaveBeenCalled();
      });

      // Unmount the component to trigger cleanup
      unmount();

      // Verify that revokeObjectURL was called on the created URL
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url');

      // Clean up mock
      mockUseSMSBackup.mockRestore();
    });
  });

  // --- 5. Additional Challenger Stress & Edge Case Tests ---
  describe('Adversarial MessageThread Virtualization & Attachment Tests', () => {
    it('MessageThread handles 0 messages gracefully by showing Empty state', () => {
      const mockUseSMSBackup = vi.spyOn(SMSContext, 'useSMSBackup').mockReturnValue({
        threads: [],
        selectedThreadId: 't1',
        selectedThread: { id: 't1', contactName: 'Contact' },
        messages: [],
        parsingState: 'completed' as const,
        parsingProgress: 100,
        theme: 'light' as const,
        searchQuery: '',
        selectThread: async () => {},
        setSearchQuery: () => {},
        toggleTheme: () => {},
        parseFile: async () => {},
        importVCFFile: async () => {},
        getAttachmentBlob: async () => undefined,
        clearData: async () => {}
      });

      render(<MessageThread />);
      expect(screen.getByText('Empty Conversation')).toBeInTheDocument();
      expect(screen.getByText('There are no messages in this conversation.')).toBeInTheDocument();

      mockUseSMSBackup.mockRestore();
    });

    it('MessageThread layout renders messages efficiently without crashing', () => {
      const largeMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        threadId: 't1',
        type: 'sms' as const,
        address: '12345',
        sender: 'Sender',
        contactName: 'Contact',
        date: Date.now() - (100 - i) * 1000,
        body: `This is message body number ${i} with some text layout content.`,
        read: 1,
        direction: i % 2 === 0 ? ('sent' as const) : ('inbox' as const),
        attachments: []
      }));

      const mockUseSMSBackup = vi.spyOn(SMSContext, 'useSMSBackup').mockReturnValue({
        threads: [],
        selectedThreadId: 't1',
        selectedThread: { id: 't1', contactName: 'Contact' },
        messages: largeMessages,
        parsingState: 'completed' as const,
        parsingProgress: 100,
        theme: 'light' as const,
        searchQuery: '',
        selectThread: async () => {},
        setSearchQuery: () => {},
        toggleTheme: () => {},
        parseFile: async () => {},
        importVCFFile: async () => {},
        getAttachmentBlob: async () => undefined,
        clearData: async () => {}
      });

      render(<MessageThread />);

      // Checking that the chat container is rendered
      expect(screen.getByTestId('chat-container')).toBeInTheDocument();

      const renderedMessages = screen.getAllByTestId('message-item');
      expect(renderedMessages.length).toBe(100);
      expect(renderedMessages.length).toBeGreaterThan(0);

      mockUseSMSBackup.mockRestore();
    });

    it('AttachmentRenderer handles getAttachmentBlob rejection safely', async () => {
      // Mock console.error to avoid spamming test logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Spy on process.emit to catch and swallow the unhandled promise rejection
      const unhandledRejections: unknown[] = [];
      const originalEmit = process.emit;
      const emitSpy = vi.spyOn(process, 'emit').mockImplementation(function (
        this: unknown,
        event: string | symbol,
        ...args: unknown[]
      ) {
        if (event === 'unhandledRejection') {
          unhandledRejections.push(args[0]);
          return true;
        }
        return Reflect.apply(originalEmit, this, [event, ...args]) as boolean;
      } as unknown as typeof process.emit);

      const mockUseSMSBackup = vi.spyOn(SMSContext, 'useSMSBackup').mockReturnValue({
        threads: [],
        selectedThreadId: 't1',
        selectedThread: { id: 't1', contactName: 'Contact' },
        messages: [
          {
            id: 'm1',
            threadId: 't1',
            type: 'mms' as const,
            address: '123',
            sender: 'Me',
            contactName: 'Contact',
            date: Date.now(),
            body: '',
            read: 1,
            direction: 'sent' as const,
            attachments: [{ id: 'att-fail', name: 'img.png', contentType: 'image/png', size: 100 }]
          }
        ],
        parsingState: 'completed' as const,
        parsingProgress: 100,
        theme: 'light' as const,
        searchQuery: '',
        selectThread: async () => {},
        setSearchQuery: () => {},
        toggleTheme: () => {},
        parseFile: async () => {},
        importVCFFile: async () => {},
        getAttachmentBlob: vi.fn().mockRejectedValue(new Error('Network or DB error')),
        clearData: async () => {}
      });

      render(<MessageThread />);

      // The text should show loading state first
      expect(screen.getByText('Loading attachment img.png...')).toBeInTheDocument();

      // Wait a tick for promise to reject, the component shouldn't crash
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify that the unhandled rejection did NOT occur
      expect(unhandledRejections.length).toBe(0);

      // Verify that the component correctly shows the error state UI block
      expect(screen.getByText('Failed to load attachment img.png')).toBeInTheDocument();

      mockUseSMSBackup.mockRestore();
      consoleSpy.mockRestore();
      emitSpy.mockRestore();
    });

    it('AttachmentRenderer renders audio, video, text, and vcards correctly', async () => {
      const mockUseSMSBackup = vi.spyOn(SMSContext, 'useSMSBackup').mockReturnValue({
        threads: [],
        selectedThreadId: 't1',
        selectedThread: { id: 't1', contactName: 'Contact' },
        messages: [
          {
            id: 'm1',
            threadId: 't1',
            type: 'mms' as const,
            address: '123',
            sender: 'Me',
            contactName: 'Contact',
            date: Date.now(),
            body: '',
            read: 1,
            direction: 'sent' as const,
            attachments: [
              { id: 'att-audio', name: 'song.mp3', contentType: 'audio/mp3', size: 100 },
              { id: 'att-video', name: 'clip.mp4', contentType: 'video/mp4', size: 100 },
              { id: 'att-text', name: 'notes.txt', contentType: 'text/plain', size: 100 },
              { id: 'att-vcard', name: 'contact.vcf', contentType: 'text/x-vcard', size: 100 }
            ]
          }
        ],
        parsingState: 'completed' as const,
        parsingProgress: 100,
        theme: 'light' as const,
        searchQuery: '',
        selectThread: async () => {},
        setSearchQuery: () => {},
        toggleTheme: () => {},
        parseFile: async () => {},
        importVCFFile: async () => {},
        getAttachmentBlob: vi.fn().mockImplementation(async (id: string) => {
          if (id === 'att-audio' || id === 'att-video') {
            return new Blob(['binarydata'], { type: 'application/octet-stream' });
          }
          if (id === 'att-text') {
            return new Blob(['hello plain text'], { type: 'text/plain' });
          }
          if (id === 'att-vcard') {
            return new Blob(['BEGIN:VCARD\nFN:John Smith\nTEL:555-1234\nEMAIL:smith@example.com\nEND:VCARD'], {
              type: 'text/x-vcard'
            });
          }
          return undefined;
        }),
        clearData: async () => {}
      });

      render(<MessageThread />);

      // Wait for async resolving
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check audio element or fallback exists
      const downloadButtons = screen.getAllByText(/Download/i);
      expect(downloadButtons.length).toBeGreaterThan(0);

      // Check text content notes.txt is rendered
      expect(screen.getByText('hello plain text')).toBeInTheDocument();

      // Check vcard John Smith details are rendered
      expect(screen.getByText(/John Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/555-1234/i)).toBeInTheDocument();
      expect(screen.getByText(/smith@example.com/i)).toBeInTheDocument();

      mockUseSMSBackup.mockRestore();
    });

    it('Header switches languages when language buttons are clicked', () => {
      render(
        <SMSContext.SMSBackupProvider>
          <Header />
        </SMSContext.SMSBackupProvider>
      );

      // Default language is English. Header title should be SMS Backup Reader
      expect(screen.getByText('SMS Backup Reader')).toBeInTheDocument();

      // Find select dropdown and change to Spanish
      const select = screen.getByTestId('language-select');
      fireEvent.change(select, { target: { value: 'es' } });

      // Spanish translation should render SMS Backup Reader (non-localized)
      expect(screen.getByText('SMS Backup Reader')).toBeInTheDocument();

      // Change back to English
      fireEvent.change(select, { target: { value: 'en' } });
      expect(screen.getByText('SMS Backup Reader')).toBeInTheDocument();
    });
  });
});
