/* panel.js
   1) Contenido editable del sitio (foto de perfil, secciones y fotos) leído desde Supabase.
   2) Panel profesional: gestión completa de turnos y edición del sitio.
   Usa las variables globales del index.html: sb, esc, allSlots, MONTHS, today, toISO, SUPABASE_URL. */
(function () {
  'use strict';
  const BUCKET = 'fotos';
  const ESTADOS = [['confirmado', 'Confirmado'], ['atendido', 'Atendido'], ['ausente', 'Ausente'], ['cancelado', 'Cancelado']];
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------- utilidades ---------- */
  function el(tag, props) {
    const n = document.createElement(tag);
    let value;
    for (const k in (props || {})) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k === 'value') value = v;
      else if (k === 'checked') n.checked = true;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(c => { if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c))); });
    }
    if (value !== undefined) n.value = value;
    return n;
  }
  const urlOk = u => typeof u === 'string' && (u.indexOf('fotos/') === 0 || u.indexOf(SUPABASE_URL + '/storage/v1/object/public/') === 0);

  const style = el('style', { text: `
    .pm { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:flex-start; justify-content:center; padding:24px 16px; overflow:auto; z-index:150; }
    .pm-box { background:var(--white); border-radius:var(--radius); padding:22px; width:100%; max-width:460px; }
    .pm-box h3 { font-size:16px; margin-bottom:14px; }
    .pm-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .pm-f { margin-bottom:10px; } .pm-f label { display:block; font-size:12px; color:var(--muted); margin-bottom:3px; }
    .pm-f input, .pm-f select, .pm-f textarea, .sx input[type=text], .sx textarea { width:100%; border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px 10px; font-size:13px; font-family:inherit; background:var(--white); }
    .pm-act { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
    .pm-err { color:#dc2626; font-size:12px; margin-top:8px; }
    .btn-danger { background:transparent; color:#b91c1c; border:1.5px solid #fca5a5; border-radius:var(--radius-sm); padding:8px 14px; font-size:13px; cursor:pointer; }
    .btn-sm { padding:6px 12px !important; font-size:12px !important; }
    .tabs { display:flex; gap:6px; margin-bottom:14px; }
    .tab { background:var(--white); border:1px solid var(--border); border-radius:20px; padding:6px 16px; font-size:13px; cursor:pointer; color:var(--muted); }
    .tab.on { background:var(--teal-400); border-color:var(--teal-400); color:#fff; }
    .admin-item .acts { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
    .st { display:inline-block; font-size:11px; border-radius:20px; padding:2px 8px; margin-left:6px; background:#f3f4f6; color:#555; }
    .st.cancelado { background:#fee2e2; color:#991b1b; } .st.atendido { background:#dcfce7; color:#166534; } .st.ausente { background:#fef3c7; color:#92400e; }
    .sx { background:var(--white); border:1px solid var(--border); border-radius:var(--radius-sm); padding:14px; margin-bottom:14px; }
    .sx h4 { font-size:14px; margin-bottom:10px; }
    .sx .line { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:8px 0; }
    .sx-photos { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; margin:10px 0; }
    .sx-photo { border:1px solid var(--border); border-radius:var(--radius-sm); padding:6px; font-size:12px; }
    .sx-photo img { width:100%; height:110px; object-fit:cover; border-radius:6px; display:block; margin-bottom:6px; }
    .sx-photo input { margin-bottom:4px; padding:5px 7px !important; font-size:12px !important; }
    .sx-avatar { width:84px; height:84px; border-radius:50%; object-fit:cover; background:var(--teal-50); border:3px solid var(--teal-200); }
    #sitio-msg { font-size:12px; min-height:16px; margin-bottom:8px; color:var(--teal-600); } #sitio-msg.err { color:#dc2626; }
    .dyn-sec .sec-sub { white-space:pre-line; }
  ` });
  document.head.appendChild(style);

  /* ---------- imágenes: reducir y convertir en el navegador ---------- */
  async function aWebp(file, max, cuadrada) {
    const bmp = await createImageBitmap(file);
    let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height, w, h;
    if (cuadrada) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; w = h = Math.min(max, s); }
    else { const k = Math.min(1, max / Math.max(sw, sh)); w = Math.round(sw * k); h = Math.round(sh * k); }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.82));
    return blob || new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  }
  const extDe = b => b.type === 'image/webp' ? 'webp' : (b.type === 'image/png' ? 'png' : 'jpg');
  async function subir(blob, ruta) {
    const { error } = await sb.storage.from(BUCKET).upload(ruta, blob, { contentType: blob.type, cacheControl: '31536000' });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
  }
  const quitarArchivo = p => p ? sb.storage.from(BUCKET).remove([p]) : null;

  /* ---------- parte pública: perfil + secciones ---------- */
  function setAvatar(url) {
    const a = $('.avatar'); if (!a || !urlOk(url)) return;
    a.textContent = '';
    a.appendChild(el('img', { src: url, alt: 'Dra. Jennyfer Jimenez', style: 'width:100%;height:100%;object-fit:cover;border-radius:50%' }));
  }

  function lightbox() {
    let lb = $('#lb2'); if (lb) return lb;
    lb = el('div', { class: 'lb', id: 'lb2' },
      el('button', { class: 'lb-x', 'aria-label': 'Cerrar', text: '✕' }),
      el('button', { class: 'lb-prev', 'aria-label': 'Anterior', text: '‹' }),
      el('img', { alt: '' }),
      el('button', { class: 'lb-next', 'aria-label': 'Siguiente', text: '›' }),
      el('div', { class: 'lb-cap' }));
    document.body.appendChild(lb);
    lb._items = []; lb._cur = 0;
    const show = i => {
      const v = lb._items; if (!v.length) return;
      lb._cur = (i + v.length) % v.length;
      const img = $('img', v[lb._cur]);
      $('img', lb).src = img.src; $('img', lb).alt = img.alt;
      $('.lb-cap', lb).textContent = ($('figcaption', v[lb._cur]) || {}).textContent || '';
      lb.classList.add('open');
    };
    lb._show = show;
    $('.lb-x', lb).onclick = () => lb.classList.remove('open');
    $('.lb-prev', lb).onclick = e => { e.stopPropagation(); show(lb._cur - 1); };
    $('.lb-next', lb).onclick = e => { e.stopPropagation(); show(lb._cur + 1); };
    lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('open'); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') lb.classList.remove('open');
      if (e.key === 'ArrowLeft') show(lb._cur - 1);
      if (e.key === 'ArrowRight') show(lb._cur + 1);
    });
    return lb;
  }

  function seccionEl(s, fotos) {
    const id = s.slug || ('sec-' + String(s.id).slice(0, 8));
    const cats = [...new Set(fotos.map(f => f.categoria).filter(Boolean))];
    const grid = el('div', { class: 'g-grid' });
    const items = fotos.filter(f => urlOk(f.url)).map(f => {
      const fig = el('figure', { class: 'g-item', 'data-cat': f.categoria || '' },
        el('button', { type: 'button', class: 'g-btn', 'aria-label': 'Ampliar: ' + (f.titulo || 'foto') },
          el('img', { src: f.url, alt: f.titulo || s.titulo, loading: 'lazy' })),
        f.titulo ? el('figcaption', { text: f.titulo }) : null);
      grid.appendChild(fig); return fig;
    });
    const lb = lightbox();
    const visibles = () => items.filter(i => !i.classList.contains('hide'));
    items.forEach(it => $('.g-btn', it).addEventListener('click', () => { lb._items = visibles(); lb._show(lb._items.indexOf(it)); }));
    const chips = cats.length > 1 ? el('div', { class: 'g-filters' }, ['Todos'].concat(cats).map((c, i) =>
      el('button', { type: 'button', class: 'g-chip' + (i === 0 ? ' active' : ''), text: c, onclick: e => {
        chips.querySelectorAll('.g-chip').forEach(b => b.classList.toggle('active', b === e.currentTarget));
        items.forEach(it => it.classList.toggle('hide', i !== 0 && it.dataset.cat !== c));
      } }))) : null;
    return el('section', { id, class: 'dyn-sec' },
      el('h2', { class: 'sec-title', text: s.titulo }),
      s.texto ? el('p', { class: 'sec-sub', text: s.texto }) : null,
      chips, items.length ? grid : null,
      items.length ? el('p', { class: 'g-note', text: 'Los resultados pueden variar según cada paciente. Imágenes publicadas con autorización.' }) : null);
  }

  async function cargarContenido() {
    try {
      const [p, s, f] = await Promise.all([
        sb.from('perfil').select('*').eq('id', 1).maybeSingle(),
        sb.from('secciones').select('*').eq('visible', true).order('orden'),
        sb.from('fotos').select('*').order('orden')]);
      if (p.data && p.data.foto_url) setAvatar(p.data.foto_url);
      if (s.error || !s.data || !s.data.length) return; // sin datos: queda la galería estática
      document.querySelectorAll('.dyn-sec, #resultados').forEach(n => n.remove());
      const ancla = $('#turnos');
      const nav = [];
      s.data.forEach(sec => {
        const fs = (f.data || []).filter(x => x.seccion_id === sec.id);
        if (!fs.length && !sec.texto) return;
        const node = seccionEl(sec, fs);
        ancla.parentNode.insertBefore(node, ancla);
        nav.push([sec.titulo, node.id]);
      });
      const links = $('.nav-links');
      if (links) {
        links.textContent = '';
        [['Servicios', 'servicios']].concat(nav, [['Turnos', 'turnos'], ['Contacto', 'contacto']])
          .forEach(([t, h]) => links.appendChild(el('a', { href: '#' + h, text: t })));
      }
    } catch (e) { /* si falla, queda el contenido estático */ }
  }
  window.cargarContenido = cargarContenido;

  /* ---------- panel: turnos ---------- */
  const fechaLinda = iso => { const d = new Date(iso + 'T12:00:00'); return d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };

  window.loadTurnos = async function () {
    const list = $('#admin-list'); if (!list) return;
    list.innerHTML = '<div class="admin-empty">Cargando...</div>';
    const f = $('#admin-date-filter').value;
    const ver = $('#ver-cancelados') && $('#ver-cancelados').checked;
    let q = sb.from('turnos').select('*').order('fecha').order('hora');
    if (f) q = q.eq('fecha', f);
    if (!ver) q = q.neq('estado', 'cancelado');
    const { data, error } = await q;
    if (error) { list.innerHTML = '<div class="admin-empty">Error al cargar turnos.</div>'; return; }
    const activos = (data || []).filter(t => t.estado !== 'cancelado');
    const hoyISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
    const ini = new Date(today); ini.setDate(today.getDate() - ((today.getDay() + 6) % 7)); ini.setHours(0, 0, 0, 0);
    const fin = new Date(ini); fin.setDate(ini.getDate() + 6); fin.setHours(23, 59, 59, 999);
    $('#stat-hoy').textContent = activos.filter(t => t.fecha === hoyISO).length;
    $('#stat-semana').textContent = activos.filter(t => { const d = new Date(t.fecha + 'T12:00:00'); return d >= ini && d <= fin; }).length;
    $('#stat-total').textContent = activos.length;
    list.textContent = '';
    if (!data || !data.length) { list.innerHTML = '<div class="admin-empty">No hay turnos para mostrar.</div>'; return; }
    data.forEach(t => list.appendChild(el('div', { class: 'admin-item' },
      el('div', { class: 'admin-item-info' },
        el('h4', null, t.nombre, t.estado !== 'confirmado' ? el('span', { class: 'st ' + t.estado, text: t.estado }) : null),
        el('p', { text: t.telefono + (t.email ? ' · ' + t.email : '') }),
        el('span', { class: 'badge-tipo', text: t.tratamiento })),
      el('div', { class: 'admin-item-time' },
        el('div', { class: 'time', text: t.hora }),
        el('div', { class: 'date', text: fechaLinda(t.fecha) }),
        el('div', { class: 'acts' }, el('button', { class: 'btn-outline btn-sm', text: 'Editar', onclick: () => abrirEditor(t) }))))));
  };

  function abrirEditor(t) {
    const nuevo = !t; t = t || { fecha: '', hora: '', nombre: '', telefono: '', email: '', tratamiento: '', estado: 'confirmado' };
    const tipos = [...document.querySelectorAll('#f-tipo option')].map(o => o.textContent);
    if (t.tratamiento && tipos.indexOf(t.tratamiento) < 0) tipos.push(t.tratamiento);
    const fFecha = el('input', { type: 'date', value: t.fecha });
    const fHora = el('select');
    const fNom = el('input', { type: 'text', value: t.nombre });
    const fTel = el('input', { type: 'tel', value: t.telefono });
    const fMail = el('input', { type: 'email', value: t.email || '' });
    const fTipo = el('select', null, tipos.map(x => el('option', { text: x })));
    const fEst = el('select', null, ESTADOS.map(([v, l]) => el('option', { value: v, text: l })));
    fTipo.value = t.tratamiento || tipos[0]; fEst.value = t.estado;
    const err = el('div', { class: 'pm-err' });
    const campo = (l, n) => el('div', { class: 'pm-f' }, el('label', { text: l }), n);

    async function horas() {
      const sel = fHora.value || t.hora; fHora.textContent = '';
      let ocupadas = [];
      if (fFecha.value) {
        const { data } = await sb.from('turnos').select('id,hora').eq('fecha', fFecha.value).neq('estado', 'cancelado');
        ocupadas = (data || []).filter(x => !t.id || x.id !== t.id).map(x => x.hora);
      }
      fHora.appendChild(el('option', { value: '', text: 'Elegí un horario' }));
      allSlots().forEach(h => fHora.appendChild(el('option', { value: h, text: ocupadas.indexOf(h) >= 0 ? h + ' (ocupado)' : h, disabled: ocupadas.indexOf(h) >= 0 })));
      fHora.value = sel;
    }
    fFecha.addEventListener('change', () => { fHora.value = ''; horas(); });
    horas();

    const cerrar = () => ov.remove();
    const guardar = el('button', { class: 'btn-primary', text: 'Guardar', onclick: async () => {
      err.textContent = '';
      if (!fFecha.value || !fHora.value || !fNom.value.trim() || !fTel.value.trim()) { err.textContent = 'Completá fecha, hora, nombre y teléfono.'; return; }
      const fila = { fecha: fFecha.value, hora: fHora.value, nombre: fNom.value.trim(), telefono: fTel.value.trim(), email: fMail.value.trim() || null, tratamiento: fTipo.value, estado: fEst.value };
      guardar.disabled = true;
      const r = nuevo ? await sb.from('turnos').insert(fila) : await sb.from('turnos').update(fila).eq('id', t.id);
      guardar.disabled = false;
      if (r.error) { err.textContent = r.error.code === '23505' ? 'Ya hay un turno en ese horario. Elegí otro.' : 'No se pudo guardar. Probá de nuevo.'; return; }
      cerrar(); window.loadTurnos();
    } });
    let pedir = false;
    const borrar = nuevo ? null : el('button', { class: 'btn-danger', text: 'Eliminar turno', onclick: async e => {
      if (!pedir) { pedir = true; e.currentTarget.textContent = '¿Seguro? Tocá de nuevo para eliminar'; return; }
      const { error } = await sb.from('turnos').delete().eq('id', t.id);
      if (error) { err.textContent = 'No se pudo eliminar.'; return; }
      cerrar(); window.loadTurnos();
    } });
    const ov = el('div', { class: 'pm' }, el('div', { class: 'pm-box' },
      el('h3', { text: nuevo ? 'Nuevo turno' : 'Editar turno' }),
      el('div', { class: 'pm-row' }, campo('Fecha', fFecha), campo('Hora', fHora)),
      campo('Nombre completo', fNom),
      el('div', { class: 'pm-row' }, campo('Teléfono', fTel), campo('Email (opcional)', fMail)),
      el('div', { class: 'pm-row' }, campo('Tratamiento', fTipo), campo('Estado', fEst)),
      err,
      el('div', { class: 'pm-act' }, guardar, el('button', { class: 'btn-outline', text: 'Cerrar', onclick: cerrar }), borrar)));
    document.body.appendChild(ov);
  }

  /* ---------- panel: sitio (perfil, secciones, fotos) ---------- */
  function mensaje(t, esError) { const m = $('#sitio-msg'); if (!m) return; m.textContent = t; m.className = esError ? 'err' : ''; if (!esError) setTimeout(() => { if (m.textContent === t) m.textContent = ''; }, 3000); }
  const fallo = (e, t) => { console.error(e); mensaje(t || 'No se pudo completar la acción. Probá de nuevo.', true); };

  async function renderSitio() {
    const cont = $('#tab-sitio'); if (!cont) return;
    const [p, s, f] = await Promise.all([
      sb.from('perfil').select('*').eq('id', 1).maybeSingle(),
      sb.from('secciones').select('*').order('orden'),
      sb.from('fotos').select('*').order('orden')]);
    if (s.error || f.error) { cont.textContent = 'Todavía falta activar esta función en la base de datos.'; return; }
    const secs = s.data || [], fotos = f.data || [];
    cont.textContent = '';
    cont.appendChild(el('div', { id: 'sitio-msg' }));

    // Foto de perfil
    const perfil = p.data || {};
    const prev = perfil.foto_url && urlOk(perfil.foto_url) ? el('img', { class: 'sx-avatar', src: perfil.foto_url, alt: 'Foto de perfil' }) : el('div', { class: 'sx-avatar' });
    const inPerfil = el('input', { type: 'file', accept: 'image/*', onchange: async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        mensaje('Subiendo foto...');
        const blob = await aWebp(file, 600, true);
        const url = await subir(blob, 'perfil/' + Date.now() + '.' + extDe(blob));
        const { error } = await sb.from('perfil').upsert({ id: 1, foto_url: url, storage_path: url.split('/object/public/' + BUCKET + '/')[1] });
        if (error) throw error;
        if (perfil.storage_path) await quitarArchivo(perfil.storage_path);
        setAvatar(url); mensaje('Foto de perfil actualizada ✓'); renderSitio();
      } catch (er) { fallo(er); }
    } });
    cont.appendChild(el('div', { class: 'sx' }, el('h4', { text: 'Foto de perfil' }),
      el('div', { class: 'line' }, prev, el('div', null, el('div', { style: 'font-size:12px;color:var(--muted);margin-bottom:6px', text: 'Se muestra en la portada. Se recorta en círculo.' }), inPerfil))));

    // Secciones
    const mover = async (arr, i, d) => {
      const j = i + d; if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      const r = await Promise.all(arr.map((x, k) => sb.from(x._tabla).update({ orden: k }).eq('id', x.id)));
      if (r.some(x => x.error)) return fallo(r.find(x => x.error).error);
      renderSitio(); cargarContenido();
    };
    secs.forEach(x => x._tabla = 'secciones');
    secs.forEach((sec, si) => {
      const mias = fotos.filter(x => x.seccion_id === sec.id); mias.forEach(x => x._tabla = 'fotos');
      const tit = el('input', { type: 'text', value: sec.titulo });
      const txt = el('textarea', { rows: 2, value: sec.texto || '', placeholder: 'Texto corto opcional' });
      const vis = el('input', { type: 'checkbox', checked: sec.visible });
      let pedir = false;
      const grid = el('div', { class: 'sx-photos' }, mias.map((ft, fi) => {
        const cap = el('input', { type: 'text', value: ft.titulo || '', placeholder: 'Descripción', onchange: async e => { const r = await sb.from('fotos').update({ titulo: e.target.value.trim() || null }).eq('id', ft.id); r.error ? fallo(r.error) : (mensaje('Guardado ✓'), cargarContenido()); } });
        const cat = el('input', { type: 'text', value: ft.categoria || '', placeholder: 'Categoría (opcional)', onchange: async e => { const r = await sb.from('fotos').update({ categoria: e.target.value.trim() || null }).eq('id', ft.id); r.error ? fallo(r.error) : (mensaje('Guardado ✓'), cargarContenido()); } });
        return el('div', { class: 'sx-photo' },
          urlOk(ft.url) ? el('img', { src: ft.url, alt: ft.titulo || 'foto' }) : null, cap, cat,
          el('div', { class: 'line', style: 'margin:2px 0' },
            el('button', { class: 'btn-outline btn-sm', text: '←', 'aria-label': 'Mover antes', onclick: () => mover(mias, fi, -1) }),
            el('button', { class: 'btn-outline btn-sm', text: '→', 'aria-label': 'Mover después', onclick: () => mover(mias, fi, 1) }),
            el('button', { class: 'btn-danger btn-sm', text: 'Quitar', onclick: async () => {
              const r = await sb.from('fotos').delete().eq('id', ft.id); if (r.error) return fallo(r.error);
              await quitarArchivo(ft.storage_path); renderSitio(); cargarContenido();
            } })));
      }));
      const agregar = el('input', { type: 'file', accept: 'image/*', multiple: true, onchange: async e => {
        const files = [...e.target.files]; if (!files.length) return;
        try {
          let orden = mias.reduce((m, x) => Math.max(m, x.orden || 0), -1);
          for (let i = 0; i < files.length; i++) {
            mensaje('Subiendo foto ' + (i + 1) + ' de ' + files.length + '...');
            const blob = await aWebp(files[i], 1200, false);
            const ruta = 'secciones/' + sec.id + '/' + Date.now() + '-' + i + '.' + extDe(blob);
            const url = await subir(blob, ruta);
            const { error } = await sb.from('fotos').insert({ seccion_id: sec.id, url, storage_path: ruta, orden: ++orden });
            if (error) throw error;
          }
          mensaje('Fotos agregadas ✓'); renderSitio(); cargarContenido();
        } catch (er) { fallo(er); }
      } });
      cont.appendChild(el('div', { class: 'sx' },
        el('div', { class: 'line' }, el('div', { style: 'flex:1;min-width:160px' }, tit),
          el('button', { class: 'btn-outline btn-sm', text: '↑', 'aria-label': 'Subir sección', onclick: () => mover(secs, si, -1) }),
          el('button', { class: 'btn-outline btn-sm', text: '↓', 'aria-label': 'Bajar sección', onclick: () => mover(secs, si, 1) })),
        txt,
        el('div', { class: 'line' }, el('label', { style: 'font-size:13px' }, vis, ' Visible en el sitio'),
          el('button', { class: 'btn-primary btn-sm', text: 'Guardar sección', onclick: async () => {
            if (!tit.value.trim()) return fallo(null, 'La sección necesita un título.');
            const r = await sb.from('secciones').update({ titulo: tit.value.trim(), texto: txt.value.trim() || null, visible: vis.checked }).eq('id', sec.id);
            r.error ? fallo(r.error) : (mensaje('Sección guardada ✓'), cargarContenido());
          } }),
          el('button', { class: 'btn-danger btn-sm', text: 'Eliminar sección', onclick: async e => {
            if (!pedir) { pedir = true; e.currentTarget.textContent = '¿Seguro? Se borran también sus fotos'; return; }
            const r = await sb.from('secciones').delete().eq('id', sec.id); if (r.error) return fallo(r.error);
            await Promise.all(mias.map(x => quitarArchivo(x.storage_path))); renderSitio(); cargarContenido();
          } })),
        grid,
        el('div', { class: 'line' }, el('span', { style: 'font-size:12px;color:var(--muted)', text: 'Agregar fotos:' }), agregar)));
    });
    cont.appendChild(el('button', { class: 'btn-primary', text: '+ Nueva sección', onclick: async () => {
      const { error } = await sb.from('secciones').insert({ titulo: 'Nueva sección', visible: false, orden: secs.length });
      error ? fallo(error) : (mensaje('Sección creada. Está oculta hasta que la marques como visible.'), renderSitio());
    } }));
  }

  /* ---------- armado del panel ---------- */
  let armado = false;
  function armarPanel() {
    if (armado) return; const c = $('#admin-content'); if (!c) return; armado = true;
    const hijos = [...c.children]; const salir = hijos[0];
    const tTurnos = el('div', { id: 'tab-turnos' }, hijos.slice(1));
    const tSitio = el('div', { id: 'tab-sitio', style: 'display:none' });
    const bT = el('button', { class: 'tab on', text: 'Turnos' }), bS = el('button', { class: 'tab', text: 'Sitio y fotos' });
    const ir = (a) => { bT.classList.toggle('on', a); bS.classList.toggle('on', !a); tTurnos.style.display = a ? '' : 'none'; tSitio.style.display = a ? 'none' : ''; if (!a) renderSitio(); };
    bT.onclick = () => ir(true); bS.onclick = () => ir(false);
    const barra = el('div', { class: 'admin-filter' },
      el('button', { class: 'btn-primary btn-sm', text: '+ Nuevo turno', onclick: () => abrirEditor(null) }),
      el('label', { style: 'margin-left:auto;font-size:12px' }, el('input', { type: 'checkbox', id: 'ver-cancelados', onchange: () => window.loadTurnos() }), ' Ver cancelados'));
    tTurnos.insertBefore(barra, tTurnos.children[1] || null);
    c.textContent = ''; c.append(salir, el('div', { class: 'tabs' }, bT, bS), tTurnos, tSitio);
  }

  armarPanel();
  const showOrig = window.showAdmin;
  window.showAdmin = function (logged) { armarPanel(); showOrig(logged); };
  cargarContenido();
})();
