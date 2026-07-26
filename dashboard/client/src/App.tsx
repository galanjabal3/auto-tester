import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Globe, Play, Clock, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Sites from './pages/Sites';
import Runs from './pages/Runs';
import Schedules from './pages/Schedules';

function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/sites', icon: Globe, label: 'Sites' },
    { to: '/runs', icon: Play, label: 'Runs' },
    { to: '/schedules', icon: Clock, label: 'Schedules' },
  ];

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Auto-Tester</h1>
            <p className="text-xs text-gray-500 mt-1">Automated Web Testing</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`
              }>
                <item.icon size={18} /> {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Theme toggle + footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setDark(!dark)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-64 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sites" element={<Sites />} />
            <Route path="/runs" element={<Runs />} />
            <Route path="/schedules" element={<Schedules />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
