// "…" next to another member's profile, shirt, comment or message: report
// it to the Maillot team, or block the member. Reports are looked at within
// 24 hours (App Store guideline 1.2).
import { useState } from 'react';
import { useLocation } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { REPORT_REASONS, type ReportKind, type ReportReason } from '../../utils/db.ts';
import { Button, ButtonLink, Dialog, TextField } from '../../ui/index.ts';
import { useBlocks } from './useBlocks.ts';

interface Props {
  /** The member behind the content (blocking); none for content without an author handle. */
  handle?: string | null | undefined;
  /** What "Report" reports. */
  report: { kind: ReportKind; target: string };
  /** A text link instead of the round "…" button. */
  compact?: boolean;
}

export function ModerationMenu({ handle, report, compact = false }: Props) {
  const { t } = usePrefs();
  const { user, profile } = useSession();
  const toast = useToast();
  const { pathname } = useLocation();
  const blocks = useBlocks();
  const [step, setStep] = useState<'closed' | 'menu' | 'report'>('closed');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (profile?.handle && handle && profile.handle.toLowerCase() === handle.toLowerCase()) return null;
  const blocked = blocks.isBlocked(handle);
  const close = () => {
    setStep('closed');
    setReason(null);
    setNote('');
  };

  const send = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await db.reportContent(report.kind, report.target, reason, note.trim() || undefined);
      toast(t('mod.reported'));
      close();
    } catch (e) {
      toast((e as { code?: string }).code === 'P0429' ? t('mod.limited') : t('mod.failed'));
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = () => {
    if (!handle) return;
    const m = blocked ? blocks.unblock : blocks.block;
    m.mutate(handle, {
      onSuccess: () => toast(t(blocked ? 'mod.unblocked' : 'mod.blockedToast', { handle })),
      onError: () => toast(t('mod.failed'))
    });
    close();
  };

  return (
    <>
      <button
        type="button"
        className={compact ? 'link-btn link-btn--muted' : 'mod-more'}
        aria-haspopup="dialog"
        aria-label={t('mod.more')}
        onClick={() => setStep('menu')}
        style={compact ? { fontSize: 12, padding: 0 } : undefined}
      >
        {compact ? t('mod.report') : '•••'}
      </button>
      <Dialog open={step === 'menu'} onClose={close} title={handle ? '@' + handle : t('mod.more')} width={380}>
        {!user ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.5 }}>{t('mod.signIn')}</p>
            <ButtonLink to="/signin" state={{ from: pathname }} block>
              {t('auth.signin')}
            </ButtonLink>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <Button variant="secondary" block onClick={() => setStep('report')}>
              {t('mod.reportWhat.' + report.kind)}
            </Button>
            {handle && (
              <Button variant={blocked ? 'secondary' : 'danger'} block onClick={toggleBlock} disabled={blocks.block.isPending || blocks.unblock.isPending}>
                {blocked ? t('mod.unblock', { handle }) : t('mod.block', { handle })}
              </Button>
            )}
            {handle && !blocked && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>{t('mod.blockHint')}</p>}
          </div>
        )}
      </Dialog>
      <Dialog open={step === 'report'} onClose={close} title={t('mod.reportWhat.' + report.kind)} width={420}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          style={{ display: 'grid', gap: 14 }}
        >
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            <legend style={{ fontWeight: 600, marginBottom: 8 }}>{t('mod.why')}</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r} className="mod-reason">
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                <span>{t('mod.reason.' + r)}</span>
              </label>
            ))}
          </fieldset>
          <TextField label={t('mod.note')} value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} placeholder={t('mod.notePlaceholder')} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>{t('mod.promise')}</p>
          <Button type="submit" block disabled={!reason || busy}>
            {t('mod.send')}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
