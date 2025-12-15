"use client";

import { ShieldAlert, CheckCircle2 } from "lucide-react";

export default function VerdictBanner({ verdict }: { verdict: string }) {
  const isApproved = verdict.includes("APPROVED");

  return (
    <div
      className={`w-full p-4 rounded-xl text-white mb-8 ${
        isApproved ? "bg-green-600" : "bg-red-600"
      }`}
    >
      <div className="flex items-center space-x-3">
        {isApproved ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
        <span className="text-lg font-semibold">{verdict}</span>
      </div>
    </div>
  );
}
