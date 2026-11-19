/* tema.js — colores del sitio elegibles desde el panel profesional.
   Guarda la elección en la tabla perfil (columna tema) y la aplica a todo el sitio. */
(function () {
  'use strict';
  const TEMAS = {
    verde:  { n: 'Verde (actual)',  v: { '--teal-50': '#E1F5EE', '--teal-200': '#5DCAA5', '--teal-400': '#1D9E75', '--teal-600': '#0F6E56', '--teal-800': '#085041', '--bg': '#f8f8f6', '--text': '#1a1a18', '--muted': '#6b6b67', '--border': 'rgba(0,0,0,0.1)' } },
    clasico:{ n: 'A · Rosa clásico', v: { '--teal-50': '#FCE8F0', '--teal-200': '#F4A9C4', '--teal-400': '#C2185B', '--teal-600': '#8E1048', '--teal-800': '#6E0C38', '--bg': '#FFF8FB', '--text': '#2B1B24', '--muted': '#7A6671', '--border': 'rgba(142,16,72,0.14)' } },
    empolvado:{ n: 'B · Rosa empolvado', v: { '--teal-50': '#FBEFF1', '--teal-200': '#E8B4C0', '--teal-400': '#A64B64', '--teal-600': '#6E2C3E', '--teal-800': '#4F1E2C', '--bg': '#FFF9FA', '--text': '#2D1F23', '--muted': '#6F5C62', '--border': 'rgba(110,44,62,0.14)' } },
    fucsia: { n: 'C · Fucsia moderno', v: { '--teal-50': '#FFEAF3', '--teal-200': '#FF9CC2', '--teal-400': '#D6246E', '--teal-600': '#9C0F4E', '--teal-800': '#780A3B', '--bg': '#FFF7FB', '--text': '#1F1420', '--muted': '#675563', '--border': 'rgba(156,15,78,0.14)' } },
    salvia: { n: 'D · Rosa y salvia', v: { '--teal-50': '#FCEEF3', '--teal-200': '#F2B8CE', '--teal-400': '#BE3F73', '--teal-600': '#7F2347', '--teal-800': '#5F1A35', '--bg': '#FFFAFC', '--text': '#2A1D25', '--muted': '#68565F', '--border': 'rgba(127,35,71,0.14)' } }
  };
  let actual = 'verde';

  function aplicar(id) {
    const t = TEMAS[id]; if (!t) return;
    actual = id;
    for (const k in t.v) document.documentElement.style.setProperty(k, t.v[k]);
    try { localStorage.setItem('tema', id); } catch (e) {}
    document.querySelectorAll('.tema-op').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  }

  // aplicar enseguida lo último que se vio, y después confirmar con la base de datos
  try { const c = localStorage.getItem('tema'); if (c && TEMAS[c]) aplicar(c); } catch (e) {}
  sb.from('perfil').select('tema').eq('id', 1).maybeSingle().then(r => {
    if (r && r.data && r.data.tema && TEMAS[r.data.tema]) aplicar(r.data.tema);
  }).catch(() => {});

  const st = document.createElement('style');
  st.textContent = '.tema-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px}' +
    '.tema-op{display:flex;flex-direction:column;gap:6px;align-items:flex-start;text-align:left;background:var(--white);border:2px solid var(--border);border-radius:var(--radius-sm);padding:10px;cursor:pointer;font:inherit;font-size:13px;color:var(--text)}' +
    '.tema-op.on{border-color:var(--teal-400);box-shadow:0 0 0 2px var(--teal-200)}' +
    '.tema-sw{display:flex;gap:4px}.tema-sw i{width:22px;height:22px;border-radius:50%;border:1px solid rgba(0,0,0,.12);display:block}';
  document.head.appendChild(st);

  function tarjeta() {
    const c = document.createElement('div'); c.className = 'sx'; c.id = 'tema-card';
    const h = document.createElement('h4'); h.textContent = 'Colores del sitio'; c.appendChild(h);
    const p = document.createElement('div'); p.style.cssText = 'font-size:12px;color:var(--muted)';
    p.textContent = 'Elegí una paleta. Se aplica al instante en todo el sitio, también para los pacientes.'; c.appendChild(p);
    const g = document.createElement('div'); g.className = 'tema-grid';
    Object.keys(TEMAS).forEach(id => {
      const t = TEMAS[id];
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tema-op' + (id === actual ? ' on' : ''); b.dataset.id = id;
      const sw = document.createElement('span'); sw.className = 'tema-sw';
      ['--teal-400', '--teal-600', '--teal-200', '--teal-50'].forEach(k => { const i = document.createElement('i'); i.style.background = t.v[k]; sw.appendChild(i); });
      const l = document.createElement('span'); l.textContent = t.n;
      b.append(sw, l);
      b.onclick = async () => {
        aplicar(id);
        const m = document.getElementById('sitio-msg');
        const { error } = await sb.from('perfil').upsert({ id: 1, tema: id });
        if (m) { m.textContent = error ? 'No se pudo guardar el color. Probá de nuevo.' : 'Colores guardados ✓'; m.className = error ? 'err' : ''; }
      };
      g.appendChild(b);
    });
    c.appendChild(g); return c;
  }

  // cada vez que el panel arma la pestaña "Sitio y fotos", sumamos la tarjeta de colores arriba
  const tab = document.getElementById('tab-sitio');
  if (tab) new MutationObserver(() => {
    const msg = document.getElementById('sitio-msg');
    if (msg && !document.getElementById('tema-card')) msg.after(tarjeta());
  }).observe(tab, { childList: true });
})();
