import { type CSSProperties, type PointerEvent } from "react";
import { Link } from "react-router";
import { BY, pct, type Shirt } from "../../data.ts";
import { usePrefs } from "../../lib/prefs.tsx";
import { ShirtGraphic, alpha } from "../../ui/index.ts";
import { useCollection } from "../vault/useCollection.ts";
import { CollectNudge } from "./CollectNudge.tsx";
import { HomeSearch } from "./HomeSearch.tsx";

/** First screen for visitors: straight into the app — search any shirt. */
export function Hero() {
  const { t } = usePrefs();
  return (
    <section
      aria-labelledby="hero-title"
      style={{
        position: "relative",
        background:
          "radial-gradient(ellipse 55% 55% at 12% -18%,rgba(225,255,236,0.11),rgba(0,0,0,0) 70%),radial-gradient(ellipse 45% 50% at 92% -12%,rgba(225,255,236,0.09),rgba(0,0,0,0) 70%)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "clamp(36px,6vw,72px) var(--gutter) clamp(28px,4vw,48px)",
          textAlign: "center",
        }}
      >
        <div className="eyebrow">{t("home.find.eyebrow")}</div>
        <h1
          id="hero-title"
          className="display"
          style={{
            fontWeight: 800,
            fontSize: "clamp(32px,5vw,56px)",
            margin: "10px auto 22px",
            maxWidth: 820,
            textWrap: "balance",
          }}
        >
          {t("home.find.title")}
        </h1>
        <HomeSearch />
        <CollectNudge />
      </div>
    </section>
  );
}

// Studio-photo shirts fanned out like a collector's cards; the shirt of the
// week sits in the middle. Each card lifts and tilts towards the cursor.
const FAN = [
  "ned-88",
  "juv-9697",
  "acm-0607",
  "ger-26",
  "sui-26",
  "ars-91",
  "nap-8788",
];

export function HeroCards({ featured }: { featured: Shirt }) {
  const { money, t } = usePrefs();
  // "In your collection" only for shirts the signed-in member actually owns.
  const { items } = useCollection();
  const mine = new Set(items.map((c) => c.catalogId).filter(Boolean));
  const ids = FAN.includes(featured.id)
    ? FAN.filter((id) => id !== featured.id)
    : FAN.slice(0, 6);
  const mid = Math.floor(ids.length / 2);
  const cards = [...ids.slice(0, mid), featured.id, ...ids.slice(mid)]
    .map((id) => BY[id])
    .filter((s): s is Shirt => !!s);
  const center = cards.indexOf(featured);

  const tilt = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      "--tx",
      ((e.clientX - r.left) / r.width - 0.5) * 16 + "deg",
    );
    e.currentTarget.style.setProperty(
      "--ty",
      (0.5 - (e.clientY - r.top) / r.height) * 16 + "deg",
    );
  };
  const untilt = (e: PointerEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.removeProperty("--tx");
    e.currentTarget.style.removeProperty("--ty");
  };

  return (
    <ul className="hero-fan" aria-label={t("home.cards")}>
      {cards.map((s, i) => {
        const off = i - center;
        const vars = {
          "--r": off * 5 + "deg",
          "--y": Math.abs(off) * 16 + "px",
          "--sx": off * 14 + "px",
          "--z": 10 - Math.abs(off),
          "--i": i,
        } as CSSProperties;
        const isFeatured = s === featured;
        return (
          <li
            key={s.id}
            className="hero-card-slot"
            data-far={Math.abs(off) > 1 || undefined}
            data-edge={Math.abs(off) > 2 || undefined}
            style={vars}
          >
            <Link
              to={"/shirt/" + s.id}
              className="hero-card"
              aria-label={
                isFeatured
                  ? t("home.shirtOfWeekLabel", { name: s.name })
                  : s.name
              }
              onPointerMove={tilt}
              onPointerLeave={untilt}
            >
              <span
                className="hero-card-photo"
                style={{
                  position: "relative",
                  display: "block",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: `radial-gradient(circle at 50% 45%,${alpha(s.glow, 0.28)} 0%,rgba(0,0,0,0) 62%),var(--surface-2)`,
                }}
              >
                <ShirtGraphic
                  pat={s.pat}
                  trim={s.trim}
                  crest={s.crest}
                  photo={s.photo}
                />
                {(isFeatured || mine.has(s.id)) && (
                  <span
                    className={
                      isFeatured ? "badge badge--solid" : "badge badge--neutral"
                    }
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      fontSize: 10.5,
                      maxWidth: "calc(100% - 16px)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {isFeatured
                      ? t("home.shirtOfWeek")
                      : "✓ " + t("home.cardTag")}
                  </span>
                )}
              </span>
              <span
                style={{
                  display: "block",
                  padding: "10px 4px 4px",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 13.5,
                    fontWeight: 650,
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 6,
                    marginTop: 3,
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  {isFeatured ? (
                    <span style={{ color: "var(--pos)", fontWeight: 600 }}>
                      {pct(s.ch)}
                    </span>
                  ) : (
                    <span>{s.season}</span>
                  )}
                  <span
                    className="mono"
                    style={{ color: "var(--text)", fontWeight: 600 }}
                  >
                    {money(s.price)}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
