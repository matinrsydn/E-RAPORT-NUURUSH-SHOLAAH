const puppeteer = require('puppeteer');

(async ()=>{
  const base = 'http://localhost:3000';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);

    console.log('Opening Manajemen Siswa page...');
    await page.goto(`${base}/dashboard/manajemen-siswa`);
    // wait for master and periode selects (they are plain select elements)
    await page.waitForSelector('select', { visible: true });
    // count master options from first select
    const selectElems = await page.$$('select');
    console.log('Found select elements count:', selectElems.length);
    if (selectElems.length >= 2) {
      const masterCount = await page.evaluate(el => el.querySelectorAll('option').length, selectElems[0]);
      const periodeCount = await page.evaluate(el => el.querySelectorAll('option').length, selectElems[1]);
      console.log(`ManajemenSiswa - master options: ${masterCount}, periode options: ${periodeCount}`);
    } else {
      console.warn('Could not find expected selects on Manajemen Siswa page.');
    }

    console.log('Opening Promosi Kelas page...');
    await page.goto(`${base}/dashboard/promosi-kelas`);
    await page.waitForSelector('select', { visible: true });
    const selectsPromosi = await page.$$('select');
    console.log('Promosi select count:', selectsPromosi.length);
    if (selectsPromosi.length >= 2) {
      const asalOpts = await page.evaluate(el => el.querySelectorAll('option').length, selectsPromosi[0]);
      const tujuanOpts = await page.evaluate(el => el.querySelectorAll('option').length, selectsPromosi[1]);
      console.log(`PromosiKelas - asal options: ${asalOpts}, tujuan options: ${tujuanOpts}`);
    } else {
      console.warn('Could not find expected selects on Promosi Kelas page.');
    }

    console.log('E2E check completed.');
  } catch (err) {
    console.error('E2E check failed:', err && err.message ? err.message : err);
    process.exit(2);
  } finally {
    await browser.close();
  }
})();
