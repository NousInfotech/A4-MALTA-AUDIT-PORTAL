import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { WorkbookViewerFullscreen } from "@/components/audit-workbooks/ExcelViewer";
import { db_WorkbookApi } from "@/lib/api/workbookApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  getExtendedTrialBalanceWithMappings,
  addMappingToRow,
  getExtendedTBWithLinkedFiles,
  updateLinkedExcelFilesInExtendedTB,
  type ETBData,
} from "@/lib/api/extendedTrialBalanceApi";
import {
  getWorkingPaperWithMappings,
  addMappingToWPRow,
  getWorkingPaperWithLinkedFiles,
  updateLinkedExcelFilesInWP,
} from "@/lib/api/workingPaperApi";
import {
  getEvidenceWithMappings,
  addMappingToEvidence,
} from "@/lib/api/classificationEvidenceApi";
import type { Workbook, Mapping, NamedRange } from "@/types/audit-workbooks/types";

export default function WorkbookViewerPage() {
  const { workbookId } = useParams<{ workbookId: string }>();
  const [searchParams] = useSearchParams();
  const engagementId = searchParams.get('engagementId') || '';
  const classification = searchParams.get('classification') || '';
  const rowType = searchParams.get('rowType') as 'etb' | 'working-paper' | 'evidence' | null;
  const { toast } = useToast();

  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [namedRanges, setNamedRanges] = useState<NamedRange[]>([]);
  const [etbData, setEtbData] = useState<ETBData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingETBData, setIsLoadingETBData] = useState(false);
  const [mappingsRefreshKey, setMappingsRefreshKey] = useState(0);
  const [initialSheet, setInitialSheet] = useState<string | undefined>(undefined); // ✅ NEW: Store initial sheet from preference

  const actualRowType = (rowType || 'etb') as 'etb' | 'working-paper' | 'evidence';
  const workbookRef = useRef<Workbook | null>(null);

  // Keep workbook ref updated
  useEffect(() => {
    workbookRef.current = workbook;
  }, [workbook]);

  // Fetch workbook data
  useEffect(() => {
    const fetchWorkbook = async () => {
      if (!workbookId) {
        toast({
          title: "Error",
          description: "Workbook ID is required",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await db_WorkbookApi.getWorkbookById(workbookId);
        
        if (response.success && response.data) {
          const workbookData = response.data;
          // Normalize ID
          if (workbookData._id && !workbookData.id) {
            workbookData.id = workbookData._id;
          }
          setWorkbook(workbookData);
          setMappings(workbookData.mappings || []);
          setNamedRanges(workbookData.namedRanges || []);

          // ✅ NEW: Load user's last selected sheet preference
          const sheetNames = workbookData.fileData 
            ? Object.keys(workbookData.fileData)
            : (workbookData.sheets?.map((s: any) => s.name || s) || []);
          
          if (sheetNames.length > 0) {
            try {
              const preferenceResponse = await db_WorkbookApi.getUserWorkbookPreference(workbookData.id);
              if (preferenceResponse.success && preferenceResponse.data?.lastSelectedSheet) {
                const savedSheet = preferenceResponse.data.lastSelectedSheet;
                // Verify the saved sheet still exists in the workbook
                if (sheetNames.includes(savedSheet)) {
                  setInitialSheet(savedSheet);
                  console.log(`WorkbookViewerPage: Restored last selected sheet: ${savedSheet}`);
                } else {
                  console.log(`WorkbookViewerPage: Saved sheet "${savedSheet}" no longer exists, using first sheet`);
                  setInitialSheet(sheetNames[0]);
                }
              } else {
                // No preference found, use first sheet
                setInitialSheet(sheetNames[0]);
              }
            } catch (prefError) {
              console.warn('WorkbookViewerPage: Failed to load sheet preference, using default:', prefError);
              setInitialSheet(sheetNames[0]);
            }
          }
        } else {
          throw new Error(response.error || "Failed to load workbook");
        }
      } catch (error: any) {
        console.error("Error fetching workbook:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load workbook",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkbook();
  }, [workbookId, toast]);

  // Fetch ETB data function - EXACTLY like ExcelViewerWithFullscreen
  // This will be passed as parentEtbData to ExcelViewerWithFullscreen and used by onRefreshETBData callback
  const fetchETBData = useCallback(async () => {
    if (!engagementId || !classification) {
      setEtbData(null);
      setIsLoadingETBData(false);
      return;
    }

    const dataType = actualRowType === 'working-paper' ? 'Working Paper' : actualRowType === 'evidence' ? 'Evidence' : 'ETB';
    console.log(`WorkbookViewerPage: Fetching ${dataType} data for engagement:`, engagementId, 'classification:', classification);

    try {
      setIsLoadingETBData(true);
      let result: ETBData | null = null;

      if (actualRowType === 'working-paper' && classification) {
        try {
          result = await getWorkingPaperWithMappings(engagementId, classification);
          console.log('WorkbookViewerPage: ✅ Working Paper data received:', {
            totalRows: result?.rows?.length || 0,
            firstThreeRows: result?.rows?.slice(0, 3)?.map(r => ({
              code: r.code,
              name: r.accountName,
              classification: r.classification
            }))
          });
        } catch (wpError: any) {
          if (wpError.response?.status === 404 || wpError.message?.includes('404')) {
            console.log('WorkbookViewerPage: 404 detected, falling back to ETB data');
            result = await getExtendedTrialBalanceWithMappings(engagementId, classification);
            console.log('WorkbookViewerPage: ✅ ETB fallback data received:', {
              totalRows: result?.rows?.length || 0
            });
          } else {
            throw wpError;
          }
        }
      } else if (actualRowType === 'evidence') {
        console.log('WorkbookViewerPage: Evidence mode - ETB data should be provided by parent');
        setEtbData(null);
        setIsLoadingETBData(false);
        return;
      } else {
        // ✅ For mapping dialog, fetch all ETB rows (pass undefined for classification to get all rows)
        // This allows users to see all account names from the engagement's ETB
        result = await getExtendedTrialBalanceWithMappings(engagementId, undefined);
        console.log('WorkbookViewerPage: ✅ ETB data received (all rows for mapping dialog):', {
          totalRows: result?.rows?.length || 0,
          firstThreeRows: result?.rows?.slice(0, 3)?.map(r => ({
            code: r.code,
            name: r.accountName,
            classification: r.classification
          })),
          uniqueClassifications: result?.rows ? Array.from(new Set(
            result.rows.map(row => row.classification).filter(Boolean)
          )) : []
        });
      }

      if (result) {
        // ✅ CRITICAL: For mapping dialog, show ALL ETB rows from engagement (no classification filtering)
        // This allows users to see all account names from the engagement's ETB
        console.log('WorkbookViewerPage: ✅ Using all ETB rows for mapping dialog (no classification filter):', {
          totalRows: result.rows?.length || 0,
          uniqueClassifications: result.rows ? Array.from(new Set(
            result.rows.map(row => row.classification).filter(Boolean)
          )) : []
        });

        // ✅ CRITICAL: Enhance mappings with workbook information (like ExcelViewerWithFullscreen does)
        const currentWorkbook = workbookRef.current;
        const enhancedData = {
          ...result,
          rows: (result.rows || []).map(row => ({
            ...row,
            mappings: row.mappings?.map(mapping => ({
              ...mapping,
              workbookId: mapping.workbookId && typeof mapping.workbookId === 'string' 
                ? {
                    _id: mapping.workbookId,
                    name: currentWorkbook?.name || 'Unknown Workbook'
                  }
                : mapping.workbookId
            })) || []
          }))
        } as ETBData;
        setEtbData(enhancedData);
        console.log('WorkbookViewerPage: ✅ ETB data set with enhanced mappings, rows:', enhancedData.rows.length);
        
        // ✅ CRITICAL: Verify data is set correctly
        if (enhancedData.rows.length === 0) {
          console.warn('WorkbookViewerPage: ⚠️ WARNING - ETB data has 0 rows after filtering!', {
            originalRows: result.rows?.length || 0,
            classification,
            engagementId
          });
        }
      } else {
        console.log('WorkbookViewerPage: ⚠️ No result from API, setting etbData to null');
        setEtbData(null);
      }
    } catch (err: any) {
      console.error(`WorkbookViewerPage: ❌ ${dataType} API error:`, err);
      setEtbData(null);
    } finally {
      setIsLoadingETBData(false);
    }
  }, [engagementId, classification, actualRowType, workbookRef]);

  // Fetch ETB data when engagementId, classification, or workbook changes
  useEffect(() => {
    // Only fetch if workbook is loaded
    if (workbook) {
      fetchETBData();
    }
  }, [fetchETBData, workbook]);

  // Refresh workbook mappings - EXACTLY like WorkBookApp
  const refreshWorkbookMappings = useCallback(async (wbId: string) => {
    try {
      const response = await db_WorkbookApi.getWorkbookById(wbId);
      if (response.success && response.data) {
        const workbookData = response.data;
        if (workbookData._id && !workbookData.id) {
          workbookData.id = workbookData._id;
        }
        
        // ✅ CRITICAL: Preserve fileData from current workbook - EXACTLY like WorkBookApp
        setWorkbook((prevWorkbook) => {
          if (prevWorkbook && prevWorkbook.id === wbId) {
            return {
              ...workbookData,
              fileData: prevWorkbook.fileData || workbookData.fileData, // Preserve fileData
              _mappingsUpdateTimestamp: Date.now() // Force re-render
            } as any;
          }
          return workbookData;
        });
        
        setMappings(workbookData.mappings || []);
        setNamedRanges(workbookData.namedRanges || []);
        setMappingsRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error refreshing workbook mappings:", error);
    }
  }, []);

  // Helper to resolve row identifier
  const resolveRowIdentifier = (row: any, rowCode: string): string => {
    return (row as any)?._id || (row as any)?.id || rowCode;
  };

  // Handle mapping operations - EXACTLY like WorkBookApp
  const handleCreateMapping = useCallback(async (
    wbId: string,
    mappingDetails: {
      sheet: string;
      start: { row: number; col: number };
      end: { row: number; col: number };
      destinationField: string;
      transform: string;
      color: string;
    }
  ) => {
    if (!engagementId || !wbId) {
      toast({
        title: "Error",
        description: "Engagement ID and Workbook ID are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find row to get its classification
      const targetRow = etbData?.rows.find(r => r.code === mappingDetails.destinationField);
      const rowClassification = targetRow?.classification || classification;
      let rowIdentifier = resolveRowIdentifier(targetRow, mappingDetails.destinationField);

      if (actualRowType === 'working-paper' && engagementId && rowClassification) {
        try {
          const wpData = await getWorkingPaperWithMappings(engagementId, rowClassification);
          const wpRow = wpData?.rows?.find((row) => row.code === targetRow?.code);
          if (wpRow?._id) {
            rowIdentifier = wpRow._id;
          }
        } catch (wpResolveError) {
          console.error('Failed to fetch Working Paper row', wpResolveError);
        }
      }

      if (actualRowType === 'working-paper' && !rowIdentifier) {
        toast({
          title: "Error",
          description: "Unable to determine Working Paper row identifier.",
          variant: "destructive",
        });
        return;
      }

      // Create mapping payload
      const mappingPayload = {
        workbookId: wbId,
        color: mappingDetails.color,
        details: {
          sheet: mappingDetails.sheet,
          start: mappingDetails.start,
          end: mappingDetails.end
        }
      };

      // Add mapping to the row (call appropriate API based on rowType)
      let mappingResult;
      if (actualRowType === 'working-paper') {
        mappingResult = await addMappingToWPRow(
          engagementId,
          rowClassification,
          rowIdentifier as string,
          mappingPayload
        );
      } else if (actualRowType === 'evidence') {
        const evidenceId = mappingDetails.destinationField;
        mappingResult = await addMappingToEvidence(evidenceId, mappingPayload);
      } else {
        mappingResult = await addMappingToRow(
          engagementId,
          mappingDetails.destinationField,
          mappingPayload
        );
      }

      // Update linked files if needed
      if (actualRowType !== 'evidence') {
        let linkedFilesData;
        if (actualRowType === 'working-paper') {
          linkedFilesData = await getWorkingPaperWithLinkedFiles(engagementId, rowClassification);
        } else {
          linkedFilesData = await getExtendedTBWithLinkedFiles(engagementId, rowClassification);
        }

        const currentRow = linkedFilesData.rows.find((r: any) => r.code === mappingDetails.destinationField);
        const existingLinkedFileIds = currentRow?.linkedExcelFiles?.map((wb: any) => wb._id || wb) || [];

        if (!existingLinkedFileIds.includes(wbId)) {
          const updatedLinkedFiles = [...existingLinkedFileIds, wbId];
          if (actualRowType === 'working-paper') {
            await updateLinkedExcelFilesInWP(
              engagementId,
              rowClassification,
              rowIdentifier as string,
              updatedLinkedFiles
            );
          } else {
            await updateLinkedExcelFilesInExtendedTB(
              engagementId,
              rowClassification,
              mappingDetails.destinationField,
              updatedLinkedFiles
            );
          }
        }
      }

      // Update local state IMMEDIATELY - EXACTLY like WorkBookApp
      const newMapping = {
        _id: `temp-${Date.now()}`,
        workbookId: wbId,
        destinationField: mappingDetails.destinationField,
        transform: mappingDetails.transform,
        color: mappingDetails.color,
        details: {
          sheet: mappingDetails.sheet,
          start: mappingDetails.start,
          end: mappingDetails.end
        }
      };

      // ✅ CRITICAL: Use functional update to prevent flickering - EXACTLY like ExcelViewerWithFullscreen
      setWorkbook((prevWorkbook) => {
        if (prevWorkbook && prevWorkbook.id === wbId) {
          const updateTimestamp = Date.now();
          return {
            ...prevWorkbook,
            mappings: [...((prevWorkbook as any).mappings || []), newMapping],
            _mappingsUpdateTimestamp: updateTimestamp,
            // Preserve all important properties
            fileData: (prevWorkbook as any).fileData,
            sheets: (prevWorkbook as any).sheets,
            namedRanges: (prevWorkbook as any).namedRanges,
            referenceFiles: (prevWorkbook as any).referenceFiles
          } as any;
        }
        return prevWorkbook;
      });

      // Update ETB data IMMEDIATELY - EXACTLY like WorkBookApp
      setEtbData(prev => {
        if (!prev) return prev;
        const updatedRows = prev.rows.map(row => {
          if (row.code === mappingDetails.destinationField) {
            return {
              ...row,
              mappings: [...(row.mappings || []), {
                ...newMapping,
                workbookId: {
                  _id: wbId,
                  name: workbook?.name || 'Unknown Workbook'
                }
              }]
            };
          }
          return row;
        });
        return {
          ...prev,
          rows: updatedRows,
          _updateTimestamp: Date.now()
        } as any;
      });

      // Refresh mappings - EXACTLY like WorkBookApp
      await refreshWorkbookMappings(wbId);
      setMappingsRefreshKey(prev => prev + 1);

      toast({
        title: "Mapping Created",
        description: `Successfully mapped to ${mappingDetails.destinationField}`,
      });
    } catch (error: any) {
      console.error("Error creating mapping:", error);
      toast({
        title: "Mapping Creation Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [engagementId, classification, actualRowType, etbData, workbook, refreshWorkbookMappings, toast]);

  const handleUpdateMapping = useCallback(async (
    wbId: string,
    mappingId: string,
    updatedMappingDetails: {
      color?: string;
      sheet?: string;
      start?: { row: number; col: number };
      end?: { row: number; col: number };
    }
  ) => {
    try {
      const response = await db_WorkbookApi.updateMapping(
        wbId,
        mappingId,
        updatedMappingDetails
      );

      if (response.success) {
        await refreshWorkbookMappings(wbId);
        setMappingsRefreshKey(prev => prev + 1);
        toast({
          title: "Mapping Updated",
          description: "Successfully updated mapping",
        });
      } else {
        toast({
          title: "Update Failed",
          description: response.error || "Failed to update mapping",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error updating mapping:", error);
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [refreshWorkbookMappings, toast]);

  const handleDeleteMapping = useCallback(async (
    wbId: string,
    mappingId: string
  ) => {
    try {
      const response = await db_WorkbookApi.deleteMapping(wbId, mappingId);

      if (response.success) {
        // ✅ CRITICAL: Use functional update to prevent flickering - EXACTLY like ExcelViewerWithFullscreen
        setWorkbook((prevWorkbook) => {
          if (prevWorkbook && prevWorkbook.id === wbId) {
            const updateTimestamp = Date.now();
            return {
              ...prevWorkbook,
              mappings: ((prevWorkbook as any).mappings || []).filter((m: any) => m._id !== mappingId),
              _mappingsUpdateTimestamp: updateTimestamp,
              // Preserve all important properties
              fileData: (prevWorkbook as any).fileData,
              sheets: (prevWorkbook as any).sheets,
              namedRanges: (prevWorkbook as any).namedRanges,
              referenceFiles: (prevWorkbook as any).referenceFiles
            } as any;
          }
          return prevWorkbook;
        });
        await refreshWorkbookMappings(wbId);
        setMappingsRefreshKey(prev => prev + 1);
        toast({
          title: "Mapping Deleted",
          description: "Successfully deleted mapping",
        });
      } else {
        toast({
          title: "Deletion Failed",
          description: response.error || "Failed to delete mapping",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error deleting mapping:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [workbook, refreshWorkbookMappings, toast]);

  // Handle named range operations - EXACTLY like WorkBookApp
  const handleCreateNamedRange = useCallback(async (
    wbId: string,
    namedRangeDetails: { name: string; range: string }
  ) => {
    try {
      const response = await db_WorkbookApi.createNamedRange(wbId, namedRangeDetails);

      if (response.success && response.data) {
        setNamedRanges((prev) => [...prev, response.data as NamedRange]);
        await refreshWorkbookMappings(wbId);
        toast({
          title: "Named Range Created",
          description: `Successfully created named range: ${namedRangeDetails.name}`,
        });
      } else {
        toast({
          title: "Creation Failed",
          description: response.error || "Failed to create named range",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error creating named range:", error);
      toast({
        title: "Creation Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [refreshWorkbookMappings, toast]);

  const handleUpdateNamedRange = useCallback(async (
    wbId: string,
    namedRangeId: string,
    updatedNamedRangeDetails: { name?: string; range?: string }
  ) => {
    try {
      const response = await db_WorkbookApi.updateNamedRange(
        wbId,
        namedRangeId,
        updatedNamedRangeDetails
      );

      if (response.success) {
        setNamedRanges((prev) =>
          prev.map((nr) =>
            nr._id === namedRangeId
              ? { ...nr, ...updatedNamedRangeDetails }
              : nr
          )
        );
        await refreshWorkbookMappings(wbId);
        toast({
          title: "Named Range Updated",
          description: "Successfully updated named range",
        });
      } else {
        toast({
          title: "Update Failed",
          description: response.error || "Failed to update named range",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error updating named range:", error);
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [refreshWorkbookMappings, toast]);

  const handleDeleteNamedRange = useCallback(async (
    wbId: string,
    namedRangeId: string
  ) => {
    try {
      const response = await db_WorkbookApi.deleteNamedRange(wbId, namedRangeId);

      if (response.success) {
        setNamedRanges((prev) => prev.filter((nr) => nr._id !== namedRangeId));
        await refreshWorkbookMappings(wbId);
        toast({
          title: "Named Range Deleted",
          description: "Successfully deleted named range",
        });
      } else {
        toast({
          title: "Deletion Failed",
          description: response.error || "Failed to delete named range",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error deleting named range:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [refreshWorkbookMappings, toast]);


  // ✅ NEW: Handle sheet change and save user preference
  const handleSheetChange = useCallback(async (wbId: string, sheetName: string) => {
    console.log("WorkbookViewerPage: Sheet changed:", { wbId, sheetName });
    
    // Save user preference for the selected sheet
    try {
      const response = await db_WorkbookApi.saveUserWorkbookPreference(wbId, sheetName);
      if (response.success) {
        console.log(`WorkbookViewerPage: Saved sheet preference: ${sheetName} for workbook ${wbId}`);
      } else {
        console.warn(`WorkbookViewerPage: Failed to save sheet preference:`, response.error);
      }
    } catch (error) {
      console.error(`WorkbookViewerPage: Error saving sheet preference:`, error);
    }
  }, []);

  // Handle link field click
  const handleLinkFieldClick = useCallback((selection: any) => {
    // This will be handled by ExcelViewerWithFullscreen
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading workbook...</p>
      </div>
    );
  }

  if (!workbook) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Workbook not found</p>
      </div>
    );
  }

  // Debug log to verify ETB data
  console.log('WorkbookViewerPage: Rendering ExcelViewerWithFullscreen with:', {
    workbookId: workbook.id,
    workbookName: workbook.name,
    engagementId,
    classification,
    rowType: actualRowType,
    etbDataRows: etbData?.rows?.length || 0,
    etbDataExists: !!etbData,
    isLoadingETBData,
    mappingsCount: mappings.length,
    namedRangesCount: namedRanges.length
  });

  // ✅ CRITICAL: Ensure we're passing the correct etbData to ExcelViewerWithFullscreen
  console.log('WorkbookViewerPage: Passing etbData to ExcelViewerWithFullscreen:', {
    etbDataRows: etbData?.rows?.length || 0,
    etbDataExists: !!etbData,
    etbDataIsNull: etbData === null,
    etbDataIsUndefined: etbData === undefined,
    etbDataType: typeof etbData,
    engagementId,
    classification,
    rowType: actualRowType,
    firstThreeRows: etbData?.rows?.slice(0, 3)?.map(r => ({
      code: r.code,
      name: r.accountName,
      classification: r.classification
    })) || []
  });
  
  // ✅ CRITICAL: Verify etbData structure before passing
  if (etbData && (!etbData.rows || !Array.isArray(etbData.rows))) {
    console.error('WorkbookViewerPage: ❌ ERROR - etbData.rows is not an array!', {
      etbData,
      rowsType: typeof etbData.rows,
      rowsIsArray: Array.isArray(etbData.rows)
    });
  }

  return (
    <WorkbookViewerFullscreen
      key={`${workbook.id}-${(workbook as any)._mappingsUpdateTimestamp || 0}-${(workbook as any)?._referenceFilesUpdateTimestamp || 0}-${(workbook as any)?.referenceFiles?.length || 0}-${mappingsRefreshKey}`}
      workbook={workbook}
      setSelectedWorkbook={setWorkbook}
      mappings={mappings}
      namedRanges={namedRanges}
      engagementId={engagementId}
      classification={classification}
      rowType={actualRowType}
      parentEtbData={etbData}
      onRefreshETBData={fetchETBData}
        onRefreshMappings={refreshWorkbookMappings}
        onSheetChange={handleSheetChange}
        initialSheet={initialSheet}
        mappingsRefreshKey={mappingsRefreshKey}
      onCreateMapping={handleCreateMapping}
      onUpdateMapping={handleUpdateMapping}
      onDeleteMapping={handleDeleteMapping}
      onCreateNamedRange={handleCreateNamedRange}
      onUpdateNamedRange={handleUpdateNamedRange}
      onDeleteNamedRange={handleDeleteNamedRange}
      onBack={() => window.close()}
      onLinkField={handleLinkFieldClick}
      onLinkSheet={() => {
        toast({
          title: "Info",
          description: "Link to sheet feature is available",
        });
      }}
      onLinkWorkbook={() => {
        toast({
          title: "Info",
          description: "Link to workbook feature is available",
        });
      }}
      onReupload={() => {
        toast({
          title: "Info",
          description: "Reupload feature - please use the main dashboard",
        });
      }}
      onViewAuditLog={() => {
        toast({
          title: "Info",
          description: "Audit log feature - please use the main dashboard",
        });
      }}
    />
  );
}

