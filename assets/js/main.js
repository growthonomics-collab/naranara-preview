/* Nara Nara redesign prototype. Vanilla JS, no dependencies. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var EN = document.documentElement.lang === 'en' || !!$('[data-lang-en]');
  var T = function (el, en) { return EN ? en : el; };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var money = function (n) { return n.toFixed(2).replace('.', ',') + ' €'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var IMG = (document.body.getAttribute('data-assets') || 'assets/') + 'img/';

  /* ---------- Age gate (required for tobacco products) ---------- */
  var age = $('.age');
  if (age && !store.get('nn_age', false)) {
    age.classList.add('open');
    $('[data-age-yes]', age).addEventListener('click', function () { store.set('nn_age', true); age.classList.remove('open'); });
    $('[data-age-no]', age).addEventListener('click', function () {
      $('.age-box p', age).textContent = T('Το κατάστημα είναι διαθέσιμο μόνο σε ενήλικες άνω των 18 ετών.', 'This store is only available to adults aged 18 and over.');
    });
  }

  /* ---------- Header: compact on scroll, back to top ---------- */
  var header = $('.header'), toTop = $('.to-top');
  function onScroll() {
    var y = window.pageYOffset;
    if (header) header.classList.toggle('scrolled', y > 40);
    if (toTop) toTop.classList.toggle('show', y > 900);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- Drawers ---------- */
  var scrim = $('.scrim'), lastFocus = null;
  function closeDrawers() {
    $$('.drawer.open').forEach(function (d) { d.classList.remove('open'); });
    if (scrim) scrim.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) { lastFocus.focus(); lastFocus = null; }
  }
  function openDrawer(id, from) {
    var d = document.getElementById(id); if (!d) return;
    closeDrawers(); lastFocus = from || document.activeElement;
    d.classList.add('open'); scrim.classList.add('open'); document.body.style.overflow = 'hidden';
    var f = $('button, a, input', d); if (f) f.focus();
  }
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); openDrawer(o.getAttribute('data-open'), o); return; }
    if (e.target.closest('[data-close]')) closeDrawers();
  });
  if (scrim) scrim.addEventListener('click', closeDrawers);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrawers(); closeSearch(); }
    if (e.key === 'Tab') {
      var d = $('.drawer.open'); if (!d) return;
      var f = $$('a[href], button:not([disabled]), input, select, textarea', d).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- Search with live results over the catalogue ---------- */
  var sbtn = $('[data-search]'), sp = $('.search-panel'), CAT = [];
  try { CAT = JSON.parse($('#nn-catalogue').textContent); } catch (e) {}
  function closeSearch() { if (sp) { sp.classList.remove('open'); if (sbtn) sbtn.setAttribute('aria-expanded', 'false'); } }
  if (sbtn && sp) {
    var sin = $('input', sp), sres = $('.search-results', sp);
    sbtn.addEventListener('click', function () {
      var open = sp.classList.toggle('open'); sbtn.setAttribute('aria-expanded', open);
      if (open) sin.focus();
    });
    var runSearch = function () {
      var q = sin.value.trim().toLowerCase();
      if (q.length < 2) { sres.innerHTML = ''; return; }
      var hits = CAT.filter(function (p) { return (p.n + ' ' + p.b).toLowerCase().indexOf(q) > -1; }).slice(0, 6);
      sres.innerHTML = hits.length ? hits.map(function (p) {
        return '<a class="s-hit" href="' + p.u + '"><span class="line-img"><img src="' + IMG + p.i + '" alt=""></span><span><b>' + esc(p.n) + '</b><small>' + esc(p.b) + '</small></span><em>' + (p.v ? T('Από ', 'From ') : '') + money(p.p) + '</em></a>';
      }).join('') : '<p class="muted s-none">' + T('Δεν βρέθηκαν προϊόντα για «', 'No products found for "') + esc(sin.value) + T('». Δοκιμάστε το όνομα ενός οίκου.', '". Try a brand name.') + '</p>';
    };
    sin.addEventListener('input', runSearch);
    $('form', sp).addEventListener('submit', function (e) { e.preventDefault(); runSearch(); var a = $('.s-hit', sres); if (a) a.focus(); });
  }

  /* ---------- Cart (demo state kept in the browser) ---------- */
  var cart = store.get('nn_cart', []);
  function count() { return cart.reduce(function (a, i) { return a + i.q; }, 0); }
  function save() { store.set('nn_cart', cart); paintCart(); }
  function totals() {
    var sub = cart.reduce(function (a, i) { return a + i.p * i.q; }, 0);
    var shipEl = $('input[name=ship]:checked');
    $$('[data-subtotal]').forEach(function (e) { e.textContent = money(sub); });
    $$('[data-ship]').forEach(function (e) { e.textContent = shipEl ? shipEl.getAttribute('data-label') : T('Υπολογίζεται στο ταμείο', 'Calculated at checkout'); });
    $$('[data-total]').forEach(function (e) { e.textContent = money(sub); });
  }
  function lineHtml(i, x, mode) {
    var v = i.v ? '<div class="line-var">' + esc(i.v) + '</div>' : '';
    if (mode === 'mini') return '<div class="mini-line"><div class="line-img"><img src="' + IMG + i.i + '" alt=""><span class="q">' + i.q + '</span></div><div><b>' + esc(i.n) + '</b>' + v + '</div><b>' + money(i.p * i.q) + '</b></div>';
    return '<div class="line"><div class="line-img"><img src="' + IMG + i.i + '" alt=""></div><div><div class="line-top"><div><div class="line-name">' + esc(i.n) + '</div>' + v + '</div><b>' + money(i.p * i.q) + '</b></div><div class="line-bot"><div class="qty" data-x="' + x + '"><button type="button" aria-label="' + T('Μείωση ποσότητας', 'Decrease quantity') + '">&minus;</button><input type="number" value="' + i.q + '" min="1" aria-label="' + T('Ποσότητα', 'Quantity') + '"><button type="button" data-inc aria-label="' + T('Αύξηση ποσότητας', 'Increase quantity') + '">+</button></div><button type="button" class="remove" data-rm="' + x + '">' + T('Αφαίρεση', 'Remove') + '</button></div></div></div>';
  }
  function paintCart() {
    var n = count();
    $$('.cart-count').forEach(function (el) { el.textContent = n; el.setAttribute('data-n', n); });
    $$('[data-cart-empty]').forEach(function (e) { e.hidden = cart.length > 0; });
    $$('[data-cart-full]').forEach(function (e) { e.hidden = cart.length === 0; });
    $$('[data-cart-lines]').forEach(function (box) {
      var mode = box.getAttribute('data-cart-lines');
      box.innerHTML = cart.map(function (i, x) { return lineHtml(i, x, mode); }).join('');
    });
    totals();
  }
  function add(item, q) {
    var hit = cart.filter(function (i) { return i.id === item.id && i.v === item.v; })[0];
    if (hit) hit.q += q; else { item.q = q; cart.push(item); }
    save();
    var note = $('#cart-drawer .added'); if (note) { note.hidden = false; note.textContent = item.n + T(' προστέθηκε στο καλάθι', ' added to your cart'); }
    if (document.getElementById('cart-drawer')) openDrawer('cart-drawer');
  }
  var seedBox = $('[data-seed]');
  if (seedBox && !cart.length && !store.get('nn_seeded', false)) { try { cart = JSON.parse(seedBox.getAttribute('data-seed')); store.set('nn_seeded', true); store.set('nn_cart', cart); } catch (e) {} }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]');
    if (b) {
      e.preventDefault();
      if (b.disabled) return;
      var q = 1, v = '';
      if (b.hasAttribute('data-main')) {
        var qi = $('.buy .qty input'); if (qi) q = Math.max(1, parseInt(qi.value, 10) || 1);
        var sw = $('.swatch[aria-pressed=true]'); if (sw) v = sw.textContent.trim();
      }
      add({ id: b.getAttribute('data-add'), n: b.getAttribute('data-name'), p: parseFloat(b.getAttribute('data-price')), i: b.getAttribute('data-img'), v: v }, q);
      return;
    }
    var r = e.target.closest('[data-rm]');
    if (r) { cart.splice(+r.getAttribute('data-rm'), 1); save(); return; }
    var s = e.target.closest('.qty button');
    if (s) {
      var inp = $('input', s.parentNode), nv = Math.max(1, (parseInt(inp.value, 10) || 1) + (s.hasAttribute('data-inc') ? 1 : -1));
      inp.value = nv; inp.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  document.addEventListener('change', function (e) {
    var q = e.target.closest('.qty[data-x]');
    if (q) { cart[+q.getAttribute('data-x')].q = Math.max(1, parseInt(e.target.value, 10) || 1); save(); }
    if (e.target.name === 'ship') totals();
  });
  paintCart();

  /* ---------- Read more / less ---------- */
  $$('.more-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.closest('.more-wrap').classList.toggle('open');
      b.textContent = open ? T('Δείτε λιγότερα', 'Show less') : T('Διαβάστε περισσότερα', 'Read more');
      b.setAttribute('aria-expanded', open);
    });
  });
  $$('.f-more').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.previousElementSibling.classList.toggle('open');
      b.textContent = open ? T('Δείτε λιγότερα', 'Show less') : T('Δείτε περισσότερα', 'Show more');
      b.setAttribute('aria-expanded', open);
    });
  });

  /* ---------- Category: sort + working filters ---------- */
  var grid = $('[data-grid]');
  if (grid) {
    var cards = $$('.card', grid), F = { brand: '', min: null, max: null, sale: false, isnew: false, stock: [] };
    var countEl = $('[data-count]'), activeEl = $('[data-active]'), emptyEl = $('[data-noresults]');
    var apply = function () {
      var n = 0;
      cards.forEach(function (c) {
        var p = parseFloat(c.dataset.price);
        var ok = (!F.brand || c.dataset.brand === F.brand) && (F.min === null || p >= F.min) && (F.max === null || p <= F.max) && (!F.sale || c.dataset.sale === '1') && (!F.isnew || c.dataset.new === '1') && (!F.stock.length || F.stock.indexOf(c.dataset.stock) > -1);
        c.hidden = !ok; if (ok) n++;
      });
      if (countEl) countEl.textContent = n === 1 ? T('1 προϊόν', '1 product') : n + T(' προϊόντα', ' products');
      if (emptyEl) emptyEl.hidden = n > 0;
      var chips = [];
      if (F.brand) chips.push(['brand', F.brand]);
      if (F.min !== null || F.max !== null) chips.push(['price', (F.min !== null ? money(F.min) : '0 €') + ' ' + T('έως', 'to') + ' ' + (F.max !== null ? money(F.max) : '∞')]);
      if (F.sale) chips.push(['sale', T('Σε προσφορά', 'On offer')]);
      if (F.isnew) chips.push(['isnew', T('Νέες αφίξεις', 'New arrivals')]);
      if (F.stock.indexOf('instock') > -1) chips.push(['instock', T('Άμεσα διαθέσιμα', 'In stock')]);
      if (F.stock.indexOf('outofstock') > -1) chips.push(['outofstock', T('Εξαντλημένα', 'Out of stock')]);
      if (activeEl) {
        activeEl.hidden = !chips.length;
        activeEl.innerHTML = chips.map(function (c) { return '<button type="button" class="chip on" data-clear="' + c[0] + '">' + esc(c[1]) + ' <span aria-hidden="true">×</span><span class="sr">' + T('Αφαίρεση φίλτρου', 'Remove filter') + '</span></button>'; }).join('') + (chips.length ? '<button type="button" class="f-reset" data-clear="all">' + T('Καθαρισμός όλων', 'Clear all') + '</button>' : '');
      }
      $$('[data-brand-chip]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-brand-chip') === F.brand); });
      $$('[data-f-sale]').forEach(function (i) { i.checked = F.sale; });
      $$('[data-f-new]').forEach(function (i) { i.checked = F.isnew; });
      $$('[data-f-stock]').forEach(function (i) { i.checked = F.stock.indexOf(i.getAttribute('data-f-stock')) > -1; });
    };
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-brand-chip]');
      if (b) { e.preventDefault(); var v = b.getAttribute('data-brand-chip'); F.brand = F.brand === v ? '' : v; apply(); return; }
      var c = e.target.closest('[data-clear]');
      if (c) {
        var k = c.getAttribute('data-clear');
        if (k === 'all' || k === 'brand') F.brand = '';
        if (k === 'all' || k === 'price') { F.min = F.max = null; $$('[data-f-min],[data-f-max]').forEach(function (i) { i.value = ''; }); }
        if (k === 'all' || k === 'sale') F.sale = false;
        if (k === 'all' || k === 'isnew') F.isnew = false;
        if (k === 'all') F.stock = [];
        if (k === 'instock' || k === 'outofstock') F.stock = F.stock.filter(function (x) { return x !== k; });
        apply();
      }
    });
    document.addEventListener('change', function (e) {
      if (e.target.matches('[data-f-sale]')) { F.sale = e.target.checked; apply(); }
      if (e.target.matches('[data-f-new]')) { F.isnew = e.target.checked; apply(); }
      if (e.target.matches('[data-f-stock]')) {
        var sv = e.target.getAttribute('data-f-stock');
        F.stock = F.stock.filter(function (x) { return x !== sv; }); if (e.target.checked) F.stock.push(sv);
        apply();
      }
    });
    $$('form[data-f-price]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var a = parseFloat($('[data-f-min]', f).value), b = parseFloat($('[data-f-max]', f).value);
        F.min = isNaN(a) ? null : a; F.max = isNaN(b) ? null : b; apply();
      });
    });
    var sort = $('[data-sort]');
    if (sort) sort.addEventListener('change', function () {
      var v = sort.value;
      cards.slice().sort(function (a, b) {
        var pa = parseFloat(a.dataset.price), pb = parseFloat(b.dataset.price);
        if (v === 'low') return pa - pb; if (v === 'high') return pb - pa;
        return parseInt(a.dataset.i, 10) - parseInt(b.dataset.i, 10);
      }).forEach(function (c) { grid.appendChild(c); });
    });
  }

  /* ---------- Blog topic filter ---------- */
  $$('[data-topic]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-topic');
      $$('[data-topic]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      $$('[data-post-topic]').forEach(function (p) { p.hidden = t !== 'all' && p.getAttribute('data-post-topic') !== t; });
    });
  });

  /* ---------- Product gallery, swatches, sticky buy bar ---------- */
  var thumbs = $$('.g-thumbs button'), gi = 0;
  function showImg(i) {
    if (!thumbs.length) return;
    gi = (i + thumbs.length) % thumbs.length;
    $('.g-main img').src = thumbs[gi].getAttribute('data-full');
    thumbs.forEach(function (x, k) { x.setAttribute('aria-current', k === gi); });
    var c = $('.g-count'); if (c) c.textContent = (gi + 1) + ' / ' + thumbs.length;
  }
  thumbs.forEach(function (b, i) { b.addEventListener('click', function () { showImg(i); }); });
  $$('[data-g]').forEach(function (b) { b.addEventListener('click', function () { showImg(gi + (b.getAttribute('data-g') === 'next' ? 1 : -1)); }); });
  var gm = $('.g-main');
  if (gm) {
    gm.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') showImg(gi + 1); if (e.key === 'ArrowLeft') showImg(gi - 1); });
    var gimg = $('img', gm);
    gm.addEventListener('mousemove', function (e) {
      if (!window.matchMedia('(hover:hover)').matches) return;
      var r = gm.getBoundingClientRect();
      gimg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%';
      gimg.style.transform = 'scale(1.8)';
    });
    gm.addEventListener('mouseleave', function () { gimg.style.transform = ''; });
  }
  function pickSwatch(b) {
    $$('.swatch').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
    var out = $('[data-swatch-out]'); if (out) out.textContent = b.textContent.trim();
    var main = $('[data-main]'), line = $('[data-stock-line]'), pr = $('[data-pdp-price]'), sp = $('[data-sticky-price]');
    var price = parseFloat(b.dataset.price), old = parseFloat(b.dataset.old), ok = b.dataset.stock === '1';
    if (pr && !isNaN(price)) pr.innerHTML = !isNaN(old) ? '<span class="now">' + money(price) + '</span><del>' + money(old) + '</del>' : money(price);
    if (sp && !isNaN(price)) sp.textContent = money(price);
    if (main) {
      if (!isNaN(price)) main.setAttribute('data-price', price);
      main.disabled = !ok; main.textContent = main.getAttribute(ok ? 'data-l-add' : 'data-l-out');
    }
    if (line) { line.classList.toggle('out', !ok); line.textContent = line.getAttribute(ok ? 'data-l-in' : 'data-l-out'); }
  }
  $$('.swatch').forEach(function (b) { b.addEventListener('click', function () { pickSwatch(b); }); });
  var sb = $('.stickybuy'), br = $('.buy-row');
  if (sb && br && 'IntersectionObserver' in window) new IntersectionObserver(function (en) { sb.classList.toggle('show', !en[0].isIntersecting && en[0].boundingClientRect.top < 0); }).observe(br);

  /* ---------- Demo forms: no backend in the prototype ---------- */
  $$('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.hasAttribute('data-order')) { cart = []; save(); }
      var p = $('.form-note', f) || document.createElement('p');
      p.className = 'note form-note'; p.setAttribute('role', 'status'); p.textContent = f.getAttribute('data-demo');
      f.appendChild(p);
    });
  });
})();
