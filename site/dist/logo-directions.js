const names = { sunrise: 'Bright side', bloom: 'In bloom', bird: 'Take flight', hello: 'Good company' };
document.querySelectorAll('[data-preview]').forEach(button => {
  button.addEventListener('click', () => {
    const key = button.dataset.preview;
    document.querySelector('#preview-symbol').src = `/assets/logo-concepts/${key}.svg`;
    document.querySelector('#preview-name').textContent = names[key];
    document.querySelector('#selection-note').textContent = `Previewing ${names[key]} in the header. The main website’s logo stays unchanged.`;
    document.querySelectorAll('[data-preview]').forEach(item => {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      item.textContent = selected ? 'In the header ✓' : 'Try in the header ↗';
    });
  });
});
