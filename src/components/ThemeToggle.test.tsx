import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SMSBackupProvider } from '../contexts/SMSBackupContext';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle Component', () => {
  it('toggles class dark on document element when clicked', () => {
    const root = window.document.documentElement;

    // Ensure initial state
    root.classList.remove('dark');

    render(
      <SMSBackupProvider>
        <ThemeToggle />
      </SMSBackupProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();

    // Initially should be light mode (no dark class)
    expect(root.classList.contains('dark')).toBe(false);

    // Click to toggle to dark mode
    fireEvent.click(button);
    expect(root.classList.contains('dark')).toBe(true);

    // Click again to toggle back to light mode
    fireEvent.click(button);
    expect(root.classList.contains('dark')).toBe(false);
  });
});
