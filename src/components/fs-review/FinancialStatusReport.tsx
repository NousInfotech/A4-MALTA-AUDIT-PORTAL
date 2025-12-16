"use client";

import { useState } from "react";

import VerdictBanner from "./VerdictBanner";
import SectionA from "./SectionA";
import SectionB from "./SectionB";
import SectionC from "./SectionC";
import SectionD from "./SectionD";

import { Download, Upload } from "lucide-react";
import { generateFinancialStatusPDF } from "@/lib/pdf-generator";

import { FSReviewOutput } from "@/types/fs/fs";

import fsAllPass from "@/data/fs/fs-allPass.json";
import fsAllFail from "@/data/fs/fs-allFail.json";
import fsMix from "@/data/fs/fs.json";
import { Button } from "../ui/button";

const DATASETS = {
  allPass: fsAllPass,
  allFail: fsAllFail,
  mix: fsMix
};

export default function FinancialStatusReport({ data, onUploadAgain }: { data?: FSReviewOutput; onUploadAgain?: () => void }) {
  const [dataset, setDataset] = useState<"allPass" | "allFail" | "mix" | null>(null);

  // If user selected a dataset, use it. Otherwise use provided data. Fallback to 'mix'.
  const activeData: FSReviewOutput = dataset 
    ? (DATASETS[dataset] as unknown as FSReviewOutput) 
    : (data || (DATASETS.mix as unknown as FSReviewOutput));

  const activeKey = dataset || (data ? null : "mix");

  if (!activeData) {
    return (
      <div className="p-4 text-center text-red-500 border border-red-200 rounded-lg bg-red-50">
        Error: Unable to load financial status data.
      </div>
    );
  }

  return (
    <div className="mx-auto px-5">

      {/* ------------------- TOGGLE BUTTONS ------------------- */}
      <div className="flex flex-col items-center gap-2 mb-6">


        {/* --- Test Data Notice Tag --- */}
      <div className="text-sm mt-5 px-3 rounded-md text-gray-600 italic">
      This is not real data — this is for test purposes only.
      </div>

        <div className="flex justify-between items-center gap-2 w-full">
      {/* --- Toggle Buttons --- */}
      <div className="flex justify-center gap-3">
      {/* {[
      { key: "allPass", label: "All Pass", color: "green" },
      { key: "allFail", label: "All Fail", color: "red" },
      { key: "mix", label: "Mixed", color: "blue" }
      ].map((btn) => (
      <button
      key={btn.key}
      onClick={() => setDataset(btn.key as any)}
      className={`
      px-4 py-2 rounded-lg border transition 
      text-sm font-medium
      ${dataset === btn.key
      ? `bg-${btn.color}-600 text-white border-${btn.color}-700 shadow`
      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
      }
      `}
      >
      {btn.label}
      </button>
      ))} */}
      </div>

      <div className="flex gap-2">
      {onUploadAgain && (
        <Button variant="default" onClick={onUploadAgain}>
        <Upload className="w-4 h-4" />
        Upload Another File
        </Button>
      )}
      
          {/* --- Export PDF Button --- */}
        <Button
          variant="default"
          onClick={() => generateFinancialStatusPDF(activeData)}
         >
          <Download className="w-4 h-4" />
          Export PDF Report
        </Button>
      </div>
      </div>

  
      </div>

      
      {/* ------------------- VERDICT ------------------- */}
      <VerdictBanner verdict={activeData.E.verdict} />

      {/* ------------------- SECTIONS ------------------- */}
      <SectionA items={activeData.A.items} />
      <SectionB items={activeData.B.items} />
      <SectionC items={activeData.C.items} />
      <SectionD tables={activeData.D.tables} />
    </div>
  );
}
