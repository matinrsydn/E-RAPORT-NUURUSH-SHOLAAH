import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Users, FileUp, BookUser, Layers, DoorOpen, Book, ClipboardList, Calendar, UserCog, FileCog, CheckSquare } from 'lucide-react'

export default function SidebarNew() {
  return (
    <aside className="bg-white border-r w-72 min-h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-center text-sky-600">e-Raport</h2>
      </div>

      <nav className="p-2">
        <div className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Menu Utama</div>
        <ul className="space-y-1">
          <li>
            <NavLink to="/" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100">
              <Home size={16} /> <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/manajemen-siswa" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100">
              <Users size={16} /> <span>Manajemen Siswa</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/input-nilai" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100">
              <FileUp size={16} /> <span>Input Nilai</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/manajemen-raport" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100">
              <BookUser size={16} /> <span>Manajemen Raport</span>
            </NavLink>
          </li>
        </ul>

        <div className="mt-6 text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Master Data</div>
        <ul className="space-y-1">
          <li>
            <NavLink to="/dashboard/manajemen-guru" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100">
              <Users size={16} /> <span>Manajemen Guru</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/manajemen-kelas" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100">
              <Layers size={16} /> <span>Manajemen Kelas</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/manajemen-kamar" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100">
              <DoorOpen size={16} /> <span>Manajemen Kamar</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/manajemen-mapel" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100">
              <Book size={16} /> <span>Mata Pelajaran</span>
            </NavLink>
            <NavLink to="/dashboard/manajemen-kitab" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100">
              <BookCopy size={16} /> <span>Manajemen Kitab</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
