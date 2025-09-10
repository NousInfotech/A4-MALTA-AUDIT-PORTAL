import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import PbcHome from "./PbcHome";

interface PbcDialogProps {
  selectedEngagement: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosePBC: () => void;
}

const PbcDialog: React.FC<PbcDialogProps> = ({
  selectedEngagement,
  open,
  onOpenChange,
  onClosePBC,
}) => {
  const handleClose = () => {
    onOpenChange(false);
    onClosePBC();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[90vw] h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>PBC Home Details</DialogTitle>
          <DialogDescription>
            View and manage your PBC settings here for engagement:{" "}
            {selectedEngagement?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto">
          <PbcHome selectedEngagement={selectedEngagement}/>
        </div>
        <DialogFooter className="flex justify-end p-4 border-t">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PbcDialog;
