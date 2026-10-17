// Discover: "Popular today" — nine kits collectors liked and added lately,
// topped up with this season's big kits; three rows of three on a phone,
// one row on a wide screen.
import { useQuery } from "@tanstack/react-query";
import { usePrefs } from "../../lib/prefs.tsx";
import * as db from "../../utils/db.ts";
import { KitDisc } from "./KitDisc.tsx";

export function PopularToday() {
  const { t } = usePrefs();
  const kits = useQuery({
    queryKey: ["popularKits"],
    queryFn: () => db.loadPopularKits(9),
    staleTime: 15 * 60_000,
    retry: false,
  });
  if (!kits.data?.length) return null;
  return (
    <section
      aria-labelledby="pop-title"
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: "clamp(32px,4vw,56px) var(--gutter) 0",
      }}
    >
      <h2 id="pop-title" className="title" style={{ margin: "0 0 16px" }}>
        🔥 {t("home.pop.title")}
      </h2>
      <ul className="kit-disc-grid kit-disc-grid--nine">
        {kits.data.map((k) => (
          <li key={k.id}>
            <KitDisc kit={k} />
          </li>
        ))}
      </ul>
    </section>
  );
}
