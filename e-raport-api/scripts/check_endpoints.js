(async () => {
  try {
    const base = 'http://localhost:5000';
    console.log('Fetching /api/master-tahun-ajaran...');
    const mastersRes = await fetch(`${base}/api/master-tahun-ajaran`);
    if (!mastersRes.ok) throw new Error(`masters request failed: ${mastersRes.status}`);
    const masters = await mastersRes.json();
    console.log('Masters:', JSON.stringify(masters, null, 2));

    if (!Array.isArray(masters) || masters.length === 0) {
      console.log('No masters found, skipping periodes fetch.');
      process.exit(0);
    }

    const firstId = masters[0].id;
    console.log(`Fetching /api/tahun-ajaran?master_tahun_ajaran_id=${firstId} ...`);
    const periodesRes = await fetch(`${base}/api/tahun-ajaran?master_tahun_ajaran_id=${firstId}`);
    if (!periodesRes.ok) throw new Error(`periodes request failed: ${periodesRes.status}`);
    const periodes = await periodesRes.json();
    console.log('Periodes for master', firstId, JSON.stringify(periodes, null, 2));
  } catch (err) {
    console.error('Error when checking endpoints:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
