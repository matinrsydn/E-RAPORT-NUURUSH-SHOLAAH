const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function upload() {
  const filePath = path.join(__dirname, '..', 'tmp', fs.readdirSync(path.join(__dirname, '..', 'tmp')).find(f => f.startsWith('test_upload_') && f.endsWith('.xlsx')));
  console.log('Uploading', filePath);
  const fd = new FormData();
  fd.append('file', fs.createReadStream(filePath));

  try {
    const res = await axios.post('http://localhost:5000/api/raport/upload', fd, { headers: fd.getHeaders(), maxBodyLength: Infinity });
    console.log('Status', res.status);
    console.log('Body', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Status', err.response.status);
      console.error('Body', err.response.data);
      if (err.response.data && err.response.data.error) console.error('Error detail:', err.response.data.error);
    } else {
      console.error('Error uploading:', err.message);
      if (err.stack) console.error(err.stack);
    }
  }
}

upload();
