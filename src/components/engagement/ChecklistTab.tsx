import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useChecklist } from "@/hooks/useChecklist";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ChecklistTabProps {
  engagementId: string;
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({ engagementId }) => {
  const { groupedChecklist, loading, updateItem } = useChecklist(engagementId);

  // Local state for immediate text display, and timers for debouncing updates
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const debouncedTimers = useRef<Record<string, number>>({});

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debouncedTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Core update function
  const handleFieldUpdate = async (itemId: string, field: string, value: any) => {
    // Find the item in groupedChecklist
    const allItems = Object.values(groupedChecklist).flatMap(cat => Object.values(cat).flat());
    const item = allItems.find(i => i._id === itemId);

    const updateData: any = { [field]: value };

    if (field === "completed") {
      if (value === true) {
        // If checking a date field, set dateValue now
        if (item?.fieldType === "date" && !item.dateValue) {
          updateData.dateValue = new Date().toISOString();
        }
      } else {
        // If unchecking, clear any field value
        if (item?.fieldType === "text") {
          updateData.textValue = "";
          // clear local state too
          setTextValues(tv => ({ ...tv, [itemId]: "" }));
        }
        if (item?.fieldType === "date") {
          updateData.dateValue = null;
        }
        if (item?.fieldType === "select") {
          updateData.selectValue = "";
        }
      }
    }

    await updateItem(itemId, updateData);
  };

  // Debounced handler for textValue
  const handleTextChange = (itemId: string, newText: string) => {
    // Update UI immediately
    setTextValues(tv => ({ ...tv, [itemId]: newText }));

    // Clear any existing timer
    if (debouncedTimers.current[itemId]) {
      clearTimeout(debouncedTimers.current[itemId]);
    }

    // Set new timer (500ms delay)
    debouncedTimers.current[itemId] = window.setTimeout(() => {
      handleFieldUpdate(itemId, "textValue", newText);
    }, 500);
  };

  // Renders each field based on its type
  const renderField = (item: any) => {
    const disabled = !item.completed;

    switch (item.fieldType) {
      case "text":
        return (
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={item.completed || false}
              onCheckedChange={checked => handleFieldUpdate(item._id, "completed", checked)}
              className="mt-1"
            />
            <div className="flex gap-4 space-y-2">
              <Label className="text-sm font-medium">{item.description}</Label>
              <Input
                placeholder="Enter text..."
                value={textValues[item._id] ?? item.textValue ?? ""}
                onChange={e => handleTextChange(item._id, e.target.value)}
                disabled={disabled}
                className="w-full"
              />
            </div>
          </div>
        );

      case "date":
        return (
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={item.completed || false}
              onCheckedChange={checked => handleFieldUpdate(item._id, "completed", checked)}
              className="mt-1"
            />
            <div className="flex-1 flex items-center gap-2">
              <Label className="text-sm font-medium">{item.description}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      disabled && "opacity-50 cursor-not-allowed",
                      !item.dateValue && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {item.dateValue
                      ? format(new Date(item.dateValue), "PPP")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={item.dateValue ? new Date(item.dateValue) : undefined}
                    onSelect={date =>
                      handleFieldUpdate(item._id, "dateValue", date?.toISOString())
                    }
                    disabled={disabled}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      case "select":
        return (
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={item.completed || false}
              onCheckedChange={checked => handleFieldUpdate(item._id, "completed", checked)}
              className="mt-1"
            />
            <div className="flex-1 flex items-center gap-2">
              <Label className="text-sm font-medium">{item.description}</Label>
              <Select
                value={item.selectValue || ""}
                onValueChange={value => handleFieldUpdate(item._id, "selectValue", value)}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {(item.selectOptions || []).map((opt: string) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={item.completed || false}
              onCheckedChange={checked => handleFieldUpdate(item._id, "completed", checked)}
            />
            <Label className="text-sm font-medium">{item.description}</Label>
          </div>
        );
    }
  };

  // Compute overall completion stats
  const getCompletionStats = () => {
    const all = Object.values(groupedChecklist).flatMap(cat =>
      Object.values(cat).flat()
    );
    const done = all.filter(i => i.completed).length;
    const total = all.length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const { done, total, pct } = getCompletionStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>Audit Procedures Checklist</CardTitle>
              <CardDescription>
                Complete audit checklist to track progress through all phases
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {done}/{total} ({pct}%)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {Object.entries(groupedChecklist).map(([category, subcats]) => (
            <div key={category} className="space-y-6">
              <div className="bg-primary text-primary-foreground p-3 font-semibold rounded">
                {category}
              </div>
              {Object.entries(subcats).map(([subcat, items]) => (
                <div key={subcat} className="space-y-4 ml-4">
                  <div className="font-medium text-foreground border-b pb-2">
                    {subcat}
                  </div>
                  <div className="space-y-4 ml-4">
                    {items.map(item => (
                      <div key={item._id} className="py-2">
                        {renderField(item)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {Object.keys(groupedChecklist).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No checklist items found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
