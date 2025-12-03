import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const SHARE_CLASS_CONFIG = [
  { key: "classA", label: "Class A", backendValue: "A" },
  { key: "classB", label: "Class B", backendValue: "B" },
  { key: "classC", label: "Class C", backendValue: "C" },
  { key: "ordinary", label: "Ordinary", backendValue: "Ordinary" },
] as const;

export type ShareClassKey = (typeof SHARE_CLASS_CONFIG)[number]["key"];

export type ShareClassValues = Record<ShareClassKey, number>;
export type ShareClassErrors = Record<ShareClassKey, string>;

export const DEFAULT_SHARE_TYPE = "Ordinary";

export const getDefaultShareClassValues = (): ShareClassValues => ({
  classA: 0,
  classB: 0,
  classC: 0,
  ordinary: 100,
});

export const getDefaultShareClassErrors = (): ShareClassErrors => ({
  classA: "",
  classB: "",
  classC: "",
  ordinary: "",
});

/**
 * Builds the totalShares payload for the backend.
 * Includes all share classes: Class A, B, C, and Ordinary
 */
export const buildTotalSharesPayload = (values: ShareClassValues) => {
  const allShares = SHARE_CLASS_CONFIG.map(({ key, backendValue }) => ({
    totalShares: Number(values[key]) || 0,
    class: backendValue,
    type: DEFAULT_SHARE_TYPE,
  }));
  
  // Filter out entries with totalShares <= 0 before sending to backend
  return allShares.filter(item => item.totalShares > 0);
};

export const calculateTotalSharesSum = (values: ShareClassValues) => {
  // Sum all share classes: Class A, B, C, and Ordinary
  return SHARE_CLASS_CONFIG.reduce((sum, { key }) => sum + (Number(values[key]) || 0), 0);
};

/**
 * Parses totalShares array from backend into form state
 */
export const parseTotalSharesArray = (
  totalShares?: Array<{ totalShares: number; class: string; type: string }>
): ShareClassValues => {
  const defaultValues = getDefaultShareClassValues();

  if (Array.isArray(totalShares) && totalShares.length > 0) {
    // Parse values from array
    totalShares.forEach((item) => {
      if (item.class === "A") defaultValues.classA = Number(item.totalShares) || 0;
      if (item.class === "B") defaultValues.classB = Number(item.totalShares) || 0;
      if (item.class === "C") defaultValues.classC = Number(item.totalShares) || 0;
      if (item.class === "Ordinary") defaultValues.ordinary = Number(item.totalShares) || 0;
    });
  }

  return defaultValues;
};

interface ShareClassInputProps {
  values: ShareClassValues;
  errors?: ShareClassErrors;
  onValuesChange: (values: ShareClassValues) => void;
  onErrorChange?: (errors: ShareClassErrors) => void;
  showTotal?: boolean;
  label?: string;
  className?: string;
}

export const ShareClassInput: React.FC<ShareClassInputProps> = ({
  values,
  errors = getDefaultShareClassErrors(),
  onValuesChange,
  onErrorChange,
  showTotal = true,
  label = "Total Shares",
  className = "",
}) => {
  const totalSharesSum = calculateTotalSharesSum(values);
  const [localErrors, setLocalErrors] = useState<ShareClassErrors>(errors);

  useEffect(() => {
    setLocalErrors(errors);
  }, [errors]);

  const handleShareValueChange = (
    key: ShareClassKey,
    label: string,
    rawValue: string
  ) => {
    if (rawValue === "") {
      const newValues = { ...values, [key]: 0 };
      onValuesChange(newValues);
      const newErrors = { ...localErrors, [key]: "" };
      setLocalErrors(newErrors);
      onErrorChange?.(newErrors);
      return;
    }

    const parsedValue = parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      const newErrors = {
        ...localErrors,
        [key]: `${label} shares must be 0 or greater`,
      };
      setLocalErrors(newErrors);
      onErrorChange?.(newErrors);
    } else {
      const newErrors = { ...localErrors, [key]: "" };
      setLocalErrors(newErrors);
      onErrorChange?.(newErrors);

      // Update the value for the selected share class
      const updatedValues = { ...values, [key]: parsedValue };
      onValuesChange(updatedValues);
    }
  };

  const handleShareValueBlur = (
    key: ShareClassKey,
    label: string,
    rawValue: string
  ) => {
    if (rawValue === "") {
      const newErrors = { ...localErrors, [key]: "" };
      setLocalErrors(newErrors);
      onErrorChange?.(newErrors);
      const newValues = { ...values, [key]: 0 };
      onValuesChange(newValues);
      return;
    }

    const parsedValue = parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      const newErrors = {
        ...localErrors,
        [key]: `${label} shares must be 0 or greater`,
      };
      setLocalErrors(newErrors);
      onErrorChange?.(newErrors);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-gray-700 font-semibold">{label}</Label>
        {showTotal && (
          <span className="text-sm text-gray-600">
            Total: {totalSharesSum.toLocaleString()}
          </span>
        )}
      </div>

      {/* All Share Class Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SHARE_CLASS_CONFIG.map(({ key, label: classLabel }) => {
          const value = values[key];
          const error = localErrors[key];

          return (
            <div className="space-y-2" key={key}>
              <div className="flex items-center justify-between">
                <Label htmlFor={key} className="text-gray-700 font-semibold">
                  {classLabel}
                </Label>
              </div>
              <Input
                id={key}
                min={0}
                type="number"
                step={1}
                placeholder={`Enter ${classLabel} shares`}
                value={value === 0 ? "" : value}
                onChange={(e) =>
                  handleShareValueChange(key, classLabel, e.target.value)
                }
                onBlur={(e) =>
                  handleShareValueBlur(key, classLabel, e.target.value)
                }
                className={`rounded-xl border-gray-200 ${
                  error ? "border-red-500" : ""
                }`}
              />
              {error && (
                <p className="text-sm text-red-500 mt-1">{error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

