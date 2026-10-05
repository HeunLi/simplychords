// Points every "Add to Chrome" button at the store listing, or shows "Coming soon" until there is one.
(function () {
  var url = window.SIMPLY_CHORDS_STORE_URL || '';
  document.querySelectorAll('[data-store-link]').forEach(function (a) {
    if (url) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    } else {
      a.removeAttribute('href');
      a.classList.add('is-soon');
      a.setAttribute('aria-disabled', 'true');
      var label = a.querySelector('[data-label]') || a;
      label.textContent = a.dataset.soon || 'Coming soon to the Chrome Web Store';
    }
  });
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
