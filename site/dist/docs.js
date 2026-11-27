// Docs clips. The build removes `autoplay` and adds controls, so without this script
// (or with reduced motion) visitors see the poster and can press play.
(() => {
  const clips = [...document.querySelectorAll('video[data-autoplay]')];
  if (!clips.length) return;
  const quiet = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (quiet.matches) return;
  const watcher = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting && !quiet.matches) target.play().catch(() => {});
      else target.pause();
    }
  }, { threshold: 0.4 }) : null;
  for (const clip of clips) {
    clip.muted = true;
    clip.loop = true;
    clip.controls = false;
    if (watcher) watcher.observe(clip);
    else clip.play().catch(() => { clip.controls = true; });
  }
  // If the preference changes while the page is open, hand control back.
  quiet.addEventListener('change', () => {
    if (!quiet.matches) return;
    for (const clip of clips) { clip.pause(); clip.controls = true; }
  });
})();
