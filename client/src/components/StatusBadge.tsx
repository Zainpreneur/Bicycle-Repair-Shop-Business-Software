import React from "react";

const COLORS: Record<string, string> = {
  received: "bg-slate-100 text-slate-700",
  diagnosing: "bg-sky-100 text-sky-700",
  awaiting_approval: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  awaiting_parts: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  picked_up: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-700",
  scheduled: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
  unpaid: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  void: "bg-slate-100 text-slate-500 line-through",
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function StatusBadge({ value }: { value: string }) {
  const classes = COLORS[value] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}
