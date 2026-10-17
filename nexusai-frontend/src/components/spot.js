// Cursor spotlight: stores the pointer position (relative to the element) in
// CSS variables, and the stylesheet draws a soft glow there. No React state,
// so moving the mouse never re-renders anything.
export function onSpot(e) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}
