// Moves focus to the page's <main> (skip link, after in-app navigation).
export function focusMain() {
  const main = document.getElementById('main');
  if (!main) return false;
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  main.focus({ preventScroll: true });
  return true;
}
