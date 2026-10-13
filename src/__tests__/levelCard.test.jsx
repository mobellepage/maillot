// @vitest-environment happy-dom
import React from 'react'; // test files are compiled with the classic JSX runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PrefsProvider } from '../lib/prefs.tsx';
import { ToastProvider } from '../lib/toast.tsx';
import { LevelCard } from '../features/levels/LevelBadge.tsx';

afterEach(cleanup);
vi.stubGlobal('fetch', () => new Promise(() => {}));
const show = (shirts, value) =>
  render(
    <PrefsProvider>
      <ToastProvider>
        <LevelCard shirts={shirts} value={value} />
      </ToastProvider>
    </PrefsProvider>
  );

describe('LevelCard', () => {
  it('shows the level and what is missing for the next one', () => {
    show(3, 250);
    expect(screen.getByRole('heading', { name: 'Rookie' })).toBeTruthy();
    expect(screen.getByText(/2 more shirts or .*150.* more collection value to Fan/)).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('63'); // value path (250 of 400) is further along than shirts (2 of 4)
  });
  it('lists every level on request', () => {
    show(16, 0);
    fireEvent.click(screen.getByRole('button', { name: 'All levels' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getAllByLabelText('Reached')).toHaveLength(3);
  });
});
