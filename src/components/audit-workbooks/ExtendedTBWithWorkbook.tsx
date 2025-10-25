import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/alert-dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { ExternalLink, FileSpreadsheet, Trash2, Eye } from 'lucide-react';
import {
  getExtendedTBWithLinkedFiles,
  deleteWorkbookFromLinkedFilesInExtendedTB,
  type Workbook,
  type ETBRow,
  type ETBData
} from '@/lib/api/extendedTrialBalanceApi';
import { useToast } from '@/hooks/use-toast';

interface ExtendedTBWithWorkbookProps {
  engagementId?: string;
  classification?: string;
  refreshTrigger?: number; // Add refresh trigger prop
  onRefreshComplete?: () => void; // Callback when refresh is complete
}

export default function ExtendedTBWithWorkbook({
  engagementId: propEngagementId,
  classification: propClassification,
  refreshTrigger,
  onRefreshComplete
}: ExtendedTBWithWorkbookProps) {
  const { id: routeEngagementId } = useParams<{ id: string }>();
  const engagementId = propEngagementId || routeEngagementId;
  const { toast } = useToast();

  const [data, setData] = useState<ETBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use prop classification or get from URL params if needed
  const classification = propClassification;

  if (!engagementId || !classification) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sheet with Linked Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Missing required parameters: Engagement ID and classification are required.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!engagementId || !classification) {
        setError('Engagement ID and classification are required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await getExtendedTBWithLinkedFiles(engagementId, classification);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch Extended Trial Balance');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [engagementId, classification]);

  // Add useEffect to handle refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      const refreshData = async () => {
        if (!engagementId || !classification) return;

        try {
          setLoading(true);
          setError(null);
          const result = await getExtendedTBWithLinkedFiles(engagementId, classification);
          setData(result);

          // Call the refresh complete callback if provided
          if (onRefreshComplete) {
            onRefreshComplete();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to refresh Extended Trial Balance');
        } finally {
          setLoading(false);
        }
      };

      refreshData();
    }
  }, [refreshTrigger, engagementId, classification, onRefreshComplete]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewWorkbook = (workbook: Workbook) => {
    if (workbook.webUrl) {
      window.open(workbook.webUrl, '_blank');
    }
  };

  const handleRemoveWorkbook = async (rowId: string, workbookId: string) => {
    if (!engagementId || !classification) return;

    try {
      await deleteWorkbookFromLinkedFilesInExtendedTB(engagementId, classification, rowId, workbookId);

      // Refresh the data after successful removal
      const result = await getExtendedTBWithLinkedFiles(engagementId, classification);
      setData(result);

      toast({
        title: "Success",
        description: "Workbook removed from linked files successfully.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove workbook';
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sheet with Linked Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sheet with Linked Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sheet with Linked Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No Extended Trial Balance data found for this classification.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Lead Sheet with Linked Files
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Classification: <Badge variant="outline">{data.classification}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap min-w-[80px]">Code</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[200px]">Account Name</TableHead>
                  <TableHead className="text-right whitespace-nowrap min-w-[120px]">Current Year</TableHead>
                  <TableHead className="text-right whitespace-nowrap min-w-[120px]">Prior Year</TableHead>
                  <TableHead className="text-right whitespace-nowrap min-w-[120px]">Adjustments</TableHead>
                  <TableHead className="text-right whitespace-nowrap min-w-[120px]">Final Balance</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap min-w-[120px]">Linked Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row._id || row.code}>
                    <TableCell className="font-medium whitespace-nowrap">{row.code}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.accountName}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(row.currentYear)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(row.priorYear)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(row.adjustments)}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(row.finalBalance)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Drawer>
                        <DrawerTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3"
                            disabled={row.linkedExcelFiles.length === 0}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {row.linkedExcelFiles.length} file{row.linkedExcelFiles.length !== 1 ? 's' : ''}
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>Linked Excel Files</DrawerTitle>
                            <DrawerDescription>
                              Manage linked files for {row.accountName} ({row.code})
                            </DrawerDescription>
                          </DrawerHeader>
                          <div className="px-4 pb-4">
                            {row.linkedExcelFiles.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                No linked files for this row.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {row.linkedExcelFiles.map((workbook) => (
                                  <div
                                    key={workbook._id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                      <div>
                                        <p className="font-medium">{workbook.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          Uploaded: {formatDate(workbook.uploadedDate)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewWorkbook(workbook)}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remove Workbook</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to remove "{workbook.name}" from this ETB row?
                                              This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleRemoveWorkbook(row._id || row.code, workbook._id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Remove
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <DrawerFooter>
                            <DrawerClose asChild>
                              <Button variant="outline">Close</Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell colSpan={2} className="whitespace-nowrap">TOTALS</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(data.rows.reduce((sum, row) => sum + row.currentYear, 0))}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(data.rows.reduce((sum, row) => sum + row.priorYear, 0))}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(data.rows.reduce((sum, row) => sum + row.adjustments, 0))}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(data.rows.reduce((sum, row) => sum + row.finalBalance, 0))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap"></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Last updated: {formatDate(data.updatedAt)}
        </div>
      </CardContent>
    </Card>
  );
}
