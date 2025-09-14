const masterController = require('../controllers/masterTahunAjaranController');
const taController = require('../controllers/tahunAjaranController');

function mockRes() {
  let data;
  return {
    json: (d) => { data = d; return d; },
    status: function(s) { this._status = s; return this; },
    send: (d) => { data = d; return d; },
    _get: () => data
  };
}

(async () => {
  try {
    console.log('Calling masterTahunAjaranController.getAll');
    const req1 = { query: {} };
    const res1 = mockRes();
    await masterController.getAll(req1, res1);
    console.log('Masters:', JSON.stringify(res1._get(), null, 2));

    const masters = res1._get();
    if (Array.isArray(masters) && masters.length) {
      const firstId = masters[0].id;
      console.log(`Calling tahunAjaranController.getAll with master_tahun_ajaran_id=${firstId}`);
      const req2 = { query: { master_tahun_ajaran_id: firstId } };
      const res2 = mockRes();
      await taController.getAll(req2, res2);
      console.log('Periodes:', JSON.stringify(res2._get(), null, 2));
    } else {
      console.log('No masters to test periodes with');
    }
    process.exit(0);
  } catch (err) {
    console.error('controller_check failed:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
})();
