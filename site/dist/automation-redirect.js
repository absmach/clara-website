const destinations = {
  '#workflows': '#workflow-screen',
  '#agents': '#agent-screen',
  '#autonomy': '#autonomy',
  '#automation': '#workflows'
};
window.location.replace('/how-it-works/' + (destinations[window.location.hash] || '#workflows'));
