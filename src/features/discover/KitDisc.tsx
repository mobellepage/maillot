// A library kit as a round picture with its club and season underneath —
// Discover's "popular today", eras and legends grids.
import { Link } from "react-router";
import { usePrefs } from "../../lib/prefs.tsx";
import type { KitTile } from "../../utils/db.ts";
import { kitHref } from "./model.ts";

export function KitDisc({ kit, sub }: { kit: KitTile; sub?: string }) {
  const { t } = usePrefs();
  const name = `${kit.club_name} ${kit.season}`;
  return (
    <Link
      to={kitHref(kit)}
      className="kit-disc"
      aria-label={`${name} · ${t("lib.kind." + kit.kind)}`}
    >
      <span className="kit-disc-img">
        {kit.image_path && (
          <img src={kit.image_path} alt="" loading="lazy" decoding="async" />
        )}
      </span>
      <span className="kit-disc-name">{kit.club_name}</span>
      <span className="kit-disc-sub">
        {sub ?? kit.season + " · " + t("lib.kind." + kit.kind)}
      </span>
    </Link>
  );
}
