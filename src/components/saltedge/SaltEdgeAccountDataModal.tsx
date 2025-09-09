import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useState, useRef, useEffect } from "react";
import AccountsList from "./AccountsList";
import TransactionsList from "./TransactionsList";

interface AccountDataModalProps {
  connectionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SaltEdgeAccountDataModal({
  connectionId,
  isOpen,
  onClose,
}: AccountDataModalProps) {
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const transactionsListRef = useRef<HTMLDivElement>(null);

  const handleAccountSelect = (currentAccount: any) => {
    setSelectedAccount(currentAccount);
  };

  // Scroll to transactionsListRef when selectedAccount changes
  useEffect(() => {
    if (selectedAccount && transactionsListRef.current) {
      transactionsListRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedAccount]); // This effect runs whenever selectedAccount changes

  console.log("inside accound data modal ", selectedAccount);
  return (
    // Use the 'open' and 'onOpenChange' props to control the dialog
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full min-w-[90vw]">
        <DialogHeader>
          <DialogTitle>Connection Details</DialogTitle>
          <DialogDescription>View Accounts and Transactions.</DialogDescription>
        </DialogHeader>
        <div className="h-[70dvh] overflow-auto px-5">
          {/* <ConnectionStatus connectionId={selectedAccount?.connection_id} /> */}

          <AccountsList
            connectionId={connectionId}
            onAccountSelect={handleAccountSelect}
            selectedAccount={selectedAccount}
          />

          {selectedAccount && (
            <div className="mt-6" ref={transactionsListRef}>
              <TransactionsList
                connectionId={connectionId}
                selectedAccount={selectedAccount}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
