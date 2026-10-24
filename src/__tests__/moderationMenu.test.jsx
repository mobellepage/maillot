// @vitest-environment happy-dom
import React from 'react'; // test files are compiled with the classic JSX runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { PrefsProvider } from '../lib/prefs.tsx';
import { ToastProvider } from '../lib/toast.tsx';
import { ModerationMenu } from '../features/moderation/ModerationMenu.tsx';

afterEach(cleanup);
vi.stubGlobal('fetch', () => new Promise(() => {}));
vi.mock('../lib/session.tsx', () => ({ useSession: () => ({ user: { id: 'u1' }, profile: { handle: 'me_myself' } }) }));
const calls = vi.hoisted(() => ({ report: [], block: [] }));
vi.mock('../utils/db.ts', () => ({
  REPORT_REASONS: ['offensive', 'spam', 'scam', 'other'],
  reportContent: async (...a) => void calls.report.push(a),
  blockUser: async (h) => void calls.block.push(h),
  unblockUser: async () => {},
  loadMyBlocks: async () => []
}));

function setup(props) {
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <PrefsProvider>
          <ToastProvider>
            <ModerationMenu {...props} />
          </ToastProvider>
        </PrefsProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ModerationMenu (report and block)', () => {
  it('reports a comment with a reason and a note', async () => {
    setup({ handle: 'troll', report: { kind: 'comment', target: 'c-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Report comment' }));
    const send = screen.getByRole('button', { name: 'Send report' });
    expect(send.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByLabelText('Spam or advertising'));
    fireEvent.change(screen.getByLabelText('Details (optional)'), { target: { value: 'ads everywhere' } });
    fireEvent.click(send);
    await waitFor(() => expect(calls.report).toEqual([['comment', 'c-1', 'spam', 'ads everywhere']]));
  });

  it('blocks the member behind the content', async () => {
    setup({ handle: 'troll', report: { kind: 'profile', target: 'troll' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Block @troll' }));
    await waitFor(() => expect(calls.block).toEqual(['troll']));
  });

  it('offers nothing on your own content', () => {
    setup({ handle: 'Me_Myself', report: { kind: 'profile', target: 'me_myself' } });
    expect(screen.queryByRole('button', { name: 'More options' })).toBeNull();
  });
});
