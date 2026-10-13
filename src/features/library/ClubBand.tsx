// A club's colours as a striped band.
export function ClubBand({ colors, height = 10 }: { colors: string[]; height?: number }) {
  return <div aria-hidden="true" style={{ height, display: 'flex', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--line)' }}>{colors.map((c, i) => <span key={i} style={{ flex: 1, background: c }} />)}</div>;
}
