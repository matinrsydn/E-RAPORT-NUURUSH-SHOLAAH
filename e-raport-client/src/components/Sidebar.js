import { Users, UserCheck, Book, FileUp, FileText, Printer, UserCog } from 'lucide-react';

const SidebarComponent = ({ activeMenu, setActiveMenu }) => {
    const menus = [
        { name: 'Manajemen Siswa', icon: <Users size={18} /> },
        { name: 'Upload Nilai Excel', icon: <FileUp size={18} /> },
        { name: 'Cetak Raport', icon: <Printer size={18} /> },
    ];
    const masterDataMenus = [
        { name: 'Wali Kelas', icon: <UserCheck size={18} /> },
        { name: 'Mata Pelajaran', icon: <Book size={18} /> },
        { name: 'Kepala Sekolah', icon: <UserCog size={18} /> },
        { name: 'Manajemen Template', icon: <FileText size={18} /> },
    ];

    return (
        <aside className="w-64 bg-white shadow-lg flex-shrink-0">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-blue-600">e-Raport</h1>
                <p className="text-sm text-gray-500">Admin Dashboard</p>
            </div>
            <nav className="mt-4 px-4">
                <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu Utama</h3>
                <ul>
                    {menus.map(menu => (
                        <li key={menu.name} className="py-1">
                            <button onClick={() => setActiveMenu(menu.name)} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-sm font-medium ${ activeMenu === menu.name ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100' }`}>
                                {menu.icon}
                                <span>{menu.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                 <h3 className="px-3 py-2 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Master Data</h3>
                 <ul>
                    {masterDataMenus.map(menu => (
                        <li key={menu.name} className="py-1">
                            <button onClick={() => setActiveMenu(menu.name)} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-sm font-medium ${ activeMenu === menu.name ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100' }`}>
                                {menu.icon}
                                <span>{menu.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};
const AppSidebar = SidebarComponent; // Rename to avoid conflict if needed
// No default export needed here as it's a component used by App.js