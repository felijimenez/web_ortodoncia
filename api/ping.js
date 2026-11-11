// Consulta minima a Supabase para que el proyecto no se pause por inactividad.
module.exports = async (req, res) => {
  try {
    const r = await fetch('https://udujbkbbaouqhgkscppo.supabase.co/rest/v1/rpc/horas_ocupadas', {
      method: 'POST',
      headers: { apikey: 'sb_publishable_y7H6ZCXyrl-TgMWdjtN0wg_LnxGQet_', 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_fecha: '2030-01-01' })
    });
    res.status(r.ok ? 200 : 500).json({ ok: r.ok, status: r.status });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
};
