// @vitest-environment happy-dom
import React from 'react'; // test files are compiled with the classic JSX runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PrefsProvider } from '../lib/prefs.tsx';
import { InfoCards } from '../features/market/detail/InfoCards.tsx';
import { BY } from '../data.ts';

afterEach(cleanup);
vi.stubGlobal('fetch', () => new Promise(() => {}));

const show = (s) =>
  render(
    <MemoryRouter>
      <PrefsProvider>
        <InfoCards s={s} stats={null} watched={false} toggleWatch={() => {}} />
      </PrefsProvider>
    </MemoryRouter>
  );

describe('product page: sales on Maillot', () => {
  it('without real sales, every figure says so — no simulated sales next to it', () => {
    show({ ...BY['juv-9697'], trades: { count: 0, lastPrice: null, lastSoldAt: null, avgRecent: null } });
    expect(screen.getByText(/No sales on Maillot yet/)).toBeTruthy();
    expect(screen.queryByText(/Recent sales/i)).toBeNull();
    expect(screen.queryByText('DEMO')).toBeNull();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('with real sales, shows them', () => {
    show({ ...BY['juv-9697'], trades: { count: 3, lastPrice: 250, lastSoldAt: '2026-10-10T12:00:00Z', avgRecent: 244 } });
    expect(screen.queryByText(/No sales on Maillot yet/)).toBeNull();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(/250/)).toBeTruthy();
  });

  it('the details describe the model only', () => {
    show(BY['juv-9697']);
    expect(screen.queryByText('Condition')).toBeNull();
    expect(screen.queryByText('Player print')).toBeNull();
    expect(screen.getByText('KV-75050')).toBeTruthy();
  });
});
