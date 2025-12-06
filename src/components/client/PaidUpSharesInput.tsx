
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PaidUpSharesInputProps {
  value: number;
  onChange: (value: number | "") => void;
  className?: string;
}

export const PaidUpSharesInput: React.FC<PaidUpSharesInputProps> = ({
  value,
  onChange,
  className
}) => {
  return (
    <div className={`p-4 rounded-2xl bg-white/60 backdrop-blur border border-gray-200 shadow-sm space-y-3 mt-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-gray-700 tracking-wide">
          Paid Up Shares Percentage
        </Label>
        <span className="text-sm font-semibold text-gray-800">
          {value || 0}%
        </span>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-lg bg-gradient-to-r from-blue-300 to-blue-600 accent-blue-600 cursor-pointer"
        />

        <Input
          type="number"
          min="0"
          max="100"
          value={value === undefined || value === null ? "" : value}
          onChange={(e) => {
            let val = e.target.value;
            if (val === "") return onChange("");
            let numVal = Number(val);
            if (numVal > 100) numVal = 100;
            if (numVal < 0) numVal = 0;
            onChange(numVal);
          }}
          className="w-20 text-center h-9 rounded-xl border-gray-300 bg-white shadow-inner"
        />
      </div>

      <p className="text-xs text-gray-600">Percentage of shares that have been paid up</p>
    </div>
  );
};
