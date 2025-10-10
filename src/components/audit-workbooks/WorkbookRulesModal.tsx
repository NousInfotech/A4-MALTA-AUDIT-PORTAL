// src/components/WorkbookRulesModal.tsx

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Play, CheckCircle, XCircle } from "lucide-react";
import {
  Workbook,
  WorkbookRule,
  FieldDestination,
  DatasetDestination,
} from "../../types/audit-workbooks/types";

interface WorkbookRulesModalProps {
  workbook: Workbook | null;
  onClose: () => void;
  onLink: (rule: WorkbookRule) => void;
}

const mockNamedRanges = [
  { name: "ppe_values", range: "Balance_Sheet!B2:C3" },
  { name: "total_assets", range: "Balance_Sheet!B2" },
  { name: "revenue_data", range: "Income_Statement!B1:C3" },
];

const mockSheets = ["Balance_Sheet", "Income_Statement", "Cash_Flow"];

const mockFields = [
  "ppe_nbv_close",
  "total_assets",
  "current_liabilities",
  "revenue",
  "expenses",
  "net_income",
];

const mockDatasets = [
  "financial_data",
  "balance_sheet_data",
  "income_statement_data",
];

// Default structure for a new rule, explicitly typed
const defaultRule: WorkbookRule["rules"][0] = {
  source: {
    type: "named_range",
    name: "",
  },
  destinationType: "field",
  destination: {
    field: "",
  },
};

