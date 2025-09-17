import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Users, FileUp, BookUser, Layers, DoorOpen, Book, ClipboardList, Calendar, UserCog, FileCog, CheckSquare, BookCopy } from "lucide-react";

type NavItem = { to: string; label: string; Icon: React.ElementType };

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Utama",
    items: [
      { to: "/", label: "Dashboard", Icon: Home },
      { to: "/dashboard/manajemen-siswa", label: "Manajemen Siswa", Icon: Users },
      { to: "/dashboard/manajemen-guru", label: "Manajemen Guru", Icon: Users },
      { to: "/dashboard/manajemen-kelas", label: "Manajemen Kelas", Icon: Layers },
    ],
  },
      {
        title: "Akademik",
        items: [
          { to: "/dashboard/input-nilai", label: "Input Nilai", Icon: FileUp },
          { to: "/dashboard/manajemen-raport", label: "Manajemen Raport", Icon: BookUser },
          // keep label 'Kenaikan' but route to the Promosi page which is already implemented
          { to: "/dashboard/promosi-kelas", label: "Kenaikan", Icon: CheckSquare },
          // Manajemen Sikap page removed; use Indikator Sikap instead
        ],
      },
  {
    title: "Master Data",
    items: [
      { to: "/dashboard/manajemen-tingkatan", label: "Tingkatan", Icon: ClipboardList },
      { to: "/dashboard/manajemen-tahun-ajaran", label: "Tahun Ajaran", Icon: Calendar },
      { to: "/dashboard/manajemen-mapel", label: "Mata Pelajaran", Icon: Book },
      { to: "/dashboard/manajemen-kitab", label: "Manajemen Kitab", Icon: BookCopy },
      { to: "/dashboard/manajemen-kurikulum", label: "Manajemen Kurikulum", Icon: Layers },
      { to: "/dashboard/manajemen-kamar", label: "Kamar", Icon: DoorOpen },
      { to: "/dashboard/manajemen-indikator-sikap", label: "Indikator Sikap", Icon: ClipboardList },
      {to: "/dashboard/indikator-kehadiran", label: "Indikator Kehadiran", Icon: ClipboardList},
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { to: "/dashboard/manajemen-template", label: "Manajemen Template", Icon: FileCog },
      { to: "/dashboard/kepala-pesantren", label: "Pimpinan Pesantren", Icon: UserCog },
      { to: "/dashboard/surat-keluar-template", label: "Surat Keluar (Template)", Icon: FileUp },
    ],
  },
];

export default function DashboardNav() {
  return (
    <aside className="w-72 bg-white border-r min-h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-center text-sky-600">e-Raport</h2>
      </div>

      <nav className="p-3">
        {sections.map((sec) => (
          <div key={sec.title} className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">{sec.title}</div>
            <ul className="space-y-1">
              {sec.items.map(({ to, label, Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded text-sm ${
                        isActive ? 'bg-sky-50 text-sky-700 font-medium' : 'hover:bg-slate-50 text-gray-700'
                      }`
                    }
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

