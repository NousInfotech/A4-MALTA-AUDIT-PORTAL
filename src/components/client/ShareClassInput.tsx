import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ErrorMessage } from "@/components/ui/error-message";

export const SHARE_CLASS_CONFIG = [
  { key: "classA", label: "Class A", backendValue: "A" },
  { key: "classB", label: "Class B", backendValue: "B" },
  { key: "classC", label: "Class C", backendValue: "C" },
  { key: "ordinary", label: "Ordinary", backendValue: "Ordinary" },
] as const;
  
export type ShareClassKey = (typeof SHARE_CLASS_CONFIG)[number]["key"];

export type ShareClassValues = Record<ShareClassKey, number> & {
  authorizedShares: number;
  issuedShares: number;
  perShareValue: number;
};
export type ShareClassErrors = Record<ShareClassKey, string> & {
  authorizedShares?: string;
  issuedShares?: string;
  perShareValue?: string;
};

export const DEFAULT_SHARE_TYPE = "Ordinary";

export const getDefaultShareClassValues = (): ShareClassValues => ({
  classA: 0,
  classB: 0,
  classC: 0,
  ordinary: 0,
  authorizedShares: 0,
  issuedShares: 0,
  perShareValue: 0,
});

export const getDefaultShareClassErrors = (): ShareClassErrors => ({
  classA: "",
  classB: "",
  classC: "",
  ordinary: "",
  authorizedShares: "",
  issuedShares: "",
  perShareValue: "",
});

export const buildTotalSharesPayload = (values: ShareClassValues) => {
  const allShares = SHARE_CLASS_CONFIG.map(({ key, backendValue }) => ({
    totalShares: Number(values[key]) || 0,
    class: backendValue,
    type: DEFAULT_SHARE_TYPE,
  }));
  
  return allShares.filter(item => item.totalShares > 0);
};

export const calculateTotalSharesSum = (values: ShareClassValues) => {
  return SHARE_CLASS_CONFIG.reduce((sum, { key }) => sum + (Number(values[key]) || 0), 0);
};

export const parseTotalSharesArray = (
  totalShares?: Array<{ totalShares: number; class: string; type: string }>
): ShareClassValues => {
  const defaultValues = getDefaultShareClassValues();

  if (Array.isArray(totalShares) && totalShares.length > 0) {
    totalShares.forEach((item) => {
      if (item.class === "A") defaultValues.classA = Number(item.totalShares) || 0;
      if (item.class === "B") defaultValues.classB = Number(item.totalShares) || 0;
      if (item.class === "C") defaultValues.classC = Number(item.totalShares) || 0;
      if (item.class === "Ordinary") defaultValues.ordinary = Number(item.totalShares) || 0;
    });
  }

  return defaultValues;
};

