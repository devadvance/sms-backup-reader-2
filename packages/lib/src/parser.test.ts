import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
  normalizePhoneNumber,
  XmlStreamScanner,
  parseAttributes,
  parseSMSBackupFileInline,
  parseSMSBackupFile,
  exportThreads,
  clearInMemoryDB,
  memoryDB,
  Thread,
  getAllThreads,
  getAttachment,
  getMessagesForThread,
  clearDB,
  updateContactNamesWithVCF,
  setUseMemoryDB,
  getUseMemoryDB,
  saveThreads,
  saveMessagesAndAttachments,
  hashMessageId,
  getSupportedCountryOverrides,
  decodeXmlEntities
} from './parser';

(global as any).self = {
  onmessage: null as any,
  postMessage: () => {}
};
await import('./parser.worker?t=' + Date.now());

// Helper to create a mock File from a string
const createMockFile = (content: string, chunkSize: number = 0): File => {
  const bytes = new TextEncoder().encode(content);
  return {
    size: bytes.length,
    stream: () => {
      let offset = 0;
      return {
        getReader: () => ({
          read: async () => {
            if (offset >= bytes.length) {
              return { done: true, value: undefined };
            }
            const size = chunkSize > 0 ? chunkSize : bytes.length;
            const end = Math.min(offset + size, bytes.length);
            const value = bytes.slice(offset, end);
            offset = end;
            return { done: false, value };
          }
        })
      };
    }
  } as unknown as File;
};

// Global reset before every single test to prevent test pollution
beforeEach(async () => {
  setUseMemoryDB(false);
  clearInMemoryDB();
  await clearDB();
});

describe('Phone Number Normalization - Parameterized', () => {
  const testCases = [
    // US format
    { input: '+15165470172', cc: '1', expected: '15165470172' },
    { input: '5165470172', cc: '1', expected: '15165470172' },
    { input: '15165470172', cc: '1', expected: '15165470172' },
    { input: ' (516) 547-0172 ', cc: '1', expected: '15165470172' },
    // UK format
    { input: '+447123456789', cc: '44', expected: '447123456789' },
    { input: '07123456789', cc: '44', expected: '447123456789' },
    { input: '447123456789', cc: '44', expected: '447123456789' },
    { input: '+4407123456789', cc: '44', expected: '447123456789' },
    // Germany format
    { input: '01712345678', cc: '49', expected: '491712345678' },
    // Alphanumeric Sender IDs
    { input: 'Google', cc: '1', expected: 'GOOGLE' },
    { input: 'INFO_SMS', cc: '44', expected: 'INFO_SMS' },
    { input: '123Alert', cc: '1', expected: '123ALERT' },
    // Short codes
    { input: '24273', cc: '1', expected: '24273' },
    { input: '123', cc: '44', expected: '123' },
    // Multi-recipient delimiters
    { input: '+15165470172, +15165470173', cc: '1', expected: '15165470172,15165470173' },
    { input: '07123456789; 07123456780', cc: '44', expected: '447123456789,447123456780' },
    { input: '+4407123456789~+4407123456780', cc: '44', expected: '447123456789,447123456780' },
    // Legacy normalization branch cover cases
    { input: '71234567890', cc: '44', expected: '71234567890' }, // CC 7 already international
    { input: '49123456789', cc: '1', expected: '49123456789' }, // CC 49 already international
    { input: ' ', cc: '1', expected: '' }, // empty trim
    { input: '123456', cc: '1', expected: '123456' }, // < 7 length
    { input: '00447123456789', cc: '1', expected: '447123456789' }, // double zero prefix
    { input: '4901712345678', cc: '1', expected: '491712345678' }, // Matched CC + 0
    { input: '712345678', cc: '44', expected: '44712345678' }, // Prefix length 8-11
    { input: 'none', cc: 'none', expected: 'NONE' }, // none override
    // Empty
    { input: '', cc: '1', expected: '' }
  ];

  it.each(testCases)('normalizes "$input" with cc "$cc" to "$expected"', ({ input, cc, expected }) => {
    expect(normalizePhoneNumber(input, cc)).toBe(expected);
  });
});

