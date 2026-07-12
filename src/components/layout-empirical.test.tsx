import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SMSBackupProvider } from '../contexts/SMSBackupContext';
import * as SMSContext from '../contexts/SMSBackupContext';
import { MessageThread } from './MessageThread';
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

describe('MMS & i18n Empirical Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lib.getAttachment).mockResolvedValue(new Blob(['test'], { type: 'image/png' }));
  });

  // --- 1. i18n Key Coverage Checks ---
  describe('Missing i18n Translation Keys', () => {
    it('reveals missing vcard translation keys in i18n.ts', async () => {
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
            attachments: [{ id: 'att-vcard', name: 'contact.vcf', contentType: 'text/x-vcard', size: 100 }]
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
        getAttachmentBlob: vi.fn().mockResolvedValue(
          new Blob(['BEGIN:VCARD\nFN:John Doe\nTEL:123456\nEMAIL:john@example.com\nEND:VCARD'], {
            type: 'text/x-vcard'
          })
        ),
        clearData: async () => {}
      });

      render(
        <SMSBackupProvider>
          <MessageThread />
        </SMSBackupProvider>
      );

      // Wait for rendering
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });

      // The header for the contact card is queried with t('messageThread.contactCard')
      // Ensure it does not render the key string "messageThread.contactCard"
      const fallbackContactCardHeader = screen.queryByText(/messageThread\.contactCard/);
      const fallbackVcardNameLabel = screen.queryByText(/messageThread\.vcardName/);
      const fallbackVcardPhoneLabel = screen.queryByText(/messageThread\.vcardPhone/);
      const fallbackVcardEmailLabel = screen.queryByText(/messageThread\.vcardEmail/);

      // Assert that none of the fallback key names are rendered
      expect(fallbackContactCardHeader).toBeNull();
      expect(fallbackVcardNameLabel).toBeNull();
      expect(fallbackVcardPhoneLabel).toBeNull();
      expect(fallbackVcardEmailLabel).toBeNull();

      // Assert that the English translation strings are correctly resolved and rendered
      expect(screen.getByText(/Contact Card/i)).toBeInTheDocument();
      expect(screen.getByText(/Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Phone/i)).toBeInTheDocument();
      expect(screen.getByText(/Email/i)).toBeInTheDocument();

      mockUseSMSBackup.mockRestore();
    });
  });
});
