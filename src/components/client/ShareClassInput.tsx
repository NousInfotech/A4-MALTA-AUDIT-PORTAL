import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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
 * IMPORTANT: Only includes the selected mode's data:
 * - If useClassShares is false: ONLY sends Ordinary share data (A, B, C are excluded)
 * - If useClassShares is true: ONLY sends Class A, B, C share data (Ordinary is excluded)
 */
export const buildTotalSharesPayload = (values: ShareClassValues, useClassShares: boolean) => {
  let filteredShares: Array<{ totalShares: number; class: string; type: string }> = [];
  
  if (useClassShares) {
    // Share Classes mode: ONLY include Class A, B, C (Ordinary is completely excluded)
    filteredShares = SHARE_CLASS_CONFIG
      .filter(({ key }) => key !== "ordinary")
      .map(({ key, backendValue }) => ({
        totalShares: Number(values[key]) || 0,
        class: backendValue,
        type: DEFAULT_SHARE_TYPE,
      }));
  } else {
    // Ordinary mode: ONLY include Ordinary (A, B, C are completely excluded)
    filteredShares = SHARE_CLASS_CONFIG
      .filter(({ key }) => key === "ordinary")
      .map(({ key, backendValue }) => ({
        totalShares: Number(values[key]) || 0,
        class: backendValue,
        type: DEFAULT_SHARE_TYPE,
      }));
  }
  
  // Filter out entries with totalShares <= 0 before sending to backend
  return filteredShares.filter(item => item.totalShares > 0);
};

export const calculateTotalSharesSum = (values: ShareClassValues, useClassShares: boolean) => {
  if (useClassShares) {
    // Only sum Class A, B, C (exclude Ordinary)
    return SHARE_CLASS_CONFIG.filter(({ key }) => key !== "ordinary")
      .reduce((sum, { key }) => sum + (Number(values[key]) || 0), 0);
  } else {
    // Only sum Ordinary (exclude A, B, C)
    return Number(values.ordinary) || 0;
  }
};

export const OPTIONAL_SHARE_CLASS_LABELS = SHARE_CLASS_CONFIG.filter(
  ({ key }) => key !== "ordinary"
).map(({ label }) => label);

/**
 * Parses totalShares array from backend into form state
 */
export const parseTotalSharesArray = (
  totalShares?: Array<{ totalShares: number; class: string; type: string }>
): { values: ShareClassValues; useClassShares: boolean } => {
  const defaultValues = getDefaultShareClassValues();
  let useClassShares = false;

  if (Array.isArray(totalShares) && totalShares.length > 0) {
    // Check if any share class is "A", "B", or "C" (not "Ordinary")
    const hasClassShares = totalShares.some(
      (item) => item.class === "A" || item.class === "B" || item.class === "C"
    );
    useClassShares = hasClassShares;

    // Parse values from array
    totalShares.forEach((item) => {
      if (item.class === "A") defaultValues.classA = Number(item.totalShares) || 0;
      if (item.class === "B") defaultValues.classB = Number(item.totalShares) || 0;
      if (item.class === "C") defaultValues.classC = Number(item.totalShares) || 0;
      if (item.class === "Ordinary") defaultValues.ordinary = Number(item.totalShares) || 0;
    });
  }

  return { values: defaultValues, useClassShares };
};

interface ShareClassInputProps {
  values: ShareClassValues;
  errors?: ShareClassErrors;
  useClassShares: boolean;
  visibleShareClasses: string[];
  onValuesChange: (values: ShareClassValues) => void;
  onUseClassSharesChange: (useClassShares: boolean) => void;
  onVisibleShareClassesChange: (visibleShareClasses: string[]) => void;
  onErrorChange?: (errors: ShareClassErrors) => void;
  showTotal?: boolean;
  label?: string;
  className?: string;
}

export const ShareClassInput: React.FC<ShareClassInputProps> = ({
  values,
  errors = getDefaultShareClassErrors(),
  useClassShares,
  visibleShareClasses,
  onValuesChange,
  onUseClassSharesChange,
  onVisibleShareClassesChange,
  onErrorChange,
  showTotal = true,
  label = "Total Shares",
  className = "",
}) => {
  const totalSharesSum = calculateTotalSharesSum(values, useClassShares);
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

      // Reset the inactive mode when entering a value
      const updatedValues = { ...values };
      if (key === "ordinary") {
        // If entering Ordinary, reset A, B, C
        updatedValues.classA = 0;
        updatedValues.classB = 0;
        updatedValues.classC = 0;
        updatedValues.ordinary = parsedValue;
        onUseClassSharesChange(false);
        onVisibleShareClassesChange([]);
        onValuesChange(updatedValues);
      } else {
        // If entering A, B, or C, reset Ordinary
        updatedValues.ordinary = 0;
        updatedValues[key] = parsedValue;
        onUseClassSharesChange(true);
        onVisibleShareClassesChange(OPTIONAL_SHARE_CLASS_LABELS);
        onValuesChange(updatedValues);
      }
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

  const handleSwitchChange = (checked: boolean) => {
    if (!checked) {
      // Switch to Ordinary mode: reset A, B, C to 0, keep Ordinary
      onUseClassSharesChange(false);
      onVisibleShareClassesChange([]);
      onValuesChange({
        classA: 0,
        classB: 0,
        classC: 0,
        ordinary: values.ordinary || 100,
      });
    } else {
      // Switch to Share Classes mode: reset Ordinary to 0, enable A, B, C
      onUseClassSharesChange(true);
      onVisibleShareClassesChange(OPTIONAL_SHARE_CLASS_LABELS);
      onValuesChange({
        classA: values.classA || 0,
        classB: values.classB || 0,
        classC: values.classC || 0,
        ordinary: 0,
      });
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-gray-700 font-semibold">{label}</Label>
        <div className="flex items-center gap-4">
          {showTotal && (
            <span className="text-sm text-gray-600">
              Total: {totalSharesSum.toLocaleString()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Share Classes</span>
            <Switch checked={useClassShares} onCheckedChange={handleSwitchChange} />
          </div>
        </div>
      </div>

      {/* Dynamic Share Class Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SHARE_CLASS_CONFIG.map(({ key, label: classLabel }) => {
          const isOrdinary = key === "ordinary";
          // Show Ordinary only when useClassShares is false
          // Show A, B, C only when useClassShares is true
          const shouldRender = isOrdinary
            ? !useClassShares
            : useClassShares && visibleShareClasses.includes(classLabel);

          if (!shouldRender) {
            return null;
          }

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

