import { useCallback, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface ShareValues {
  sharesA: string;
  sharesB: string;
  sharesC: string;
  sharesOrdinary: string;
}

interface EditCompanySharesProps {
  company?: any;
  companyShare?: any; // Current company shareholding being edited (to exclude from allocated calculations)
  shareValues: ShareValues;
  onShareChange: (shareClass: "A" | "B" | "C" | "Ordinary", value: string) => void;
  error?: string;
  sharePercentage?: string;
  className?: string;
  onValidationError?: (error: string | null) => void; // Callback to notify parent of validation errors
}

/**
 * Component specifically for editing company shareholdings
 * Shows actual remaining shares correctly (not including the shares being replaced)
 */
export const EditCompanyShares: React.FC<EditCompanySharesProps> = ({
  company,
  companyShare,
  shareValues,
  onShareChange,
  error,
  sharePercentage,
  className = "",
  onValidationError,
}) => {
  // Get available share classes from company
  const getAvailableShareClasses = useCallback((): Array<"A" | "B" | "C" | "Ordinary"> => {
    if (!company?.totalShares || !Array.isArray(company.totalShares)) {
      return ["A", "B", "C"]; // Default fallback
    }
    
    const classes = company.totalShares
      .filter((share: any) => Number(share.totalShares) > 0)
      .map((share: any) => share.class)
      .filter((cls: string) => cls && cls !== "") as Array<"A" | "B" | "C" | "Ordinary">;
    
    // If no classes found, return default
    return classes.length > 0 ? classes : ["A", "B", "C"];
  }, [company]);

  // Calculate allocated shares per class from existing shareholders (excluding current company shareholding)
  const getAllocatedSharesPerClass = useCallback((): Record<string, number> => {
    const allocated: Record<string, number> = {};
    
    if (!company) return allocated;
    
    // Initialize all possible classes
    const allClasses = ["A", "B", "C", "Ordinary"];
    allClasses.forEach(cls => allocated[cls] = 0);
    
    // Sum from shareHolders (persons)
    if (Array.isArray(company.shareHolders)) {
      company.shareHolders.forEach((sh: any) => {
        if (Array.isArray(sh.sharesData)) {
          sh.sharesData.forEach((sd: any) => {
            const shareClass = sd.shareClass || sd.class || "A";
            allocated[shareClass] = (allocated[shareClass] || 0) + (Number(sd.totalShares) || 0);
          });
        }
      });
    }
    
    // Sum from shareHoldingCompanies - exclude current company shareholding being edited
    if (Array.isArray(company.shareHoldingCompanies)) {
      company.shareHoldingCompanies.forEach((sh: any) => {
        // Skip the company shareholding being edited
        if (companyShare) {
          const shCompanyId = typeof sh.companyId === 'object' ? sh.companyId?._id : sh.companyId;
          const editingCompanyId = typeof companyShare.companyId === 'object' 
            ? companyShare.companyId?._id 
            : companyShare.companyId;
          if (String(shCompanyId) === String(editingCompanyId)) return;
        }
        
        if (Array.isArray(sh.sharesData)) {
          sh.sharesData.forEach((sd: any) => {
            const shareClass = sd.shareClass || sd.class || "A";
            allocated[shareClass] = (allocated[shareClass] || 0) + (Number(sd.totalShares) || 0);
          });
        }
      });
    }
    
    return allocated;
  }, [company, companyShare]);

  // Calculate available shares per class (actual remaining shares in the pool)
  const getAvailableSharesPerClass = useCallback((): Record<string, number> => {
    const available: Record<string, number> = {};
    const allocated = getAllocatedSharesPerClass();
    
    if (!company?.totalShares || !Array.isArray(company.totalShares)) {
      return available;
    }
    
    // Get total shares per class from company
    company.totalShares.forEach((share: any) => {
      const shareClass = share.class || "A";
      const total = Number(share.totalShares) || 0;
      const allocatedForClass = allocated[shareClass] || 0;
      // Available = total - allocated (this is the actual remaining shares)
      available[shareClass] = Math.max(0, total - allocatedForClass);
    });
    
    return available;
  }, [company, getAllocatedSharesPerClass]);

  // Calculate current company shareholding's allocated shares per class
  const getCurrentCompanySharesPerClass = useCallback((): Record<string, number> => {
    const currentShares: Record<string, number> = {};
    const allClasses = ["A", "B", "C", "Ordinary"];
    allClasses.forEach(cls => currentShares[cls] = 0);
    
    // Get from company shareholding's sharesData
    if (companyShare && Array.isArray(companyShare.sharesData)) {
      companyShare.sharesData.forEach((sd: any) => {
        const shareClass = sd.shareClass || sd.class || "A";
        currentShares[shareClass] = (currentShares[shareClass] || 0) + (Number(sd.totalShares) || 0);
      });
    }
    
    return currentShares;
  }, [companyShare]);

  const availableShareClasses = useMemo(() => getAvailableShareClasses(), [getAvailableShareClasses]);
  const availableShares = useMemo(() => getAvailableSharesPerClass(), [getAvailableSharesPerClass]);
  const currentCompanyShares = useMemo(() => getCurrentCompanySharesPerClass(), [getCurrentCompanySharesPerClass]);

  const gridColsClass = useMemo(() => {
    if (availableShareClasses.length === 1) return "grid-cols-1";
    if (availableShareClasses.length === 2) return "grid-cols-2";
    return "grid-cols-3";
  }, [availableShareClasses.length]);

  // Calculate per-class validation errors
  const getPerClassErrors = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    availableShareClasses.forEach((shareClass) => {
      const available = availableShares[shareClass] || 0;
      const currentAllocated = currentCompanyShares[shareClass] || 0;
      
      // Get value from shareValues
      let value = 0;
      if (shareClass === "Ordinary") {
        value = parseInt(shareValues.sharesOrdinary || "0", 10) || 0;
      } else if (shareClass === "A") {
        value = parseInt(shareValues.sharesA || "0", 10) || 0;
      } else if (shareClass === "B") {
        value = parseInt(shareValues.sharesB || "0", 10) || 0;
      } else if (shareClass === "C") {
        value = parseInt(shareValues.sharesC || "0", 10) || 0;
      }
      
      // Calculate if the new value exceeds available
      const totalAvailableForClass = available;
      if (value > totalAvailableForClass) {
        const exceeded = value - totalAvailableForClass;
        errors[shareClass] = `Exceeds available by ${exceeded.toLocaleString()}. Maximum available: ${totalAvailableForClass.toLocaleString()} shares`;
      }
    });

    return errors;
  }, [shareValues, availableShares, currentCompanyShares, availableShareClasses]);

  // Validate shares per class and notify parent
  useEffect(() => {
    if (!onValidationError) return;

    const perClassErrors = getPerClassErrors();
    const validationErrors: string[] = [];
    
    Object.entries(perClassErrors).forEach(([shareClass, errorMsg]) => {
      validationErrors.push(
        `${shareClass === "Ordinary" ? "Ordinary" : `Class ${shareClass}`} shares: ${errorMsg}`
      );
    });

    const errorMessage = validationErrors.length > 0 ? validationErrors.join(". ") : null;
    onValidationError(errorMessage);
  }, [shareValues, availableShares, currentCompanyShares, availableShareClasses, onValidationError, getPerClassErrors]);

  const perClassErrors = useMemo(() => getPerClassErrors(), [getPerClassErrors]);

  return (
    <div className={`space-y-4 border-t pt-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <Label className="text-gray-700 font-semibold">
          Shares in this Company {availableShareClasses.length > 1 && "(at least one required)"}
        </Label>
      </div>
      {(error || Object.keys(perClassErrors).length > 0) && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">
            {error || "Please correct the share allocation errors below"}
          </p>
        </div>
      )}
      <div className={`grid gap-3 ${gridColsClass}`}>
        {availableShareClasses.map((shareClass) => {
          const available = availableShares[shareClass] || 0;
          const currentAllocated = currentCompanyShares[shareClass] || 0;
          
          // Get value from shareValues
          let value = 0;
          if (shareClass === "Ordinary") {
            value = parseInt(shareValues.sharesOrdinary || "0", 10) || 0;
          } else if (shareClass === "A") {
            value = parseInt(shareValues.sharesA || "0", 10) || 0;
          } else if (shareClass === "B") {
            value = parseInt(shareValues.sharesB || "0", 10) || 0;
          } else if (shareClass === "C") {
            value = parseInt(shareValues.sharesC || "0", 10) || 0;
          }
          
          // Calculate actual remaining shares after the new allocation
          // available = total - other allocations (excluding current company being edited)
          // When allocating 'value' shares from the available pool, remaining = available - value
          // This shows ONLY the remaining shares in the pool after this allocation
          const remaining = Math.max(0, available - value);
          const hasError = perClassErrors[shareClass] || false;
          
          return (
            <div key={shareClass}>
              <Label className="text-xs text-gray-600">
                {shareClass === "Ordinary" ? "Ordinary Shares" : `Class ${shareClass} Shares`}
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={String(value)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d+$/.test(val)) {
                    onShareChange(shareClass, val);
                  }
                }}
                className={`rounded-lg ${error || hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
              />
              <p className="text-xs text-gray-500 mt-1">
                {value > 0 ? (
                  <>Remaining: {remaining.toLocaleString()} shares</>
                ) : (
                  <>Available: {available.toLocaleString()} shares</>
                )}
              </p>
              {hasError && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  {perClassErrors[shareClass]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

