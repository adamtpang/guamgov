// Shared header Menu (america.gov parity): a pill button that opens a panel of every route and page.
(function () {
  var bar = document.querySelector('.nav');
  if (!bar) return;
  var nav = bar.querySelector('.navlinks');
  if (!nav) {
    var old = bar.querySelector(':scope > a.pill');
    if (old) old.remove();
    nav = document.createElement('span');
    nav.className = 'navlinks';
    bar.appendChild(nav);
  }
  var LINKS = [
    ['Ask PermitGU', '/ask', 'Get an answer from official sources'],
    ['Start a food truck', '/food-truck', 'Full route'],
    ['Repair typhoon damage', '/typhoon-repair', 'Full route'],
    ['Build a house, addition, or fence', '/build', 'Full route'],
    ['Clear, grade, or install septic', '/clear-grade', 'Full route'],
    ['Other government services', '/#all', 'Licenses, IDs, bills, and more'],
  ];
  var MORE = [['How it works', '/how-it-works'], ['Privacy', '/privacy'], ['About', '/about']];
  nav.innerHTML = '<a class="hide-sm" href="/how-it-works">How it works</a>' +
    '<button type="button" class="pill menu" id="menuBtn" aria-expanded="false" aria-controls="menuPanel">Menu</button>';
  var panel = document.createElement('div');
  panel.className = 'menu-panel';
  panel.id = 'menuPanel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Menu');
  panel.innerHTML = '<div class="menu-sheet"><div class="menu-top"><span class="wm">Permit<b>GU</b></span>' +
    '<button type="button" class="menu-close" aria-label="Close menu">&times;</button></div><nav class="menu-links">' +
    LINKS.map(function (l) { return '<a href="' + l[1] + '"><b>' + l[0] + '</b><small>' + l[2] + '</small></a>'; }).join('') +
    '</nav><div class="menu-more">' + MORE.map(function (l) { return '<a href="' + l[1] + '">' + l[0] + '</a>'; }).join('') +
    '</div><p class="menu-note">Unofficial demo. Not affiliated with the Government of Guam.</p></div>';
  document.body.appendChild(panel);
  var btn = document.getElementById('menuBtn');
  function set(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) panel.querySelector('.menu-close').focus(); else btn.focus();
  }
  btn.onclick = function () { set(true); };
  panel.querySelector('.menu-close').onclick = function () { set(false); };
  panel.addEventListener('click', function (e) { if (e.target === panel || e.target.closest('.menu-links a,.menu-more a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) set(false); });
})();
