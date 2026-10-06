// Small layout and display primitives shared by every screen.
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { usePrefs } from '../lib/prefs.tsx';
import { useFlash } from './useFlash.ts';

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

export function Page({ narrow, className, ...rest }: HTMLAttributes<HTMLElement> & { narrow?: boolean }) {
  return <main id="main" className={cx('page', narrow && 'page--narrow', className)} {...rest} />;
}

export function Card({ tight, accent, interactive, className, ...rest }: HTMLAttributes<HTMLDivElement> & { tight?: boolean; accent?: boolean; interactive?: boolean }) {
  return <div className={cx('card', tight && 'card--tight', accent && 'card--accent', interactive && 'card--interactive', className)} {...rest} />;
}

export type Tone = 'neutral' | 'accent' | 'neg' | 'warn' | 'info' | 'solid';

export function Badge({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cx('badge', 'badge--' + tone, className)} {...rest} />;
}

export function Notice({ tone = 'info', className, ...rest }: HTMLAttributes<HTMLDivElement> & { tone?: Exclude<Tone, 'neutral' | 'solid'> }) {
  return <div role={tone === 'neg' ? 'alert' : 'status'} className={cx('notice', 'notice--' + tone, className)} {...rest} />;
}

/** Eyebrow + display heading + optional action on the right. */
export function SectionHeader({ eyebrow, title, action, level = 2, size = 'md', id }: { eyebrow?: ReactNode; title: ReactNode; action?: ReactNode; level?: 1 | 2; size?: 'xl' | 'lg' | 'md' | 'sm'; id?: string }) {
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <H id={id} className={cx('display', 'display--' + size)} style={{ marginTop: eyebrow ? 8 : 0 }}>
          {title}
        </H>
      </div>
      {action}
    </div>
  );
}

export interface SegmentOption<V extends string> {
  value: V;
  label: ReactNode;
}

export function Segmented<V extends string>({ options, value, onChange, mono, label }: { options: SegmentOption<V>[]; value: V; onChange: (v: V) => void; mono?: boolean; label: string }) {
  return (
    <div role="group" aria-label={label} className={cx('segmented', mono && 'segmented--mono')}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Two-column key/value rows (details tables). */
export function KeyValueList({ rows, style }: { rows: [ReactNode, ReactNode][]; style?: CSSProperties }) {
  return (
    <dl style={{ margin: 0, ...style }}>
      {rows.map(([k, v], i) => (
        <div key={i} className="kv">
          <dt>{k}</dt>
          <dd style={{ margin: 0 }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, children, action, accent }: { title: ReactNode; children?: ReactNode; action?: ReactNode; accent?: boolean }) {
  return (
    <div className={cx('empty', accent && 'empty--accent')}>
      <div className="display display--sm">{title}</div>
      {children && <p style={{ maxWidth: 460, margin: '10px auto 0', fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{children}</p>}
      {action && <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>{action}</div>}
    </div>
  );
}

/**
 * A load that failed — never shown as "empty". Says what didn't load and
 * offers a retry; offline is called out because it's the usual cause.
 */
export function ErrorState({ what, onRetry, compact }: { what: string; onRetry?: () => void; compact?: boolean }) {
  const { t } = usePrefs();
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return (
    <div role="alert" className={cx('empty', compact && 'empty--compact')} style={{ borderColor: 'rgba(255,107,94,0.3)' }}>
      <div className={compact ? 'title' : 'display display--sm'}>{t('error.couldntLoad', { what })}</div>
      <p style={{ maxWidth: 460, margin: '8px auto 0', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>
        {offline ? t('error.offlineBody') : t('error.serverBody')}
      </p>
      {onRetry && (
        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            {t('common.tryAgain')}
          </button>
        </div>
      )}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 16, radius, style }: { width?: number | string; height?: number | string; radius?: number | string; style?: CSSProperties }) {
  return <div className="skeleton" aria-hidden="true" style={{ width, height, borderRadius: radius, ...style }} />;
}

/** A labelled stat tile (price tiles, counts). */
export function StatTile({ label, value, sub, highlight, live, amount, scope = '' }: { label: ReactNode; value: ReactNode; sub?: ReactNode; highlight?: boolean; live?: boolean; amount?: number; scope?: string }) {
  const flash = useFlash(amount, scope);
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 'var(--r-lg)',
        background: highlight ? 'rgba(75,255,139,0.06)' : 'var(--surface-2)',
        border: highlight ? '1px solid rgba(75,255,139,0.3)' : '1px solid var(--line)'
      }}
    >
      <div style={{ fontSize: 11.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {live && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'kvPulse 1.8s ease-in-out infinite' }} />}
      </div>
      <div key={flash?.n} className={flash ? 'mono flash-' + flash.dir : 'mono'} style={{ fontSize: 'clamp(16px,1.8vw,21px)', fontWeight: 700, marginTop: 4, marginInline: -4, paddingInline: 4, width: 'fit-content' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
