// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UpdateEngagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement: any;
  onUpdate: (id: string, data: any) => Promise<any>;
}

export function UpdateEngagementDialog({
  open,
  onOpenChange,
  engagement,
  onUpdate,
}: UpdateEngagementDialogProps) {
  const [title, setTitle] = useState("");
  const [yearEndDate, setYearEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (engagement) {
      setTitle(engagement.title || "");
      setYearEndDate(engagement.yearEndDate || "");
    }
  }, [engagement, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Engagement title is required",
        variant: "destructive",
      });
      return;
    }

    if (!yearEndDate) {
      toast({
        title: "Error",
        description: "Year end date is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(engagement._id, { title, yearEndDate });
      toast({
        title: "Success",
        description: "Engagement updated successfully",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update engagement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle(engagement?.title || "");
    setYearEndDate(engagement?.yearEndDate || "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Engagement</DialogTitle>
          <DialogDescription>
            Update the engagement title and year end date
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Engagement Title</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter engagement title"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearEndDate">Year End Date</Label>
            <Input
              id="yearEndDate"
              type="date"
              value={yearEndDate ? new Date(yearEndDate).toISOString().split('T')[0] : ""}
              onChange={(e) => setYearEndDate(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

