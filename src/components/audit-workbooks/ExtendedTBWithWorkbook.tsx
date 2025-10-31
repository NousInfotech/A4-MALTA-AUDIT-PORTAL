import React, { useState, useEffect, useMemo } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

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

  // Lead Sheet rows loaded via the same APIs as ClassificationSection
  const [sectionData, setSectionData] = useState<Array<{
    id?: string;
    _id?: string;
    code: string;
    accountName: string;
    currentYear: number;
    priorYear: number;
    adjustments: number;
    finalBalance: number;
    classification?: string;
    // For UI compatibility (linked files column stays but likely disabled)
    linkedExcelFiles?: any[];
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>(new Date().toISOString());

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

  // authFetch helper to attach Supabase Bearer token (same pattern as ClassificationSection)
  async function authFetch(url: string, options: RequestInit = {}) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const headers = new Headers(options.headers || {});
    if (data.session?.access_token) {
      headers.set('Authorization', `Bearer ${data.session.access_token}`);
    }
    return fetch(url, { ...options, headers });
  }

  // Helpers mirroring ClassificationSection logic
  const isAdjustments = (c: string) => c === 'Adjustments';
  const isETB = (c: string) => c === 'ETB';
  const TOP_CATEGORIES = ['Equity', 'Income', 'Expenses'];
  const isTopCategory = (c: string) => TOP_CATEGORIES.includes(c);

  const loadSectionData = async () => {
    try {
      if (!engagementId || !classification) throw new Error('Engagement ID and classification are required');

      // Always fetch linked files snapshot for this classification to preserve previous functionality
      // This endpoint returns rows that include linkedExcelFiles and often a stable _id
      const linkedResp = await getExtendedTBWithLinkedFiles(engagementId, classification);
      const linkedRows: any[] = Array.isArray(linkedResp?.rows) ? linkedResp.rows : [];
      const byCode = new Map<string, any>();
      const byId = new Map<string, any>();
      for (const lr of linkedRows) {
        if (lr?.code) byCode.set(String(lr.code), lr);
        if (lr?._id) byId.set(String(lr._id), lr);
      }

      if (isAdjustments(classification) || isETB(classification)) {
        const etbResp = await authFetch(
          `${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/etb`
        );
        if (!etbResp.ok) throw new Error('Failed to load ETB');
        const etb = await etbResp.json();
        const rows: any[] = Array.isArray(etb.rows) ? etb.rows : [];
        const filtered = isAdjustments(classification)
          ? rows.filter((r) => Number(r.adjustments) !== 0)
          : rows;
        // merge linked files info by code or id
        const merged = filtered.map((r) => {
          const match = (r.code && byCode.get(String(r.code))) || (r._id && byId.get(String(r._id)));
          return {
            ...r,
            _id: match?._id ?? r._id,
            linkedExcelFiles: Array.isArray(match?.linkedExcelFiles) ? match.linkedExcelFiles : [],
          };
        });
        setSectionData(merged);
        setLastUpdatedAt(new Date().toISOString());
        return;
      }

      const endpoint = isTopCategory(classification)
        ? `${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/etb/category/${encodeURIComponent(classification)}`
        : `${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/etb/classification/${encodeURIComponent(classification)}`;

      const response = await authFetch(endpoint);
      if (!response.ok) throw new Error('Failed to load section data');
      const data = await response.json();
      const leadRows: any[] = Array.isArray(data.rows) ? data.rows : [];
      // merge linked files info
      const merged = leadRows.map((r) => {
        const match = (r.code && byCode.get(String(r.code))) || (r._id && byId.get(String(r._id)));
        return {
          ...r,
          _id: match?._id ?? r._id,
          linkedExcelFiles: Array.isArray(match?.linkedExcelFiles) ? match.linkedExcelFiles : [],
        };
      });
      setSectionData(merged);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || 'Failed to load lead sheet');
      setSectionData([]);
    }
  };

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
        await loadSectionData();
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
          await loadSectionData();

          // Call the refresh complete callback if provided
          if (onRefreshComplete) {
            onRefreshComplete();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to refresh lead sheet');
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
      await loadSectionData();

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

  const totals = useMemo(() => {
    return sectionData.reduce(
      (acc, row) => ({
        currentYear: acc.currentYear + (Number(row.currentYear) || 0),
        priorYear: acc.priorYear + (Number(row.priorYear) || 0),
        adjustments: acc.adjustments + (Number(row.adjustments) || 0),
        finalBalance: acc.finalBalance + (Number(row.finalBalance) || 0),
      }),
      { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 }
    );
  }, [sectionData]);

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

  if (!sectionData || sectionData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sheet with Linked Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No lead sheet data found for this classification.
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
          Classification: <Badge variant="outline">{classification}</Badge>
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
                {sectionData.map((row: any) => {
                  const linkedCount = Array.isArray(row.linkedExcelFiles) ? row.linkedExcelFiles.length : 0;
                  return (
                    <TableRow key={row.id || row._id || row.code}>
                      <TableCell className="font-medium whitespace-nowrap">{row.code}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.accountName}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(Number(row.currentYear) || 0)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(Number(row.priorYear) || 0)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(Number(row.adjustments) || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatCurrency(Number(row.finalBalance) || 0)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Drawer>
                          <DrawerTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3"
                              disabled={linkedCount === 0}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {linkedCount} file{linkedCount !== 1 ? 's' : ''}
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
                              {linkedCount === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  No linked files for this row.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {row.linkedExcelFiles.map((workbook: any) => (
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
                                                onClick={() => handleRemoveWorkbook(row.id || row._id || row.code, workbook._id)}
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
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell colSpan={2} className="whitespace-nowrap">TOTALS</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(totals.currentYear)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(totals.priorYear)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(totals.adjustments)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(totals.finalBalance)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap"></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Last updated: {formatDate(lastUpdatedAt)}
        </div>
      </CardContent>
    </Card>
  );
}
