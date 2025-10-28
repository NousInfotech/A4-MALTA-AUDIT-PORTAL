import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShareholdingCompany {
  companyId: string;
  sharePercentage: number;
}

interface ShareholdingCompaniesManagerProps {
  companies: any[]; // All available companies
  value?: ShareholdingCompany[];
  onChange?: (shareholdings: ShareholdingCompany[]) => void;
}

export const ShareholdingCompaniesManager: React.FC<ShareholdingCompaniesManagerProps> = ({
  companies,
  value = [],
  onChange,
}) => {
  const [shareholdings, setShareholdings] = useState<ShareholdingCompany[]>(value);

  useEffect(() => {
    setShareholdings(value);
  }, [value]);

  const handleAddShareholding = () => {
    const newShareholding = { companyId: "", sharePercentage: 0 };
    const updated = [...shareholdings, newShareholding];
    setShareholdings(updated);
    onChange?.(updated);
  };

  const handleRemoveShareholding = (index: number) => {
    const updated = shareholdings.filter((_, i) => i !== index);
    setShareholdings(updated);
    onChange?.(updated);
  };

  const handleChange = (index: number, field: keyof ShareholdingCompany, val: string | number) => {
    const updated = shareholdings.map((item, i) =>
      i === index ? { ...item, [field]: val } : item
    );
    setShareholdings(updated);
    onChange?.(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-gray-700 font-semibold">Shareholding Companies</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddShareholding}
          className="rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      <div className="space-y-3">
        {shareholdings.map((shareholding, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
          >
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Company</Label>
                <Select
                  value={shareholding.companyId}
                  onValueChange={(val) => handleChange(index, "companyId", val)}
                >
                  <SelectTrigger className="rounded-lg bg-white">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {companies.length === 0 ? (
                      <SelectItem value="no-companies" disabled>No companies available</SelectItem>
                    ) : (
                      companies.map((company) => (
                        <SelectItem key={company._id} value={company._id}>
                          {company.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Share %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={shareholding.sharePercentage || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow empty value or valid numbers
                    if (val === "") {
                      handleChange(index, "sharePercentage", 0);
                    } else {
                      const numVal = parseFloat(val);
                      if (!isNaN(numVal)) {
                        handleChange(index, "sharePercentage", numVal);
                      }
                    }
                  }}
                  className="rounded-lg"
                  placeholder="0"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveShareholding(index)}
              className="rounded-xl hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {shareholdings.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No shareholding companies added yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

