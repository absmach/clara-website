// Docs clips. The build removes `autoplay` and adds native controls, so without this script
// (or with reduced motion) visitors see the poster and can press play. With it, each clip gets
// the control bar from docs-player.js, and clips that may autoplay play, muted and looping, only while visible.
async function startClips() {
  let mount = null;
  try { ({ mountPlayer: mount } = await import('/docs-player.js')); } catch { /* the native controls stay */ }
  const videos = [...document.querySelectorAll('.docs-body video')];
  if (mount) for (const video of videos) mount(video);
  // Without the control bar, hand control back to the browser's own.
  const native = clip => { if (!clip.closest('.docs-player')) clip.controls = true; };

  const clips = videos.filter(video => video.hasAttribute('data-autoplay'));
  if (!clips.length) return;
  const quiet = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Reduced motion: no autoplay, and no looping if the reader presses play.
  if (quiet.matches) { for (const video of videos) video.loop = false; return; }
  const watcher = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      // A clip the reader paused stays paused.
      if (isIntersecting && !quiet.matches && !target.dataset.userPaused) target.play().catch(() => native(target));
      else target.pause();
    }
  }, { threshold: 0.4 }) : null;
  for (const clip of clips) {
    clip.muted = true;
    clip.loop = true;
    clip.controls = false;
    if (watcher) watcher.observe(clip);
    else clip.play().catch(() => native(clip));
  }
  // If the preference changes while the page is open, stop the clips.
  quiet.addEventListener('change', () => {
    if (!quiet.matches) return;
    for (const clip of clips) { clip.pause(); clip.loop = false; native(clip); }
  });
}
startClips();
