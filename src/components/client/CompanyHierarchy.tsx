// Updated CompanyHierarchy.tsx with fixes for loading and full-quality PDF export
// --- FIXES INCLUDED ---
// 1. Removed initial flicker: no more showing "no data" for 5-10 seconds.
// 2. Rewritten PDF export: captures full flow at full resolution.

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Position,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "../ui/button";
import { EnhancedLoader } from "../ui/enhanced-loader";

const LEVEL_GAP_Y = 270;
const NODE_WIDTH = 350;
const PARENT_NODE_WIDTH = 1300;
const HORIZONTAL_SPACING = NODE_WIDTH + 1;
const NODE_GAP = 130; // Gap between nodes (horizontal spacing)
const HEADER_WIDTH = 400; // Width for group headers

interface ShareDataItem {
  totalShares: number;
  class: string; // "A" | "B" | "C" | "Ordinary"
  type?: string;
}

interface HierarchyTreeNode {
  id: string;
  type?: string;
  name: string;
  percentage?: number;
  sharePercentage?: number;
  class?: string;
  address?: string;
  nationality?: string;
  totalShares?: number | ShareDataItem[]; // Can be number (for shareholders) or array (for parent company)
  sharesData?: ShareDataItem[];
  roles?: string[];
  children?: HierarchyTreeNode[];
  shareholders?: HierarchyTreeNode[];
  _isOnlyRepresentative?: boolean;
  _parentCompanyId?: string;
}

interface CompanyHierarchyProps {
  rootData?: HierarchyTreeNode | null;
}

interface HierarchyNodeData {
  label: ReactNode;
}

