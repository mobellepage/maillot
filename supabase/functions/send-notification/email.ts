// The notification email: branded HTML (table layout, inline styles — what
// mail clients understand) plus a plain-text part. Pure function, no Deno
// APIs, so the app's unit tests cover it (src/__tests__/email.test.js).

export interface EmailInput {
  title: string;
  body: string | null;
  type: string;
  data: Record<string, unknown> | null;
  appUrl: string;
}

const ACCENT = "#4BFF8B";
const INK = "#06110A";

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const id = (v: unknown) => (typeof v === "string" && SAFE_ID.test(v) ? v : null);

/** Where the button goes: the order, else the shirt, else the app. */
export function deepLink({ data, appUrl }: Pick<EmailInput, "data" | "appUrl">): { href: string; label: string } {
  const base = appUrl.replace(/\/$/, "");
  const order = id(data?.order_id);
  if (order) return { href: `${base}/orders/${order}`, label: "View order" };
  const shirt = id(data?.shirt_id);
  if (shirt) return { href: `${base}/shirt/${shirt}`, label: "View shirt" };
  return { href: `${base}/`, label: "Open MAILLOT" };
}

export function renderEmail(input: EmailInput): { subject: string; html: string; text: string } {
  const body = input.body ?? "";
  const base = input.appUrl.replace(/\/$/, "");
  const link = base ? deepLink(input) : null;
  const footer = "You get this email because you have a MAILLOT account and something changed on your orders, bids or listings.";

  const html =
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title></head>` +
    `<body style="margin:0;padding:0;background:#F2F4F1">` +
    // Preheader: the inbox preview line.
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(body)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F1"><tr><td align="center" style="padding:32px 16px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">` +
    `<tr><td style="background:#0A0C0B;padding:20px 28px">` +
    (base ? `<img src="${escapeHtml(base)}/icons/icon-192.png" width="28" height="28" alt="" style="vertical-align:middle;border:0;border-radius:7px">` : "") +
    `<span style="vertical-align:middle;margin-left:10px;color:#F2F4F1;font-weight:800;font-size:18px;letter-spacing:.06em">MAILLOT</span></td></tr>` +
    `<tr><td style="padding:28px 28px 8px"><h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;color:#0A0C0B">${escapeHtml(input.title)}</h1>` +
    `<p style="margin:0;font-size:15px;line-height:1.55;color:#3A403C">${escapeHtml(body)}</p></td></tr>` +
    (link
      ? `<tr><td style="padding:20px 28px 8px"><a href="${escapeHtml(link.href)}" style="display:inline-block;background:${ACCENT};color:${INK};padding:12px 22px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">${link.label}</a></td></tr>`
      : "") +
    `<tr><td style="padding:24px 28px 28px;font-size:12px;line-height:1.5;color:#6B726D">${footer}` +
    (base ? ` <a href="${escapeHtml(base)}/help" style="color:#6B726D">Help</a>` : "") +
    `</td></tr></table></td></tr></table></body></html>`;

  const text = [input.title, "", body, ...(link ? ["", `${link.label}: ${link.href}`] : []), "", "—", footer].join("\n");
  return { subject: input.title, html, text };
}
