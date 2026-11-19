/* tema.js — colores del sitio elegibles desde el panel profesional.
   Guarda la elección en la tabla perfil (columna tema) y la aplica a todo el sitio. */
(function () {
  'use strict';
  const TEMAS = {
    verde: { n: 'Verde (actual)', v: { '--teal-50': '#E1F5EE', '--teal-200': '#5DCAA5', '--teal-400': '#1D9E75', '--teal-600': '#0F6E56', '--teal-800': '#085041', '--bg': '#f8f8f6', '--text': '#1a1a18', '--muted': '#6b6b67', '--border': 'rgba(0,0,0,0.1)' } },
    salvia: { n: 'Verde salvia', v: { '--teal-50': '#E8F2EC', '--teal-200': '#A9CBBC', '--teal-400': '#3F7260', '--teal-600': '#2B5446', '--teal-800': '#1E3D32', '--bg': '#F8FBF9', '--text': '#1A2420', '--muted': '#5F6E67', '--border': 'rgba(43,84,70,0.14)' } },
    clasico: { n: 'Rosa clásico', v: { '--teal-50': '#FCE8F0', '--teal-200': '#F4A9C4', '--teal-400': '#C2185B', '--teal-600': '#8E1048', '--teal-800': '#6E0C38', '--bg': '#FFF8FB', '--text': '#2B1B24', '--muted': '#7A6671', '--border': 'rgba(142,16,72,0.14)' } },
    empolvado: { n: 'Rosa empolvado', v: { '--teal-50': '#FBEFF1', '--teal-200': '#E8B4C0', '--teal-400': '#A64B64', '--teal-600': '#6E2C3E', '--teal-800': '#4F1E2C', '--bg': '#FFF9FA', '--text': '#2D1F23', '--muted': '#6F5C62', '--border': 'rgba(110,44,62,0.14)' } },
    cielo: { n: 'Azul cielo', v: { '--teal-50': '#E6F1FA', '--teal-200': '#9CC9EC', '--teal-400': '#2272B5', '--teal-600': '#174F80', '--teal-800': '#0F3A60', '--bg': '#F7FAFD', '--text': '#172230', '--muted': '#5A6B7B', '--border': 'rgba(23,79,128,0.14)' } },
    marino: { n: 'Azul marino', v: { '--teal-50': '#E8EEF9', '--teal-200': '#A9BEE6', '--teal-400': '#1F4E9E', '--teal-600': '#14336B', '--teal-800': '#0D2250', '--bg': '#F8F9FD', '--text': '#141B2E', '--muted': '#5B6479', '--border': 'rgba(20,51,107,0.14)' } },
    lavanda: { n: 'Lavanda', v: { '--teal-50': '#F1EBF9', '--teal-200': '#CDB8EA', '--teal-400': '#7A52B3', '--teal-600': '#54347F', '--teal-800': '#3C2360', '--bg': '#FBF9FE', '--text': '#231B2E', '--muted': '#685F78', '--border': 'rgba(84,52,127,0.14)' } },
    coral: { n: 'Coral', v: { '--teal-50': '#FCEDE8', '--teal-200': '#F0B5A5', '--teal-400': '#C4533A', '--teal-600': '#8F3320', '--teal-800': '#6A2314', '--bg': '#FFFAF8', '--text': '#2B1E1A', '--muted': '#735F58', '--border': 'rgba(143,51,32,0.14)' } }
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
