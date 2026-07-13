# SMS Backup Reader

A client-side web application designed to parse and view XML SMS/MMS backup files produced by the Android app [*SMS Backup & Restore*](https://www.synctech.com.au/sms-backup-restore/). It runs locally in the browser, ensuring your private data never leaves your machine.

SMS Backup Reader is unaffiliated with SyncTech or other entities.

## Use it now

Access the live app at: [mattj.io/sms-backup-reader-2/](https://mattj.io/sms-backup-reader-2/)

## Features

* **100% local**: No data leaves your device. All processing happens in your browser.
* **File parsing**: Imports XML backup files and VCF contact lists locally. Handles multi-GiB files.
* **Data deduplication**: Automatically merges multiple backup files and resolves contact names.
* **File exports**: Export active threads or all loaded conversations to CSV and plain text files.
* **Media and emojis**: Decodes and displays MMS attachments, fallbacks, emojis, and surrogate character entity codes.

## Development

### Prerequisites

* Node.js (LTS version recommended)
* NPM

### Commands

```shell
# Install dependencies.
npm install

# Start local development server (http://localhost:3000/sms-backup-reader-2/).
npm run dev

# Build for production.
npm run build

# Preview production build locally.
npm run preview
```

## Verification and testing

### Formatting

Verify code formatting compliance:

```shell
# Check formatting.
npm run format:check

# Format files automatically.
npm run format
```

### Unit Tests

Run Vitest unit tests for the frontend and parsing libraries:

```shell
npm run test:run
```

### End-to-end (e2e) and screenshot tests

Run Playwright end-to-end integration and visual screenshot tests:

```shell
# Install Playwright browser dependencies (first time only)
npx playwright install --with-deps

# Run E2E tests
npm run test:e2e
```

## Contributing new locales

To add a new language translation:

1. Open [src/i18n.ts](file:///c:/Users/matth/code/sms-backup-reader-2/src/i18n.ts) and add the translation dictionary for the new locale key (e.g. `fr`, `hi`, `te`).
2. Open [src/components/Header.tsx](file:///c:/Users/matth/code/sms-backup-reader-2/src/components/Header.tsx) and add a corresponding `<option>` tag inside the select dropdown to expose the language selector to users.
3. Verify that the UI elements translate correctly when selected, and that formatting checks and unit tests continue to pass.

## Technical details

## Architecture

* **Core library**: Self-contained TypeScript parser using stream/chunk-based XML parsing to support 1GB+ files. Includes VCF parsing, contact name resolution, and database updating functions.
* **Frontend UI**: React + Vite + Tailwind CSS. Virtualized lists (e.g., react-window) for rendering high-volume messages without UI lag. Tailwind for modern, clean, dark/light styling.
* **Test Infrastructure**: Vitest for unit tests, Playwright/Cypress for e2e and screenshot testing.

### Interface contracts

#### Parser ↔ UI

* Stream parsing interface compatible with browser file reader:
  * `parseSMSBackupFile(file: File, options: ParserOptions, callbacks: ParserCallbacks): Promise<void>`
  * `ParserOptions`: `{ countryCode: string, vcfContacts?: Record<string, string> }`
  * `ParserCallbacks`: `{ onProgress: (percent: number) => void, onThreadParsed: (thread: Thread) => void, onComplete: () => void, onError: (error: Error) => void }`
* VCF parsing and contact name update interface:
  * `parseVCF(vcfContent: string, defaultCountryCode: string): Record<string, string>`
  * `updateContactNamesWithVCF(contactMap: Record<string, string>): Promise<void>`
* Thread export interface:
  * `exportThreads(threads: Thread[], format: 'csv' | 'text'): Promise<string>`

### Code layout

* `packages/lib/` - Core self-contained library for parsing and loading
* `src/` - React frontend code
* `scripts/` - Scripts including PII stripper
* `tests/e2e/` - E2E tests and infrastructure

## License

SMS Backup Reader is made available under the MIT license. See the `LICENSE` file for details.
