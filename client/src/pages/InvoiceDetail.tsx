import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { Invoice } from "../types";
import { formatDate, money } from "../utils/format";

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get(`/invoices/${id}`);
    setInvoice(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(status: "unpaid" | "paid" | "void") {
    if (!invoice) return;
    setBusy(true);
    try {
      await api.patch(`/invoices/${invoice.id}/status`, { status });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (!invoice) return <div className="text-red-600">Invoice not found.</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link to="/invoices" className="text-sm text-brand-600 hover:underline">
          &larr; Back to invoices
        </Link>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</h1>
            <div className="text-sm text-slate-500 mt-1">Issued {formatDate(invoice.issued_date)}</div>
          </div>
          <StatusBadge value={invoice.status} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <div className="text-xs text-slate-500 uppercase font-medium">Bill To</div>
            <div className="mt-1 font-medium text-slate-800">{invoice.customer_name}</div>
            {invoice.customer_email && <div className="text-slate-500">{invoice.customer_email}</div>}
            {invoice.customer_phone && <div className="text-slate-500">{invoice.customer_phone}</div>}
          </div>
          {invoice.repair_order_id && (
            <div>
              <div className="text-xs text-slate-500 uppercase font-medium">Repair Order</div>
              <Link
                to={`/repair-orders/${invoice.repair_order_id}`}
                className="mt-1 inline-block text-brand-600 hover:underline"
              >
                #{invoice.repair_order_id}
              </Link>
            </div>
          )}
        </div>

        {invoice.items && invoice.items.length > 0 && (
          <table className="table-base mb-4">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="text-slate-800">{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unit_price)}</td>
                  <td className="font-medium">{money(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="space-y-1 text-sm text-right border-t border-slate-100 pt-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{money(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax ({(invoice.tax_rate * 100).toFixed(1)}%)</span>
            <span>{money(invoice.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-900">
            <span>Total</span>
            <span>{money(invoice.total)}</span>
          </div>
        </div>

        {invoice.paid_date && (
          <p className="text-xs text-slate-400 mt-3 text-right">Paid on {formatDate(invoice.paid_date)}</p>
        )}

        <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 pt-4">
          {invoice.status !== "paid" && (
            <button className="btn-primary" disabled={busy} onClick={() => setStatus("paid")}>
              Mark Paid
            </button>
          )}
          {invoice.status !== "unpaid" && (
            <button className="btn-secondary" disabled={busy} onClick={() => setStatus("unpaid")}>
              Mark Unpaid
            </button>
          )}
          {invoice.status !== "void" && (
            <button className="btn-danger" disabled={busy} onClick={() => setStatus("void")}>
              Void Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