export const CompanyHierarchy: React.FC<CompanyHierarchyProps> = ({ rootData }) => {

  const [nodes, setNodes, onNodesChange] = useNodesState<HierarchyNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(false);

  const isStillLoading = rootData === undefined; // FIX #1: distinct loading state

  const { initialNodes, initialEdges, bounds } = useMemo(() => {
    if (!rootData) return { initialNodes: [], initialEdges: [], bounds: { width: 0, height: 0 } };

    const nodeMap = new Map<string, Node<HierarchyNodeData>>();
    const generatedEdges: Edge[] = [];
    const NODES_PER_ROW = 3;

    // Helper to determine share class priority for ordering:
    // Any Class A shareholder comes first, then Class B, then Class C, then others/Ordinary-only
    const getShareClassPriority = (node: HierarchyTreeNode): number => {
      const shareItems: ShareDataItem[] =
        (node.sharesData && Array.isArray(node.sharesData) && node.sharesData) ||
        (Array.isArray(node.totalShares) ? (node.totalShares as ShareDataItem[]) : []);

      let hasA = false;
      let hasB = false;
      let hasC = false;

      shareItems.forEach((sd) => {
        const cls = sd.class;
        const amount = Number(sd.totalShares) || 0;
        if (amount <= 0) return;
        if (cls === "A") {
          hasA = true;
        } else if (cls === "B") {
          hasB = true;
        } else if (cls === "C") {
          hasC = true;
        }
      });

      if (hasA) return 0;
      if (hasB) return 1;
      if (hasC) return 2;
      return 3; // Ordinary only or no class info
    };

    // Helper to restructure data into side-by-side layout: Parent -> Left (Shareholders) | Right (Only Representatives)
    const restructureHierarchy = (root: HierarchyTreeNode): { 
      root: HierarchyTreeNode; 
      shareholders: HierarchyTreeNode[]; 
      onlyRepresentatives: HierarchyTreeNode[] 
    } => {
      const allDescendants = root.children ?? root.shareholders ?? [];
      
      if (allDescendants.length === 0) {
        return { root, shareholders: [], onlyRepresentatives: [] };
      }

      const shareholders: HierarchyTreeNode[] = [];
      const onlyRepresentatives: HierarchyTreeNode[] = [];

      allDescendants.forEach(descendant => {
        // Check if this is a shareholder (person or company with shares > 0)
        const hasSharesFromData = descendant.sharesData && Array.isArray(descendant.sharesData) &&
          descendant.sharesData.some((sd: ShareDataItem) => Number(sd.totalShares) > 0);
        const hasSharesFromTotalSharesArray = Array.isArray(descendant.totalShares) &&
          descendant.totalShares.some((sd: ShareDataItem) => Number(sd.totalShares) > 0);
        const hasShares = (descendant.sharePercentage && descendant.sharePercentage > 0) || 
                         (descendant.percentage && descendant.percentage > 0) ||
                         (typeof descendant.totalShares === 'number' && descendant.totalShares > 0) ||
                         hasSharesFromData ||
                         hasSharesFromTotalSharesArray;
        
        // Check if this is a representative (has representative/director/secretary role)
        const hasRepRole = descendant.roles?.some(role => 
          role.toLowerCase().includes('representative') ||
          role.toLowerCase().includes('director') ||
          role.toLowerCase().includes('secretary')
        );

        if (hasShares) {
          shareholders.push(descendant);
        } else if (hasRepRole) {
          onlyRepresentatives.push(descendant);
        }
      });

      // Sort shareholders so that:
      // - Nodes with Class A shares appear first
      // - Then nodes with Class B shares
      // - Then nodes with Class C shares
      // - Then Ordinary-only / others
      shareholders.sort((a, b) => {
        const prioA = getShareClassPriority(a);
        const prioB = getShareClassPriority(b);
        if (prioA !== prioB) return prioA - prioB;

        // Tie-breaker: higher total shares first (if available)
        const totalSharesA =
          (Array.isArray(a.sharesData)
            ? a.sharesData.reduce((sum, sd) => sum + (Number(sd.totalShares) || 0), 0)
            : 0) ||
          (Array.isArray(a.totalShares)
            ? (a.totalShares as ShareDataItem[]).reduce((sum, sd) => sum + (Number(sd.totalShares) || 0), 0)
            : typeof a.totalShares === "number"
            ? a.totalShares
            : 0);

        const totalSharesB =
          (Array.isArray(b.sharesData)
            ? b.sharesData.reduce((sum, sd) => sum + (Number(sd.totalShares) || 0), 0)
            : 0) ||
          (Array.isArray(b.totalShares)
            ? (b.totalShares as ShareDataItem[]).reduce((sum, sd) => sum + (Number(sd.totalShares) || 0), 0)
            : typeof b.totalShares === "number"
            ? b.totalShares
            : 0);

        if (totalSharesA !== totalSharesB) return totalSharesB - totalSharesA;

        // Final tie-breaker: alphabetical by name
        return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
      });

      return { root, shareholders, onlyRepresentatives };
    };

    const baseNodeStyle = {
      background: "transparent",
      border: "none",
      padding: 0,
      borderRadius: 0,
      width: NODE_WIDTH,
      boxShadow: "none",
    } as const;

    // Helper function to create label content for a node
    const createLabelContent = (node: HierarchyTreeNode, isRoot: boolean = false) => {
      // Build roles array
      let displayRoles = node.roles && Array.isArray(node.roles) && node.roles.length > 0
        ? [...node.roles]
        : [];
      
      // Add "Shareholder" role if node has shares but not explicitly in roles
      // BUT NOT for the root/parent company
      if (!isRoot) {
        const hasSharesFromData = node.sharesData && Array.isArray(node.sharesData) &&
          node.sharesData.some((sd: ShareDataItem) => Number(sd.totalShares) > 0);
        const hasSharesFromTotalSharesArray = Array.isArray(node.totalShares) &&
          node.totalShares.some((sd: ShareDataItem) => Number(sd.totalShares) > 0);
        const isShareholder = (node.sharePercentage !== undefined && node.sharePercentage > 0) || 
                             (node.percentage !== undefined && node.percentage > 0) ||
                             (typeof node.totalShares === 'number' && node.totalShares > 0) ||
                             hasSharesFromData ||
                             hasSharesFromTotalSharesArray;
        
        if (isShareholder && !displayRoles.some(role => role.toLowerCase() === 'shareholder')) {
          displayRoles.unshift('Shareholder'); // Add at beginning
        }
      }
      
      // If no roles, set to undefined to hide the roles section
      const finalRoles = displayRoles.length === 0 ? undefined : displayRoles;
      
      // Use larger dimensions for parent company
      const nodeWidth = isRoot ? PARENT_NODE_WIDTH : NODE_WIDTH;
      const nameFontSize = isRoot ? 50 : 16; // Larger font for parent
      const paddingSize = isRoot ? "5px" : "6px"; // More padding for parent
      const addressFontSize = isRoot ? 30 : 11;
      const companyFontSize = isRoot ? 30 : 16;

      return (
        <div
          style={{
            width: nodeWidth,
            fontFamily: "Inter, system-ui, sans-serif",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid black",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Top Section - Light Gray Background */}
          <div
            style={{
              backgroundColor: "#f3f4f6",
              padding: paddingSize,
              color: "#111827",
             }}
          >
            {/* Name */}
            <div
              style={{
                fontWeight: 500,
                fontSize: nameFontSize,
                marginBottom: 5,
                textTransform: "uppercase",
                color: "#1f2937",
              }}
            >
              {node.name}
            </div>
            
            {/* Address */}
            {node.address && (
              <div
                style={{
                  fontSize: addressFontSize,
                  color: "black",
                  marginBottom: 6,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ fontWeight: 600 }}>Address: </span> {node.address}
              </div>
            )}
            
            {/* Nationality (for persons and companies if available) */}
            {node.nationality && (
              <div
                style={{
                  fontSize: isRoot ? 13 : 11,
                  color: "black",
                  marginTop: 4,
                }}
              >
                <span style={{ fontWeight: 600 }}>Nationality: </span> {node.nationality}
              </div>
            )}
          </div>

          {/* Middle Section - Dark Gray Background for Roles */}
          {finalRoles && Array.isArray(finalRoles) && finalRoles.length > 0 && (
            <div
              style={{
                backgroundColor: "black",
                padding: isRoot ? "12px 16px" : "10px 12px",
                color: "white",
              }}
            >
              <div
                style={{
                  fontSize: isRoot ? 13 : 11,
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {finalRoles.join(" / ")}
              </div>
            </div>
          )}

          {/* Bottom Section - Light Gray Background */}
          <div
            style={{
              backgroundColor: "#f3f4f6",
              padding: paddingSize,
              color: "#111827",
            }}
          >
            {/* Percentage and Shares */}
            {((node.sharePercentage !== undefined && node.sharePercentage > 0) || 
              (node.percentage !== undefined && node.percentage > 0)) && (
              <div
                style={{
                  fontSize: isRoot ? 28 : 24,
                  fontWeight: 700,
                  color: "#1f2937",
                  marginBottom: 6,
                }}
              >
                {((node.sharePercentage ?? node.percentage) || 0).toFixed(2)}%
              </div>
            )}
            
            {/* Display shares by class */}
            {(() => {
              // Check if totalShares is an array (parent company case) or if sharesData exists (shareholder case)
              const parentCompanyShares = Array.isArray(node.totalShares) ? node.totalShares.filter((sd: ShareDataItem) => Number(sd.totalShares) > 0) : [];
              const shareholderShares = node.sharesData && Array.isArray(node.sharesData) && node.sharesData.length > 0 ? node.sharesData : [];
              const sharesToDisplay = parentCompanyShares.length > 0 ? parentCompanyShares : shareholderShares;

              if (sharesToDisplay.length > 0) {
                // Group shares by class
                const sharesByClass: Record<string, number> = {};
                sharesToDisplay.forEach((sd: ShareDataItem) => {
                  const shareClass = sd.class || "Ordinary";
                  sharesByClass[shareClass] = (sharesByClass[shareClass] || 0) + (Number(sd.totalShares) || 0);
                });

                // Separate Ordinary from other classes
                const ordinaryShares = sharesByClass["Ordinary"] || 0;
                const classShares = Object.entries(sharesByClass)
                  .filter(([cls]) => cls !== "Ordinary")
                  .sort(([a], [b]) => a.localeCompare(b));

                return (
                  <div style={{ 
                    marginBottom: 4,
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    placeItems: "center",
                    placeContent: "center",
                    gap: isRoot ? "12px" : "8px",
                  }}>
                    {ordinaryShares > 0 && (
                      <div
                        style={{
                          fontSize: isRoot ? 30 : 11,
                          color: "black",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Ordinary: </span>
                        {ordinaryShares.toLocaleString()}
                      </div>
                    )}
                    {classShares.map(([shareClass, totalShares]) => (
                      <div
                        key={shareClass}
                        style={{
                          fontSize: isRoot ? 30 : 11,
                          color: "black",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Class {shareClass}: </span>
                        {totalShares.toLocaleString()}
                      </div>
                    ))}
                  </div>
                );
              } else if (typeof node.totalShares === 'number' && node.totalShares > 0) {
                // Fallback to number totalShares if neither array nor sharesData is available
                return (
                  <div
                    style={{
                      fontSize: isRoot ? 30 : 11,
                      color: "black",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Shares: </span> {node.totalShares.toLocaleString()}
                    {node.class && ` (${node.class})`}
                  </div>
                );
              }
              return null;
            })()}

            {/* Person/Company Indicator */}
            <div
              style={{
                marginTop: 8,
                fontSize: isRoot ? 13 : 11,
                color: "black",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: isRoot ? 10 : 8,
                  height: isRoot ? 10 : 8,
                  borderRadius: "50%",
                  background: node.type === "company" ? "#3b82f6" : "#10b981",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 500 }}>
                {node.type === "company" ? "Company" : "Person"}
              </span>
            </div>
          </div>
        </div>
      );
    };


    // Helper to create a simple group header box
    const createGroupHeader = (title: string, width: number = NODE_WIDTH) => {
      return (
        <div
          style={{
            width: width,
            fontFamily: "Inter, system-ui, sans-serif",
            borderRadius: 8,
            overflow: "hidden",
            border: "2px solid #111827",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            backgroundColor: "#f9fafb",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: "#111827",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {title}
          </div>
        </div>
      );
    };

    // Build two-row layout with grouping headers: Row 1 (Shareholders), Row 2 (Only Representatives)
    const buildTwoRowLayout = (
      root: HierarchyTreeNode,
      shareholders: HierarchyTreeNode[],
      onlyRepresentatives: HierarchyTreeNode[]
    ) => {
      const rootId = String(root.id);
      
      // Calculate total width needed (based on the widest row)
      const maxNodesInRow = Math.max(shareholders.length, onlyRepresentatives.length);
      const totalWidth = (maxNodesInRow * NODE_WIDTH) + ((maxNodesInRow - 1) * NODE_GAP) + 200; // +200 for padding

      // Position parent at top center
      const parentX = (totalWidth - PARENT_NODE_WIDTH) / 2;
      const labelContent = createLabelContent(root, true); // true = isRoot
      
      nodeMap.set(rootId, {
        id: rootId,
        data: { label: labelContent },
        position: { x: parentX, y: 0 },
        draggable: false,
        selectable: false,
        style: { ...baseNodeStyle, width: PARENT_NODE_WIDTH },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });


      // HEADER 1: "Shareholders" grouping header
      const shareholdersHeaderId = "shareholders-header";
      const shareholdersHeaderY = LEVEL_GAP_Y;
      const shareholdersHeaderX = (totalWidth - HEADER_WIDTH) / 2;
      
      if (shareholders.length > 0) {
        nodeMap.set(shareholdersHeaderId, {
          id: shareholdersHeaderId,
          data: { label: createGroupHeader("Shareholders/representatives", HEADER_WIDTH) },
          position: { x: shareholdersHeaderX, y: shareholdersHeaderY },
          draggable: false,
          selectable: false,
          style: { ...baseNodeStyle, width: HEADER_WIDTH },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        // Connect header to parent (centered)
        generatedEdges.push({
          id: `${rootId}-${shareholdersHeaderId}`,
          source: rootId,
          target: shareholdersHeaderId,
          type: "smoothstep",
          style: { stroke: "#111827", strokeWidth: 1.2 },
          sourceHandle: null,
          targetHandle: null,
        });

      }

      // ROW 1: Position individual shareholders horizontally at Level 2 (max 3 per row)
      const shareholdersStartY = LEVEL_GAP_Y * 2;
      let maxShareholdersY = shareholdersStartY;
      
      shareholders.forEach((shareholder, index) => {
        const nodeId = String(shareholder.id);
        const label = createLabelContent(shareholder);
        
        // Calculate row and column position
        const rowIndex = Math.floor(index / NODES_PER_ROW);
        const colIndex = index % NODES_PER_ROW;
        const nodesInThisRow = Math.min(NODES_PER_ROW, shareholders.length - rowIndex * NODES_PER_ROW);
        
        // Calculate X position (centered for each row)
        const rowWidth = (nodesInThisRow * NODE_WIDTH) + ((nodesInThisRow - 1) * NODE_GAP);
        const rowStartX = (totalWidth - rowWidth) / 2;
        const xPos = rowStartX + (colIndex * (NODE_WIDTH + NODE_GAP));
        
        // Calculate Y position
        const yPos = shareholdersStartY + (rowIndex * (LEVEL_GAP_Y * 1));
        maxShareholdersY = Math.max(maxShareholdersY, yPos);
        
        nodeMap.set(nodeId, {
          id: nodeId,
          data: { label },
          position: { x: xPos, y: yPos },
          draggable: false,
          selectable: false,
          style: baseNodeStyle,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        // Connect to shareholders header (centered)
        generatedEdges.push({
          id: `${shareholdersHeaderId}-${nodeId}`,
          source: shareholdersHeaderId,
          target: nodeId,
          type: "smoothstep",
          style: { stroke: "#111827", strokeWidth: 1.2 },
          sourceHandle: null,
          targetHandle: null,
        });

      });

      // HEADER 2: "Representatives" grouping header
      const representativesHeaderId = "representatives-header";
      // If no shareholders, move this up to where the shareholders header would have been
      const representativesHeaderY = shareholders.length > 0 
        ? maxShareholdersY + LEVEL_GAP_Y 
        : LEVEL_GAP_Y;

      const representativesHeaderX = (totalWidth - HEADER_WIDTH) / 2;
      
      if (onlyRepresentatives.length > 0) {
        nodeMap.set(representativesHeaderId, {
          id: representativesHeaderId,
          data: { label: createGroupHeader("Representatives", HEADER_WIDTH) },
          position: { x: representativesHeaderX, y: representativesHeaderY },
          draggable: false,
          selectable: false,
          style: { ...baseNodeStyle, width: HEADER_WIDTH },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        // Connect header to shareholders header OR parent if no shareholders
        const sourceId = shareholders.length > 0 ? shareholdersHeaderId : rootId;

        generatedEdges.push({
          id: `${sourceId}-${representativesHeaderId}`,
          source: sourceId,
          target: representativesHeaderId,
          type: "smoothstep",
          style: { stroke: "#111827", strokeWidth: 1.2 },
          sourceHandle: null,
          targetHandle: null,
        });

      }

      // ROW 2: Position only-representatives horizontally (max 3 per row)
      const representativesStartY = representativesHeaderY + LEVEL_GAP_Y;
      let maxRepresentativesY = representativesStartY;
      
      onlyRepresentatives.forEach((rep, index) => {
        const nodeId = String(rep.id);
        const label = createLabelContent(rep);
        
        // Calculate row and column position
        const rowIndex = Math.floor(index / NODES_PER_ROW);
        const colIndex = index % NODES_PER_ROW;
        const nodesInThisRow = Math.min(NODES_PER_ROW, onlyRepresentatives.length - rowIndex * NODES_PER_ROW);
        
        // Calculate X position (centered for each row)
        const rowWidth = (nodesInThisRow * NODE_WIDTH) + ((nodesInThisRow - 1) * NODE_GAP);
        const rowStartX = (totalWidth - rowWidth) / 2;
        const xPos = rowStartX + (colIndex * (NODE_WIDTH + NODE_GAP));
        
        // Calculate Y position
        const yPos = representativesStartY + (rowIndex * (LEVEL_GAP_Y * 0.9));
        maxRepresentativesY = Math.max(maxRepresentativesY, yPos);
        
        nodeMap.set(nodeId, {
          id: nodeId,
          data: { label },
          position: { x: xPos, y: yPos },
          draggable: false,
          selectable: false,
          style: baseNodeStyle,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        // Connect to representatives header (centered)
        generatedEdges.push({
          id: `${representativesHeaderId}-${nodeId}`,
          source: representativesHeaderId,
          target: nodeId,
          type: "smoothstep",
          style: { stroke: "#111827", strokeWidth: 1.2 },
          sourceHandle: null,
          targetHandle: null,
        });

      });

      return {
        maxX: totalWidth,
        maxY: (onlyRepresentatives.length > 0 ? maxRepresentativesY : maxShareholdersY) + 300, // Add 300 to account for node height
      };
    };

    // Apply hierarchy restructuring: Parent -> Row 1 (Shareholders) -> Row 2 (Only Representatives)
    const { root: restructuredRoot, shareholders, onlyRepresentatives } = restructureHierarchy(rootData);
    const { maxX, maxY } = buildTwoRowLayout(restructuredRoot, shareholders, onlyRepresentatives);

    const generatedNodes = Array.from(nodeMap.values());

    return {
      initialNodes: generatedNodes,
      initialEdges: generatedEdges,
      bounds: { width: maxX + 400, height: maxY + 400 },
    };
  }, [rootData]);

  useEffect(() => {
    if (isStillLoading) return;
    if (rootData === null) return;

    setNodes(initialNodes);
    setEdges(initialEdges);

    setTimeout(() => {
      reactFlowRef.current?.fitView({ padding: 0.2 });
      setScrollZoomEnabled(false);
    }, 80);
  }, [initialNodes, initialEdges, rootData, isStillLoading]);

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) => addEdge({ 
        ...params, 
        type: "smoothstep", 
        style: { stroke: "#111827", strokeWidth: 1.2 },
        sourceHandle: null,
        targetHandle: null
      }, eds)),
    [setEdges]
  );

  const handleWrapperFocus = useCallback(() => setScrollZoomEnabled(true), []);
  const handleWrapperBlur = useCallback(() => setScrollZoomEnabled(false), []);

  // FIX #2 — High‑quality full‑canvas PDF export
  const exportToPDF = useCallback(async () => {
    const wrap = flowWrapperRef.current;
    const rfInstance = reactFlowRef.current;
    if (!wrap || !rfInstance) return;
  
    const viewport = wrap.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewport) return;
  
    // Save original state
    const originalTransform = viewport.style.transform;
    const originalWidth = wrap.style.width;
    const originalHeight = wrap.style.height;
    const originalOverflow = wrap.style.overflow;
    const originalViewport = rfInstance.getViewport();
  
    try {
      // Get all nodes and calculate actual bounds with proper padding
      const allNodes = rfInstance.getNodes();
      if (allNodes.length === 0) return;
      
      // Calculate bounds including node dimensions
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      
      allNodes.forEach((node) => {
        const pos = node.position;
        // Determine node width based on whether it's the root/parent company
        const isRootNode = node.id === String(rootData?.id);
        const width = node.width || (isRootNode ? PARENT_NODE_WIDTH : NODE_WIDTH);
        const height = node.height || 250; // Estimated node height
        
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + width);
        maxY = Math.max(maxY, pos.y + height);
      });
      
      // Add extra padding to ensure edges and all content are captured
      // More padding on right side to prevent cut-off
      const paddingLeft = 150;
      const paddingRight = 250; // Extra padding on right to prevent edge cutoff
      const paddingTop = 100;
      const paddingBottom = 120;
      
      const diagramWidth = maxX - minX + paddingLeft + paddingRight;
      const diagramHeight = maxY - minY + paddingTop + paddingBottom;
      
      // Set wrapper to exact diagram size
      wrap.style.width = `${diagramWidth}px`;
      wrap.style.height = `${diagramHeight}px`;
      wrap.style.overflow = "visible";
      
      // Reset viewport to show entire diagram from top-left with no zoom
      viewport.style.transform = `translate(${paddingLeft - minX}px, ${paddingTop - minY}px) scale(1)`;
      
      // Wait for layout to stabilize
      await new Promise((r) => setTimeout(r, 500));
      
      // Capture with high quality - ensure entire diagram is captured
      const canvas = await html2canvas(wrap, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        width: diagramWidth,
        height: diagramHeight,
        windowWidth: diagramWidth,
        windowHeight: diagramHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });
      
      const img = canvas.toDataURL("image/png", 1.0);
      
      // Determine optimal orientation
      const isLandscape = diagramWidth > diagramHeight;
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "pt",
        format: "a4",
      });
      
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      
      // Calculate scaling to fit width with margins
      const margin = 20;
      const imgW = pageW - (margin * 2);
      const imgH = (canvas.height * imgW) / canvas.width;
      
  // Add image across multiple pages if needed
  // Add image across multiple pages if needed
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(
          img, 
          "PNG", 
          margin, 
          margin - y, 
          imgW, 
          imgH, 
          undefined, 
          "FAST"
        );
        y += pageH - (margin * 2);
      }

      pdf.save(`${rootData?.name}-hierarchy.pdf`);

      
    } finally {
      // Always restore original state
      wrap.style.width = originalWidth;
      wrap.style.height = originalHeight;
      wrap.style.overflow = originalOverflow;
      viewport.style.transform = originalTransform;
      rfInstance.setViewport(originalViewport, { duration: 0 });
    }
  }, [rootData]);
  

  // AUTO-FIT WIDTH FIX — keeps full tree visible top‑to‑bottom on screen
  // After layout is built, we force ReactFlow to fit the entire diagram vertically
  useEffect(() => {
    if (!reactFlowRef.current || !rootData) return;
    // Fit diagram so top-to-bottom is fully visible on load
    reactFlowRef.current.fitView({ padding: 0.1, minZoom: 0.1, maxZoom: 1 });
  }, [bounds, rootData]);

  // ---- Render ----
  if (isStillLoading) {
    return (
      <div className="flex h-48 items-center justify-center border border-dashed rounded-md">
        <EnhancedLoader size="lg" />
      </div>
    );
  }

  if (rootData === null) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-500">
        <EnhancedLoader size="lg" />
      </div>
    );
  }

  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    height: Math.max(bounds.height, 700), // Increased min-height
    overflow: "hidden",
    position: "relative",
    border: "1px solid #e5e7eb",
    borderRadius: "0.75rem",
  };

return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button onClick={exportToPDF}>Download PDF</Button>
        <div className="text-sm text-gray-600">Click inside diagram to zoom.</div>
      </div>

      <div
        ref={flowWrapperRef}
        tabIndex={0}
        onFocus={handleWrapperFocus}
        onBlur={handleWrapperBlur}
        style={wrapperStyle}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          maxZoom={2}
          zoomOnScroll={scrollZoomEnabled}
          panOnDrag={true}
          onInit={(instance) => (reactFlowRef.current = instance)}
          defaultEdgeOptions={{ 
            style: { stroke: "#111827", strokeWidth: 1.2 }, 
            type: "smoothstep"
          }}
        >
          <MiniMap 
            nodeStrokeColor={() => "#111827"} 
            nodeColor={() => "#fff"} 
            pannable 
            zoomable 
          />
          <Controls showInteractive={false} />
          <Background gap={16} color="#f3f4f6" />
        </ReactFlow>
      </div>
    </div>
  );
};

export default CompanyHierarchy;
