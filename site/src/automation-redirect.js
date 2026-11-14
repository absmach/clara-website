const destinations = {
  '#workflows': '#workflows',
  '#agents': '#agents',
  '#autonomy': '#autonomy',
  '#automation': '#workflows'
};
window.location.replace('/how-it-works/' + (destinations[window.location.hash] || '#workflows'));