describe('XML Parsing & Stream Scanner', () => {
  it('parses attributes and decodes entity values', () => {
    const tag =
      '<sms address="+15165470172" body="I thought &quot;Boston&quot; was &lt;this&gt; weekend &amp; next" />';
    const attrs = parseAttributes(tag);
    expect(attrs.address).toBe('+15165470172');
    expect(attrs.body).toBe('I thought "Boston" was <this> weekend & next');
  });

  it('handles stream scanner chunk boundaries', async () => {
    const tags: string[] = [];
    const scanner = new XmlStreamScanner((t) => {
      tags.push(t);
    });
    await scanner.write('<smses>');
    await scanner.write('<sms address="');
    await scanner.write('123" />');
    await scanner.write('</smses>');

    expect(tags).toContain('<smses>');
    expect(tags).toContain('<sms address="123" />');
    expect(tags).toContain('</smses>');
  });

  it('skips comments', async () => {
    const tags: string[] = [];
    const scanner = new XmlStreamScanner((t) => {
      tags.push(t);
    });
    await scanner.write('<!-- comment --><sms />');
    expect(tags).toHaveLength(1);
    expect(tags[0]).toBe('<sms />');
  });

  it('swallows tags when quotes are unclosed', async () => {
    const malformed = `<smses><sms body="unclosed quote starts... /><sms address="1" /></smses>`;
    const tags: string[] = [];
    const scanner = new XmlStreamScanner((t) => {
      tags.push(t);
    });
    await scanner.write(malformed);
    expect(tags).not.toContain('<sms address="1" />');
  });

  it('swallows tags when raw < is present', async () => {
    const malformed = `<smses><sms address="1" />raw < text<sms address="2" /></smses>`;
    const tags: string[] = [];
    const scanner = new XmlStreamScanner((t) => {
      tags.push(t);
    });
    await scanner.write(malformed);
    expect(tags).not.toContain('<sms address="2" />');
  });
});

