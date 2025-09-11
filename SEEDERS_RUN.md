Seeder and environment instructions

- Create a root `.env` (already added in this repo) with:

  API_BASE_URL=http://localhost:5000/api
  REACT_APP_API_BASE_URL=http://localhost:5000/api

- Start backend:

  1. cd e-raport-api
  2. npm install
  3. npm start

- Run seeders from project root (example):

  node e-raport-api/seeders/20250911-seed-gurus-with-ttd.js
  node e-raport-api/seeders/20250911-seed-raport-sample-data.js

Notes:

- Seeders use inline Sequelize and rely on `db.sequelize.sync({ alter: true })` to create/update schema.
- Uploads directory and placeholder signature will be created by seeder if missing.