export const WorkbookRulesModal: React.FC<WorkbookRulesModalProps> = ({
  workbook,
  onClose,
  onLink,
}) => {
  const [ruleName, setRuleName] = useState("");
  const [rules, setRules] = useState<WorkbookRule["rules"]>([defaultRule]);
  const [jsonRules, setJsonRules] = useState("");
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const handleAddRule = () => {
    setRules((prev) => [...prev, { ...defaultRule }]);
  };

  const handleUpdateRule = (index: number, field: string, value: any) => {
    setRules((prevRules) => {
      return prevRules.map((rule, i) => {
        if (i !== index) return rule;

        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          if (parent === "source") {
            return { ...rule, source: { ...rule.source, [child]: value } };
          }
          if (parent === "destination") {
            // Reconstruct the destination object, preserving its type
            const currentDestination = rule.destination;
            return {
              ...rule,
              destination: { ...currentDestination, [child]: value },
            };
          }
        } else {
          // Handle top-level properties or replacing the whole destination
          if (field === "destination") {
            return { ...rule, destination: value };
          }
          return { ...rule, [field]: value };
        }

        return rule; // Fallback
      });
    });
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleValidateRules = () => {
    const isValid = rules.every((rule) => {
      if (rule.source.type === "named_range" && !rule.source.name) return false;
      if (rule.source.type === "sheet" && !rule.source.name) return false;
      if (rule.source.type === "table" && !rule.source.name) return false;

      if (rule.destinationType === "field") {
        return !!(rule.destination as FieldDestination).field;
      }

      if (rule.destinationType === "dataset") {
        return !!(rule.destination as DatasetDestination).dataset;
      }

      return false;
    });

    if (isValid) {
      setValidationResults({ isValid: true, message: "All rules are valid" });
    } else {
      setValidationResults({
        isValid: false,
        message:
          "Some rules are invalid. Please check source and destination fields.",
      });
    }
  };

  const handleExtractAll = () => {
    console.log("Extracting all data based on rules...");
  };

  const handleLink = () => {
    if (!workbook || !ruleName) return;

    const newWorkbookRule: WorkbookRule = {
      id: Date.now().toString(),
      name: ruleName,
      rules,
    };

    onLink(newWorkbookRule);
    onClose();
  };

  const handleJsonChange = (value: string) => {
    setJsonRules(value);
    try {
      const parsed = JSON.parse(value);
      if (parsed.rules && Array.isArray(parsed.rules)) {
        setRules(parsed.rules);
        setRuleName(parsed.name || "");
      }
    } catch (e) {
      // Invalid JSON
      console.log("Invalid JSON");
    }
  };

  const rulesAsJson = {
    name: ruleName,
    rules,
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Workbook via Rules</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="builder" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builder">Rule Builder</TabsTrigger>
              <TabsTrigger value="json">JSON Editor</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Enter rule name"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Rules</Label>
                  <Button variant="outline" size="sm" onClick={handleAddRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>

                {rules.map((rule, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Rule {index + 1}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRule(index)}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Source Type</Label>
                        <Select
                          value={rule.source.type}
                          onValueChange={(
                            value: "named_range" | "sheet" | "table"
                          ) => handleUpdateRule(index, "source.type", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="named_range">
                              Named Range
                            </SelectItem>
                            <SelectItem value="sheet">Sheet</SelectItem>
                            <SelectItem value="table">Table</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Source Name</Label>
                        {rule.source.type === "named_range" ? (
                          <Select
                            value={rule.source.name}
                            onValueChange={(value) =>
                              handleUpdateRule(index, "source.name", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select named range" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockNamedRanges.map((nr) => (
                                <SelectItem key={nr.name} value={nr.name}>
                                  {nr.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : rule.source.type === "sheet" ? (
                          <Select
                            value={rule.source.name}
                            onValueChange={(value) =>
                              handleUpdateRule(index, "source.name", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select sheet" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockSheets.map((sheet) => (
                                <SelectItem key={sheet} value={sheet}>
                                  {sheet}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Table name"
                            value={rule.source.name}
                            onChange={(e) =>
                              handleUpdateRule(
                                index,
                                "source.name",
                                e.target.value
                              )
                            }
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Destination Type</Label>
                        <Select
                          value={rule.destinationType}
                          onValueChange={(value: "field" | "dataset") => {
                            handleUpdateRule(index, "destinationType", value);
                            const newDestination =
                              value === "field"
                                ? { field: "" }
                                : { dataset: "" };
                            handleUpdateRule(
                              index,
                              "destination",
                              newDestination
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="field">Field</SelectItem>
                            <SelectItem value="dataset">Dataset</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Destination Name</Label>
                        {rule.destinationType === "field" ? (
                          <Select
                            value={
                              (rule.destination as FieldDestination).field || ""
                            }
                            onValueChange={(value) =>
                              handleUpdateRule(
                                index,
                                "destination.field",
                                value
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockFields.map((field) => (
                                <SelectItem key={field} value={field}>
                                  {field}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={
                              (rule.destination as DatasetDestination)
                                .dataset || ""
                            }
                            onValueChange={(value) =>
                              handleUpdateRule(
                                index,
                                "destination.dataset",
                                value
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select dataset" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockDatasets.map((dataset) => (
                                <SelectItem key={dataset} value={dataset}>
                                  {dataset}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {rule.destinationType === "field" && (
                      <div className="space-y-2">
                        <Label>Transform (Optional)</Label>
                        <Select
                          value={
                            (rule.destination as FieldDestination).transform ||
                            ""
                          }
                          onValueChange={(value) =>
                            handleUpdateRule(
                              index,
                              "destination.transform",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select transform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sum">SUM</SelectItem>
                            <SelectItem value="average">AVERAGE</SelectItem>
                            <SelectItem value="first">FIRST</SelectItem>
                            <SelectItem value="last">LAST</SelectItem>
                            <SelectItem value="count">COUNT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleValidateRules}>
                  Validate Rules
                </Button>
                <Button onClick={handleExtractAll}>
                  <Play className="h-4 w-4 mr-2" />
                  Extract All
                </Button>
              </div>

              {validationResults && (
                <div
                  className={`p-3 rounded-md ${
                    validationResults.isValid
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  <div className="flex items-center">
                    {validationResults.isValid ? (
                      <CheckCircle className="h-5 w-5 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 mr-2" />
                    )}
                    <span>{validationResults.message}</span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="json" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="json-rules">JSON Rules</Label>
                <Textarea
                  id="json-rules"
                  value={jsonRules || JSON.stringify(rulesAsJson, null, 2)}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="min-h-[300px] font-mono"
                  placeholder="Enter JSON rules"
                />
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleValidateRules}>
                  Validate JSON
                </Button>
                <Button onClick={handleExtractAll}>
                  <Play className="h-4 w-4 mr-2" />
                  Extract All
                </Button>
              </div>

              {validationResults && (
                <div
                  className={`p-3 rounded-md ${
                    validationResults.isValid
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  <div className="flex items-center">
                    {validationResults.isValid ? (
                      <CheckCircle className="h-5 w-5 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 mr-2" />
                    )}
                    <span>{validationResults.message}</span>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!ruleName || rules.length === 0}
          >
            Link Rules
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
