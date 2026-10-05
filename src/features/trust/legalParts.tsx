import type { ReactNode } from 'react';

export const P = ({ children }: { children: ReactNode }) => <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)' }}>{children}</p>;
export const UL = ({ items }: { items: ReactNode[] }) => (
  <ul style={{ margin: '0 0 12px', paddingLeft: 20, fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)' }}>
    {items.map((x, i) => (
      <li key={i} style={{ marginBottom: 4 }}>
        {x}
      </li>
    ))}
  </ul>
);
export const Mail = ({ to }: { to: string }) => (
  <a href={'mailto:' + to} style={{ color: 'var(--accent)' }}>
    {to}
  </a>
);

