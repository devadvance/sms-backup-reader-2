import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSMSBackup } from '../contexts/SMSBackupContext';
import { Thread } from '@sms-backup-reader/lib';

interface ThreadRowProps {
  thread: Thread;
}

const ThreadRow: React.FC<ThreadRowProps> = ({ thread }) => {
  const { selectedThreadId, selectThread } = useSMSBackup();
  const { t } = useTranslation();
  const isSelected = thread.id === selectedThreadId;

  return (
    <button
      onClick={() => selectThread(thread.id)}
      data-testid="thread-item"
      className={`w-full text-left px-4 py-3 border-b border-stone-200 dark:border-stone-800 transition-colors h-[4.0625rem] flex flex-col justify-center ${
        isSelected
          ? 'bg-amber-100/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 font-medium border-l-4 border-l-amber-800 dark:border-l-amber-600 pl-3'
          : 'hover:bg-stone-100 dark:hover:bg-stone-900/40 text-stone-700 dark:text-stone-300'
      }`}
    >
      <div className="font-semibold truncate text-sm">{thread.contactName || t('messageThread.unknownSender')}</div>
      <div className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">ID: {thread.id}</div>
    </button>
  );
};

export const ThreadList: React.FC = () => {
  const { threads, searchQuery } = useSMSBackup();
  const { t } = useTranslation();

  const filteredThreads = threads.filter(
    (t) => (t.contactName || '').toLowerCase().includes(searchQuery.toLowerCase()) || t.id.includes(searchQuery)
  );

  return (
    <div className="flex-1 w-full overflow-y-auto" data-testid="thread-list-container">
      {filteredThreads.length === 0 ? (
        <div className="p-6 text-center text-sm text-stone-500 dark:text-stone-400 italic">
          {t('threadList.noConversationsFound')}
        </div>
      ) : (
        filteredThreads.map((thread) => <ThreadRow key={thread.id} thread={thread} />)
      )}
    </div>
  );
};
