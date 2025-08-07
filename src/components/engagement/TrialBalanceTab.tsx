import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Loader2 } from 'lucide-react';

interface TrialBalanceTabProps {
  engagement: any;
  trialBalanceUrl: string;
  setTrialBalanceUrl: (url: string) => void;
  trialBalanceData: any;
  handleUploadTrialBalance: () => void;
  tbLoading: boolean;
}

export const TrialBalanceTab = ({
  engagement,
  trialBalanceUrl,
  setTrialBalanceUrl,
  trialBalanceData,
  handleUploadTrialBalance,
  tbLoading,
}: TrialBalanceTabProps) => {
  // Convert trial balance data for display
  const displayTrialBalance = trialBalanceData
    ? trialBalanceData.rows.map((row: any[], index: number) => ({
        id: index.toString(),
        category: row[0] || "Unknown",
        accountName: row[1] || "Unknown",
        debitAmount: parseFloat(row[2]) || 0,
        creditAmount: parseFloat(row[3]) || 0,
      }))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trial Balance Upload</CardTitle>
        <CardDescription>
          Upload trial balance data via Google Sheets link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="tbUrl">Google Sheets URL</Label>
            <Input
              id="tbUrl"
              value={trialBalanceUrl}
              onChange={(e) => setTrialBalanceUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleUploadTrialBalance}
              disabled={tbLoading}
            >
              {tbLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {engagement.trialBalanceUrl ? "Update" : "Upload"}
            </Button>
          </div>
        </div>
        {displayTrialBalance.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-4">Trial Balance Data</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTrialBalance.map((item) => (
                  <TableRow key={item.id}>
                    {item.category !== "Unknown" && (
                      <>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.accountName}</TableCell>
                        <TableCell className="text-right">
                          {item.debitAmount > 0
                            ? item.debitAmount.toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.creditAmount > 0
                            ? item.creditAmount.toLocaleString()
                            : "-"}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