describe('XML Backup Stream Parsing', () => {
  it('parses SMS/MMS tags and attachments and exports to CSV and Text', async () => {
    const xmlContent = `<?xml version=\'1.0\' encoding=\'UTF-8\' ?>
<smses count="2">
  <sms address="+15165470172" date="1512226167463" type="1" body="Hello Boston" contact_name="Alec Lokhandwala" read="1" />
  <mms date="1720997593000" msg_box="1" address="+14152647748" contact_name="Charlie Reiter" read="1">
    <parts>
      <part seq="0" ct="text/plain" name="body" text="Thanks for the badges." />
      <part seq="1" ct="image/png" name="logo.png" data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" />
      <part seq="2" ct="image/gif" name="err.gif" data="!!!" />
    </parts>
    <addrs>
      <addr address="+14152647748" type="137" />
    </addrs>
  </mms>
</smses>`;

    const mockFile = createMockFile(xmlContent);
    const threads: Thread[] = [];

    await parseSMSBackupFileInline(
      mockFile,
      { countryCode: '1' },
      {
        onProgress: () => {},
        onThreadParsed: (t) => threads.push(t),
        onComplete: () => {},
        onError: (err) => {
          throw err;
        }
      }
    );

    expect(threads).toHaveLength(2);
    expect(threads[0].id).toBe('15165470172');
    expect(threads[1].id).toBe('14152647748');

    // Test Exporters
    const csv = await exportThreads(threads, 'csv');
    expect(csv).toContain(
      '"Thread ID","Contact Name","Date","Timestamp","Type","Sender","Address","Body","Attachments"'
    );
    expect(csv).toContain('"Hello Boston"');

    const txt = await exportThreads(threads, 'text');
    expect(txt).toContain('THREAD TRANSCRIPT: Alec Lokhandwala (15165470172)');
    expect(txt).toContain('Hello Boston');

    // Cover export Date limits / empty bodies
    const invalidThread: Thread = { id: 'invalid_date', contactName: 'Invalid' };
    await saveThreads([invalidThread]);
    await saveMessagesAndAttachments(
      [
        {
          id: 'inv_msg',
          threadId: 'invalid_date',
          type: 'sms',
          address: '',
          sender: '',
          contactName: '',
          date: NaN, // Invalid timestamp to cover formatDate line 1011 fallback
          body: null as any, // Null body to cover escapeCsvField line 1022 fallback
          read: 1,
          direction: 'inbox',
          attachments: []
        }
      ],
      []
    );
    const invCsv = await exportThreads([invalidThread], 'csv');
    expect(invCsv).toContain('"invalid_date"'); // verified row output and empty date fallback coverage

    const mmsMessages = await getMessagesForThread(threads[1].id);
    const mms = mmsMessages.find((m) => m.type === 'mms');
    expect(mms).toBeDefined();
    const attId = mms!.attachments[0].id;
    const attBlob = await getAttachment(attId);
    expect(attBlob).toBeDefined();
    expect(attBlob!.type).toBe('image/png');
  });

  it('skips duplicate messages deterministically and handles group chat name resolving', async () => {
    // Pre-save the duplicate message in DB to trigger line 833
    const smsId = hashMessageId('sms', 1000, '+15165470172', 'hello');
    await saveThreads([{ id: '15165470172', contactName: 'Alec' }]);
    await saveMessagesAndAttachments(
      [
        {
          id: smsId,
          threadId: '15165470172',
          type: 'sms',
          address: '+15165470172',
          sender: '+15165470172',
          contactName: '',
          date: 1000,
          body: 'hello',
          read: 1,
          direction: 'inbox',
          attachments: []
        }
      ],
      []
    );

    const xmlContent = `<?xml version=\'1.0\' encoding=\'UTF-8\' ?>
<smses count="3">
  <sms address="+15165470172" date="1000" type="1" body="hello" />
  <sms address="+15165470172" date="1000" type="1" body="hello" />
  <mms date="2000" msg_box="1" address="+14152647748,~;+12489907977" contact_name="Charlie &amp; Barrett" read="1">
    <parts>
      <part seq="0" ct="text/plain" text="Group text" />
    </parts>
    <addrs>
      <addr address="+14152647748" type="151" />
      <addr address="+12489907977" type="151" />
    </addrs>
  </mms>
</smses>`;
    const mockFile = createMockFile(xmlContent);
    const parsedThreads: Thread[] = [];

    await parseSMSBackupFileInline(
      mockFile,
      { countryCode: '1' },
      {
        onProgress: () => {},
        onThreadParsed: (t) => parsedThreads.push(t),
        onComplete: () => {},
        onError: (err) => {
          throw err;
        }
      }
    );

    const threads = await getAllThreads();
    expect(threads.some((t) => t.id === '15165470172')).toBe(true);
    expect(threads.some((t) => t.id === '14152647748,12489907977')).toBe(true);
  });

  it('handles batch queue saving triggered at 2,000 messages boundary', async () => {
    let xmlContent = `<?xml version='1.0' encoding='UTF-8' ?>\n<smses count="2005">\n`;
    for (let i = 0; i < 2005; i++) {
      xmlContent += `<sms address="+15165470172" date="${10000 + i}" type="1" body="Message number ${i}" />\n`;
    }
    xmlContent += `</smses>`;

    const mockFile = createMockFile(xmlContent);
    await parseSMSBackupFileInline(
      mockFile,
      { countryCode: '1' },
      {
        onProgress: () => {},
        onThreadParsed: () => {},
        onComplete: () => {},
        onError: (err) => {
          throw err;
        }
      }
    );

    const threads = await getAllThreads();
    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe('15165470172');
  });

  it('performs VCF updates to thread contact names and message sender fields in IndexedDB mode', async () => {
    const threadId = '15165470172';
    const sender = '5165470172';

    const mockThreads: Thread[] = [{ id: threadId, contactName: 'Group Chat' }];
    const mockMessages = [
      {
        id: 'msg_1',
        threadId: threadId,
        type: 'sms' as const,
        address: sender,
        sender: sender,
        contactName: 'Group Chat',
        date: Date.now(),
        body: 'Hello',
        read: 1,
        direction: 'inbox' as const,
        attachments: []
      },
      {
        id: 'msg_2',
        threadId: threadId,
        type: 'sms' as const,
        address: 'Unknown',
        sender: 'Unknown',
        contactName: 'Group Chat',
        date: Date.now() + 10,
        body: 'Hello fallback',
        read: 1,
        direction: 'inbox' as const,
        attachments: []
      }
    ];

    await saveThreads(mockThreads);
    await saveMessagesAndAttachments(mockMessages, []);

    // Perform VCF updates mapping normalized numbers to update sender and thread contact names (covers lines 1195 and 1197-1201)
    const contactsMap = { '15165470172': 'John US' };
    await updateContactNamesWithVCF(contactsMap);

    const threads = await getAllThreads();
    expect(threads.find((t) => t.id === threadId)?.contactName).toBe('John US');

    // Verify inbox message sender updated successfully
    const messages = await getMessagesForThread(threadId);
    expect(messages[0].sender).toBe('John US');
    expect(messages[1].sender).toBe('John US'); // fallback name coverage
  });

  it('handles error triggers in safeOnError when parsing throws chunks errors', async () => {
    const errorFile = {
      size: 100,
      stream: () => ({
        getReader: () => ({
          read: async () => {
            throw new Error('Chunk reading failed');
          }
        })
      })
    } as any;

    let caughtError: Error | null = null;
    await parseSMSBackupFileInline(
      errorFile,
      { countryCode: '1' },
      {
        onProgress: () => {},
        onThreadParsed: () => {},
        onComplete: () => {},
        onError: (err) => {
          caughtError = err;
        }
      }
    );

    expect(caughtError).toBeDefined();
    expect(caughtError!.message).toBe('Chunk reading failed');
  });

  it('resolves contact names and senders using vcfContacts option and covers groups during XML parsing', async () => {
    // Contains group MMS with 3 recipients (triggers line 671), rcs.google.com address, single MMS, and sent MMS direction
    const xmlContent = `<?xml version=\'1.0\' encoding=\'UTF-8\' ?>
<smses count="4">
  <sms address="+15165470172" date="500" type="1" body="Google SMS" contact_name="Old Alec" />
  <mms date="1000" msg_box="2" address="+15165470172" contact_name="Charlie" read="1">
    <parts><part seq="0" ct="text/plain" text="Sent MMS" /></parts>
    <addrs><addr address="+15165470172" type="151" /></addrs>
  </mms>
  <mms date="2000" msg_box="1" address="+14152647748,~;+12489907977,~;+15165470172" contact_name="Charlie &amp; Barrett &amp; Alec" read="1">
    <parts><part seq="0" ct="text/plain" text="3-way group" /></parts>
    <addrs>
      <addr address="+14152647748" type="137" />
      <addr address="+12489907977" type="151" />
      <addr address="+15165470172" type="151" />
    </addrs>
  </mms>
  <mms date="3000" msg_box="1" address="group-rcs.google.com" contact_name="RCS group" read="1">
    <parts><part seq="0" ct="text/plain" text="RCS group" /></parts>
    <addrs>
      <addr address="+14152647748" type="151" />
    </addrs>
  </mms>
</smses>`;
    const mockFile = createMockFile(xmlContent);
    const threads: Thread[] = [];

    const vcfContacts = {
      '15165470172': 'VCF Alec',
      '14152647748': 'VCF Charlie',
      '12489907977': 'VCF Barrett'
    };

    await parseSMSBackupFileInline(
      mockFile,
      { countryCode: '1', vcfContacts },
      {
        onProgress: () => {},
        onThreadParsed: (t) => threads.push(t),
        onComplete: () => {},
        onError: (err) => {
          throw err;
        }
      }
    );

    expect(threads.length).toBeGreaterThan(0);
    // Verifies contactName resolved overrides correctly (covers lines 681-686, 691, 697, 701, 704)
    const threadGroup = threads.find((t) => t.id === '12489907977,14152647748,15165470172');
    expect(threadGroup).toBeDefined();
    expect(threadGroup!.contactName).toContain('VCF Alec');
  });
});

