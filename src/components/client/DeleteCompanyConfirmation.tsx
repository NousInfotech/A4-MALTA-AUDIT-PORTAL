import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteCompanyConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  companyName: string;
  personCount?: number;
  isLoading?: boolean;
}

export const DeleteCompanyConfirmation: React.FC<DeleteCompanyConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  companyName,
  personCount = 0,
  isLoading = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Delete Company
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="text-gray-600 py-4">
          Are you sure you want to delete <span className="font-semibold text-gray-900">{companyName}</span>?
          {personCount > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠️ This will also delete all <strong>{personCount} person{personCount !== 1 ? 's' : ''}</strong> associated with this company. This action cannot be undone.
              </p>
            </div>
          )}
        </DialogDescription>

        <DialogFooter className="flex gap-3 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl flex-1"
          >
            {isLoading ? "Deleting..." : "Delete Company"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

