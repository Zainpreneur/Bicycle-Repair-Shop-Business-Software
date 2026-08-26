import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { DashboardData } from "../types";
import { formatDateTime, money } from "../utils/format";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading dashboard…</div>;
  if (!data) return <div className="text-red-600">Failed to load dashboard.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Shop overview at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Repairs" value={data.activeRepairs} />
        <StatCard label="Completed This Month" value={data.completedThisMonth} tone="success" />
        <StatCard label="Revenue This Month" value={money(data.revenueThisMonth)} tone="success" />
        <StatCard
          label="Unpaid Invoices"
          value={money(data.unpaidInvoicesTotal)}
          tone={data.unpaidInvoicesTotal > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Recent Repair Orders</h2>
            <Link to="/repair-orders" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {data.recentRepairOrders.length === 0 ? (
            <p className="text-sm text-slate-400">No repair orders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentRepairOrders.map((ro) => (
                <li key={ro.id} className="py-2.5">
                  <Link to={`/repair-orders/${ro.id}`} className="flex items-center justify-between group">
                    <div>
                      <div className="text-sm font-medium text-slate-800 group-hover:text-brand-600">
                        #{ro.id} — {ro.customer_name}
                      </div>
                      <div className="text-xs text-slate-400">{ro.description || "No description"}</div>
                    </div>
                    <StatusBadge value={ro.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {data.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcomingAppointments.map((a) => (
                <li key={a.id} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{a.customer_name}</div>
                      <div className="text-xs text-slate-400">{a.reason || "Appointment"}</div>
                    </div>
                    <div className="text-xs text-slate-500">{formatDateTime(a.scheduled_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Low Stock Alerts</h2>
          <Link to="/inventory" className="text-sm text-brand-600 hover:underline">
            View inventory
          </Link>
        </div>
        {data.lowStockItems.length === 0 ? (
          <p className="text-sm text-slate-400">All items are stocked above their reorder level.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>On Hand</th>
                  <th>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium text-slate-800">{item.name}</td>
                    <td className="text-slate-500">{item.sku || "—"}</td>
                    <td className="text-red-600 font-semibold">{item.quantity}</td>
                    <td className="text-slate-500">{item.reorder_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
