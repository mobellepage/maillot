// Under the Discover search: one compact row inviting people to build their
// digital shirt collection — three example shirts fanned out like cards, or,
// once you have shirts, three of your own and a way to your collection.
// Small enough that the leagues stay in view.
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import * as db from '../../utils/db.ts';
import { ShirtGraphic } from '../../ui/index.ts';
import { itemLook, mainPhoto } from '../vault/model.ts';
import { useCollection } from '../vault/useCollection.ts';

const EXAMPLES = ['acm-0607', 'ger-26', 'sui-26'];

export function CollectNudge() {
  const { t, tp } = usePrefs();
  const { user } = useSession();
  const { items } = useCollection();
  const counts = useQuery({ queryKey: ['kitCounts'], queryFn: db.loadKitCounts, staleTime: 5 * 60_000, retry: false });
  const kits = counts.data ? Object.values(counts.data).reduce((a, n) => a + n, 0) : 0;
  const mine = user ? items.slice(0, 3) : [];
  const url = usePhotoUrls(mine.map(mainPhoto), true);

  const cards = mine.length
    ? mine.map((c) => {
        const photo = url(mainPhoto(c));
        const cat = c.catalogId ? BY[c.catalogId] : undefined;
        if (photo) return <img key={c.id} src={photo} alt="" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />;
        if (c.kitImage) return <img key={c.id} src={c.kitImage} alt="" />;
        return <ShirtGraphic key={c.id} flat {...itemLook(c).look} photo={cat?.photo} style={{ width: '88%' }} />;
      })
    : EXAMPLES.map((id) => BY[id]).map((s, i) => (s ? <ShirtGraphic key={s.id} flat pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} style={{ width: '88%' }} /> : <span key={i} />));

  return (
    <Link to={mine.length ? '/vault' : user ? '/vault/add/library' : '/signin'} state={user ? undefined : { from: '/vault/add/library' }} className="collect-nudge">
      <span className="nudge-fan" aria-hidden="true">
        {cards.map((c, i) => (
          <span key={i} className="nudge-card" style={{ ['--r' as string]: (i - 1) * 9 + 'deg' }}>
            {c}
          </span>
        ))}
      </span>
      <span style={{ minWidth: 0 }}>
        <strong>{mine.length ? t('home.nudge.mine') : t('home.nudge.title')}</strong>
        <span className="collect-nudge-sub">{mine.length ? tp('coll.shirts', items.length) : kits > 0 ? t('home.nudge.count', { kits: kits.toLocaleString('de-CH') }) : ''}</span>
      </span>
      {mine.length ? <span className="collect-nudge-btn">{t('home.nudge.open')}</span> : <span aria-hidden="true">›</span>}
    </Link>
  );
}
