import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/repair-orders", label: "Repair Orders" },
  { to: "/appointments", label: "Appointments" },
  { to: "/customers", label: "Customers" },
  { to: "/inventory", label: "Inventory" },
  { to: "/services", label: "Services" },
  { to: "/invoices", label: "Invoices" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-lg font-bold tracking-tight">🚲 Spoke &amp; Wrench</div>
          <div className="text-xs text-slate-400">Shop Manager</div>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-800 text-sm">
          <div className="font-medium">{user?.name}</div>
          <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
          <button
            onClick={logout}
            className="mt-2 text-xs text-slate-400 hover:text-white underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
