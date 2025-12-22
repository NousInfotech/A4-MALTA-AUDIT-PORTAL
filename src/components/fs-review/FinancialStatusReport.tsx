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

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All",
  AUDIT_REPORT: "Audit Report",
  BALANCE_SHEET: "Balance Sheet",
  INCOME_STATEMENT: "Income Statement",
  GENERAL: "General",
  NOTES_AND_POLICY: "Notes & Policy",
  CROSS_STATEMENT: "Cross Statement",
};

export default function FinancialStatusReport({ data, onUploadAgain }: { data?: FSReviewOutput; onUploadAgain?: () => void }) {
  const [dataset, setDataset] = useState<"allPass" | "allFail" | "mix" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // If user selected a dataset, use it. Otherwise use provided data. Fallback to 'mix'.
  const activeData: FSReviewOutput = dataset 
    ? (DATASETS[dataset] as unknown as FSReviewOutput) 
    : (data || (DATASETS.mix as unknown as FSReviewOutput));

  const activeKey = dataset || (data ? null : "mix");

  // Extract all unique categories from the data
  const getAllCategories = (): string[] => {
    const categories = new Set<string>();
    
    if (activeData?.A?.items) {
      activeData.A.items.forEach(item => {
        if (item.category) categories.add(item.category);
      });
    }
    
    if (activeData?.B?.items) {
      activeData.B.items.forEach(item => {
        if (item.category) categories.add(item.category);
      });
    }
    
    if (activeData?.C?.items) {
      activeData.C.items.forEach(item => {
        if (item.category) categories.add(item.category);
      });
    }
    
    return ["ALL", ...Array.from(categories).sort()];
  };

  const availableCategories = getAllCategories();

  // Filter items by selected category
  const filterItemsByCategory = <T extends { category?: string }>(items: T[]): T[] => {
    if (selectedCategory === "ALL") return items;
    return items.filter(item => item.category === selectedCategory);
  };

  const filteredAItems = filterItemsByCategory(activeData?.A?.items || []);
  const filteredBItems = filterItemsByCategory(activeData?.B?.items || []);
  const filteredCItems = filterItemsByCategory(activeData?.C?.items || []);

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
      <div className="flex flex-col gap-4 mb-6">
        {/* Category Filter Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 mr-2">Filter by Category:</span>
          {availableCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-4 py-2 rounded-lg border transition-all
                text-sm font-medium
                ${
                  selectedCategory === category
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }
              `}
            >
              {CATEGORY_LABELS[category] || category}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
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

      
      {/* ------------------- VERDICT ------------------- */}
      <VerdictBanner verdict={activeData.E.verdict} />

      {/* ------------------- SECTIONS ------------------- */}
      <SectionA items={filteredAItems} />
      <SectionB items={filteredBItems} />
      <SectionC items={filteredCItems} />
      <SectionD tables={activeData.D.tables} />
    </div>
  );
}