// --- Component Interface and Definition ---

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
  const [perShareValueInput, setPerShareValueInput] = useState(
    values.perShareValue !== 0 ? values.perShareValue.toString() : ""
  );
  
  useEffect(() => {
    // Only update localErrors from props if there's a real change (initial load or external change)
    if (JSON.stringify(errors) !== JSON.stringify(localErrors)) {
        setLocalErrors(errors);
    }
  }, [errors]);

  useEffect(() => {
    // Sync local input string if the numeric value changes from outside (e.g. form reset)
    const currentInputNumeric = parseFloat(perShareValueInput) || 0;
    if (values.perShareValue !== currentInputNumeric) {
      setPerShareValueInput(values.perShareValue !== 0 ? values.perShareValue.toString() : "");
    }
  }, [values.perShareValue]);

  /**
   * Centralized validation function for Authorized/Issued/Total Shares sum.
   * This is the key fix for the "glitching" issue.
   */
  const runAllValidations = (currentValues: ShareClassValues, currentErrors: ShareClassErrors): ShareClassErrors => {
    let newErrors: ShareClassErrors = { ...currentErrors, issuedShares: "" }; // Reset issuedShares error for re-evaluation

    const issued = currentValues.issuedShares;
    const authorized = currentValues.authorizedShares;
    const totalShareClassesSum = calculateTotalSharesSum(currentValues);
    
    // 1. Issued Shares vs. Authorized Shares
    if (issued > authorized) {
      newErrors.issuedShares = "Issued Shares cannot exceed Authorized Shares";
      // If error 1 exists, we skip checking error 2 on the same field for clarity.
      return newErrors; 
    }

    // 2. Total Share Classes vs. Issued Shares (your new required validation)
    if (totalShareClassesSum > issued) {
      newErrors.issuedShares = `Total Share Classes (${totalShareClassesSum}) cannot exceed Issued Shares (${issued})`;
      // If error 2 exists, we skip checking error 1 on the same field for clarity.
      return newErrors;
    }
    
    // If neither validation fails, issuedShares error remains empty ("")

    // Retain non-issuedShares errors (e.g., perShareValue or individual class errors)
    // The explicit reset and re-evaluation above handles the issuedShares field correctly.
    return newErrors;
  }

  const handleShareValueChange = (
    key: ShareClassKey,
    label: string,
    rawValue: string
  ) => {
    let newErrors = { ...localErrors };
    let updatedValues = { ...values };

    if (rawValue === "") {
      updatedValues[key] = 0;
      newErrors[key] = "";
    } else {
      const parsedValue = parseInt(rawValue, 10);
      
      if (Number.isNaN(parsedValue) || parsedValue < 0) {
        newErrors[key] = `${label} shares must be 0 or greater`;
        setLocalErrors(newErrors);
        onErrorChange?.(newErrors);
        return;
      } else {
        updatedValues[key] = parsedValue;
        newErrors[key] = "";
      }
    }
    
    const issuedLimit = updatedValues.issuedShares;
    if (updatedValues[key] > issuedLimit) {
      newErrors[key] = `${label} shares cannot exceed Issued Shares`;
    }

    newErrors = runAllValidations(updatedValues, newErrors);

    setLocalErrors(newErrors);
    onErrorChange?.(newErrors);
    onValuesChange(updatedValues);
  };

  const handleShareValueBlur = (
    key: ShareClassKey,
    label: string,
    rawValue: string
  ) => {
    if (rawValue === "") {
      // If empty on blur, ensure state reflects 0 and error is clear
      let newErrors = { ...localErrors, [key]: "" };
      const newValues = { ...values, [key]: 0 };
      
      // Re-run validation for issuedShares in case this change fixed an issue
      newErrors = runAllValidations(newValues, newErrors);

      setLocalErrors(newErrors);
      onErrorChange?.(newErrors);
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
    } else {
      let newErrors = { ...localErrors };
      const issuedLimit = values.issuedShares;
      if (parsedValue > issuedLimit) {
        newErrors[key] = `${label} shares cannot exceed Issued Shares`;
      } else {
        newErrors[key] = "";
      }
      setLocalErrors(newErrors);
      onErrorChange?.(newErrors);
    }
  };

  const handleGeneralValueBlur = (
    key: "authorizedShares" | "issuedShares" | "perShareValue"
  ) => {
    // Run full validation on blur to catch any inconsistencies
    const newErrors = runAllValidations(values, localErrors);
    setLocalErrors(newErrors);
    onErrorChange?.(newErrors);
  };

  const handleGeneralValueChange = (
    key: "authorizedShares" | "issuedShares" | "perShareValue",
    value: string
  ) => {
    if (key === "perShareValue") {
      setPerShareValueInput(value);
    }
    const parsedValue = key === "perShareValue" ? parseFloat(value) : parseInt(value, 10);
    const newValue = Number.isNaN(parsedValue) ? 0 : parsedValue;
    
    const updatedValues = { ...values, [key]: newValue };
    let newErrors = { ...localErrors };
    if (localErrors.issuedShares) {
        newErrors = runAllValidations(updatedValues, newErrors);
    }

    setLocalErrors(newErrors);
    onErrorChange?.(newErrors);
    onValuesChange(updatedValues);
  };

  return (
    <div className="space-y-2">
      <Label className="text-gray-700 font-semibold">{label}</Label>
    <div className={`space-y-2 ${className} border border-gray-200 rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        {/* {showTotal && (
          <span className="text-sm text-gray-600">
            Total: {totalSharesSum.toLocaleString()}
          </span>
        )} */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="authorizedShares" className="text-gray-700 font-semibold">
            Authorized Shares
          </Label>
          <Input
            id="authorizedShares"
            type="number"
            min={0}
            value={values.authorizedShares || ""}
            onChange={(e) => handleGeneralValueChange("authorizedShares", e.target.value)}
            onBlur={() => handleGeneralValueBlur("authorizedShares")}
            className="rounded-xl border-gray-200"
            placeholder="Enter Authorized Shares"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="issuedShares" className="text-gray-700 font-semibold">
            Issued Shares
          </Label>
          <Input
            id="issuedShares"
            type="number"
            min={0}
            value={values.issuedShares || ""}
            onChange={(e) => handleGeneralValueChange("issuedShares", e.target.value)}
            onBlur={() => handleGeneralValueBlur("issuedShares")}
            className={`rounded-xl border-gray-200 ${
              localErrors?.issuedShares ? "border-red-500" : ""
            }`}
              placeholder="Enter Issued Shares"
          />
          <ErrorMessage message={localErrors?.issuedShares} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perShareValue" className="text-gray-700 font-semibold">
            Per Share Value (EUR)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            <Input
              id="perShareValue"
              type="number"
              step="0.0001"
              min={0}
              value={perShareValueInput}
              onChange={(e) => handleGeneralValueChange("perShareValue", e.target.value)}
              className="pl-8 rounded-xl border-gray-200"
              placeholder="Enter Per Share Value"
            />
          </div>
        </div>
      </div>
     <div className="flex justify-end">
       {showTotal && (
          <span className="text-sm text-gray-600">
            Total: {totalSharesSum.toLocaleString()}/{values.issuedShares.toLocaleString()}
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
              <ErrorMessage message={error} />
            </div>
          );
        })}
      </div>

    </div>
    </div>
  );
};