describe('Extended Database Functions - Memory DB Fallbacks', () => {
  it('runs database helper operations in memory fallback mode', async () => {
    setUseMemoryDB(true); // Force memory DB fallback mode
    expect(getUseMemoryDB()).toBe(true);

    const mockThread: Thread = { id: '999', contactName: 'Memory User' };
    await saveThreads([mockThread]);

    const threads = await getAllThreads();
    expect(threads).toContainEqual(mockThread);

    const mockMessages = [
      {
        id: 'msg_mem',
        threadId: '999',
        type: 'sms' as const,
        address: '999',
        sender: '999',
        contactName: 'Memory User',
        date: 1000,
        body: 'Memory text',
        read: 1,
        direction: 'inbox' as const,
        attachments: []
      },
      {
        id: 'msg_mem_fallback',
        threadId: '999',
        type: 'sms' as const,
        address: 'Unknown',
        sender: 'Unknown',
        contactName: 'Memory User',
        date: 1010,
        body: 'Memory fallback text',
        read: 1,
        direction: 'inbox' as const,
        attachments: []
      }
    ];
    // Pass non-empty attachments to cover line 139 loop
    await saveMessagesAndAttachments(mockMessages, [{ id: 'mem_att', blob: new Blob(['hello']) }]);

    // Set memory contacts
    memoryDB.contacts['999'] = 'Memory User Updated';
    expect(memoryDB.contacts['999']).toBe('Memory User Updated');

    const contacts = { '999': 'Memory User Updated' };
    // Trigger memory updateContactNamesWithVCF line 1109 by passing mapped sender mapping
    await updateContactNamesWithVCF(contacts);

    const retrievedBlob = await getAttachment('mem_att');
    expect(retrievedBlob).toBeDefined();

    const notFoundBlob = await getAttachment('non-existent');
    expect(notFoundBlob).toBeUndefined();

    // Trigger getMessagesForThread memory sort/filter lines 170-172
    const filteredMessages = await getMessagesForThread('999');
    expect(filteredMessages.length).toBeGreaterThan(0);

    // Verify memory inbox sender update logic worked
    expect(filteredMessages[0].sender).toBe('Memory User Updated');
    expect(filteredMessages[1].sender).toBe('Memory User Updated'); // fallback name coverage

    // Parse in memory fallback mode to cover line 846 (SMS save XML name to memory contacts)
    const memXml = `<?xml version='1.0' encoding='UTF-8' ?>
<smses count="1">
  <sms address="+18887776666" date="2000" type="1" body="Mem body" contact_name="Mem XML Name" />
</smses>`;
    const memMockFile = createMockFile(memXml);
    await parseSMSBackupFileInline(
      memMockFile,
      { countryCode: '1' },
      {
        onProgress: () => {},
        onThreadParsed: () => {},
        onComplete: () => {},
        onError: () => {}
      }
    );
    expect(memoryDB.contacts['18887776666']).toBe('Mem XML Name');

    await clearDB();
    expect(await getAllThreads()).toHaveLength(0);
    expect(await getAttachment('mem_att')).toBeUndefined();
  });
});

