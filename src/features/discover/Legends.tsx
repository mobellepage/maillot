// Discover: football's legends — one tap to every kit they wore.
import { Link } from "react-router";
import { usePrefs } from "../../lib/prefs.tsx";
import { LEGENDS } from "./model.ts";

export function Legends({ except }: { except?: string }) {
  const { t } = usePrefs();
  return (
    <section
      aria-labelledby="legends-title"
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: "clamp(32px,4vw,56px) var(--gutter) 0",
      }}
    >
      <h2 id="legends-title" className="title" style={{ margin: "0 0 6px" }}>
        {except ? t("legend.more") : "⭐ " + t("home.legends.title")}
      </h2>
      {!except && (
        <p
          style={{ margin: "0 0 16px", color: "var(--text-2)", fontSize: 14.5 }}
        >
          {t("home.legends.body")}
        </p>
      )}
      <ul className="legend-row">
        {LEGENDS.filter((l) => l.slug !== except).map((l) => (
          <li key={l.slug}>
            <Link to={"/legends/" + l.slug} className="kit-disc">
              <span className="kit-disc-img kit-disc-img--gold">
                <img src={l.img} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="kit-disc-name">{l.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
