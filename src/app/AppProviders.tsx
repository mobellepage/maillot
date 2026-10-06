// Every context the app needs, in one place: the browser entry (main.tsx)
// and the build-time prerender (entry-server.tsx) render the same tree.
import type { ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { Lang, Messages } from '../i18n/index.ts';
import { SessionProvider } from '../lib/session.tsx';
import { PrefsProvider } from '../lib/prefs.tsx';
import { ToastProvider } from '../lib/toast.tsx';
import { ConfirmProvider } from '../ui/Confirm.tsx';

export function AppProviders({ queryClient, initialMessages, children }: { queryClient: QueryClient; initialMessages?: { lang: Lang; dict: Messages }; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <PrefsProvider initialMessages={initialMessages}>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </PrefsProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
