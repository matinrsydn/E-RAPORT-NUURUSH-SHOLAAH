Reset DB from models - instructions

This script will DROP ALL TABLES and re-create schema using the Sequelize models defined in `models/`.

Usage (from `e-raport-api` folder):

1. Backup your database (recommended). For MySQL you can use:
   mysqldump -u <user> -p <database> > backup.sql

2. Ensure you have a test Excel in `tmp/` named `test_upload_*.xlsx` if you want the smoke test to run. Otherwise the script will skip the smoke test.

3. Run:
   node scripts/reset_db_from_models.js

Notes:

- This is destructive. Do not run on production unless you have a reliable backup and know the consequences.
- The script seeds minimal master data: MasterTahunAjaran, PeriodeAjaran, IndikatorKehadiran, MataPelajaran, a Guru, Kelas, and one Siswa.
- After the script completes, it will attempt to run the parser + save flow against any `test_upload_*.xlsx` found in `tmp/`.
