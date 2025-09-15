# Surat Template Placeholders

Placeholders you can use in your .docx templates. The server replaces these keys with data from the database / form when generating the final document.

Available placeholders:

- {nomor_surat}
- {tanggal_surat} (e.g. 13 September 2025)
- {siswa_nama}
- {siswa_nis}
- {siswa_ttl}
- {siswa_kelas}
- {wali_nama}
- {wali_pekerjaan}
- {wali_alamat}
- {tujuan_nama_pesantren}
- {tujuan_alamat_pesantren}
- {alasan}
- {penanggung_jawab} (ayah|ibu|wali)
- {penanggung_nama} (editable/overridable name for the responsible person)

Note: The placeholders {nama_pimpinan}, {jabatan_pimpinan}, and {tempat_dikeluarkan} are no longer provided by the server and should not be used in templates.

Recommended example for numbering: if you want to include tanggal in the printed number, you can put in the template something like:

- Nomor: {nomor_surat}/{tanggal_surat}

This will render with the generated nomor (e.g., SUR/2025/0001) followed by the formatted tanggal (e.g., 13 September 2025).

Usage notes:

- Ensure placeholders are written exactly as above (including curly braces).
- Upload a .docx file which contains these placeholders in the text. The server will return a generated .docx with values substituted.
