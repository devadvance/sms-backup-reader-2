import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import './i18n';

// Mock URL methods which may not be fully supported in JSDOM
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'mock-url';
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}

// Mock Web Worker
class MockWorker {
  url: string;
  onmessage: ((this: Worker, ev: MessageEvent) => unknown) | null = null;
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => unknown) | null = null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => unknown) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  postMessage(): void {
    // Basic mock that triggers completion asynchronously.
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: { type: 'complete' }
        } as MessageEvent);
      }
    }, 0);
  }

  terminate(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

globalThis.Worker = MockWorker as unknown as typeof Worker;

// Mock ResizeObserver for JSDOM
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  window.ResizeObserver = window.ResizeObserver || MockResizeObserver;
}
if (typeof globalThis !== 'undefined') {
  const globalObj = globalThis as unknown as { ResizeObserver: unknown };
  globalObj.ResizeObserver = globalObj.ResizeObserver || MockResizeObserver;
}
