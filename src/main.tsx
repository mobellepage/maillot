import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import './ui/ui.css';
import { queryClient } from './lib/queryClient.ts';
import { SessionProvider } from './lib/session.tsx';
import { PrefsProvider } from './lib/prefs.tsx';
import { ToastProvider } from './lib/toast.tsx';
import { router } from './app/router.tsx';
import { ConfirmProvider } from './ui/Confirm.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <PrefsProvider>
          <ToastProvider>
            <ConfirmProvider>
              <RouterProvider router={router} />
            </ConfirmProvider>
          </ToastProvider>
        </PrefsProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>
);
