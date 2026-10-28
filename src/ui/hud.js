// Title, a collapsible controls card, and the follow toggle (desktop only).
export function createHud(root, { touch, onToggleFollow }) {
  root.innerHTML = `
    <div class="hud-title">Pelican Beach Day</div>
    ${touch ? '<div class="hud-tag">Following the pelican</div>' : `
    <div class="hud-card" data-open="true">
      <button class="hud-card-toggle" type="button" aria-expanded="true">Controls</button>
      <ul class="hud-keys">
        <li><kbd>W</kbd><kbd>S</kbd> fly forward / back</li>
        <li><kbd>A</kbd><kbd>D</kbd> slide left / right</li>
        <li><kbd>E</kbd><kbd>Q</kbd> up / down</li>
        <li><kbd>Shift</kbd> go faster</li>
        <li><span class="hud-ico">drag</span> look around</li>
        <li><span class="hud-ico">scroll</span> zoom</li>
        <li><kbd>F</kbd> follow the pelican &middot; <kbd>Esc</kbd> fly free</li>
      </ul>
    </div>
    <button class="hud-follow" type="button">Follow the pelican</button>`}
  `;
  if (touch) return { setMode() {} };

  const card = root.querySelector('.hud-card');
  const toggle = root.querySelector('.hud-card-toggle');
  const follow = root.querySelector('.hud-follow');
  toggle.addEventListener('click', () => {
    const open = card.dataset.open !== 'true';
    card.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  follow.addEventListener('click', (e) => { e.currentTarget.blur(); onToggleFollow(); });
  return {
    setMode(mode) {
      follow.textContent = mode === 'follow' ? 'Free roam' : 'Follow the pelican';
      follow.classList.toggle('active', mode === 'follow');
    },
  };
}