describe('Database Error Handling & Fallback Transitions', () => {
  it('handles IndexedDB open errors gracefully', async () => {
    const originalOpen = indexedDB.open;
    indexedDB.open = () => {
      const req = {
        onerror: null as any,
        onsuccess: null as any,
        error: new Error('Mock Open Error')
      } as any;
      setTimeout(() => {
        if (req.onerror) req.onerror();
      }, 0);
      return req;
    };

    const threads = await getAllThreads();
    expect(threads).toEqual([]);
    expect(getUseMemoryDB()).toBe(true);

    indexedDB.open = originalOpen;
  });

  it('handles openDB exception throws gracefully', async () => {
    const originalOpen = indexedDB.open;
    indexedDB.open = () => {
      throw new Error('Immediate throw open error');
    };

    const threads = await getAllThreads();
    expect(threads).toEqual([]);
    expect(getUseMemoryDB()).toBe(true);

    indexedDB.open = originalOpen;
  });

  it('handles IndexedDB transaction errors gracefully', async () => {
    const originalOpen = indexedDB.open;
    indexedDB.open = () => {
      const req = {
        onerror: null as any,
        onsuccess: null as any,
        result: {
          transaction: () => {
            const tx = {
              objectStore: () => ({
                put: () => {
                  throw new Error('Immediate put error');
                },
                getAll: () => {
                  const r = { onsuccess: null, onerror: null, error: new Error('GetAll Error') } as any;
                  setTimeout(() => {
                    if (r.onerror) r.onerror();
                  }, 0);
                  return r;
                },
                getAllKeys: () => {
                  const r = { onsuccess: null, onerror: null, error: new Error('GetAllKeys Error') } as any;
                  setTimeout(() => {
                    if (r.onerror) r.onerror();
                  }, 0);
                  return r;
                }
              }),
              oncomplete: null,
              onerror: null,
              error: new Error('Transaction Error')
            } as any;
            setTimeout(() => {
              if (tx.onerror) tx.onerror();
            }, 0);
            return tx;
          },
          close: () => {}
        }
      } as any;
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    };

    // saveThreads catches error internally and sets fallback
    await saveThreads([{ id: '123', contactName: 'Fail' }]);
    expect(getUseMemoryDB()).toBe(true);

    indexedDB.open = originalOpen;
  });

  it('triggers error catch blocks and memory fallback for each database helper', async () => {
    const originalOpen = indexedDB.open;
    indexedDB.open = () => {
      throw new Error('DB open error');
    };

    // 1. saveThreads catch block
    setUseMemoryDB(false);
    await saveThreads([{ id: 'catch1', contactName: 'Catch' }]);
    expect(getUseMemoryDB()).toBe(true);
    expect(memoryDB.threads['catch1']).toBeDefined();

    // 2. saveMessagesAndAttachments catch block
    setUseMemoryDB(false);
    await saveMessagesAndAttachments(
      [
        {
          id: 'catch_msg',
          threadId: 'catch1',
          type: 'sms',
          address: '123',
          sender: 'Catch',
          contactName: 'Catch',
          date: 1000,
          body: 'Catch text',
          read: 1,
          direction: 'inbox',
          attachments: []
        }
      ],
      [{ id: 'catch_att', blob: new Blob(['att']) }]
    );
    expect(getUseMemoryDB()).toBe(true);
    expect(memoryDB.messages.some((m) => m.id === 'catch_msg')).toBe(true);
    expect(memoryDB.attachments['catch_att']).toBeDefined();

    // 3. getAttachment catch block
    setUseMemoryDB(false);
    memoryDB.attachments['catch_att_get'] = new Blob(['get']);
    const blob = await getAttachment('catch_att_get');
    expect(getUseMemoryDB()).toBe(true);
    expect(blob).toBeDefined();

    // 4. getMessagesForThread catch block
    setUseMemoryDB(false);
    const msgs = await getMessagesForThread('catch1');
    expect(getUseMemoryDB()).toBe(true);
    expect(msgs.length).toBeGreaterThan(0);

    // 5. clearDB catch block
    setUseMemoryDB(false);
    await clearDB();
    expect(getUseMemoryDB()).toBe(true);
    expect(memoryDB.messages).toHaveLength(0);

    // 6. updateContactNamesWithVCF catch block (line 1221)
    setUseMemoryDB(false);
    await updateContactNamesWithVCF({ '123': 'Catch' });
    expect(getUseMemoryDB()).toBe(true);

    indexedDB.open = originalOpen;
  });

  it('triggers the catch block on inline parser re-throws', async () => {
    // call parseSMSBackupFile with useWorker = false to cover lines 996-1005
    // make stream() method throw directly so it escapes parseSMSBackupFileInline
    const errorFile = {
      size: 100,
      stream: () => {
        throw new Error('Inline parsing crashed');
      }
    } as any;

    // Temporarily disable Worker support
    const originalWorker = (global as any).Worker;
    (global as any).Worker = undefined;

    await expect(
      parseSMSBackupFile(
        errorFile,
        { countryCode: '1' },
        {
          onProgress: () => {},
          onThreadParsed: () => {},
          onComplete: () => {},
          onError: () => {}
        }
      )
    ).rejects.toThrow('Inline parsing crashed');

    (global as any).Worker = originalWorker;
  });
});

