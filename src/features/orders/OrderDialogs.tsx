// Designed replacements for the old window.prompt / window.confirm flows.
import { useState } from 'react';
import { Button, Dialog, Notice, TextField } from '../../ui/index.ts';

export function ShipDialog({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (tracking: string) => void; busy: boolean }) {
  const [tracking, setTracking] = useState('');
  return (
    <Dialog open={open} onClose={onClose} title="Mark as shipped">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(tracking.trim());
        }}
      >
        <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>Ship the shirt to our Zürich authentication centre with the prepaid label, then add the tracking number so the buyer can follow it.</p>
        <TextField label="Tracking number" placeholder="e.g. 99.00.123456.12345678" value={tracking} onChange={(e) => setTracking(e.target.value.slice(0, 60))} hint="Optional, but it speeds up disputes if something goes missing." autoFocus />
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button type="submit" busy={busy} busyLabel="Saving…" style={{ flex: 1.4 }}>
            Mark as shipped
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ReleaseDialog({ open, onClose, onConfirm, busy, amountFmt }: { open: boolean; onClose: () => void; onConfirm: () => void; busy: boolean; amountFmt: string }) {
  return (
    <Dialog open={open} onClose={onClose} title="Confirm delivery">
      <Notice tone="warn">Only confirm once the shirt has arrived and matches the listing. This releases {amountFmt} to the seller and can’t be undone.</Notice>
      <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>Something wrong with it? Open a dispute instead — your payment stays in escrow while we look into it.</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
          Not yet
        </Button>
        <Button busy={busy} busyLabel="Releasing…" onClick={onConfirm} style={{ flex: 1.4 }}>
          Yes, release payment
        </Button>
      </div>
    </Dialog>
  );
}

const REASONS = ['Hasn’t arrived', 'Not as described', 'Damaged in transit', 'Looks counterfeit', 'Other'];

export function DisputeDialog({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (reason: string) => void; busy: boolean }) {
  const [kind, setKind] = useState(REASONS[0]!);
  const [details, setDetails] = useState('');
  const reason = kind + (details.trim() ? ': ' + details.trim() : '');
  return (
    <Dialog open={open} onClose={onClose} title="Open a dispute">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason);
        }}
      >
        <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>Your payment stays in escrow while our team reviews the order. Both sides are notified.</p>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>What’s wrong?</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REASONS.map((r) => (
              <button key={r} type="button" className="option-btn" aria-pressed={kind === r} onClick={() => setKind(r)} style={{ padding: '9px 14px', fontSize: 13.5 }}>
                {r}
              </button>
            ))}
          </div>
        </fieldset>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, margin: '18px 0 10px' }} htmlFor="dispute-details">
          Details
        </label>
        <textarea
          id="dispute-details"
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 1500))}
          rows={4}
          placeholder="Tell us what happened. Include tracking info or what doesn’t match the listing."
          style={{ width: '100%', padding: 14, borderRadius: 12, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', fontSize: 14, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" busy={busy} busyLabel="Sending…" style={{ flex: 1.4 }}>
            Open dispute
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
