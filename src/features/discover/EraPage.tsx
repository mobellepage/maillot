// /era/:decade — every kit of one decade (/era/1990 = the 90s) from the big
// leagues and national teams, filterable by league, 48 at a time.
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { usePageMeta } from "../../lib/meta.ts";
import { usePrefs } from "../../lib/prefs.tsx";
import * as db from "../../utils/db.ts";
import { Button, ErrorState, Page, Skeleton } from "../../ui/index.ts";
import { TOP5 } from "../library/model.ts";
import { KitDisc } from "./KitDisc.tsx";
import { ERAS, eraNumber } from "./model.ts";

const PAGE = 48;
const LEAGUES: readonly string[] = [
  ...TOP5,
  "Swiss Super League",
  "National Teams",
];

export default function EraPage() {
  const { t } = usePrefs();
  const decade = Number(useParams().decade);
  const known = ERAS.some((e) => e.decade === decade);
  const era = t("era.label", { d: eraNumber(decade) });
  usePageMeta(t("era.title", { era }), t("era.intro"));
  const [league, setLeague] = useState<string | null>(null);
  const kits = useInfiniteQuery({
    queryKey: ["eraKits", decade, league],
    queryFn: ({ pageParam }) => db.loadEraKits(decade, league, pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      last.length === PAGE ? all.length * PAGE : undefined,
    enabled: known,
    staleTime: 10 * 60_000,
  });
  if (!known) return <Navigate to="/" replace />;
  const list = kits.data?.pages.flat() ?? [];

  return (
    <Page>
      <div className="eyebrow">
        <Link to="/">{t("nav.discover")}</Link> · {t("home.era.title")}
      </div>
      <h1
        className="display"
        style={{ fontSize: "clamp(30px,5vw,48px)", margin: "6px 0 0" }}
      >
        {t("era.title", { era })}
      </h1>
      <p
        style={{
          color: "var(--text-2)",
          margin: "8px 0 0",
          fontSize: 15,
          lineHeight: 1.5,
          maxWidth: 680,
        }}
      >
        {t("era.intro")}
      </p>

      <div
        role="group"
        aria-label={t("era.decades")}
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 18 }}
      >
        {ERAS.map((e) => (
          <Link
            key={e.decade}
            to={"/era/" + e.decade}
            className="option-btn"
            aria-current={e.decade === decade ? "page" : undefined}
            aria-pressed={e.decade === decade}
            style={{
              padding: "7px 13px",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            {t("era.label", { d: eraNumber(e.decade) })}
          </Link>
        ))}
      </div>
      <div
        role="group"
        aria-label={t("lib.leagues")}
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}
      >
        {[null, ...LEAGUES].map((l) => (
          <button
            key={l ?? "all"}
            type="button"
            className="option-btn"
            aria-pressed={league === l}
            onClick={() => setLeague(l)}
            style={{ padding: "7px 13px", fontSize: 13 }}
          >
            {l === null
              ? t("era.all")
              : l === "National Teams"
                ? t("lib.nations")
                : l}
          </button>
        ))}
      </div>

      {kits.isLoading && (
        <Skeleton height={320} radius={20} style={{ marginTop: 22 }} />
      )}
      {kits.isError && (
        <ErrorState what={t("home.era.title")} onRetry={() => kits.refetch()} />
      )}
      <ul className="kit-disc-grid" style={{ marginTop: 24 }}>
        {list.map((k) => (
          <li key={k.id}>
            <KitDisc kit={k} />
          </li>
        ))}
      </ul>
      {kits.data && !list.length && (
        <p style={{ color: "var(--muted)", marginTop: 16 }}>{t("era.none")}</p>
      )}
      {kits.hasNextPage && (
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 24 }}
        >
          <Button
            variant="secondary"
            onClick={() => kits.fetchNextPage()}
            busy={kits.isFetchingNextPage}
            disabled={kits.isFetchingNextPage}
          >
            {t("era.more")}
          </Button>
        </div>
      )}
    </Page>
  );
}
