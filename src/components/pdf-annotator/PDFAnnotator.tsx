"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, PDFPage } from "pdf-lib";
import {
  Highlighter,
  MessageSquare,
  Pen,
  Square,
  Circle,
  Download,
  Save,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Trash2,
  Type,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

export type AnnotationType = "highlight" | "comment" | "draw" | "rectangle" | "circle" | "text";

export interface Annotation {
  id: string;
  type: AnnotationType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  content?: string; // For comments and text annotations
  points?: Array<{ x: number; y: number }>; // For drawings
  createdAt: string;
  createdBy?: string;
}

interface PDFAnnotatorProps {
  fileUrl: string;
  fileName: string;
  engagementId: string;
  fileId: string;
  onClose: () => void;
  onSave?: (annotations: Annotation[]) => void;
}

const COLORS = {
  highlight: ["#FFEB3B", "#FF9800", "#F44336", "#9C27B0", "#2196F3", "#4CAF50"],
  comment: ["#FFEB3B", "#FF9800", "#F44336", "#9C27B0", "#2196F3", "#4CAF50"],
  draw: ["#000000", "#F44336", "#2196F3", "#4CAF50", "#FF9800", "#9C27B0"],
};

export const PDFAnnotator: React.FC<PDFAnnotatorProps> = ({
  fileUrl,
  fileName,
  engagementId,
  fileId,
  onClose,
  onSave,
}) => {
  // Decode URL to handle double encoding issues
  const decodeUrl = (url: string): string => {
    try {
      // Try decoding once
      let decoded = decodeURIComponent(url);
      // Check if it's still encoded (double-encoded)
      if (decoded.includes('%')) {
        try {
          decoded = decodeURIComponent(decoded);
        } catch {
          // If second decode fails, use first decode
        }
      }
      return decoded;
    } catch {
      // If decoding fails, return original URL
      return url;
    }
  };

  // Process the file URL to handle encoding and add cache-busting
  const processedFileUrl = React.useMemo(() => {
    const decoded = decodeUrl(fileUrl);
    try {
      const url = new URL(decoded);
      // Add cache-busting parameter
      url.searchParams.set("v", String(Date.now()));
      return url.toString();
    } catch {
      // If URL parsing fails, try to add cache-busting manually
      const separator = decoded.includes("?") ? "&" : "?";
      return `${decoded}${separator}v=${Date.now()}`;
    }
  }, [fileUrl]);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.90);
  const [rotation, setRotation] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<AnnotationType | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS.highlight[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraw, setCurrentDraw] = useState<Array<{ x: number; y: number }>>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [commentText, setCommentText] = useState("");
  const [textAnnotation, setTextAnnotation] = useState("");
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number; page: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [previewShape, setPreviewShape] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load annotations from localStorage
  useEffect(() => {
    const savedAnnotations = localStorage.getItem(`pdf-annotations-${engagementId}-${fileId}`);
    if (savedAnnotations) {
      try {
        setAnnotations(JSON.parse(savedAnnotations));
      } catch (error) {
        console.error("Failed to load annotations:", error);
      }
    }
  }, [engagementId, fileId]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Save annotations to localStorage
  const saveAnnotations = useCallback(() => {
    localStorage.setItem(
      `pdf-annotations-${engagementId}-${fileId}`,
      JSON.stringify(annotations)
    );
    if (onSave) {
      onSave(annotations);
    }
    toast({
      title: "Annotations saved",
      description: "Your annotations have been saved successfully",
    });
  }, [annotations, engagementId, fileId, onSave, toast]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const getPageCoordinates = (
    e: React.MouseEvent<HTMLDivElement>,
    pageNum: number
  ): { x: number; y: number } | null => {
    const pageRef = pageRefs.current.get(pageNum);
    if (!pageRef) return null;

    const rect = pageRef.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePageMouseDown = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!selectedTool) return;

    const coords = getPageCoordinates(e, pageNum);
    if (!coords) return;

    const pageRef = pageRefs.current.get(pageNum);
    if (!pageRef) return;

    switch (selectedTool) {
      case "highlight":
        // Start text selection for highlighting
        setSelectionStart({ x: coords.x, y: coords.y, page: pageNum });
        setIsDrawing(true);
        break;

      case "comment":
        setDrawStart(coords);
        setShowCommentDialog(true);
        break;

      case "text":
        setDrawStart(coords);
        setShowTextDialog(true);
        break;

      case "rectangle":
      case "circle":
        setDrawStart(coords);
        setIsDrawing(true);
        setPreviewShape({ x: coords.x, y: coords.y, width: 0, height: 0 });
        break;

      case "draw":
        setDrawStart(coords);
        setIsDrawing(true);
        setCurrentDraw([coords]);
        break;
    }
  };

  const handlePageMouseMove = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!isDrawing) return;

    const coords = getPageCoordinates(e, pageNum);
    if (!coords) return;

    if (selectedTool === "highlight" && selectionStart) {
      // Update selection rectangle for highlighting
      const minX = Math.min(selectionStart.x, coords.x);
      const minY = Math.min(selectionStart.y, coords.y);
      const width = Math.abs(coords.x - selectionStart.x);
      const height = Math.abs(coords.y - selectionStart.y);
      setCurrentSelection({ x: minX, y: minY, width, height });
    } else if (selectedTool === "draw" && drawStart) {
      setCurrentDraw((prev) => {
        // Only add if the point is significantly different from the last one
        if (prev.length === 0 || 
            Math.abs(prev[prev.length - 1].x - coords.x) > 2 || 
            Math.abs(prev[prev.length - 1].y - coords.y) > 2) {
          return [...prev, coords];
        }
        return prev;
      });
    } else if ((selectedTool === "rectangle" || selectedTool === "circle") && drawStart) {
      // Update preview shape
      const minX = Math.min(drawStart.x, coords.x);
      const minY = Math.min(drawStart.y, coords.y);
      const width = Math.abs(coords.x - drawStart.x);
      const height = Math.abs(coords.y - drawStart.y);
      setPreviewShape({ x: minX, y: minY, width, height });
    }
  };

  const handlePageMouseUp = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!isDrawing) return;

    const coords = getPageCoordinates(e, pageNum);
    if (!coords) return;

    let newAnnotation: Annotation | null = null;

    if (selectedTool === "highlight" && selectionStart && currentSelection) {
      // Create highlight from selection
      if (currentSelection.width > 5 && currentSelection.height > 5) {
        newAnnotation = {
          id: `highlight-${Date.now()}`,
          type: "highlight",
          page: selectionStart.page,
          x: currentSelection.x,
          y: currentSelection.y,
          width: currentSelection.width,
          height: currentSelection.height,
          color: selectedColor,
          createdAt: new Date().toISOString(),
        };
      }
      setSelectionStart(null);
      setCurrentSelection(null);
    } else if (selectedTool === "rectangle" && drawStart && previewShape) {
      if (previewShape.width > 5 && previewShape.height > 5) {
        newAnnotation = {
          id: `rect-${Date.now()}`,
          type: "rectangle",
          page: pageNum,
          x: previewShape.x,
          y: previewShape.y,
          width: previewShape.width,
          height: previewShape.height,
          color: selectedColor,
          createdAt: new Date().toISOString(),
        };
      }
    } else if (selectedTool === "circle" && drawStart && previewShape) {
      const centerX = drawStart.x + previewShape.width / 2;
      const centerY = drawStart.y + previewShape.height / 2;
      const radius = Math.sqrt(Math.pow(previewShape.width / 2, 2) + Math.pow(previewShape.height / 2, 2));
      if (radius > 5) {
        newAnnotation = {
          id: `circle-${Date.now()}`,
          type: "circle",
          page: pageNum,
          x: centerX - radius,
          y: centerY - radius,
          width: radius * 2,
          height: radius * 2,
          color: selectedColor,
          createdAt: new Date().toISOString(),
        };
      }
    } else if (selectedTool === "draw" && currentDraw.length > 1) {
      newAnnotation = {
        id: `draw-${Date.now()}`,
        type: "draw",
        page: pageNum,
        x: Math.min(...currentDraw.map((p) => p.x)),
        y: Math.min(...currentDraw.map((p) => p.y)),
        width: Math.max(...currentDraw.map((p) => p.x)) - Math.min(...currentDraw.map((p) => p.x)),
        height: Math.max(...currentDraw.map((p) => p.y)) - Math.min(...currentDraw.map((p) => p.y)),
        color: selectedColor,
        points: [...currentDraw],
        createdAt: new Date().toISOString(),
      };
    }

    if (newAnnotation) {
      setAnnotations((prev) => [...prev, newAnnotation!]);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDraw([]);
    setPreviewShape(null);
  };

  const handleSaveComment = () => {
    if (!drawStart || !commentText.trim()) return;

    const commentAnnotation: Annotation = {
      id: `comment-${Date.now()}`,
      type: "comment",
      page: pageNumber,
      x: drawStart.x,
      y: drawStart.y,
      width: 20,
      height: 20,
      color: selectedColor,
      content: commentText,
      createdAt: new Date().toISOString(),
    };

    setAnnotations((prev) => [...prev, commentAnnotation]);
    setCommentText("");
    setShowCommentDialog(false);
    setDrawStart(null);
  };

  const handleSaveText = () => {
    if (!drawStart || !textAnnotation.trim()) return;

    const textAnnotationObj: Annotation = {
      id: `text-${Date.now()}`,
      type: "text",
      page: pageNumber,
      x: drawStart.x,
      y: drawStart.y,
      width: 100,
      height: 20,
      color: selectedColor,
      content: textAnnotation,
      createdAt: new Date().toISOString(),
    };

    setAnnotations((prev) => [...prev, textAnnotationObj]);
    setTextAnnotation("");
    setShowTextDialog(false);
    setDrawStart(null);
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
    setSelectedAnnotation(null);
  };

  const renderAnnotation = (annotation: Annotation, pageNum: number) => {
    const pageRef = pageRefs.current.get(pageNum);
    if (!pageRef) return null;

    const style: React.CSSProperties = {
      position: "absolute",
      left: `${annotation.x}px`,
      top: `${annotation.y}px`,
      pointerEvents: "auto",
      zIndex: 10,
    };

    switch (annotation.type) {
      case "highlight":
        return (
          <div
            key={annotation.id}
            style={{
              ...style,
              width: `${annotation.width}px`,
              height: `${annotation.height}px`,
              backgroundColor: annotation.color || COLORS.highlight[0],
              opacity: 0.4,
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation);
            }}
          />
        );

      case "comment":
        return (
          <div
            key={annotation.id}
            style={style}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation);
            }}
            className="cursor-pointer"
          >
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{
                backgroundColor: annotation.color || COLORS.comment[0],
                borderColor: annotation.color || COLORS.comment[0],
              }}
            >
              <MessageSquare className="h-3 w-3 text-white" />
            </div>
            {selectedAnnotation?.id === annotation.id && (
              <div className="absolute top-6 left-0 bg-white border rounded-lg p-2 shadow-lg max-w-xs z-20">
                <p className="text-sm">{annotation.content}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteAnnotation(annotation.id)}
                  className="mt-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );

      case "rectangle":
        return (
          <div
            key={annotation.id}
            style={{
              ...style,
              width: `${annotation.width}px`,
              height: `${annotation.height}px`,
              border: `2px solid ${annotation.color || COLORS.draw[0]}`,
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation);
            }}
          />
        );

      case "circle":
        return (
          <div
            key={annotation.id}
            style={{
              ...style,
              width: `${annotation.width}px`,
              height: `${annotation.height}px`,
              border: `2px solid ${annotation.color || COLORS.draw[0]}`,
              borderRadius: "50%",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation);
            }}
          />
        );

      case "draw":
        if (!annotation.points || annotation.points.length < 2) return null;
        return (
          <svg
            key={annotation.id}
            style={{
              ...style,
              width: `${annotation.width}px`,
              height: `${annotation.height}px`,
              pointerEvents: "none",
            }}
            className="absolute"
          >
            <polyline
              points={annotation.points.map((p) => `${p.x - annotation.x},${p.y - annotation.y}`).join(" ")}
              fill="none"
              stroke={annotation.color || COLORS.draw[0]}
              strokeWidth="2"
            />
          </svg>
        );

      case "text":
        return (
          <div
            key={annotation.id}
            style={{
              ...style,
              color: annotation.color || COLORS.draw[0],
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation);
            }}
            className="font-semibold"
          >
            {annotation.content}
          </div>
        );

      default:
        return null;
    }
  };

  const exportAnnotatedPDF = async () => {
    setSaving(true);
    try {
      // Fetch the original PDF
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Load PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Group annotations by page
      const annotationsByPage = annotations.reduce((acc, ann) => {
        if (!acc[ann.page]) acc[ann.page] = [];
        acc[ann.page].push(ann);
        return acc;
      }, {} as Record<number, Annotation[]>);

      // Apply annotations to each page
      for (const [pageNumStr, pageAnnotations] of Object.entries(annotationsByPage)) {
        const pageNum = parseInt(pageNumStr) - 1;
        if (pageNum < 0 || pageNum >= pages.length) continue;

        const page = pages[pageNum];
        const { width, height } = page.getSize();

        // Get the canvas to calculate scale
        const pageRef = pageRefs.current.get(parseInt(pageNumStr));
        if (!pageRef) continue;

        const canvas = pageRef.querySelector("canvas");
        if (!canvas) continue;

        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = width / canvasRect.width;
        const scaleY = height / canvasRect.height;

        for (const ann of pageAnnotations) {
          switch (ann.type) {
            case "highlight":
              page.drawRectangle({
                x: ann.x * scaleX,
                y: height - (ann.y + ann.height) * scaleY,
                width: ann.width * scaleX,
                height: ann.height * scaleY,
                color: rgb(
                  parseInt(ann.color?.substring(1, 3) || "FF", 16) / 255,
                  parseInt(ann.color?.substring(3, 5) || "EB", 16) / 255,
                  parseInt(ann.color?.substring(5, 7) || "3B", 16) / 255
                ),
                opacity: 0.4,
              });
              break;

            case "rectangle":
              page.drawRectangle({
                x: ann.x * scaleX,
                y: height - (ann.y + ann.height) * scaleY,
                width: ann.width * scaleX,
                height: ann.height * scaleY,
                borderColor: rgb(
                  parseInt(ann.color?.substring(1, 3) || "00", 16) / 255,
                  parseInt(ann.color?.substring(3, 5) || "00", 16) / 255,
                  parseInt(ann.color?.substring(5, 7) || "00", 16) / 255
                ),
                borderWidth: 2,
              });
              break;

            case "circle":
              // pdf-lib doesn't have drawCircle, so we'll use drawEllipse
              const radiusX = (ann.width / 2) * scaleX;
              const radiusY = (ann.height / 2) * scaleY;
              page.drawEllipse({
                x: (ann.x + ann.width / 2) * scaleX,
                y: height - (ann.y + ann.height / 2) * scaleY,
                xScale: radiusX,
                yScale: radiusY,
                borderColor: rgb(
                  parseInt(ann.color?.substring(1, 3) || "00", 16) / 255,
                  parseInt(ann.color?.substring(3, 5) || "00", 16) / 255,
                  parseInt(ann.color?.substring(5, 7) || "00", 16) / 255
                ),
                borderWidth: 2,
              });
              break;

            case "text":
              if (ann.content) {
                page.drawText(ann.content, {
                  x: ann.x * scaleX,
                  y: height - ann.y * scaleY,
                  size: 12,
                  color: rgb(
                    parseInt(ann.color?.substring(1, 3) || "00", 16) / 255,
                    parseInt(ann.color?.substring(3, 5) || "00", 16) / 255,
                    parseInt(ann.color?.substring(5, 7) || "00", 16) / 255
                  ),
                });
              }
              break;
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      // Convert Uint8Array to ArrayBuffer for Blob compatibility
      // Create a new ArrayBuffer from the Uint8Array to ensure type compatibility
      const pdfBuffer = new Uint8Array(pdfBytes).buffer;
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `annotated-${fileName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF exported",
        description: "Annotated PDF has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export failed",
        description: "Failed to export annotated PDF",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const pageAnnotations = annotations.filter((ann) => ann.page === pageNumber);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <FileText className="h-5 w-5 text-gray-600" />
          <div>
            <h2 className="text-lg font-semibold">{fileName}</h2>
            <p className="text-sm text-gray-500">
              Page {pageNumber} of {numPages || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((prev) => Math.max(0.5, prev - 0.25))}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((prev) => Math.min(3, prev + 0.25))}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            title="Rotate"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isFullscreen) {
                containerRef.current?.requestFullscreen?.();
                setIsFullscreen(true);
              } else {
                document.exitFullscreen?.();
                setIsFullscreen(false);
              }
            }}
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={saveAnnotations} title="Save Annotations">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={exportAnnotatedPDF} disabled={saving} title="Export PDF">
            <Download className="h-4 w-4 mr-2" />
            {saving ? "Exporting..." : "Export"}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar - Collapsible */}
        {sidebarOpen && (
          <div className="w-56 bg-white border-r p-3 overflow-y-auto flex-shrink-0">
          <h3 className="font-semibold mb-4">Annotation Tools</h3>

          <Tabs defaultValue="annotate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="annotate">Annotate</TabsTrigger>
              <TabsTrigger value="annotations">Annotations</TabsTrigger>
            </TabsList>

            <TabsContent value="annotate" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tools</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedTool === "highlight" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTool("highlight")}
                    className="flex flex-col h-auto py-3"
                  >
                    <Highlighter className="h-5 w-5 mb-1" />
                    <span className="text-xs">Highlight</span>
                  </Button>
                  <Button
                    variant={selectedTool === "comment" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTool("comment")}
                    className="flex flex-col h-auto py-3"
                  >
                    <MessageSquare className="h-5 w-5 mb-1" />
                    <span className="text-xs">Comment</span>
                  </Button>
                  <Button
                    variant={selectedTool === "draw" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTool("draw")}
                    className="flex flex-col h-auto py-3"
                  >
                    <Pen className="h-5 w-5 mb-1" />
                    <span className="text-xs">Draw</span>
                  </Button>
                  <Button
                    variant={selectedTool === "rectangle" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTool("rectangle")}
                    className="flex flex-col h-auto py-3"
                  >
                    <Square className="h-5 w-5 mb-1" />
                    <span className="text-xs">Rectangle</span>
                  </Button>
                  <Button
                    variant={selectedTool === "circle" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTool("circle")}
                    className="flex flex-col h-auto py-3"
                  >
                    <Circle className="h-5 w-5 mb-1" />
                    <span className="text-xs">Circle</span>
                  </Button>
                  <Button
                    variant={selectedTool === "text" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTool("text")}
                    className="flex flex-col h-auto py-3"
                  >
                    <Type className="h-5 w-5 mb-1" />
                    <span className="text-xs">Text</span>
                  </Button>
                </div>
              </div>

              {selectedTool && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS[selectedTool === "highlight" || selectedTool === "comment" ? "highlight" : "draw"].map(
                      (color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-8 h-8 rounded border-2",
                            selectedColor === color ? "border-gray-800" : "border-gray-300"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelectedTool(null)}
              >
                Clear Selection
              </Button>
            </TabsContent>

            <TabsContent value="annotations" className="mt-4">
              <div className="space-y-2">
                <div className="text-sm font-medium mb-2">
                  Page {pageNumber} ({pageAnnotations.length} annotations)
                </div>
                {pageAnnotations.map((ann) => (
                  <div
                    key={ann.id}
                    className={cn(
                      "p-2 border rounded cursor-pointer",
                      selectedAnnotation?.id === ann.id ? "bg-blue-50 border-blue-500" : "bg-white"
                    )}
                    onClick={() => setSelectedAnnotation(ann)}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {ann.type}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {ann.content && (
                      <p className="text-xs text-gray-600 mt-1 truncate">{ann.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          </div>
        )}
        
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-1/2 -translate-y-1/2 z-10 bg-white border border-r-0 rounded-r-lg p-1 shadow-md hover:bg-gray-50 transition-all"
          style={{ left: sidebarOpen ? '224px' : '0px' }}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* PDF Viewer */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-100 p-2 relative"
          onClick={() => setSelectedAnnotation(null)}
        >
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Document
              file={processedFileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error("Error loading PDF:", error);
                toast({
                  title: "Error loading PDF",
                  description: error.message || "Failed to load PDF document",
                  variant: "destructive",
                });
                setLoading(false);
              }}
              loading={
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
            >
              {numPages &&
                Array.from(new Array(numPages), (el, index) => {
                  const pageNum = index + 1;
                  const isCurrentPage = pageNum === pageNumber;

                  return (
                    <div
                      key={`page-${pageNum}`}
                      ref={(el) => {
                        if (el) pageRefs.current.set(pageNum, el);
                      }}
                      className={cn(
                        "relative mb-2 flex justify-center",
                        !isCurrentPage && "hidden"
                      )}
                      onMouseDown={(e) => handlePageMouseDown(e, pageNum)}
                      onMouseMove={(e) => handlePageMouseMove(e, pageNum)}
                      onMouseUp={(e) => handlePageMouseUp(e, pageNum)}
                      style={{ cursor: selectedTool ? "crosshair" : "default" }}
                    >
                      <Page
                        pageNumber={pageNum}
                        scale={scale}
                        rotate={rotation}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                      {annotations
                        .filter((ann) => ann.page === pageNum)
                        .map((ann) => renderAnnotation(ann, pageNum))}
                      
                      {/* Preview for highlight selection */}
                      {isDrawing && selectedTool === "highlight" && currentSelection && selectionStart?.page === pageNum && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            left: `${currentSelection.x}px`,
                            top: `${currentSelection.y}px`,
                            width: `${currentSelection.width}px`,
                            height: `${currentSelection.height}px`,
                            backgroundColor: selectedColor,
                            opacity: 0.4,
                            zIndex: 15,
                          }}
                        />
                      )}
                      
                      {/* Preview for rectangle */}
                      {isDrawing && selectedTool === "rectangle" && previewShape && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            left: `${previewShape.x}px`,
                            top: `${previewShape.y}px`,
                            width: `${previewShape.width}px`,
                            height: `${previewShape.height}px`,
                            border: `2px solid ${selectedColor}`,
                            backgroundColor: "transparent",
                            zIndex: 15,
                          }}
                        />
                      )}
                      
                      {/* Preview for circle */}
                      {isDrawing && selectedTool === "circle" && previewShape && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            left: `${previewShape.x}px`,
                            top: `${previewShape.y}px`,
                            width: `${previewShape.width}px`,
                            height: `${previewShape.height}px`,
                            border: `2px solid ${selectedColor}`,
                            borderRadius: "50%",
                            backgroundColor: "transparent",
                            zIndex: 15,
                          }}
                        />
                      )}
                      
                      {/* Preview for drawing */}
                      {isDrawing && selectedTool === "draw" && currentDraw.length > 0 && (
                        <svg
                          className="absolute top-0 left-0 pointer-events-none"
                          style={{
                            width: "100%",
                            height: "100%",
                            zIndex: 15,
                          }}
                        >
                          <polyline
                            points={currentDraw.map((p) => `${p.x},${p.y}`).join(" ")}
                            fill="none"
                            stroke={selectedColor}
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </div>
                  );
                })}
            </Document>
          </div>
        </div>

        {/* Page Navigation - Floating - Aligned with Clear Selection button */}
        <div className="absolute top-[430px] left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border rounded-lg shadow-lg px-3 py-1.5 flex items-center gap-2 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-2 px-3">
            <Input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageNumber}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= (numPages || 1)) {
                  setPageNumber(page);
                }
              }}
              className="w-16 text-center"
            />
            <span className="text-sm text-gray-600">of {numPages || 0}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((prev) => Math.min(numPages || 1, prev + 1))}
            disabled={pageNumber >= (numPages || 1)}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Enter your comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="mt-4"
            rows={4}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveComment}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Dialog */}
      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Enter text..."
            value={textAnnotation}
            onChange={(e) => setTextAnnotation(e.target.value)}
            className="mt-4"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowTextDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveText}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

