const controls = document.querySelectorAll('[data-bloom]');
controls.forEach(button => button.addEventListener('click', () => {
  const { bloom, name } = button.dataset;
  document.querySelectorAll('[data-selected-mark]').forEach(image => {
    image.src = `/assets/logo-concepts/${bloom}.svg`;
  });
  document.querySelectorAll('[data-selected-mono]').forEach(image => {
    image.src = `/assets/logo-concepts/${bloom}-mono.svg`;
  });
  document.querySelector('#study-favicon').href = `/assets/logo-concepts/${bloom}-favicon.svg`;
  document.querySelector('#application-title').textContent = `${name}, out in the world.`;
  document.querySelector('#selection-note').textContent = `Now previewing ${name}, including this tab’s favicon.`;
  controls.forEach(control => {
    const selected = control === button;
    control.setAttribute('aria-pressed', String(selected));
    control.textContent = selected ? 'Previewing below ✓' : 'Preview this bloom ↓';
  });
}));
