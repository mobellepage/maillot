import { usePageMeta } from '../../lib/meta.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { Page } from '../../ui/index.ts';
import { ApiKeysPanel } from './ApiKeysPanel.tsx';
import { DisputesPanel } from './DisputesPanel.tsx';
import { InspectionPanel } from './InspectionPanel.tsx';
import { CertificatesPanel } from './CertificatesPanel.tsx';
import { HealthPanel } from './HealthPanel.tsx';
import { ReviewQueue } from './ReviewQueue.tsx';
import { AuditPanel } from './AuditPanel.tsx';
import { MfaGate } from './MfaGate.tsx';
import { useSession } from '../../lib/session.tsx';

export default function AdminPage() {
  useCatalog(); // re-render when the live catalogue loads
  usePageMeta('Admin');
  const { isAdmin } = useSession();
  if (!isAdmin)
    return (
      <Page style={{ maxWidth: 860 }}>
        <div className="eyebrow">Internal</div>
        <h1 className="display" style={{ margin: '8px 0 20px', fontSize: 'clamp(26px,3.6vw,38px)' }}>
          Admin
        </h1>
        <MfaGate />
      </Page>
    );
  return (
    <Page style={{ maxWidth: 860 }}>
      <div className="eyebrow">Internal</div>
      <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(26px,3.6vw,38px)' }}>
        Verification queue
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5, maxWidth: 560 }}>Shirts land here when an owner requests expert verification. Nothing resolves by itself — a person has to verify or reject each one.</p>
      <HealthPanel />
      <ReviewQueue />
      <InspectionPanel />
      <CertificatesPanel />
      <DisputesPanel />
      <ApiKeysPanel />
      <AuditPanel />
    </Page>
  );
}
