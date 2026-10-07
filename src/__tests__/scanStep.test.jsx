// @vitest-environment happy-dom
import React from 'react'; // test files are compiled with the classic JSX runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrefsProvider } from '../lib/prefs.tsx';
import { ScanStep } from '../features/vault/addshirt/ScanStep.tsx';

afterEach(cleanup);
vi.stubGlobal('fetch', () => new Promise(() => {}));

const recognised = (over = {}) => ({
  isShirt: true, club: 'Netherlands', season: '1988', kit: 'home', brand: 'adidas', productCode: '012345', sponsor: null,
  playerName: 'Van Basten', playerNumber: '12', version: 'replica', labelSize: 'L', catalogId: 'ned-88',
  condition: { grade: 'very_good', notes: ['Light pilling on the sleeves'] },
  authenticityConcerns: [], confidence: 0.93, summary: 'Netherlands 1988 home shirt.', ...over
});

function setup(scan, form = {}) {
  const set = vi.fn();
  const w = { f: { photos: {}, catalogId: null, proposed: false, scan, ...form }, set };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PrefsProvider>
        <ScanStep w={w} busyKey={null} onScanFile={() => {}} valuation={{ blocked: false, low: 240, high: 320 }} />
      </PrefsProvider>
    </QueryClientProvider>
  );
  return set;
}

describe('ScanStep (photo recognition)', () => {
  it('asks for a front and a label photo', () => {
    setup({ status: 'idle', confidence: 0, matchId: null, result: null });
    expect(screen.getAllByText('Front').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inner label').length).toBeGreaterThan(0);
  });

  it('shows a confident match with value range, details and condition', () => {
    setup({ status: 'done', confidence: 0.93, matchId: 'ned-88', result: recognised() }, { catalogId: 'ned-88' });
    expect(screen.getByText('✓ RECOGNISED')).toBeTruthy();
    expect(screen.getByText('93% sure')).toBeTruthy();
    expect(screen.getByText('Article code 012345')).toBeTruthy();
    expect(screen.getByText('Van Basten 12')).toBeTruthy();
    expect(screen.getByText('Very good')).toBeTruthy();
    expect(screen.getByText('Light pilling on the sleeves')).toBeTruthy();
    expect(screen.getByText(/240/)).toBeTruthy();
  });

  it('offers an unsure match for the member to confirm', () => {
    const set = setup({ status: 'done', confidence: 0.45, matchId: 'ned-88', result: recognised({ confidence: 0.45 }) });
    expect(screen.getByText('PROBABLY THIS SHIRT')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'That’s the one' }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ catalogId: 'ned-88', proposed: false }));
  });

  it('describes an uncatalogued shirt and lists authenticity notes without accusing', () => {
    setup({ status: 'done', confidence: 0.8, matchId: null, result: recognised({ catalogId: null, club: 'FC Thun', season: '2005-06', authenticityConcerns: ['Label font unusual'] }) });
    expect(screen.getByText('NOT IN THE CATALOGUE YET')).toBeTruthy();
    expect(screen.getByText('FC Thun 2005-06 Home')).toBeTruthy();
    expect(screen.getByText('Label font unusual')).toBeTruthy();
    expect(screen.getByText(/Not a verdict/)).toBeTruthy();
  });

  it('explains when recognition is off or the photo is not a shirt', () => {
    setup({ status: 'off', confidence: 0, matchId: null, result: null });
    expect(screen.getByText(/isn’t switched on yet/)).toBeTruthy();
    cleanup();
    setup({ status: 'done', confidence: 0, matchId: null, result: recognised({ isShirt: false, catalogId: null }) });
    expect(screen.getByText(/doesn’t look like a football shirt/)).toBeTruthy();
  });
});
