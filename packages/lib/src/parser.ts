import {
  parsePhoneNumber,
  getRegionCodeForCountryCode,
  getSupportedCallingCodes,
  getSupportedRegionCodes,
  getCountryCodeForRegionCode
} from 'awesome-phonenumber';
// @ts-expect-error: worker query suffix is not declared in type definitions
import ParserWorker from './parser.worker?worker';

export interface ParserOptions {
  countryCode: string;
  vcfContacts?: Record<string, string>;
}

export interface Thread {
  id: string;
  contactName: string;
}

export interface ParserCallbacks {
  onProgress: (percent: number) => void;
  onThreadParsed: (thread: Thread) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface AttachmentMetadata {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

export interface Message {
  id: string;
  threadId: string;
  type: 'sms' | 'mms';
  address: string;
  sender: string;
  contactName: string;
  date: number;
  body: string;
  read: number;
  direction: 'inbox' | 'sent';
  attachments: AttachmentMetadata[];
  senderAddress?: string;
}

// Memory-based database fallback for Node.js / test environments
interface InMemoryDB {
  threads: Record<string, Thread>;
  messages: Message[];
  attachments: Record<string, Blob>;
  contacts: Record<string, string>;
}

export const memoryDB: InMemoryDB = {
  threads: {},
  messages: [],
  attachments: {},
  contacts: {}
};

let useMemoryDB = typeof indexedDB === 'undefined';

export function clearInMemoryDB() {
  memoryDB.threads = {};
  memoryDB.messages = [];
  memoryDB.attachments = {};
  memoryDB.contacts = {};
}

// Database helper functions
export function openDB(): Promise<IDBDatabase> {
  if (useMemoryDB) {
    return Promise.reject(new Error('IndexedDB is disabled (using Memory DB fallback)'));
  }
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('SMSBackupReaderDB', 2);
      request.onerror = () => {
        useMemoryDB = true;
        reject(request.error || new Error('IndexedDB open error'));
      };
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('threads')) {
          db.createObjectStore('threads', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('threadId', 'threadId', { unique: false });
          messageStore.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('attachments')) {
          db.createObjectStore('attachments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('contacts')) {
          db.createObjectStore('contacts', { keyPath: 'normalizedAddress' });
        }
      };
    } catch (err) {
      useMemoryDB = true;
      reject(err);
    }
  });
}

