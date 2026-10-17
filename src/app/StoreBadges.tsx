// "Download on the App Store" / "Get it on Google Play" badges. A badge links
// to its store once the link is set (STORE_LINKS in config/site.ts); before
// that it is shown with a "coming soon" note and isn't clickable. Hidden
// inside the native app, which is already installed.
import { STORE_LINKS } from "../config/site.ts";
import { usePrefs } from "../lib/prefs.tsx";
import { isNative } from "../lib/native.ts";

const BADGES = [
  {
    key: "appStore",
    src: "/badges/app-store.png",
    alt: "Download on the App Store",
    store: "App Store",
  },
  {
    key: "googlePlay",
    src: "/badges/google-play.png",
    alt: "Get it on Google Play",
    store: "Google Play",
  },
] as const;

export function StoreBadges({
  align = "center",
  height = 40,
}: {
  align?: "center" | "start";
  height?: number;
}) {
  const { t } = usePrefs();
  if (isNative()) return null;
  const width = Math.round((height * 406) / 120);
  return (
    <ul
      className="store-badges"
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
      }}
    >
      {BADGES.map((b) => {
        const href = STORE_LINKS[b.key];
        const img = (
          <img
            src={b.src}
            alt={href ? b.alt : t("store.soon", { store: b.store })}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            style={{ display: "block", borderRadius: height * 0.19 }}
          />
        );
        return (
          <li
            key={b.key}
            style={{ display: "grid", justifyItems: "center", gap: 4 }}
          >
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="store-badge"
              >
                {img}
              </a>
            ) : (
              <>
                <span className="store-badge">{img}</span>
                <span
                  aria-hidden="true"
                  style={{ fontSize: 11.5, color: "var(--muted)" }}
                >
                  {t("store.soonShort")}
                </span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
