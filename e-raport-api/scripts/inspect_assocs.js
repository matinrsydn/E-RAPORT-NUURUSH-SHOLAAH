const db = require('../models');

console.log('Loaded models:', Object.keys(db).filter(k=>k!== 'sequelize' && k !== 'Sequelize'));

for (const k of Object.keys(db)) {
  if (k === 'sequelize' || k === 'Sequelize') continue;
  const m = db[k];
  console.log('\nModel:', k, '-> modelName:', m.name);
  console.log('  associations keys:', m.associations ? Object.keys(m.associations) : '(none)');
  if (m.associations) {
    for (const [aName, assoc] of Object.entries(m.associations)) {
      console.log(`    - ${aName}: associationType=${assoc.associationType}, target=${assoc.target && assoc.target.name}`);
    }
  }
}
