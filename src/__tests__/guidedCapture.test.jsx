// @vitest-environment happy-dom
import React from 'react'; // test files are compiled with the classic JSX runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrefsProvider } from '../lib/prefs.tsx';
import { GuidedCapture } from '../features/vault/addshirt/GuidedCapture.tsx';

afterEach(cleanup);
vi.stubGlobal('fetch', () => new Promise(() => {}));

const specs = [
  { key: 'front', label: 'Full front', hint: 'Laid flat.' },
  { key: 'back', label: 'Full back' },
  { key: 'crest', label: 'Crest' }
];

function setup(results) {
  const photos = {};
  const onShot = vi.fn(async (spec) => {
    const p = results.shift();
    photos[spec.key] = p;
    return p;
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PrefsProvider>
        <GuidedCapture specs={specs} photos={photos} startKey={null} onShot={onShot} onClose={() => {}} />
      </PrefsProvider>
    </QueryClientProvider>
  );
  return onShot;
}

const shoot = async () => {
  const input = document.querySelector('input[type=file]');
  await act(async () => fireEvent.change(input, { target: { files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] } }));
};

describe('GuidedCapture', () => {
  it('falls back to the phone camera and moves on after a good photo', async () => {
    setup([{ label: 'Full front' }]);
    expect(screen.getByRole('dialog', { name: 'Photo 1 of 3' })).toBeTruthy();
    expect(screen.getByText(/Live camera isn’t available/)).toBeTruthy();
    await shoot();
    expect(screen.getByRole('dialog', { name: 'Photo 2 of 3' })).toBeTruthy();
  });

  it('stops on a blurry photo and offers a retake', async () => {
    setup([{ label: 'Full front', blurry: true }]);
    await shoot();
    expect(screen.getByText(/looks blurry/)).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retake' })));
    expect(screen.getByRole('dialog', { name: 'Photo 1 of 3' })).toBeTruthy();
  });
});
