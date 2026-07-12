import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Layout & Rendering', () => {
  it('renders the header title and sidebar info', () => {
    render(<App />);

    // Check if the title is in the document
    expect(screen.getAllByText('SMS Backup Reader').length).toBeGreaterThan(0);

    // Check if the thread selection prompt is displayed
    expect(screen.getByText('Select a conversation to begin reading')).toBeInTheDocument();
  });
});
