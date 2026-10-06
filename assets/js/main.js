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
  var ASSETS = document.body.getAttribute('data-assets') || 'assets/';
  var IMG = ASSETS + 'img/';

  /* ---------- Catalogue: every product of the live categories, with price and stock ---------- */
  var catP = null, thumbP = {}, TH = {};
  function loadCat() {
    if (!catP) catP = fetch(ASSETS + 'data/catalogue.json').then(function (r) { return r.json(); }).then(function (C) {
      C.byId = {}; C.products.forEach(function (p) { C.byId[p.id] = p; });
      return C;
    });
    return catP;
  }
  function loadThumbs(list) {
    var ks = []; list.forEach(function (p) { if (ks.indexOf(p.k) < 0) ks.push(p.k); });
    return Promise.all(ks.map(function (k) {
      if (!thumbP[k]) thumbP[k] = fetch(ASSETS + 'data/thumbs-' + k + '.json').then(function (r) { return r.json(); }).then(function (o) { Object.keys(o).forEach(function (id) { TH[id] = o[id]; }); }).catch(function () {});
      return thumbP[k];
    }));
  }
  function paintThumbs(root) { $$('img[data-th]', root).forEach(function (im) { var u = TH[im.getAttribute('data-th')]; if (u) { im.src = u; im.removeAttribute('data-th'); } }); }
  var BRAND_PARENTS = ['nargiledes', 'kapnoi', 'aromatika-ygra', 'poura'];
  function termName(C, t) { return C.terms[t] ? (EN ? C.terms[t].en : C.terms[t].el) : ''; }
  function brandOf(C, p) { for (var i = 0; i < p.t.length; i++) { var t = C.terms[p.t[i]]; if (t && BRAND_PARENTS.indexOf(t.p) > -1) return termName(C, p.t[i]); } return ''; }
  function priceHtml(p) {
    if (p.p === null) return '<span class="from">' + T('Τιμή στο κατάστημα', 'Price in store') + '</span>';
    if (p.o) return '<span class="now">' + money(p.p) + '</span><del>' + money(p.o) + '</del>';
    return (p.r ? '<span class="from">' + T('Από', 'From') + '</span>' : '') + money(p.p);
  }
  function cardHtml(C, p) {
    var badge = !p.s ? '<span class="badge out">' + T('Εξαντλημένο', 'Out of stock') + '</span>' : (p.o ? '<span class="badge">-' + Math.round((p.o - p.p) / p.o * 100) + '%</span>' : '');
    var add = '';
    if (p.s && p.p !== null) add = p.v ? '<a class="card-add" href="' + p.h + '" aria-label="' + T('Επιλογές', 'Choose options') + '">' + PLUS + '</a>'
      : '<button class="card-add" type="button" data-add="' + p.id + '" data-name="' + esc(p.n) + '" data-price="' + p.p + '" data-img="@' + p.id + '" aria-label="' + T('Προσθήκη στο καλάθι', 'Add to cart') + '">' + PLUS + '</button>';
    return '<article class="card' + (p.s ? '' : ' is-out') + '"><div class="card-img">' + badge + '<img data-th="' + p.id + '" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="' + esc(p.n) + '" width="260" height="260">' + add + '</div><div class="card-brand">' + esc(brandOf(C, p)) + '</div><h3 class="card-name"><a href="' + p.h + '">' + esc(p.n) + '</a></h3><div class="price">' + priceHtml(p) + '</div></article>';
  }
  var PLUS = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

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
      loadCat().then(function (C) {
        if (sin.value.trim().toLowerCase() !== q) return;
        var hits = C.products.filter(function (p) { return (p.n + ' ' + brandOf(C, p)).toLowerCase().indexOf(q) > -1; });
        hits.sort(function (x, y) { return y.s - x.s; });
        var n = hits.length; hits = hits.slice(0, 6);
        sres.innerHTML = hits.length ? hits.map(function (p) {
          return '<a class="s-hit" href="' + p.h + '"><span class="line-img"><img data-th="' + p.id + '" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt=""></span><span><b>' + esc(p.n) + '</b><small>' + esc(brandOf(C, p)) + (p.s ? '' : ' ' + T('(εξαντλημένο)', '(out of stock)')) + '</small></span><em>' + (p.p === null ? '' : (p.r ? T('Από ', 'From ') : '') + money(p.p)) + '</em></a>';
        }).join('') + (n > 6 ? '<p class="muted s-none">' + T('και ' + (n - 6) + ' ακόμη προϊόντα', 'and ' + (n - 6) + ' more products') + '</p>' : '')
          : '<p class="muted s-none">' + T('Δεν βρέθηκαν προϊόντα για «', 'No products found for "') + esc(sin.value) + T('». Δοκιμάστε το όνομα ενός οίκου.', '". Try a brand name.') + '</p>';
        loadThumbs(hits).then(function () { paintThumbs(sres); });
      });
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
    if (mode === 'mini') return '<div class="mini-line"><div class="line-img"><img src="' + (i.i.indexOf('data:') === 0 ? i.i : IMG + i.i) + '" alt=""><span class="q">' + i.q + '</span></div><div><b>' + esc(i.n) + '</b>' + v + '</div><b>' + money(i.p * i.q) + '</b></div>';
    return '<div class="line"><div class="line-img"><img src="' + (i.i.indexOf('data:') === 0 ? i.i : IMG + i.i) + '" alt=""></div><div><div class="line-top"><div><div class="line-name">' + esc(i.n) + '</div>' + v + '</div><b>' + money(i.p * i.q) + '</b></div><div class="line-bot"><div class="qty" data-x="' + x + '"><button type="button" aria-label="' + T('Μείωση ποσότητας', 'Decrease quantity') + '">&minus;</button><input type="number" value="' + i.q + '" min="1" aria-label="' + T('Ποσότητα', 'Quantity') + '"><button type="button" data-inc aria-label="' + T('Αύξηση ποσότητας', 'Increase quantity') + '">+</button></div><button type="button" class="remove" data-rm="' + x + '">' + T('Αφαίρεση', 'Remove') + '</button></div></div></div>';
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
      var im = b.getAttribute('data-img') || ''; if (im.charAt(0) === '@') im = TH[im.slice(1)] || '';
      add({ id: b.getAttribute('data-add'), n: b.getAttribute('data-name'), p: parseFloat(b.getAttribute('data-price')), i: im, v: v }, q);
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
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.f-more'); if (!b) return;
    var open = b.previousElementSibling.classList.toggle('open');
    b.textContent = open ? T('Δείτε λιγότερα', 'Show less') : T('Δείτε περισσότερα', 'Show more');
    b.setAttribute('aria-expanded', open);
  });

  /* ---------- Category: filters, sorting and paging over the full live catalogue ---------- */
  var grid = $('[data-grid][data-cat]');
  if (grid) loadCat().then(function (C) {
    var cat = grid.getAttribute('data-cat'), PER = 24;
    var seen = {}, all = [];
    (C.order[cat] || []).forEach(function (id) { if (!seen[id] && C.byId[id]) { seen[id] = 1; all.push(C.byId[id]); } });
    all.forEach(function (p, i) { p._i = i; });
    var F = { facet: [], stock: [], min: null, max: null, sale: false }, sortV = 'new', page = 1;
    var facetCount = {};
    all.forEach(function (p) { p.t.forEach(function (t) { if (C.terms[t] && C.terms[t].p === cat) facetCount[t] = (facetCount[t] || 0) + 1; }); });
    var facets = Object.keys(facetCount).sort(function (x, y) { return facetCount[y] - facetCount[x] || termName(C, x).localeCompare(termName(C, y)); });
    var countEl = $('[data-count]'), activeEl = $('[data-active]'), emptyEl = $('[data-noresults]'), pager = $('[data-pager]'), sort = $('[data-sort]');

    /* build the brand / type facet from the real data */
    $$('[data-facet-group]').forEach(function (g) {
      if (!facets.length) return;
      g.hidden = false;
      $('[data-facet-list]', g).innerHTML = facets.map(function (t, i) {
        return '<li class="' + (i >= 6 ? 'x' : '') + '"><label class="f-check"><input type="checkbox" data-f-facet="' + t + '"> ' + esc(termName(C, t)) + ' <span class="n">' + facetCount[t] + '</span></label></li>';
      }).join('');
      var more = $('.f-more', g); if (more) more.hidden = facets.length <= 6;
    });
    var rail = $('[data-facet-rail]');
    if (rail) { rail.hidden = !facets.length; rail.innerHTML = facets.slice(0, 10).map(function (t) { return '<button type="button" class="chip" data-facet-chip="' + t + '" aria-pressed="false">' + esc(termName(C, t)) + '</button>'; }).join(''); }
    var nIn = all.filter(function (p) { return p.s; }).length;
    $$('[data-n-in]').forEach(function (e) { e.textContent = nIn; });
    $$('[data-n-out]').forEach(function (e) { e.textContent = all.length - nIn; });
    $$('[data-n-sale]').forEach(function (e) { e.textContent = all.filter(function (p) { return p.o; }).length; });

    function matches(p) {
      if (F.facet.length && !p.t.some(function (t) { return F.facet.indexOf(t) > -1; })) return false;
      if (F.stock.length && F.stock.indexOf(p.s ? 'instock' : 'outofstock') < 0) return false;
      if (F.sale && !p.o) return false;
      if (F.min !== null && (p.p === null || p.p < F.min)) return false;
      if (F.max !== null && (p.p === null || p.p > F.max)) return false;
      return true;
    }
    function render(scroll) {
      var list = all.filter(matches);
      if (sortV === 'low' || sortV === 'high') list.sort(function (x, y) { var a = x.p === null ? Infinity : x.p, b = y.p === null ? Infinity : y.p; return sortV === 'low' ? a - b : (b === Infinity ? -1 : b) - (a === Infinity ? -1 : a); });
      else list.sort(function (x, y) { return x._i - y._i; });
      var pages = Math.max(1, Math.ceil(list.length / PER)); if (page > pages) page = pages;
      var slice = list.slice((page - 1) * PER, page * PER);
      grid.innerHTML = slice.map(function (p) { return cardHtml(C, p); }).join('');
      loadThumbs(slice).then(function () { paintThumbs(grid); });
      if (countEl) countEl.textContent = list.length === 1 ? T('1 προϊόν', '1 product') : list.length + T(' προϊόντα', ' products');
      if (emptyEl) emptyEl.hidden = list.length > 0;
      /* active filters, shown above the products and removable one by one */
      var chips = [];
      F.facet.forEach(function (t) { chips.push(['facet:' + t, termName(C, t)]); });
      if (F.stock.indexOf('instock') > -1) chips.push(['instock', T('Άμεσα διαθέσιμα', 'In stock')]);
      if (F.stock.indexOf('outofstock') > -1) chips.push(['outofstock', T('Εξαντλημένα', 'Out of stock')]);
      if (F.min !== null || F.max !== null) chips.push(['price', T('Τιμή: ', 'Price: ') + (F.min !== null ? money(F.min) : '0 €') + ' ' + T('έως', 'to') + ' ' + (F.max !== null ? money(F.max) : '∞')]);
      if (F.sale) chips.push(['sale', T('Σε προσφορά', 'On offer')]);
      if (activeEl) {
        activeEl.hidden = !chips.length;
        activeEl.innerHTML = chips.length ? '<span class="active-l">' + T('Φίλτρα:', 'Filters:') + '</span>' + chips.map(function (c) { return '<button type="button" class="chip on" data-clear="' + c[0] + '">' + esc(c[1]) + ' <span aria-hidden="true">×</span><span class="sr">' + T('Αφαίρεση φίλτρου', 'Remove filter') + '</span></button>'; }).join('') + '<button type="button" class="f-reset" data-clear="all">' + T('Καθαρισμός όλων', 'Clear all') + '</button>' : '';
      }
      $$('.filter-btn [data-nf]').forEach(function (e) { e.textContent = chips.length ? ' (' + chips.length + ')' : ''; });
      $$('[data-facet-chip]').forEach(function (b) { b.setAttribute('aria-pressed', F.facet.indexOf(b.getAttribute('data-facet-chip')) > -1); });
      $$('[data-f-facet]').forEach(function (i) { i.checked = F.facet.indexOf(i.getAttribute('data-f-facet')) > -1; });
      $$('[data-f-stock]').forEach(function (i) { i.checked = F.stock.indexOf(i.getAttribute('data-f-stock')) > -1; });
      $$('[data-f-sale]').forEach(function (i) { i.checked = F.sale; });
      if (pager) {
        pager.hidden = pages < 2;
        var h = '';
        if (page > 1) h += '<button type="button" data-page="' + (page - 1) + '">' + T('Προηγούμενη', 'Previous') + '</button>';
        for (var n = 1; n <= pages; n++) {
          if (n === 1 || n === pages || Math.abs(n - page) <= 1) h += n === page ? '<span aria-current="page">' + n + '</span>' : '<button type="button" data-page="' + n + '">' + n + '</button>';
          else if (n === 2 || n === pages - 1) h += '<span class="gap">…</span>';
        }
        if (page < pages) h += '<button type="button" data-page="' + (page + 1) + '">' + T('Επόμενη', 'Next') + '</button>';
        pager.innerHTML = h;
      }
      if (scroll) { var top = $('.toolbar'); if (top) window.scrollTo({ top: top.getBoundingClientRect().top + window.pageYOffset - 90 }); }
    }
    function toggle(arr, v) { var i = arr.indexOf(v); if (i > -1) arr.splice(i, 1); else arr.push(v); }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-facet-chip]');
      if (b) { e.preventDefault(); toggle(F.facet, b.getAttribute('data-facet-chip')); page = 1; render(); return; }
      var pg = e.target.closest('[data-page]');
      if (pg) { page = parseInt(pg.getAttribute('data-page'), 10); render(true); return; }
      var c = e.target.closest('[data-clear]');
      if (c) {
        var k = c.getAttribute('data-clear');
        if (k === 'all') { F = { facet: [], stock: [], min: null, max: null, sale: false }; $$('[data-f-min],[data-f-max]').forEach(function (i) { i.value = ''; }); }
        else if (k.indexOf('facet:') === 0) F.facet = F.facet.filter(function (x) { return x !== k.slice(6); });
        else if (k === 'instock' || k === 'outofstock') F.stock = F.stock.filter(function (x) { return x !== k; });
        else if (k === 'price') { F.min = F.max = null; $$('[data-f-min],[data-f-max]').forEach(function (i) { i.value = ''; }); }
        else if (k === 'sale') F.sale = false;
        page = 1; render();
      }
    });
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-f-facet]')) { toggle(F.facet, t.getAttribute('data-f-facet')); page = 1; render(); }
      if (t.matches('[data-f-stock]')) { toggle(F.stock, t.getAttribute('data-f-stock')); page = 1; render(); }
      if (t.matches('[data-f-sale]')) { F.sale = t.checked; page = 1; render(); }
    });
    $$('form[data-f-price]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var a = parseFloat($('[data-f-min]', f).value), b = parseFloat($('[data-f-max]', f).value);
        F.min = isNaN(a) ? null : a; F.max = isNaN(b) ? null : b; page = 1; render();
      });
    });
    if (sort) sort.addEventListener('change', function () { sortV = sort.value; page = 1; render(); });
    render();
  }).catch(function () {});

  /* ---------- Generic product page (p.html#id): filled from the catalogue ---------- */
  var dyn = $('[data-pdyn]');
  function fillDyn() {
    loadCat().then(function (C) {
      var p = C.byId[location.hash.slice(1)];
      if (!p) { $('[data-d-name]', dyn).textContent = T('Το προϊόν δεν βρέθηκε', 'Product not found'); return; }
      var CN = { nargiledes: ['Ναργιλέδες', 'Hookahs'], kapnoi: ['Καπνοί', 'Tobacco'], 'aromatika-ygra': ['Αρωματικά Υγρά', 'Flavour liquids'], karvouna: ['Κάρβουνα', 'Charcoal'], aksesouar: ['Αξεσουάρ', 'Accessories'], poura: ['Πούρα', 'Cigars'], gifts: ['Δώρα', 'Gifts'], prosfores: ['Προσφορές', 'Offers'] };
      var cat = p.c.filter(function (c) { return c !== 'gifts' && c !== 'prosfores'; })[0] || p.c[0], brand = brandOf(C, p);
      document.title = p.n + ' | Nara Nara';
      $$('[data-d-name]').forEach(function (e) { e.textContent = p.n; });
      $$('[data-d-cat]').forEach(function (e) { e.textContent = T(CN[cat][0], CN[cat][1]); e.setAttribute('href', cat + '.html'); });
      var be = $('[data-d-brand]'); be.textContent = brand || T(CN[cat][0], CN[cat][1]); be.setAttribute('href', cat + '.html');
      $$('[data-d-price]').forEach(function (e) { e.innerHTML = priceHtml(p); });
      $('[data-d-badge]').innerHTML = !p.s ? '<span class="badge out">' + T('Εξαντλημένο', 'Out of stock') + '</span>' : (p.o ? '<span class="badge">-' + Math.round((p.o - p.p) / p.o * 100) + '%</span>' : '');
      $('[data-d-short]').textContent = T('Αυθεντικό προϊόν' + (brand ? ' ' + brand : '') + ', διαθέσιμο online και στα καταστήματά μας σε Ηράκλειο και Γλυφάδα.', 'Authentic' + (brand ? ' ' + brand : '') + ' product, available online and in our stores in Heraklion and Glyfada.');
      $('[data-d-var]').hidden = !p.v;
      var btn = $('[data-main]', dyn), line = $('[data-stock-line]', dyn), can = p.s && p.p !== null;
      btn.disabled = !can; btn.textContent = btn.getAttribute(can ? 'data-l-add' : 'data-l-out');
      btn.setAttribute('data-add', p.id); btn.setAttribute('data-name', p.n); btn.setAttribute('data-price', p.p === null ? 0 : p.p); btn.setAttribute('data-img', '@' + p.id);
      line.classList.toggle('out', !p.s); line.textContent = line.getAttribute(p.s ? 'data-l-in' : 'data-l-out');
      var rel = (C.order[cat] || []).map(function (id) { return C.byId[id]; }).filter(function (x) { return x && x.id !== p.id && x.s; }).slice(0, 4);
      var rg = $('[data-d-related]'); rg.innerHTML = rel.map(function (x) { return cardHtml(C, x); }).join('');
      $$('[data-d-catlink]').forEach(function (e) { e.setAttribute('href', cat + '.html'); });
      loadThumbs([p].concat(rel)).then(function () { var im = $('[data-d-img]'); if (TH[p.id]) im.src = TH[p.id]; im.alt = p.n; paintThumbs(rg); });
    }).catch(function () {});
  }
  if (dyn) { fillDyn(); window.addEventListener('hashchange', function () { window.scrollTo(0, 0); fillDyn(); }); }

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
