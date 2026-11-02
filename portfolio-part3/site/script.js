/* Part 3 behaviour: accordion, project filter, lightbox, forms, map. */
(function () {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Accordion ---------- */
  $$('.accordion__trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      document.getElementById(btn.getAttribute('aria-controls')).hidden = isOpen;
    });
  });

  /* ---------- Dynamic projects: render, search, filter, sort ---------- */
  const list = $('#project-list');
  if (list) {
    const projects = [
      { title: 'Project One', year: 2026, tags: ['HTML', 'CSS', 'JavaScript'], desc: 'A short description of the project: what it does, the problem it solves, and any constraints worth mentioning.' },
      { title: 'Project Two', year: 2025, tags: ['Responsive', 'Git'], desc: 'A short description of the project: what it does, the problem it solves, and any constraints worth mentioning.' },
      { title: 'Project Three', year: 2024, tags: ['API', 'CSS Grid'], desc: 'A short description of the project: what it does, the problem it solves, and any constraints worth mentioning.' }
    ];
    const search = $('#project-search'), tagSel = $('#project-tag'), sortSel = $('#project-sort'), count = $('#project-count');

    [...new Set(projects.flatMap((p) => p.tags))].sort().forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t; tagSel.appendChild(opt);
    });

    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text; // textContent avoids injecting HTML
      return node;
    };

    function render() {
      const q = search.value.trim().toLowerCase();
      const tag = tagSel.value;
      const result = projects
        .filter((p) => (!tag || p.tags.includes(tag)) &&
          (!q || (p.title + ' ' + p.desc + ' ' + p.tags.join(' ')).toLowerCase().includes(q)))
        .sort((a, b) => sortSel.value === 'title' ? a.title.localeCompare(b.title) : b.year - a.year);

      list.replaceChildren();
      result.forEach((p) => {
        const li = el('li', 'project');
        const main = el('div', 'project__main');
        main.append(el('h3', 'project__title', p.title), el('p', 'project__desc', p.desc));
        const meta = el('div', 'project__meta');
        const tags = el('ul', 'tag-list');
        p.tags.forEach((t) => tags.appendChild(el('li', 'tag', t)));
        const link = el('a', 'project__link', 'View project');
        link.href = '#';
        meta.append(tags, link);
        li.append(main, meta);
        list.appendChild(li);
      });
      if (!result.length) list.appendChild(el('li', 'project__empty', 'No projects match. Clear the search or pick "All skills".'));
      count.textContent = result.length + (result.length === 1 ? ' project shown' : ' projects shown');
    }
    [search, tagSel, sortSel].forEach((c) => c.addEventListener('input', render));
    render();
  }

  /* ---------- Gallery lightbox (native <dialog>) ---------- */
  const box = $('#lightbox');
  if (box) {
    const items = $$('.gallery__item');
    const img = $('#lightbox-img'), cap = $('#lightbox-cap');
    let index = 0, opener = null;
    const show = (i) => {
      index = (i + items.length) % items.length;
      img.src = items[index].dataset.src;
      img.alt = items[index].dataset.alt;
      cap.textContent = items[index].dataset.alt + ' (' + (index + 1) + ' of ' + items.length + ')';
    };
    items.forEach((btn, i) => btn.addEventListener('click', () => { opener = btn; show(i); box.showModal(); }));
    $('#lb-prev').addEventListener('click', () => show(index - 1));
    $('#lb-next').addEventListener('click', () => show(index + 1));
    $('#lb-close').addEventListener('click', () => box.close());
    box.addEventListener('click', (e) => { if (e.target === box) box.close(); }); // click backdrop
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    box.addEventListener('close', () => opener && opener.focus());
  }

  /* ---------- Form validation helpers ---------- */
  function setError(field, msg) {
    const out = document.getElementById(field.id + '-error');
    if (out) out.textContent = msg;
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (out) field.setAttribute('aria-describedby', out.id);
  }
  function check(field) {
    const v = field.value.trim();
    let msg = '';
    if (field.required && !v) msg = 'This field is required.';
    else if (v && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Enter an email like name@example.com.';
    else if (v && field.hasAttribute('data-phone') && !/^\+?[0-9 ]{9,15}$/.test(v)) msg = 'Use 9 to 15 digits, with an optional leading +.';
    else if (v && field.minLength > 0 && v.length < field.minLength) msg = 'Use at least ' + field.minLength + ' characters (you have ' + v.length + ').';
    else if (v && field.type === 'number' && (Number(v) < Number(field.min) || Number(v) > Number(field.max) || !Number.isInteger(Number(v)))) msg = 'Enter a whole number from ' + field.min + ' to ' + field.max + '.';
    else if (v && field.type === 'date') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(v + 'T00:00:00') < today) msg = 'Choose today or a later date.';
    }
    setError(field, msg);
    return !msg;
  }
  function wire(form, onValid) {
    const fields = $$('input, select, textarea', form);
    fields.forEach((f) => f.addEventListener('blur', () => check(f)));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const results = fields.map(check); // check all so every error shows
      const firstBad = fields[results.indexOf(false)];
      if (firstBad) { firstBad.focus(); return; }
      onValid(Object.fromEntries(new FormData(form)));
    });
  }
  function showResult(box, title, lines, linkHref, linkText) {
    box.replaceChildren();
    const h = document.createElement('h2'); h.textContent = title; box.appendChild(h);
    lines.forEach((t) => { const p = document.createElement('p'); p.textContent = t; box.appendChild(p); });
    if (linkHref) {
      const a = document.createElement('a');
      a.className = 'button button--primary'; a.href = linkHref; a.textContent = linkText;
      box.appendChild(a);
    }
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- Contact form: build a mailto: link ---------- */
  const RECIPIENT = 'jordan.reyes@example.com'; // change to your real address
  const contact = $('#contact-form');
  if (contact) {
    wire(contact, (d) => {
      const body = 'Name: ' + d.name + '\nEmail: ' + d.email + '\nPhone: ' + (d.phone || 'not given') + '\nType: ' + d.type + '\n\n' + d.message;
      const href = 'mailto:' + RECIPIENT + '?subject=' + encodeURIComponent(d.type + ' from ' + d.name) + '&body=' + encodeURIComponent(body);
      showResult($('#contact-result'), 'Your email is ready', ['Check the details, then send it from your email app to ' + RECIPIENT + '.'], href, 'Open in email app');
    });
  }

  /* ---------- Enquiry form: fetch pricing (AJAX) then estimate ---------- */
  const enquiry = $('#enquiry-form');
  if (enquiry) {
    const deadline = $('#e-deadline');
    deadline.min = new Date().toISOString().slice(0, 10);
    const fallback = { base: { landing: 1500, portfolio: 2500, business: 4000, shop: 7500 }, perPage: 450, rushDays: 14, rushMultiplier: 1.25, currency: 'R' };
    wire(enquiry, async (d) => {
      let pricing = fallback;
      try {
        const res = await fetch('data/pricing.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        pricing = await res.json();
      } catch (err) { /* offline or opened from file: use built-in prices */ }

      const pages = Number(d.pages);
      let total = pricing.base[d.service] + pages * pricing.perPage;
      const days = Math.ceil((new Date(d.deadline + 'T00:00:00') - new Date()) / 86400000);
      const rush = days < pricing.rushDays;
      if (rush) total = Math.round(total * pricing.rushMultiplier);
      const fmt = (n) => pricing.currency + n.toLocaleString('en-ZA');

      showResult($('#enquiry-result'), 'Estimated price: ' + fmt(total), [
        'Thanks, ' + d.name + '. For a ' + enquiry.service.selectedOptions[0].text.toLowerCase() + ' with ' + pages + (pages === 1 ? ' page' : ' pages') + ', the estimate is ' + fmt(total) + '.',
        rush ? 'This includes a 25% rush fee because your deadline is under ' + pricing.rushDays + ' days away.' : 'Your deadline gives enough time, so there is no rush fee.',
        'I will reply to ' + d.email + ' within two working days to confirm.'
      ]);
    });
  }

  /* ---------- Leaflet map ---------- */
  const mapEl = $('#map');
  if (mapEl && window.L) {
    const pos = [-26.1467, 28.0436]; // Rosebank, Johannesburg: change to your location
    const map = L.map(mapEl).setView(pos, 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker(pos).addTo(map).bindPopup('Jordan Reyes, Rosebank');
  }
})();
