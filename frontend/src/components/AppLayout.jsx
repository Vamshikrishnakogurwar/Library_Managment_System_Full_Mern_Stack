import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Repeat,
  RotateCcw,
  Receipt,
  Settings,
  Bot,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdminOrLibrarian = user && (user.role === 'ADMIN' || user.role === 'LIBRARIAN');
  const isAdmin = user && user.role === 'ADMIN';

  const navLinks = [
    ...(isAdminOrLibrarian ? [{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] : []),
    { name: 'Book Catalog', path: '/catalog', icon: BookOpen },
    ...(isAdminOrLibrarian ? [{ name: 'Customers', path: '/customers', icon: Users }] : []),
    ...(isAdminOrLibrarian ? [{ name: 'Issue Desk', path: '/issue', icon: Repeat }] : []),
    ...(isAdminOrLibrarian ? [{ name: 'Return Desk', path: '/return', icon: RotateCcw }] : []),
    { name: 'Billing & Fines', path: '/billing', icon: Receipt },
    { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
    ...(isAdmin ? [{ name: 'Settings & Audit', path: '/settings', icon: Settings }] : []),
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-6 h-6 text-sky-400" />
          <span className="font-bold tracking-tight text-lg">LibraFlow</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 rounded text-slate-300 hover:text-white">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Desktop & Mobile drawer */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="hidden md:flex items-center space-x-3 px-6 py-6 border-b border-slate-800">
            <div className="p-2 bg-sky-600 rounded-lg text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-wide">LibraFlow</h1>
              <p className="text-xs text-sky-400">Library & Circulation</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.fullName || user?.username}</p>
              <div className="flex items-center space-x-1 mt-0.5">
                {user?.role === 'ADMIN' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span className="text-xs text-slate-400 font-mono tracking-wider">{user?.role}</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
