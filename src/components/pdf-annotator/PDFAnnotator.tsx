
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  MousePointer2,
  Eraser,
  ArrowRight,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

export type AnnotationType =
  | "highlight"
  | "comment"
  | "draw"
  | "rectangle"
  | "circle"
  | "text"
  | "arrow";

type ToolType = AnnotationType | "cursor" | "eraser";

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
  const [scale, setScale] = useState(0.9);
  const [rotation, setRotation] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolType | null>("cursor");
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
  const [previewArrow, setPreviewArrow] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const [eraserSize, setEraserSize] = useState<number>(24);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isPortalReady, setIsPortalReady] = useState(false);

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

  // Ensure document is available before creating portal
  useEffect(() => {
    setIsPortalReady(true);
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
    if (!selectedTool || selectedTool === "cursor") return;

    const coords = getPageCoordinates(e, pageNum);
    if (!coords) return;

    // Eraser removes annotations in the hit area instead of creating new ones
    if (selectedTool === "eraser") {
      const radius = eraserSize;
      const cx = coords.x;
      const cy = coords.y;

      setAnnotations((prev) =>
        prev.filter((ann) => {
          const insideX = cx >= ann.x - radius && cx <= ann.x + ann.width + radius;
          const insideY = cy >= ann.y - radius && cy <= ann.y + ann.height + radius;
          return !(insideX && insideY);
        })
      );
      return;
    }

    switch (selectedTool as AnnotationType) {
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
      case "arrow":
        setDrawStart(coords);
        setIsDrawing(true);
        setPreviewArrow({ start: coords, end: coords });
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
    } else if (selectedTool === "arrow" && drawStart) {
      setPreviewArrow({
        start: drawStart,
        end: coords,
      });
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
    } else if (selectedTool === "arrow" && drawStart && previewArrow) {
      const { start, end } = previewArrow;
      if (Math.abs(end.x - start.x) > 5 || Math.abs(end.y - start.y) > 5) {
        const minX = Math.min(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);

        newAnnotation = {
          id: `arrow-${Date.now()}`,
          type: "arrow",
          page: pageNum,
          x: minX,
          y: minY,
          width,
          height,
          color: selectedColor,
          points: [start, end],
          createdAt: new Date().toISOString(),
        };
      }
    }

    if (newAnnotation) {
      setAnnotations((prev) => [...prev, newAnnotation!]);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDraw([]);
    setPreviewShape(null);
    setPreviewArrow(null);
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

    // Calculate approximate width and height based on text content
    // Estimate: ~10-12 characters per 100px width, ~20px per line
    const lines = textAnnotation.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const estimatedWidth = Math.min(Math.max(200, maxLineLength * 8), 400);
    const estimatedHeight = Math.max(20, lines.length * 20);

    const textAnnotationObj: Annotation = {
      id: `text-${Date.now()}`,
      type: "text",
      page: pageNumber,
      x: drawStart.x,
      y: drawStart.y,
      width: estimatedWidth,
      height: estimatedHeight,
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
        const pageRefForComment = pageRefs.current.get(pageNum);
        let commentStyle: React.CSSProperties = {
          maxWidth: "400px",
          minWidth: "200px",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "pre-wrap",
        };

        // Calculate available space to keep comment within PDF bounds
        if (pageRefForComment) {
          const pageWidth = pageRefForComment.offsetWidth;
          const pageHeight = pageRefForComment.offsetHeight;
          const availableRight = pageWidth - annotation.x;
          const availableBottom = pageHeight - annotation.y;

          // Adjust max width based on available space
          if (availableRight < 400) {
            commentStyle.maxWidth = `${Math.max(200, availableRight - 20)}px`;
          }

          // If not enough space below, show above the comment icon
          if (availableBottom < 150 && annotation.y > 200) {
            commentStyle.bottom = "28px";
            commentStyle.top = "auto";
          } else {
            commentStyle.top = "28px";
            commentStyle.bottom = "auto";
          }

          // If not enough space on right, align to left
          if (availableRight < 250 && annotation.x > 250) {
            commentStyle.right = "0";
            commentStyle.left = "auto";
          } else {
            commentStyle.left = "0";
            commentStyle.right = "auto";
          }
        }

        return (
          <div
            key={annotation.id}
            style={style}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotation(annotation);
            }}
            onMouseEnter={() => setSelectedAnnotation(annotation)}
            onMouseLeave={() => setSelectedAnnotation(null)}
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
              <div
                className="absolute bg-white border rounded-lg p-3 shadow-lg z-20"
                style={commentStyle}
              >
                <div className="text-xs leading-relaxed break-words whitespace-pre-wrap">
                  {annotation.content}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteAnnotation(annotation.id)}
                  className="mt-2 p-0 h-7"
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

      case "arrow":
        if (!annotation.points || annotation.points.length < 2) return null;

        const [start, end] = annotation.points;
        const arrowColor = annotation.color || COLORS.draw[0];

        const relStartX = start.x - annotation.x;
        const relStartY = start.y - annotation.y;
        const relEndX = end.x - annotation.x;
        const relEndY = end.y - annotation.y;

        const headLength = 10;
        const dx = relEndX - relStartX;
        const dy = relEndY - relStartY;
        const angle = Math.atan2(dy, dx);

        const arrowPoint1X = relEndX - headLength * Math.cos(angle - Math.PI / 6);
        const arrowPoint1Y = relEndX === relEndX ? relEndY - headLength * Math.sin(angle - Math.PI / 6) : relEndY;
        const arrowPoint2X = relEndX - headLength * Math.cos(angle + Math.PI / 6);
        const arrowPoint2Y = relEndY - headLength * Math.sin(angle + Math.PI / 6);

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
            <line
              x1={relStartX}
              y1={relStartY}
              x2={relEndX}
              y2={relEndY}
              stroke={arrowColor}
              strokeWidth={2}
            />
            <polygon
              points={`${relEndX},${relEndY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
              fill={arrowColor}
            />
          </svg>
        );

      case "text":
        const pageRefForText = pageRefs.current.get(pageNum);
        const maxWidth = pageRefForText ? pageRefForText.offsetWidth - annotation.x - 10 : 300;
        return (
          <div
            key={annotation.id}
            style={{
              ...style,
              color: annotation.color || COLORS.draw[0],
              cursor: "pointer",
              maxWidth: `${Math.max(annotation.width || 200, Math.min(maxWidth, 400))}px`,
              width: annotation.width ? `${annotation.width}px` : "auto",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap",
              lineHeight: "1.4",
              fontSize: "11px",
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

            case "arrow":
              if (ann.points && ann.points.length >= 2) {
                const [start, end] = ann.points;
                const startX = start.x * scaleX;
                const startY = height - start.y * scaleY;
                const endX = end.x * scaleX;
                const endY = height - end.y * scaleY;

                const color = rgb(
                  parseInt(ann.color?.substring(1, 3) || "00", 16) / 255,
                  parseInt(ann.color?.substring(3, 5) || "00", 16) / 255,
                  parseInt(ann.color?.substring(5, 7) || "00", 16) / 255
                );

                // Main line
                page.drawLine({
                  start: { x: startX, y: startY },
                  end: { x: endX, y: endY },
                  color,
                  thickness: 2,
                });

                // Arrow head (simple two lines)
                const headLength = 10;
                const angle = Math.atan2(endY - startY, endX - startX);

                const arrow1 = {
                  x: endX - headLength * Math.cos(angle - Math.PI / 6),
                  y: endY - headLength * Math.sin(angle - Math.PI / 6),
                };
                const arrow2 = {
                  x: endX - headLength * Math.cos(angle + Math.PI / 6),
                  y: endY - headLength * Math.sin(angle + Math.PI / 6),
                };

                page.drawLine({
                  start: { x: endX, y: endY },
                  end: { x: arrow1.x, y: arrow1.y },
                  color,
                  thickness: 2,
                });

                page.drawLine({
                  start: { x: endX, y: endY },
                  end: { x: arrow2.x, y: arrow2.y },
                  color,
                  thickness: 2,
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

  const annotatorContent = (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray/100">
      {/* Header */}
      {/* HEADER BAR LIKE MAIN APP */}
      <div className="bg-white shadow-sm border-b px-6 py-3 flex items-center justify-between sticky top-0 z-50 rounded-md ml-24 mt-3">

        {/* LEFT — Back Button + File Name */}
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div>
            <h2 className="text-lg font-semibold truncate max-w-[280px]">{fileName}</h2>
            <p className="text-xs text-gray-500">
              Page {pageNumber} of {numPages || 0}
            </p>
          </div>
        </div>

        {/* CENTER — Viewer Controls */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span className="text-sm font-medium w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <Button variant="outline" size="sm" onClick={() => setScale(prev => Math.min(3, prev + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={() => setRotation(prev => (prev + 90) % 360)}>
            <RotateCw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isFullscreen) containerRef.current?.requestFullscreen?.();
              else document.exitFullscreen?.();
              setIsFullscreen(!isFullscreen);
            }}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>

        {/* RIGHT — Save / Export / Menu */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveAnnotations}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>

          <Button variant="outline" size="sm" onClick={exportAnnotatedPDF} disabled={saving}>
            <Download className="h-4 w-4 mr-1" />
            {saving ? "Exporting..." : "Export"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => containerRef.current?.requestFullscreen?.()}>
                Fullscreen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={saveAnnotations}>
                Save Annotations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAnnotatedPDF}>
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>


      <div className="flex flex-1 overflow-hidden flex-row-reverse">
        {sidebarOpen && (
          <div className="w-56 bg-white border-l p-3 overflow-y-auto flex-shrink-0">

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
                      variant={!selectedTool || selectedTool === "cursor" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTool("cursor")}
                      className="flex flex-col h-auto py-3"
                    >
                      <MousePointer2 className="h-5 w-5 mb-1" />
                      <span className="text-xs">Cursor</span>
                    </Button>
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
                    <Button
                      variant={selectedTool === "arrow" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTool("arrow")}
                      className="flex flex-col h-auto py-3"
                    >
                      <ArrowRight className="h-5 w-5 mb-1" />
                      <span className="text-xs">Arrow</span>
                    </Button>
                    <Button
                      variant={selectedTool === "eraser" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTool("eraser")}
                      className="flex flex-col h-auto py-3"
                    >
                      <Eraser className="h-5 w-5 mb-1" />
                      <span className="text-xs">Eraser</span>
                    </Button>
                  </div>
                </div>

                {selectedTool && selectedTool !== "eraser" && selectedTool !== "cursor" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium mb-2 block">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS[
                        selectedTool === "highlight" || selectedTool === "comment" ? "highlight" : "draw"
                      ].map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-8 h-8 rounded border-2",
                            selectedColor === color ? "border-gray-800" : "border-gray-300"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setSelectedColor(color);
                            setRecentColors((prev) => {
                              const next = [color, ...prev.filter((c) => c !== color)];
                              return next.slice(0, 5);
                            });
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => {
                          const color = e.target.value;
                          setSelectedColor(color);
                          setRecentColors((prev) => {
                            const next = [color, ...prev.filter((c) => c !== color)];
                            return next.slice(0, 5);
                          });
                        }}
                        className="h-8 w-10 rounded border border-gray-300 cursor-pointer"
                      />
                      {recentColors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {recentColors.map((color) => (
                            <button
                              key={color}
                              className={cn(
                                "w-6 h-6 rounded border-2",
                                selectedColor === color ? "border-gray-800" : "border-gray-300"
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => setSelectedColor(color)}
                              title={color}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedTool === "eraser" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium mb-2 block">Eraser Size</label>
                    <Slider
                      min={8}
                      max={72}
                      step={4}
                      value={[eraserSize]}
                      onValueChange={([value]) => setEraserSize(value)}
                    />
                    <div className="text-xs text-gray-500">Current size: {eraserSize}px</div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedTool("cursor")}
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

            {/* Page navigation moved into sidebar for a simpler layout */}
            <div className="mt-6 space-y-2 border-t pt-4">
              <label className="text-sm font-medium block mb-1">Page Navigation</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                  disabled={pageNumber <= 1}
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={numPages || 1}
                  value={pageNumber}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (!Number.isNaN(page) && page >= 1 && page <= (numPages || 1)) {
                      setPageNumber(page);
                    }
                  }}
                  className="w-16 text-center"
                />
                <span className="text-xs text-gray-500">of {numPages || 0}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPageNumber((prev) => Math.min(numPages || 1, prev + 1))}
                  disabled={pageNumber >= (numPages || 1)}
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
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

          {/* Carousel-style navigation arrows beside the PDF page */}
          {numPages && numPages > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPageNumber((prev) => Math.max(1, prev - 1));
                }}
                disabled={pageNumber <= 1}
                className="hidden md:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 border border-gray-300 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
                }}
                disabled={pageNumber >= (numPages || 1)}
                className="hidden md:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 border border-gray-300 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
            </>
          )}
        </div>

        {/* Removed floating page navigation in favor of sidebar navigation */}
      </div>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Enter your comment (supports multiple lines)..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="mt-4 min-h-[100px] resize-y"
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
          <Textarea
            placeholder="Enter text (supports multiple lines)..."
            value={textAnnotation}
            onChange={(e) => setTextAnnotation(e.target.value)}
            className="mt-4 min-h-[100px] resize-y"
            rows={4}
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

  if (!isPortalReady) {
    return null;
  }

  return createPortal(annotatorContent, document.body);
};
