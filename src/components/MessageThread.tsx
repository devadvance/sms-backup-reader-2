import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSMSBackup } from '../contexts/SMSBackupContext';
import { Message } from '@sms-backup-reader/lib';

interface VCardDetails {
  name?: string;
  phone?: string;
  email?: string;
}

function parseVCard(vcardText: string): VCardDetails {
  const details: VCardDetails = {};
  const fnMatch = vcardText.match(/^FN:(.+)$/m);
  if (fnMatch) {
    details.name = fnMatch[1].trim();
  } else {
    const nMatch = vcardText.match(/^N:(.+)$/m);
    if (nMatch) {
      const parts = nMatch[1].split(';');
      const first = parts[1] ? parts[1].trim() : '';
      const last = parts[0] ? parts[0].trim() : '';
      details.name = `${first} ${last}`.trim();
    }
  }

  const telMatch = vcardText.match(/^TEL(?:;[^:]*)?:(.+)$/m);
  if (telMatch) {
    details.phone = telMatch[1].trim();
  }

  const emailMatch = vcardText.match(/^EMAIL(?:;[^:]*)?:(.+)$/m);
  if (emailMatch) {
    details.email = emailMatch[1].trim();
  }

  return details;
}

const AttachmentRenderer: React.FC<{ id: string; name: string; contentType: string }> = ({ id, name, contentType }) => {
  const { getAttachmentBlob } = useSMSBackup();
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  const isInlineMedia =
    contentType.startsWith('image/') || contentType.startsWith('audio/') || contentType.startsWith('video/');
  const isVCard =
    contentType.startsWith('text/x-vcard') || contentType.startsWith('text/vcard') || name.endsWith('.vcf');
  const isText = contentType.startsWith('text/plain') && !isVCard;
  const isAMR = contentType.includes('amr') || name.endsWith('.amr');

  const shouldFetchOnMount = isInlineMedia || isVCard || isText;

  useEffect(() => {
    if (!shouldFetchOnMount) return;

    let active = true;
    let objectUrl: string | null = null;

    getAttachmentBlob(id)
      .then(async (blob) => {
        if (!blob) {
          throw new Error('Attachment not found');
        }
        if (!active) return;

        if (isInlineMedia) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        } else if (isVCard || isText) {
          const text = await blob.text();
          if (active) {
            setTextContent(text);
          }
        }
      })
      .catch((err) => {
        console.error('Error loading attachment:', err);
        if (active) {
          setError(true);
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, shouldFetchOnMount, isInlineMedia, isVCard, isText, getAttachmentBlob]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const blob = await getAttachmentBlob(id);
      if (blob) {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = name || 'attachment';
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(downloadUrl);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to download attachment:', err);
    }
  };

  if (error) {
    return (
      <div className="text-xs text-red-600 dark:text-red-400 mt-1">{t('messageThread.attachmentError', { name })}</div>
    );
  }

  if (shouldFetchOnMount && !url && textContent === null) {
    return <div className="text-xs italic text-stone-500 mt-1">{t('messageThread.attachmentLoading', { name })}</div>;
  }

  if (contentType.startsWith('image/')) {
    return (
      <div className="flex flex-col gap-1 mt-2">
        <img
          src={url!}
          alt={name}
          className="max-w-xs max-h-48 rounded border border-stone-300 dark:border-stone-700 shadow-sm"
        />
        <button
          onClick={handleDownload}
          className="self-start text-[0.6875rem] text-amber-700 dark:text-amber-400 underline"
        >
          📎 {t('messageThread.attachmentDownload')} ({name})
        </button>
      </div>
    );
  }

  if (contentType.startsWith('audio/')) {
    if (isAMR) {
      return (
        <div className="flex flex-col gap-1 mt-2">
          <div className="text-xs italic text-stone-500">Unsupported audio format ({name})</div>
          <button
            onClick={handleDownload}
            className="self-start text-[0.6875rem] text-amber-700 dark:text-amber-400 underline"
          >
            📎 {t('messageThread.attachmentDownload')}
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1 mt-2">
        <audio controls className="w-full max-w-xs mt-2" src={url!} />
        <button
          onClick={handleDownload}
          className="self-start text-[0.6875rem] text-amber-700 dark:text-amber-400 underline mt-1"
        >
          📎 {t('messageThread.attachmentDownload')} ({name})
        </button>
      </div>
    );
  }

  if (contentType.startsWith('video/')) {
    return (
      <div className="flex flex-col gap-1 mt-2">
        <video
          controls
          className="max-w-xs max-h-48 rounded mt-2 border border-stone-300 dark:border-stone-700 shadow-sm"
          src={url!}
        />
        <button
          onClick={handleDownload}
          className="self-start text-[0.6875rem] text-amber-700 dark:text-amber-400 underline mt-1"
        >
          📎 {t('messageThread.attachmentDownload')} ({name})
        </button>
      </div>
    );
  }

  if (isText) {
    return (
      <div className="flex flex-col gap-1 mt-2">
        <pre className="max-w-xs max-h-32 overflow-auto bg-stone-100 dark:bg-stone-900 p-2 text-xs rounded border border-stone-200 dark:border-stone-800 whitespace-pre-wrap">
          {textContent}
        </pre>
        <button
          onClick={handleDownload}
          className="self-start text-[0.6875rem] text-amber-700 dark:text-amber-400 underline mt-1"
        >
          📎 {t('messageThread.attachmentDownload')} ({name})
        </button>
      </div>
    );
  }

  if (isVCard) {
    const vcardDetails = textContent ? parseVCard(textContent) : {};
    return (
      <div className="flex flex-col gap-1 mt-2">
        <div className="max-w-xs bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded p-3 text-xs space-y-1">
          <div className="font-bold border-b border-stone-200 dark:border-stone-800 pb-1 mb-1 text-stone-700 dark:text-stone-300">
            📇 {t('messageThread.contactCard')}
          </div>
          {vcardDetails.name && (
            <div>
              <span className="text-stone-500 dark:text-stone-400">{t('messageThread.vcardName')}:</span>{' '}
              {vcardDetails.name}
            </div>
          )}
          {vcardDetails.phone && (
            <div>
              <span className="text-stone-500 dark:text-stone-400">{t('messageThread.vcardPhone')}:</span>{' '}
              {vcardDetails.phone}
            </div>
          )}
          {vcardDetails.email && (
            <div>
              <span className="text-stone-500 dark:text-stone-400">{t('messageThread.vcardEmail')}:</span>{' '}
              {vcardDetails.email}
            </div>
          )}
        </div>
        <button
          onClick={handleDownload}
          className="self-start text-[0.6875rem] text-amber-700 dark:text-amber-400 underline mt-1"
        >
          📎 {t('messageThread.attachmentDownload')} ({name})
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 mt-2">
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 underline"
      >
        <span>
          📎 {t('messageThread.attachmentDownload')} ({name || 'attachment'})
        </span>
      </button>
    </div>
  );
};

interface MessageRowProps {
  msg: Message;
}

const MessageRow: React.FC<MessageRowProps> = ({ msg }) => {
  const isSent = msg.direction === 'sent';
  const formattedDate = new Date(msg.date).toLocaleString();
  const { t } = useTranslation();

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} px-6 py-1`} data-testid="message-item">
      <div
        className={`max-w-[70%] rounded-lg px-4 py-3 shadow-sm border ${
          isSent
            ? 'bg-amber-100/60 border-amber-200 text-stone-800 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-stone-100'
            : 'bg-white border-stone-200 text-stone-800 dark:bg-stone-900/60 dark:border-stone-800 dark:text-stone-200'
        }`}
      >
        {!isSent && (
          <div className="text-xs font-serif font-bold text-amber-800 dark:text-amber-400 mb-1">
            {msg.sender || t('messageThread.unknownSender')}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</div>

        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mt-2 space-y-2 border-t border-stone-100 dark:border-stone-800/60 pt-1">
            {msg.attachments.map((att) => (
              <AttachmentRenderer key={att.id} id={att.id} name={att.name} contentType={att.contentType} />
            ))}
          </div>
        )}

        <div className="text-[0.625rem] text-stone-400 dark:text-stone-500 mt-2 text-right">{formattedDate}</div>
      </div>
    </div>
  );
};

export const MessageThread: React.FC = () => {
  const { messages, selectedThread } = useSMSBackup();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!selectedThread) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone-400 dark:text-stone-500">
        <span className="text-4xl mb-3">✉️</span>
        <h3 className="text-lg font-serif font-medium text-stone-700 dark:text-stone-300">
          {t('messageThread.noConversationSelectedTitle')}
        </h3>
        <p className="text-sm text-center max-w-sm mt-1">{t('messageThread.noConversationSelectedDesc')}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone-400 dark:text-stone-500">
        <h3 className="text-lg font-serif font-medium text-stone-700 dark:text-stone-300">
          {t('messageThread.emptyConversationTitle')}
        </h3>
        <p className="text-sm text-center max-w-sm mt-1">{t('messageThread.emptyConversationDesc')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 w-full overflow-y-auto py-4 space-y-2" data-testid="chat-container">
      {messages.map((msg, index) => (
        <MessageRow key={msg.id || index} msg={msg} />
      ))}
    </div>
  );
};
