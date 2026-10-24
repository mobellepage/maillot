// @vitest-environment happy-dom
import React from 'react'; // test files are compiled with the classic JSX runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { PrefsProvider } from '../lib/prefs.tsx';
import { ScanStep } from '../features/vault/addshirt/ScanStep.tsx';

afterEach(cleanup);
vi.stubGlobal('fetch', () => new Promise(() => {}));
// Signed out: no plan to load (the scan counter stays hidden).
vi.mock('../lib/session.tsx', () => ({ useSession: () => ({ user: null, profile: null }) }));

const recognised = (over = {}) => ({
  isShirt: true, club: 'Netherlands', season: '1988', kit: 'home', brand: 'adidas', productCode: '012345', sponsor: null,
  playerName: 'Van Basten', playerNumber: '12', version: 'replica', labelSize: 'L', catalogId: 'ned-88',
  condition: { grade: 'very_good', notes: ['Light pilling on the sleeves'] },
  authenticityConcerns: [], confidence: 0.93, summary: 'Netherlands 1988 home shirt.', ...over
});

function setup(scan, form = {}, studio = 'idle', onStudioOff = () => {}) {
  const set = vi.fn();
  const w = { f: { photos: {}, catalogId: null, proposed: false, studioOff: false, scan, ...form }, set };
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <PrefsProvider>
          <ScanStep w={w} busyKey={null} onScanFile={() => {}} valuation={{ blocked: false, low: 240, high: 320 }} studio={studio} onStudioOff={onStudioOff} />
        </PrefsProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
  return set;
}

describe('ScanStep (photo recognition)', () => {
  it('asks for a front and a back photo', () => {
    setup({ status: 'idle', confidence: 0, matchId: null, result: null });
    expect(screen.getAllByText('Front').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Back').length).toBeGreaterThan(0);
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

  it('offers the studio look once there is a main photo, and lets you turn it off', () => {
    const off = vi.fn();
    const front = { dataUrl: 'data:image/jpeg;base64,AAAA' };
    setup({ status: 'idle', confidence: 0, matchId: null, result: null }, { photos: { front } }, 'working', off);
    expect(screen.getByText('Studio look')).toBeTruthy();
    expect(screen.getByText('Cutting out your shirt…')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use studio look' }));
    expect(off).toHaveBeenCalledWith(true);
    cleanup();
    setup({ status: 'idle', confidence: 0, matchId: null, result: null }, { photos: { front } }, 'off');
    expect(screen.getByText(/isn’t switched on yet — your photo is shown as taken/)).toBeTruthy();
  });

  it('lets you replace a photo (and pick one from the library)', () => {
    setup({ status: 'idle', confidence: 0, matchId: null, result: null }, { photos: { front: { dataUrl: 'data:image/jpeg;base64,AAAA' } } });
    const input = screen.getByLabelText('Replace: Front');
    expect(input.getAttribute('capture')).toBe(null);
  });

  it('explains when recognition is off or the photo is not a shirt', () => {
    setup({ status: 'off', confidence: 0, matchId: null, result: null });
    expect(screen.getByText(/isn’t switched on yet/)).toBeTruthy();
    cleanup();
    setup({ status: 'done', confidence: 0, matchId: null, result: recognised({ isShirt: false, catalogId: null }) });
    expect(screen.getByText(/doesn’t look like a football shirt/)).toBeTruthy();
  });

  it('when this month’s scans are used, offers the library (no Premium while it is switched off)', () => {
    setup({ status: 'quota', confidence: 0, matchId: null, result: null });
    expect(screen.getByText('This month’s scans are used up')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Scan without limit' })).toBeNull();
    expect(screen.getAllByRole('link', { name: /library/i }).some((a) => a.getAttribute('href') === '/vault/add/library')).toBe(true);
  });

  it('when unsure, offers the closest library kits to tap, and shows the one picked', () => {
    const kit = (n, kind = 'home') => ({ id: 'k' + n, clubId: 'young-boys', clubName: 'BSC Young Boys', season: '201' + n + '/1' + (n + 1), kind, variant: '', image: '/library/yb/' + n + '.webp' });
    const result = recognised({ club: 'BSC Young Boys', season: null, catalogId: null, confidence: 0.45, libraryKit: null, libraryCandidates: [kit(6), kit(7), kit(8, 'away')] });
    const set = setup({ status: 'done', confidence: 0.45, matchId: null, result });
    expect(screen.getByText('Which one is it?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /2017\/18 · Home/ }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ kitId: 'k7', proposedClub: 'BSC Young Boys', proposedSeason: '2017/18' }));
    cleanup();
    setup({ status: 'done', confidence: 0.45, matchId: null, result }, { kitId: 'k7', proposed: true });
    expect(screen.getByText('✓ FOUND IN THE LIBRARY')).toBeTruthy();
    expect(screen.getByText('Not this one? These look alike:')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /2017\/18 · Home/ })).toBeNull();
  });
});
