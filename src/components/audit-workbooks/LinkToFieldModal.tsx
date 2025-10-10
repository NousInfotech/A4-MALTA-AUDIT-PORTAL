import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Selection, Mapping } from "../../types/audit-workbooks/types";

interface LinkToFieldModalProps {
  onClose: () => void;
  selection: Selection | null;
  onLink: (mapping: Mapping) => void;
}

const destinationFields = [
  "ppe_nbv_close",
  "total_assets",
  "current_liabilities",
  "revenue",
  "expenses",
  "net_income",
  "cash_flow",
  "depreciation",
  "inventory",
  "accounts_receivable",
];

const transforms = [
  { value: "sum", label: "SUM" },
  { value: "average", label: "AVERAGE" },
  { value: "first", label: "FIRST" },
  { value: "last", label: "LAST" },
  { value: "count", label: "COUNT" },
  { value: "currency_normalize", label: "Currency Normalization" },
  { value: "text_parse", label: "Text Parsing" },
  { value: "date_format", label: "Date Format" },
];

const validations = [
  { value: "numeric_range", label: "Numeric Range" },
  { value: "not_empty", label: "Not Empty" },
  { value: "is_date", label: "Is Date" },
  { value: "is_number", label: "Is Number" },
  { value: "regex", label: "Regex Pattern" },
];

export const LinkToFieldModal: React.FC<LinkToFieldModalProps> = ({
  onClose,
  selection,
  onLink,
}) => {
  const [destinationField, setDestinationField] = useState("");
  const [transform, setTransform] = useState("");
  const [validationType, setValidationType] = useState("");
  const [validationParams, setValidationParams] = useState({
    min: "",
    max: "",
    pattern: "",
  });

  const handleLink = () => {
    if (!selection || !destinationField) return;

    const newMapping: Mapping = {
      id: Date.now().toString(),
      sheet: selection.sheet,
      start: selection.start,
      end: selection.end,
      destinationField,
      transform,
      validation: validationType,
      color: "bg-green-300",
    };

    onLink(newMapping);
    onClose();
  };

  const selectionText = selection
    ? `${selection.sheet}!A${selection.start.row + 1}`
    : "None";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Selection to Field</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Selection
              </Label>
              <div className="mt-1">
                <Badge variant="outline">{selectionText}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination-field">Destination Field</Label>
              <Select
                value={destinationField}
                onValueChange={setDestinationField}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a field" />
                </SelectTrigger>
                <SelectContent>
                  {destinationFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transform">Transform (Optional)</Label>
              <Select value={transform} onValueChange={setTransform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a transform" />
                </SelectTrigger>
                <SelectContent>
                  {transforms.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="validation">Validation (Optional)</Label>
              <Select value={validationType} onValueChange={setValidationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a validation rule" />
                </SelectTrigger>
                <SelectContent>
                  {validations.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {validationType === "numeric_range" && (
                <div className="flex space-x-2 pt-2">
                  <Input
                    type="number"
                    placeholder="Min (e.g., 0)"
                    value={validationParams.min}
                    onChange={(e) =>
                      setValidationParams((prev) => ({
                        ...prev,
                        min: e.target.value,
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max (e.g., 1000000)"
                    value={validationParams.max}
                    onChange={(e) =>
                      setValidationParams((prev) => ({
                        ...prev,
                        max: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {validationType === "regex" && (
                <div className="pt-2">
                  <Input
                    placeholder="Regex pattern"
                    value={validationParams.pattern}
                    onChange={(e) =>
                      setValidationParams((prev) => ({
                        ...prev,
                        pattern: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selection || !destinationField}
          >
            Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
