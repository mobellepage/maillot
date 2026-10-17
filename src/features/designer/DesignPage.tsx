// /design/:id — a shared kit design, front and back, by its designer. Share
// it, save the picture, or start your own from it.
import { useRef } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, ButtonLink, EmptyState, ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { KitSvg } from './KitSvg.tsx';
import { cleanDesign } from './model.ts';
import { designUrl, downloadPicture, shareLink } from './share.ts';

export default function DesignPage() {
  const { t } = usePrefs();
  const toast = useToast();
  const { id = '' } = useParams();
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const q = useQuery({ queryKey: ['sharedDesign', id], queryFn: () => db.loadSharedDesign(id), enabled: valid });
  const d = q.data;
  usePageMeta(d ? t('des.pageMeta', { name: d.name }) : t('des.meta'), d?.handle ? t('des.by', { handle: '@' + d.handle }) : undefined);
  const front = useRef<SVGSVGElement>(null);

  if (valid && q.isLoading)
    return (
      <Page>
        <Skeleton height={420} radius={28} />
      </Page>
    );
  if (q.isError)
    return (
      <Page>
        <ErrorState what={t('des.title')} onRetry={() => q.refetch()} />
      </Page>
    );
  if (!d)
    return (
      <Page narrow>
        <EmptyState title={t('des.notFound')} action={<ButtonLink to="/designer">{t('des.own')}</ButtonLink>}>
          {t('des.notFoundBody')}
        </EmptyState>
      </Page>
    );

  const design = cleanDesign(d.design);
  const share = async () => {
    const r = await shareLink(designUrl(d.id), d.name);
    if (r === 'copied') toast(t('des.linkCopied'));
    else if (r === 'failed') toast(designUrl(d.id));
  };

  return (
    <Page>
      <div className="eyebrow">
        <Link to="/designer">{t('des.eyebrow')}</Link>
      </div>
      <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,48px)', margin: '6px 0 0', overflowWrap: 'anywhere' }}>
        {d.name}
      </h1>
      {d.handle && (
        <Link to={'/u/' + d.handle} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>
          <Avatar avatar={d.avatar} name={d.handle} size={28} ring={false} />
          {t('des.by', { handle: '@' + d.handle })}
        </Link>
      )}
      <div className="design-pair">
        <figure>
          <div className="designer-stage">
            <KitSvg ref={front} design={design} title={d.name + ' · ' + t('des.front')} />
          </div>
          <figcaption>{t('des.front')}</figcaption>
        </figure>
        <figure>
          <div className="designer-stage">
            <KitSvg design={design} view="back" title={d.name + ' · ' + t('des.back')} />
          </div>
          <figcaption>{t('des.back')}</figcaption>
        </figure>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
        <Button onClick={share}>🔗 {t('des.share')}</Button>
        <Button variant="secondary" onClick={() => front.current && downloadPicture(front.current, d.name).catch(() => toast(t('des.pictureFailed')))}>
          ⬇ {t('des.picture')}
        </Button>
        {d.is_mine ? (
          <ButtonLink to={'/designer?id=' + d.id} variant="ghost">
            {t('des.edit')}
          </ButtonLink>
        ) : (
          <ButtonLink to={'/designer?from=' + d.id} variant="ghost">
            {t('des.remix')}
          </ButtonLink>
        )}
      </div>
    </Page>
  );
}
