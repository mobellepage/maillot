import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

// WCAG 2.2 AA via axe-core; the failure message lists each rule and where it broke.
export async function expectAccessible(page, include) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
  if (include) builder.include(include);
  const { violations } = await builder.analyze();
  const report = violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.slice(0, 4).map((n) => n.target.join(' ') + ' — ' + (n.failureSummary || '').split('\n')[1]).join('\n  ')}`)
    .join('\n');
  expect(violations, report).toEqual([]);
}
