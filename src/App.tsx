import React, { useState, useRef } from 'react';
import { SMSBackupProvider, useSMSBackup } from './contexts/SMSBackupContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MessageThread } from './components/MessageThread';

function MainLayout() {
  const { parseFile, parseMultipleFiles } = useSMSBackup();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (dragCounter.current > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files).filter((file) => file.name.toLowerCase().endsWith('.xml'));

    if (files.length > 0) {
      if (files.length === 1) {
        await parseFile?.(files[0]);
      } else {
        await parseMultipleFiles?.(files);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex h-screen w-screen overflow-hidden dark:bg-[#0B0F19] bg-[#F9F6F0] text-stone-900 dark:text-stone-100 transition-colors relative"
      data-testid="app-viewport"
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header />
        <MessageThread />
      </div>

      {isDragging && (
        <div className="fixed inset-0 z-50 bg-amber-950/20 dark:bg-black/60 backdrop-blur-sm pointer-events-none flex items-center justify-center p-6">
          <div className="w-full h-full border-4 border-dashed border-amber-600 dark:border-amber-500 rounded-2xl flex flex-col items-center justify-center bg-amber-950/10 dark:bg-stone-950/20">
            <span className="text-4xl mb-4">📥</span>
            <p className="text-xl font-bold text-amber-800 dark:text-amber-400">Drop SMS Backup XML files here</p>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <SMSBackupProvider>
      <MainLayout />
    </SMSBackupProvider>
  );
}

export default App;
