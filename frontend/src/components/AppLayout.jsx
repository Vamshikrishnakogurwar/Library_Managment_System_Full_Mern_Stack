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
  UserCheck,
  Sparkles,
  ShoppingBag,
  Layers,
  ArrowRight
} from 'lucide-react';

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdminOrLibrarian = user && (user.role === 'ADMIN' || user.role === 'LIBRARIAN');
  const isAdmin = user && user.role === 'ADMIN';
  const isCustomer = user && user.role === 'CUSTOMER';

  const navLinks = [
    ...(isAdminOrLibrarian ? [{ name: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard, tag: 'Live' }] : []),
    { name: isCustomer ? 'Browse Books (Rent / Buy)' : 'Master Book Catalog & Stock', path: '/catalog', icon: BookOpen },
    ...(isAdminOrLibrarian ? [{ name: 'Customer Directory & Edit', path: '/customers', icon: Users }] : []),
    ...(isAdminOrLibrarian ? [{ name: 'Issue Circulation Desk', path: '/issue', icon: Repeat }] : []),
    ...(isAdminOrLibrarian ? [{ name: 'Return & Fine Desk', path: '/return', icon: RotateCcw }] : []),
    { name: isCustomer ? 'My Invoices & Receipts' : 'Billing, Invoices & Fines', path: '/billing', icon: Receipt },
    { name: 'AI Library Assistant', path: '/ai-assistant', icon: Bot, tag: 'Smart' },
    ...(isAdmin ? [{ name: 'System Settings & Audit', path: '/settings', icon: Settings }] : []),
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 sticky top-0 z-50 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-base font-display">LibraFlow</span>
            <span className="text-[10px] text-sky-400 font-mono block -mt-0.5">
              {isAdmin ? 'ADMIN CONSOLE' : isCustomer ? 'CUSTOMER PORTAL' : 'STAFF CONSOLE'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out border-r border-slate-800/80 shadow-xl shadow-black/20 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Logo & Portal Header */}
          <div className="hidden md:flex items-center space-x-3.5 px-6 py-6 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 ring-2 ring-white/10">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-white font-display tracking-tight leading-none flex items-center gap-1.5">
                LibraFlow
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h1>
              <p className="text-xs text-sky-400 font-medium mt-1 truncate">
                {isAdmin ? 'Unified Admin Suite' : isCustomer ? 'Reader & Member Portal' : 'Circulation Console'}
              </p>
            </div>
          </div>

          {/* Current Mode Badge */}
          <div className="px-5 pt-4 pb-2">
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
              isAdmin
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : isCustomer
                ? 'bg-sky-500/10 border-sky-500/20 text-sky-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}>
              <div className="flex items-center space-x-2">
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                ) : isCustomer ? (
                  <ShoppingBag className="w-4 h-4 text-sky-400" />
                ) : (
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                )}
                <div>
                  <span className="font-bold block leading-none">{isAdmin ? 'Administrator Mode' : isCustomer ? 'Customer Portal' : 'Librarian Desk'}</span>
                  <span className="text-[10px] opacity-75">{isAdmin ? 'Full stock & billing authority' : isCustomer ? 'Rent & purchase access' : 'Circulation operations'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-1">
              {isAdmin ? 'Management Modules' : isCustomer ? 'Library Services' : 'Operations'}
            </p>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-300'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.tag && (
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-sky-950 text-sky-400 border border-sky-800/50'
                    }`}>
                      {item.tag}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.fullName || user?.username}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
                <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                  {user?.role} {user?.customerCode ? `• ${user.customerCode}` : ''}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold rounded-xl text-rose-300 bg-rose-950/30 hover:bg-rose-900/50 hover:text-rose-100 border border-rose-900/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function AppLayout({ children }) {
  const { user } = useAuth();
  const isAdmin = user && user.role === 'ADMIN';

  return (
    <div className="flex min-h-screen bg-slate-50/60 text-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Subtle top notification ribbon */}
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>LibraFlow High-Availability Node Active</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 hidden sm:inline">Automatic zero-latency transaction pool</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="font-medium text-slate-700">{user?.fullName || user?.username}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {user?.role}
            </span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
