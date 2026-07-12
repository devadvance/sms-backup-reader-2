import { parseSMSBackupFileInline, memoryDB } from './parser';

self.onmessage = async (e: MessageEvent) => {
  const { file, options } = e.data;
  try {
    await parseSMSBackupFileInline(file, options, {
      onProgress: (percent) => {
        self.postMessage({ type: 'progress', percent });
      },
      onThreadParsed: (thread) => {
        self.postMessage({ type: 'threadParsed', thread });
      },
      onComplete: () => {
        // Send memoryDB fallback if indexedDB is not available/active
        self.postMessage({ type: 'memoryDB', memoryDB });
        self.postMessage({ type: 'complete' });
      },
      onError: (err) => {
        self.postMessage({ type: 'error', error: err.message || String(err) });
      }
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', error: errorMsg });
  }
};
