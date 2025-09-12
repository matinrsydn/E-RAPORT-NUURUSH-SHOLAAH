const path = require('path');
console.log('Start stepwise require');
console.log('Requiring express, cors, path, models');
const express = require('express');
const cors = require('cors');
const pathMod = require('path');
const db = require('../models');
console.log('OK base modules');

const routesDir = path.join(__dirname, '..', 'routes');
const fs = require('fs');
fs.readdirSync(routesDir).forEach(file => {
  const full = path.join(routesDir, file);
  console.log('Requiring route:', file);
  try {
    require(full);
    console.log('OK', file);
  } catch (err) {
    console.error('ERR', file, err && err.stack ? err.stack.split('\n')[0] : err);
  }
});
console.log('Done');
