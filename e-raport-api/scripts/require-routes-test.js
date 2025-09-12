const path = require('path');
const fs = require('fs');
const routesDir = path.join(__dirname, '..', 'routes');
console.log('Testing requires in', routesDir);
fs.readdirSync(routesDir).forEach(file => {
  const full = path.join(routesDir, file);
  try {
    console.log('Requiring', file);
    require(full);
    console.log('OK', file);
  } catch (err) {
    console.error('ERROR requiring', file, err && err.stack ? err.stack.split('\n')[0] : err);
  }
});
console.log('Done');
