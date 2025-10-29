// @ts-nocheck
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteClientConfirmationProps {
  clientName?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const DeleteClientConfirmation: React.FC<DeleteClientConfirmationProps> = ({
  clientName = "this item",
  onConfirm,
  isLoading = false,
  children,
}) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="destructive">
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[95%] max-w-[500px] mx-auto">
        <AlertDialogHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-xl sm:text-2xl font-semibold text-gray-900">
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm sm:text-base text-gray-600 mt-2">
                This action cannot be undone. This will permanently delete{" "}
                <span className="font-semibold text-gray-900">{clientName}</span>{" "}
                and all associated data.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
          <div className="flex flex-row sm:flex-row items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-amber-800">
              <p className="font-semibold mb-1">Warning:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All client data will be permanently removed</li>
                <li>Associated engagements will be deleted</li>
                <li>This action cannot be reversed</li>
              </ul>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="mt-6 flex-col sm:flex-row gap-3 sm:gap-2">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              className="rounded-xl px-6 py-3 h-auto border-gray-200 hover:bg-gray-50 text-gray-700 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-3 h-auto w-full sm:w-auto"
            >
              {isLoading ? "Deleting..." : "Yes, Delete"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