describe('Web Worker - Simulated Message Handling', () => {
  it('exercises parser.worker.ts by simulating postMessage and onmessage events', async () => {
    const workerHandler = (globalThis as any).self.onmessage;
    expect(workerHandler).toBeDefined();

    const originalSelf = global.self;
    const postMessageSpy = vi.fn();
    const fakeSelf = {
      onmessage: workerHandler,
      postMessage: postMessageSpy
    };
    global.self = fakeSelf as any;

    const xmlContent = `<?xml version='1.0' encoding='UTF-8' ?>
<smses count="1">
  <sms address="111" date="1000" type="1" body="hello" />
</smses>`;
    const mockFile = createMockFile(xmlContent);

    await workerHandler({
      data: {
        file: mockFile,
        options: { countryCode: '1' }
      }
    } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalled();
    const calls = postMessageSpy.mock.calls.map((c) => c[0].type);
    expect(calls).toContain('progress');
    expect(calls).toContain('threadParsed');
    expect(calls).toContain('complete');

    // Trigger error path inside worker (exercises line 19 of parser.worker.ts)
    const errorFile = {
      size: 100,
      stream: () => ({
        getReader: () => ({
          read: async () => {
            throw new Error('Worker parsing crash');
          }
        })
      })
    } as any;
    await workerHandler({
      data: {
        file: errorFile,
        options: { countryCode: '1' }
      }
    } as MessageEvent);
    let lastCall = postMessageSpy.mock.calls[postMessageSpy.mock.calls.length - 1][0];
    expect(lastCall.type).toBe('error');
    expect(lastCall.error).toBe('Worker parsing crash');

    // Trigger synchronous error to cover parser.worker.ts catch block at line 22-25
    const syncErrorFile = {
      size: 100,
      stream: () => {
        throw new Error('Synchronous worker crash');
      }
    } as any;
    await workerHandler({
      data: {
        file: syncErrorFile,
        options: { countryCode: '1' }
      }
    } as MessageEvent);
    lastCall = postMessageSpy.mock.calls[postMessageSpy.mock.calls.length - 1][0];
    expect(lastCall.type).toBe('error');
    expect(lastCall.error).toBe('Synchronous worker crash');

    global.self = originalSelf;
  });

  it('covers the Web Worker path in parseSMSBackupFile', async () => {
    const originalWindow = global.window;
    const originalWorker = (global as any).Worker;

    global.window = {} as any;
    (global as any).Worker = class MockWorker {
      onmessage: any;
      onerror: any;
      postMessage(_data: any) {
        setTimeout(() => {
          this.onmessage({ data: { type: 'progress', percent: 50 } });
          this.onmessage({ data: { type: 'threadParsed', thread: { id: 'w1', contactName: 'Worker Thread' } } });
          this.onmessage({
            data: {
              type: 'memoryDB',
              memoryDB: {
                threads: { w1: { id: 'w1', contactName: 'Worker Thread' } },
                messages: [],
                attachments: { w_att: new Blob(['w']) },
                contacts: { '123': 'Worker contact' }
              }
            }
          });
          this.onmessage({ data: { type: 'complete' } });
        }, 0);
      }
      terminate() {}
    };

    const mockFile = createMockFile(`<smses></smses>`);
    let progress = 0;
    await parseSMSBackupFile(
      mockFile,
      { countryCode: '1' },
      {
        onProgress: (p) => {
          progress = p;
        },
        onThreadParsed: () => {},
        onComplete: () => {},
        onError: () => {}
      }
    );

    expect(progress).toBe(50);

    global.window = originalWindow;
    (global as any).Worker = originalWorker;
  });

  it('covers the Web Worker error paths in parseSMSBackupFile', async () => {
    const originalWindow = global.window;
    const originalWorker = (global as any).Worker;

    global.window = {} as any;

    // Test msg.type === 'error'
    (global as any).Worker = class MockErrorWorker {
      onmessage: any;
      onerror: any;
      postMessage(_data: any) {
        setTimeout(() => {
          this.onmessage({ data: { type: 'error', error: 'Worker error message' } });
        }, 0);
      }
      terminate() {}
    };

    const mockFile = createMockFile(`<smses></smses>`);
    await expect(
      parseSMSBackupFile(
        mockFile,
        { countryCode: '1' },
        {
          onProgress: () => {},
          onThreadParsed: () => {},
          onComplete: () => {},
          onError: () => {}
        }
      )
    ).rejects.toThrow('Worker error message');

    // Test worker.onerror event
    (global as any).Worker = class MockErrorEventWorker {
      onmessage: any;
      onerror: any;
      postMessage(_data: any) {
        setTimeout(() => {
          this.onerror({ error: new Error('Worker execution crashed') });
        }, 0);
      }
      terminate() {}
    };

    await expect(
      parseSMSBackupFile(
        mockFile,
        { countryCode: '1' },
        {
          onProgress: () => {},
          onThreadParsed: () => {},
          onComplete: () => {},
          onError: () => {}
        }
      )
    ).rejects.toThrow('Worker execution crashed');

    global.window = originalWindow;
    (global as any).Worker = originalWorker;
  });

  it('returns a list of supported country overrides', () => {
    const list = getSupportedCountryOverrides();
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((o) => o.regionCode === 'US' && o.code === '1')).toBe(true);
    expect(list.some((o) => o.regionCode === 'GB' && o.code === '44')).toBe(true);
  });

  describe('XML Entity Decoding & Surrogate Pairs', () => {
    it('decodes single-entity representation of surrogate characters (emojis)', () => {
      expect(decodeXmlEntities('&#x1F600;')).toBe('😀');
      expect(decodeXmlEntities('&#128512;')).toBe('😀');
    });

    it('decodes split-surrogate entities and concatenates them correctly', () => {
      expect(decodeXmlEntities('&#xd83d;&#xde00;')).toBe('😀');
      expect(decodeXmlEntities('&#55357;&#56832;')).toBe('😀');
    });

    it('handles lone surrogates and invalid numeric entities gracefully', () => {
      expect(decodeXmlEntities('&#xd83d;')).toBe('\uD83D');
      expect(decodeXmlEntities('&#x110000;')).toBe('&#x110000;');
      expect(decodeXmlEntities('&#99999999;')).toBe('&#99999999;');
    });
  });
});
