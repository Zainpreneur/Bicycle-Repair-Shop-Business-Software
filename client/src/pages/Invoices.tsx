import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { Invoice } from "../types";
import { formatDate, money } from "../utils/format";

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await api.get("/invoices", { params: { status: statusFilter || undefined } });
    setInvoices(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="text-slate-500 text-sm mt-1">Billing generated from repair orders.</p>
      </div>

      <div className="flex gap-2">
        {["", "unpaid", "paid", "void"].map((s) => (
          <button
            key={s}
            className={`btn-secondary capitalize ${statusFilter === s ? "!bg-slate-900 !text-white" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th>Issued</th>
              <th>Paid</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link to={`/invoices/${inv.id}`} className="font-medium text-brand-600 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="text-slate-700">{inv.customer_name}</td>
                  <td>
                    <StatusBadge value={inv.status} />
                  </td>
                  <td className="font-medium">{money(inv.total)}</td>
                  <td className="text-slate-500">{formatDate(inv.issued_date)}</td>
                  <td className="text-slate-500">{formatDate(inv.paid_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