export async function saveThreads(threads: Thread[]): Promise<void> {
  if (useMemoryDB) {
    for (const t of threads) {
      memoryDB.threads[t.id] = t;
    }
    return;
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('threads', 'readwrite');
      const store = tx.objectStore('threads');
      for (const t of threads) {
        store.put(t);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    useMemoryDB = true;
    for (const t of threads) {
      memoryDB.threads[t.id] = t;
    }
  }
}

export async function saveMessagesAndAttachments(
  messages: Message[],
  attachments: { id: string; blob: Blob }[]
): Promise<void> {
  if (useMemoryDB) {
    memoryDB.messages.push(...messages);
    for (const a of attachments) {
      memoryDB.attachments[a.id] = a.blob;
    }
    return;
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['messages', 'attachments'], 'readwrite');
      const msgStore = tx.objectStore('messages');
      const attStore = tx.objectStore('attachments');
      for (const m of messages) {
        msgStore.put(m);
      }
      for (const a of attachments) {
        attStore.put(a);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    useMemoryDB = true;
    memoryDB.messages.push(...messages);
    for (const a of attachments) {
      memoryDB.attachments[a.id] = a.blob;
    }
  }
}

export async function getMessagesForThread(threadId: string): Promise<Message[]> {
  if (useMemoryDB) {
    return memoryDB.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.date - b.date);
  }
  try {
    const db = await openDB();
    const msgs = await new Promise<Message[]>((resolve, reject) => {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('threadId');
      const request = index.getAll(threadId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return msgs.sort((a, b) => a.date - b.date);
  } catch {
    useMemoryDB = true;
    return memoryDB.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.date - b.date);
  }
}

export async function getAllThreads(): Promise<Thread[]> {
  if (useMemoryDB) {
    return Object.values(memoryDB.threads);
  }
  try {
    const db = await openDB();
    const threads = await new Promise<Thread[]>((resolve, reject) => {
      const tx = db.transaction('threads', 'readonly');
      const store = tx.objectStore('threads');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return threads;
  } catch {
    useMemoryDB = true;
    return Object.values(memoryDB.threads);
  }
}

export async function getAttachment(id: string): Promise<Blob | undefined> {
  if (useMemoryDB) {
    return memoryDB.attachments[id];
  }
  try {
    const db = await openDB();
    const res = await new Promise<{ id: string; blob: Blob } | undefined>((resolve, reject) => {
      const tx = db.transaction('attachments', 'readonly');
      const store = tx.objectStore('attachments');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return res?.blob;
  } catch {
    useMemoryDB = true;
    return memoryDB.attachments[id];
  }
}

export async function clearDB(): Promise<void> {
  if (useMemoryDB) {
    clearInMemoryDB();
    return;
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['threads', 'messages', 'attachments', 'contacts'], 'readwrite');
      tx.objectStore('threads').clear();
      tx.objectStore('messages').clear();
      tx.objectStore('attachments').clear();
      tx.objectStore('contacts').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    useMemoryDB = true;
    clearInMemoryDB();
  }
}

// Helper functions for parsing and normalization
function originalNormalizePhoneNumber(address: string, defaultCountryCode: string = '1'): string {
  if (defaultCountryCode.toLowerCase() === 'none') {
    return address.trim().replace(/\D/g, '');
  }
  const KNOWN_COUNTRY_CODES = getSupportedCallingCodes().map(String);

  function isAlreadyInternational(digs: string, defCC: string): boolean {
    const sortedCCs = [...KNOWN_COUNTRY_CODES].sort((a, b) => b.length - a.length);
    for (const kcc of sortedCCs) {
      if (kcc === defCC) continue;
      if (digs.startsWith(kcc)) {
        const restLen = digs.length - kcc.length;
        if (kcc === '1' || kcc === '7') {
          if (restLen === 10) return true;
        } else {
          if (restLen === 9 || restLen === 10) return true;
        }
      }
    }
    return false;
  }

  const trimmed = address.trim();
  if (!trimmed) {
    return '';
  }

  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');

  if (digits.length === 0) {
    return trimmed;
  }

  if (digits.length < 7) {
    return digits;
  }

  const cc = defaultCountryCode.replace(/\D/g, '');

  let isInternational = hasPlus;
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
    isInternational = true;
  }

  const allCCs = Array.from(new Set([cc, ...KNOWN_COUNTRY_CODES])).sort((a, b) => b.length - a.length);
  let matchedCC = '';
  for (const candidate of allCCs) {
    if (digits.startsWith(candidate)) {
      matchedCC = candidate;
      break;
    }
  }

  if (matchedCC && matchedCC !== '1' && digits.startsWith(matchedCC + '0')) {
    digits = matchedCC + digits.slice(matchedCC.length + 1);
  }

  if (!matchedCC && digits.startsWith('0') && cc !== '0') {
    digits = cc + digits.slice(1);
  }

  const alreadyHasCC = digits.startsWith(cc) || isAlreadyInternational(digits, cc);
  if (!alreadyHasCC && !isInternational) {
    if (cc === '1') {
      if (digits.length === 10) {
        digits = cc + digits;
      }
    } else {
      if (digits.length >= 8 && digits.length <= 11) {
        digits = cc + digits;
      }
    }
  }

  return digits;
}

export function normalizePhoneNumber(address: string, defaultCountryCode?: string): string {
  const trimmed = address.trim();
  if (!trimmed) {
    return '';
  }

  // Split by common separators (, ; ~)
  const parts = trimmed.split(/[;,~]/);
  if (parts.length > 1) {
    return parts
      .map((part) => normalizePhoneNumber(part, defaultCountryCode))
      .filter(Boolean)
      .join(',');
  }

  if (/[a-zA-Z]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) {
    return digits;
  }

  let parsed;
  if (defaultCountryCode && defaultCountryCode.trim() !== '' && defaultCountryCode.toLowerCase() !== 'none') {
    const cleanCC = defaultCountryCode.replace(/\D/g, '');
    const region = getRegionCodeForCountryCode(parseInt(cleanCC, 10));
    if (region && region !== 'ZZ') {
      parsed = parsePhoneNumber(trimmed, { regionCode: region });
    } else {
      parsed = parsePhoneNumber(trimmed);
    }
  } else {
    parsed = parsePhoneNumber(trimmed);
  }

  if (parsed && parsed.valid) {
    const e164 = parsed.number.e164;
    if (e164) {
      return e164.replace('+', '');
    }
  }

  // Fallback to original normalization logic
  return originalNormalizePhoneNumber(trimmed, defaultCountryCode || '1');
}

export function hashMessageId(type: string, date: number, address: string, body: string): string {
  const str = `${type}|${date}|${address}|${body}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

export function parseAttributes(tagContent: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let i = 0;
  // Skip tag name
  while (i < tagContent.length && !/\s/.test(tagContent[i])) {
    i++;
  }

  while (i < tagContent.length) {
    // Skip whitespace
    while (i < tagContent.length && /\s/.test(tagContent[i])) {
      i++;
    }
    if (i >= tagContent.length) break;

    // Read attribute name
    let name = '';
    while (i < tagContent.length && !/\s/.test(tagContent[i]) && tagContent[i] !== '=') {
      name += tagContent[i];
      i++;
    }

    // Skip whitespace
    while (i < tagContent.length && /\s/.test(tagContent[i])) {
      i++;
    }

    if (i < tagContent.length && tagContent[i] === '=') {
      i++; // Consume '='
      // Skip whitespace
      while (i < tagContent.length && /\s/.test(tagContent[i])) {
        i++;
      }
      if (i < tagContent.length && (tagContent[i] === '"' || tagContent[i] === "'")) {
        const quote = tagContent[i];
        i++; // Consume quote
        let val = '';
        while (i < tagContent.length && tagContent[i] !== quote) {
          val += tagContent[i];
          i++;
        }
        if (i < tagContent.length) {
          i++; // Consume end quote
        }
        attrs[name] = decodeXmlEntities(val);
      }
    }
  }
  return attrs;
}

export function decodeXmlEntities(str: string): string {
  if (!str) return str;
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#([xX][0-9a-fA-F]+|\d+);/g, (match, codeStr) => {
      try {
        const isHex = codeStr.startsWith('x') || codeStr.startsWith('X');
        const code = isHex ? parseInt(codeStr.slice(1), 16) : parseInt(codeStr, 10);
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    });
}

export async function base64ToBlob(base64Data: string, mimeType: string): Promise<Blob> {
  try {
    const response = await fetch(`data:${mimeType};base64,${base64Data.trim()}`);
    return await response.blob();
  } catch {
    try {
      const cleaned = base64Data.replace(/\s/g, '');
      const binaryString = atob(cleaned);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: mimeType });
    } catch {
      return new Blob([base64Data], { type: mimeType });
    }
  }
}

export class XmlStreamScanner {
  declare buffer: string;
  declare state: 'TEXT' | 'TAG' | 'QUOTE' | 'COMMENT';
  declare quoteChar: string;

  onTag: (tag: string) => Promise<void> | void;

  constructor(onTag: (tag: string) => Promise<void> | void) {
    this.buffer = '';
    this.state = 'TEXT';
    this.quoteChar = '';
    this.onTag = onTag;
  }

  async write(chunk: string) {
    let i = 0;
    while (i < chunk.length) {
      if (this.state === 'TEXT') {
        const char = chunk[i];
        if (char === '<') {
          this.state = 'TAG';
          this.buffer = '<';
        }
        i++;
      } else if (this.state === 'TAG') {
        const char = chunk[i];
        this.buffer += char;
        if (this.buffer.startsWith('<!--')) {
          this.state = 'COMMENT';
        } else if (char === '"' || char === "'") {
          this.state = 'QUOTE';
          this.quoteChar = char;
        } else if (char === '>') {
          await this.onTag(this.buffer);
          this.state = 'TEXT';
          this.buffer = '';
        }
        i++;
      } else if (this.state === 'COMMENT') {
        const char = chunk[i];
        this.buffer += char;
        if (this.buffer.endsWith('-->')) {
          this.state = 'TEXT';
          this.buffer = '';
        }
        i++;
      } else if (this.state === 'QUOTE') {
        const nextQuoteIndex = chunk.indexOf(this.quoteChar, i);
        if (nextQuoteIndex !== -1) {
          this.buffer += chunk.slice(i, nextQuoteIndex + 1);
          this.state = 'TAG';
          i = nextQuoteIndex + 1;
        } else {
          this.buffer += chunk.slice(i);
          i = chunk.length;
        }
      }
    }
  }
}

export async function parseSMSBackupFileInline(
  file: File,
  options: ParserOptions,
  callbacks: ParserCallbacks
): Promise<void> {
  let errorCalled = false;
  const safeOnError = (err: Error) => {
    if (!errorCalled) {
      errorCalled = true;
      callbacks.onError(err);
    }
  };

  // Pre-load all existing message IDs to skip duplicates
  const existingMsgIds = new Set<string>();

  if (!useMemoryDB) {
    try {
      const db = await openDB();
      // Load message keys
      const msgTx = db.transaction('messages', 'readonly');
      const msgStore = msgTx.objectStore('messages');
      const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
        const req = msgStore.getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      for (const key of keys) {
        if (typeof key === 'string') {
          existingMsgIds.add(key);
        }
      }
      db.close();
    } catch (err) {
      console.warn('Failed to pre-load message keys from IndexedDB:', err);
    }
  } else {
    // In-memory fallback
    for (const msg of memoryDB.messages) {
      existingMsgIds.add(msg.id);
    }
  }

  // Use only options.vcfContacts during parsing to avoid over-resolving contact names with XML-only values
  const contactMap = options.vcfContacts || {};
  const xmlContacts: Record<string, string> = {};

  // Save options.vcfContacts into the database contacts store right away!
  if (options.vcfContacts && Object.keys(options.vcfContacts).length > 0) {
    if (!useMemoryDB) {
      try {
        const db = await openDB();
        const contactTx = db.transaction('contacts', 'readwrite');
        const contactStore = contactTx.objectStore('contacts');
        for (const [normAddr, name] of Object.entries(options.vcfContacts)) {
          contactStore.put({ normalizedAddress: normAddr, name });
        }
        db.close();
      } catch (err) {
        console.warn('Failed to save options VCF contacts to IndexedDB:', err);
      }
    } else {
      for (const [normAddr, name] of Object.entries(options.vcfContacts)) {
        memoryDB.contacts[normAddr] = name;
      }
    }
  }

  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');

  const threadMap = new Map<string, Thread>();
  let msgQueue: Message[] = [];
  let attQueue: { id: string; blob: Blob }[] = [];
  let mmsBuilder: {
    attrs: Record<string, string>;
    parts: Record<string, string>[];
    addrs: Record<string, string>[];
  } | null = null;
  let readBytes = 0;
  const totalSize = file.size;

  const handleTag = async (tag: string) => {
    if (tag.startsWith('<?') || tag.startsWith('<!')) {
      return;
    }

    if (tag.startsWith('</')) {
      const tagName = tag.substring(2, tag.length - 1).trim();
      if (tagName === 'mms' && mmsBuilder) {
        const mms = mmsBuilder;
        mmsBuilder = null;

        const dateVal = parseInt(mms.attrs.date || '0', 10);
        const msgBox = mms.attrs.msg_box || '1';

        const senderObj = mms.addrs.find((a) => a.type === '137');
        const senderAddr = senderObj ? senderObj.address : mms.attrs.address || '';

        const direction = msgBox === '2' ? 'sent' : 'inbox';
        let contactName = mms.attrs.contact_name && mms.attrs.contact_name !== 'null' ? mms.attrs.contact_name : '';

        let threadId = '';
        const mmsAddress = mms.attrs.address || '';
        const uniqueAddrs = Array.from(
          new Set(mms.addrs.map((a) => normalizePhoneNumber(a.address, options.countryCode)).filter(Boolean))
        ).sort();
        const isGroup = mmsAddress.includes('rcs.google.com') || uniqueAddrs.length > 2;

        if (isGroup) {
          threadId = uniqueAddrs.join(',');
        } else {
          threadId = normalizePhoneNumber(mmsAddress, options.countryCode);
        }

        // Check if there are contact names in contactMap
        if (threadId.includes(',')) {
          const parts = threadId.split(',');
          const hasOverride = parts.some((part) => contactMap[normalizePhoneNumber(part, options.countryCode)]);
          if (hasOverride) {
            const originalXMLNames = contactName ? contactName.split(/\s*(?:,|;|~|&)\s*/) : [];
            const resolvedParts = parts.map((part, index) => {
              const normPart = normalizePhoneNumber(part, options.countryCode);
              return contactMap[normPart] || originalXMLNames[index] || part;
            });
            contactName = resolvedParts.join(', ');
          }
        } else {
          const normThread = normalizePhoneNumber(threadId, options.countryCode);
          if (contactMap[normThread]) {
            contactName = contactMap[normThread];
          }
        }

        let sender: string;
        if (direction === 'sent') {
          sender = 'Me';
        } else {
          const normSender = normalizePhoneNumber(senderAddr, options.countryCode);
          if (contactMap[normSender]) {
            sender = contactMap[normSender];
          } else {
            if (isGroup) {
              sender = senderAddr || 'Unknown';
            } else {
              sender = contactName || senderAddr || 'Unknown';
            }
          }
        }

        const bodyText = mms.parts
          .filter((p) => p.ct === 'text/plain' && p.text && p.text !== 'null')
          .map((p) => p.text)
          .join('\n');

        // Deterministic message ID
        const mmsId = hashMessageId('mms', dateVal, mmsAddress, bodyText);
        if (existingMsgIds.has(mmsId)) {
          return; // skip duplicate message!
        }

        // Save XML-only contact name to contacts database if not in VCF
        if (contactName && contactName !== 'Unknown') {
          if (threadId.includes(',')) {
            const parts = threadId.split(',');
            const originalXMLNames = contactName.split(/,\s*/);
            parts.forEach((part, index) => {
              const partXMLName = originalXMLNames[index];
              if (partXMLName && !contactMap[part] && !xmlContacts[part]) {
                xmlContacts[part] = partXMLName;
                if (!useMemoryDB) {
                  openDB()
                    .then((db) => {
                      const tx = db.transaction('contacts', 'readwrite');
                      tx.objectStore('contacts').put({ normalizedAddress: part, name: partXMLName });
                      db.close();
                    })
                    .catch(() => {});
                } else {
                  memoryDB.contacts[part] = partXMLName;
                }
              }
            });
          } else {
            if (!contactMap[threadId] && !xmlContacts[threadId]) {
              xmlContacts[threadId] = contactName;
              if (!useMemoryDB) {
                openDB()
                  .then((db) => {
                    const tx = db.transaction('contacts', 'readwrite');
                    tx.objectStore('contacts').put({ normalizedAddress: threadId, name: contactName });
                    db.close();
                  })
                  .catch(() => {});
              } else {
                memoryDB.contacts[threadId] = contactName;
              }
            }
          }
        }

        const attachmentsMetadata: AttachmentMetadata[] = [];
        for (let idx = 0; idx < mms.parts.length; idx++) {
          const part = mms.parts[idx];
          if (part.data && part.data !== 'null') {
            const attId = `${mmsId}_${idx}`;
            try {
              const blob = await base64ToBlob(part.data, part.ct);
              attQueue.push({ id: attId, blob });
              attachmentsMetadata.push({
                id: attId,
                name: part.name || part.cl || 'attachment',
                contentType: part.ct,
                size: blob.size
              });
            } catch (err) {
              console.error('Failed to decode MMS attachment base64', err);
            }
            part.data = '';
          }
        }

        let thread = threadMap.get(threadId);
        if (!thread) {
          thread = { id: threadId, contactName: contactName || mmsAddress || 'Unknown' };
          threadMap.set(threadId, thread);
          callbacks.onThreadParsed(thread);
        }

        const message: Message = {
          id: mmsId,
          threadId,
          type: 'mms',
          address: mmsAddress,
          sender,
          contactName: contactName || 'Unknown',
          date: dateVal,
          body: bodyText,
          read: parseInt(mms.attrs.read || '1', 10),
          direction,
          attachments: attachmentsMetadata,
          senderAddress: mmsAddress || undefined
        };

        msgQueue.push(message);

        if (msgQueue.length >= 2000) {
          await saveMessagesAndAttachments(msgQueue, attQueue);
          msgQueue = [];
          attQueue = [];
        }
      }
      return;
    }

    const isSelfClosing = tag.endsWith('/>');
    const cleanTag = isSelfClosing ? tag.substring(1, tag.length - 2) : tag.substring(1, tag.length - 1);
    const firstSpace = cleanTag.search(/\s/);
    const name = firstSpace === -1 ? cleanTag.trim() : cleanTag.substring(0, firstSpace).trim();

    if (name === 'sms') {
      const attrs = parseAttributes(tag);
      const dateVal = parseInt(attrs.date || '0', 10);
      const direction = attrs.type === '2' ? 'sent' : 'inbox';
      let contactName = attrs.contact_name && attrs.contact_name !== 'null' ? attrs.contact_name : '';
      const threadId = normalizePhoneNumber(attrs.address || '', options.countryCode);

      if (contactMap[threadId]) {
        contactName = contactMap[threadId];
      }

      const sender = direction === 'sent' ? 'Me' : contactName || attrs.address || 'Unknown';

      // Deterministic message ID
      const smsId = hashMessageId('sms', dateVal, attrs.address || '', attrs.body || '');
      if (existingMsgIds.has(smsId)) {
        return; // skip duplicate message!
      }

      // Save XML-only contact name to contacts database if not in VCF
      if (contactName && contactName !== 'Unknown' && !contactMap[threadId] && !xmlContacts[threadId]) {
        xmlContacts[threadId] = contactName;
        if (!useMemoryDB) {
          openDB()
            .then((db) => {
              const tx = db.transaction('contacts', 'readwrite');
              tx.objectStore('contacts').put({ normalizedAddress: threadId, name: contactName });
              db.close();
            })
            .catch(() => {});
        } else {
          memoryDB.contacts[threadId] = contactName;
        }
      }

      let thread = threadMap.get(threadId);
      if (!thread) {
        thread = { id: threadId, contactName: contactName || attrs.address || 'Unknown' };
        threadMap.set(threadId, thread);
        callbacks.onThreadParsed(thread);
      }

      const message: Message = {
        id: smsId,
        threadId,
        type: 'sms',
        address: attrs.address || '',
        sender,
        contactName: contactName || 'Unknown',
        date: dateVal,
        body: attrs.body || '',
        read: parseInt(attrs.read || '1', 10),
        direction,
        attachments: [],
        senderAddress: attrs.address || undefined
      };

      msgQueue.push(message);

      if (msgQueue.length >= 2000) {
        await saveMessagesAndAttachments(msgQueue, attQueue);
        msgQueue = [];
        attQueue = [];
      }
    } else if (name === 'mms') {
      const attrs = parseAttributes(tag);
      mmsBuilder = {
        attrs,
        parts: [],
        addrs: []
      };
    } else if (name === 'part') {
      if (mmsBuilder) {
        const attrs = parseAttributes(tag);
        mmsBuilder.parts.push(attrs);
      }
    } else if (name === 'addr') {
      if (mmsBuilder) {
        const attrs = parseAttributes(tag);
        mmsBuilder.addrs.push(attrs);
      }
    }
  };

  const scanner = new XmlStreamScanner(handleTag);
  try {
    let reading = true;
    while (reading) {
      const { done, value } = await reader.read();
      if (done) {
        reading = false;
        break;
      }
      readBytes += value.length;
      const chunk = decoder.decode(value, { stream: true });
      await scanner.write(chunk);
      callbacks.onProgress(Math.round((readBytes / totalSize) * 100));
    }
    const remaining = decoder.decode();
    if (remaining) {
      await scanner.write(remaining);
    }
  } catch (err) {
    safeOnError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (msgQueue.length > 0) {
    await saveMessagesAndAttachments(msgQueue, attQueue);
  }
  if (threadMap.size > 0) {
    await saveThreads(Array.from(threadMap.values()));
  }

  callbacks.onProgress(100);
  callbacks.onComplete();
}

export async function parseSMSBackupFile(
  file: File,
  options: ParserOptions,
  callbacks: ParserCallbacks
): Promise<void> {
  let errorCalled = false;
  const safeOnError = (err: Error) => {
    if (!errorCalled) {
      errorCalled = true;
      callbacks.onError(err);
    }
  };

  const isWebkit =
    typeof navigator !== 'undefined' &&
    /AppleWebKit/.test(navigator.userAgent) &&
    !/Chrome|Chromium|Firefox|Edge/.test(navigator.userAgent);
  const useWorker = typeof Worker !== 'undefined' && typeof window !== 'undefined' && !isWebkit;

  if (useWorker) {
    return new Promise((resolve, reject) => {
      const worker = new ParserWorker();

      worker.postMessage({ file, options });

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          callbacks.onProgress(msg.percent);
        } else if (msg.type === 'threadParsed') {
          callbacks.onThreadParsed(msg.thread);
        } else if (msg.type === 'memoryDB') {
          if (msg.memoryDB) {
            memoryDB.threads = { ...memoryDB.threads, ...msg.memoryDB.threads };
            memoryDB.messages.push(...(msg.memoryDB.messages || []));
            if (msg.memoryDB.attachments) {
              for (const [id, b] of Object.entries(msg.memoryDB.attachments)) {
                memoryDB.attachments[id] = b as Blob;
              }
            }
            if (msg.memoryDB.contacts) {
              memoryDB.contacts = { ...memoryDB.contacts, ...msg.memoryDB.contacts };
            }
          }
        } else if (msg.type === 'complete') {
          callbacks.onComplete();
          worker.terminate();
          resolve();
        } else if (msg.type === 'error') {
          const err = new Error(msg.error);
          safeOnError(err);
          worker.terminate();
          reject(err);
        }
      };

      worker.onerror = (err: ErrorEvent) => {
        const error = err.error || new Error('Worker error');
        safeOnError(error);
        worker.terminate();
        reject(error);
      };
    });
  } else {
    try {
      await parseSMSBackupFileInline(file, options, {
        ...callbacks,
        onError: safeOnError
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      safeOnError(error);
      throw error;
    }
  }
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}

function escapeCsvField(val: string | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  return '"' + str.replace(/"/g, '""') + '"';
}

export async function exportThreads(threads: Thread[], format: 'csv' | 'text'): Promise<string> {
  let result = '';

  if (format === 'csv') {
    result += `"Thread ID","Contact Name","Date","Timestamp","Type","Sender","Address","Body","Attachments"\n`;
  }

  for (const thread of threads) {
    const messages = await getMessagesForThread(thread.id);
    if (format === 'csv') {
      for (const msg of messages) {
        result +=
          [
            escapeCsvField(thread.id),
            escapeCsvField(thread.contactName),
            escapeCsvField(formatDate(msg.date)),
            escapeCsvField(String(msg.date)),
            escapeCsvField(msg.type.toUpperCase()),
            escapeCsvField(msg.sender),
            escapeCsvField(msg.address),
            escapeCsvField(msg.body),
            escapeCsvField(msg.attachments ? msg.attachments.map((a) => a.name).join(', ') : '')
          ].join(',') + '\n';
      }
    } else {
      result += '='.repeat(70) + '\n';
      result += `THREAD TRANSCRIPT: ${thread.contactName} (${thread.id})\n`;
      result += `Total Messages: ${messages.length}\n`;
      result += '='.repeat(70) + '\n\n';

      for (const msg of messages) {
        const dateStr = formatDate(msg.date);
        const senderStr = msg.sender || 'Unknown';
        const bodyStr = msg.body || '';
        let attachmentStr = '';
        if (msg.attachments && msg.attachments.length > 0) {
          attachmentStr = msg.attachments.map((a) => `[Attachment: ${a.name} (${a.contentType})]`).join(' ') + '\n';
        }
        result += `[${dateStr}] ${senderStr}:\n${attachmentStr}${bodyStr}\n\n`;
      }
      result += '\n';
    }
  }

  return result;
}

export async function updateContactNamesWithVCF(
  contactMap: Record<string, string>,
  defaultCountryCode?: string
): Promise<void> {
  // Update memory DB contacts
  for (const [normAddr, name] of Object.entries(contactMap)) {
    memoryDB.contacts[normAddr] = name;
  }

  // Update memory DB (tests / Node fallback)
  for (const thread of Object.values(memoryDB.threads)) {
    const parts = thread.id.split(',');
    const originalXMLNames = thread.contactName ? thread.contactName.split(/,\s*/) : [];
    const resolvedParts = parts.map((part, index) => {
      const normPart = normalizePhoneNumber(part, defaultCountryCode);
      return contactMap[normPart] || originalXMLNames[index] || part;
    });
    thread.contactName = resolvedParts.join(', ');
  }

  for (const message of memoryDB.messages) {
    const parts = message.threadId.split(',');
    const originalXMLNames = message.contactName ? message.contactName.split(/,\s*/) : [];
    const resolvedParts = parts.map((part, index) => {
      const normPart = normalizePhoneNumber(part, defaultCountryCode);
      return contactMap[normPart] || originalXMLNames[index] || part;
    });
    message.contactName = resolvedParts.join(', ');

    if (message.direction === 'inbox') {
      const normSender = normalizePhoneNumber(message.sender, defaultCountryCode);
      if (contactMap[normSender]) {
        message.sender = contactMap[normSender];
      } else if (parts.length === 1) {
        const normThread = normalizePhoneNumber(message.threadId, defaultCountryCode);
        if (contactMap[normThread]) {
          message.sender = contactMap[normThread];
        }
      }
    }
  }

  // Update IndexedDB if it is active
  if (!useMemoryDB) {
    try {
      const db = await openDB();

      // Update contacts store
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('contacts', 'readwrite');
        const store = tx.objectStore('contacts');
        for (const [normAddr, name] of Object.entries(contactMap)) {
          store.put({ normalizedAddress: normAddr, name });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Fetch all threads first
      const threads = await new Promise<Thread[]>((resolve, reject) => {
        const tx = db.transaction('threads', 'readonly');
        const store = tx.objectStore('threads');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      // Find affected threads and their new names
      const affectedThreads: { thread: Thread; newName: string }[] = [];
      for (const thread of threads) {
        const parts = thread.id.split(',');
        const originalXMLNames = thread.contactName ? thread.contactName.split(/,\s*/) : [];
        const resolvedParts = parts.map((part, index) => {
          const normPart = normalizePhoneNumber(part, defaultCountryCode);
          return contactMap[normPart] || originalXMLNames[index] || part;
        });
        const newName = resolvedParts.join(', ');
        if (newName !== thread.contactName) {
          affectedThreads.push({ thread, newName });
        }
      }

      // Update affected threads and their messages in transactions
      if (affectedThreads.length > 0) {
        const tx = db.transaction(['threads', 'messages'], 'readwrite');
        const threadStore = tx.objectStore('threads');
        const messageStore = tx.objectStore('messages');
        const msgIndex = messageStore.index('threadId');

        for (const { thread, newName } of affectedThreads) {
          // Update thread contact name
          thread.contactName = newName;
          threadStore.put(thread);

          // Query and update messages for this specific threadId using the index
          await new Promise<void>((resolve, reject) => {
            const req = msgIndex.openCursor(IDBKeyRange.only(thread.id));
            req.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
              if (cursor) {
                const message = cursor.value as Message;
                let updated = false;

                const parts = message.threadId.split(',');
                const originalXMLNames = message.contactName ? message.contactName.split(/,\s*/) : [];
                const resolvedParts = parts.map((part, index) => {
                  const normPart = normalizePhoneNumber(part, defaultCountryCode);
                  return contactMap[normPart] || originalXMLNames[index] || part;
                });
                const msgNewName = resolvedParts.join(', ');
                if (message.contactName !== msgNewName) {
                  message.contactName = msgNewName;
                  updated = true;
                }

                if (message.direction === 'inbox') {
                  const normSender = normalizePhoneNumber(message.sender, defaultCountryCode);
                  if (contactMap[normSender] && message.sender !== contactMap[normSender]) {
                    message.sender = contactMap[normSender];
                    updated = true;
                  } else if (parts.length === 1) {
                    const normThread = normalizePhoneNumber(message.threadId, defaultCountryCode);
                    if (contactMap[normThread] && message.sender !== contactMap[normThread]) {
                      message.sender = contactMap[normThread];
                      updated = true;
                    }
                  }
                }

                if (updated) {
                  cursor.update(message);
                }
                cursor.continue();
              } else {
                resolve();
              }
            };
            req.onerror = () => reject(req.error);
          });
        }
      }

      db.close();
    } catch (err) {
      console.error('Error updating contact names in IndexedDB:', err);
    }
  }
}

export function setUseMemoryDB(val: boolean): void {
  useMemoryDB = val;
}

export function getUseMemoryDB(): boolean {
  return useMemoryDB;
}

export interface CountryOverrideOption {
  code: string;
  regionCode: string;
}

export function getSupportedCountryOverrides(): CountryOverrideOption[] {
  const regions = getSupportedRegionCodes();
  const optionsMap = new Map<string, CountryOverrideOption>();

  for (const r of regions) {
    const code = getCountryCodeForRegionCode(r);
    if (code) {
      optionsMap.set(r, {
        code: String(code),
        regionCode: r
      });
    }
  }

  return Array.from(optionsMap.values()).sort((a, b) => a.regionCode.localeCompare(b.regionCode));
}
