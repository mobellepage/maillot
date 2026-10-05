// @vitest-environment happy-dom
import React from 'react'; // test files are compiled with the classic JSX runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from '../ui/Confirm.tsx';
import { PrefsProvider } from '../lib/prefs.tsx';

afterEach(cleanup);
// PrefsProvider fetches live FX rates; keep tests offline.
vi.stubGlobal('fetch', () => new Promise(() => {}));

function Harness({ onResult }) {
  const confirm = useConfirm();
  return (
    <button type="button" onClick={async () => onResult(await confirm({ title: 'Delete it?', body: 'Gone for good.', confirmLabel: 'Delete', tone: 'danger' }))}>
      open
    </button>
  );
}

function setup() {
  const results = [];
  render(
    <PrefsProvider>
      <ConfirmProvider>
        <Harness onResult={(r) => results.push(r)} />
      </ConfirmProvider>
    </PrefsProvider>
  );
  return results;
}

describe('useConfirm', () => {
  it('resolves true when confirmed and closes', async () => {
    const results = setup();
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByRole('dialog', { name: 'Delete it?' })).toBeTruthy();
    expect(screen.getByText('Gone for good.')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Delete' })));
    expect(results).toEqual([true]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('resolves false on cancel and on Escape', async () => {
    const results = setup();
    fireEvent.click(screen.getByText('open'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' })));
    fireEvent.click(screen.getByText('open'));
    await act(async () => fireEvent.keyDown(document, { key: 'Escape' }));
    expect(results).toEqual([false, false]);
  });

  it('moves focus into the dialog', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });
});
