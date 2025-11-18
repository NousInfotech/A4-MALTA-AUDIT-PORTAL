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

const LEVEL_GAP_Y = 280;
const NODE_WIDTH = 320;
const HORIZONTAL_SPACING = NODE_WIDTH + 80;

interface HierarchyTreeNode {
  id: string;
  type?: string;
  name: string;
  percentage?: number;
  class?: string;
  address?: string;
  nationality?: string;
  totalShares?: number;
  roles?: string[];
  children?: HierarchyTreeNode[];
  shareholders?: HierarchyTreeNode[];
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
    let leafIndex = 0;

    const baseNodeStyle = {
      background: "transparent",
      border: "none",
      padding: 0,
      borderRadius: 0,
      width: NODE_WIDTH,
      boxShadow: "none",
    } as const;

    const build = (node: HierarchyTreeNode, parentId: string | null, level: number): { left: number; right: number } => {
      const nodeId = String(node.id);
      const descendants = node.children ?? node.shareholders ?? [];
      const isLeaf = descendants.length === 0;

      // Debug: Log roles for companies and nationality for persons
      if (node.type === "company" && node.roles) {
        console.log("Company node with roles:", node.name, node.roles);
      }
      if (node.type === "person") {
        console.log("Person node:", node.name, "Nationality:", node.nationality);
      }

      // Ensure companies with shares show "Shareholder" role if not already set
      const displayRoles = node.roles && Array.isArray(node.roles) && node.roles.length > 0
        ? node.roles
        : (node.type === "company" && node.percentage !== undefined && node.percentage > 0
          ? ["Shareholder"]
          : node.roles);

      const labelContent = (
        <div
          style={{
            width: NODE_WIDTH,
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
              padding: "12px",
              color: "#111827",
            }}
          >
            {/* Name */}
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
                marginBottom: 8,
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
                  fontSize: 11,
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
                  fontSize: 11,
                  color: "black",
                  marginTop: 4,
                }}
              >
                <span style={{ fontWeight: 600 }}>Nationality: </span> {node.nationality}
              </div>
            )}
          </div>

          {/* Middle Section - Dark Gray Background for Roles */}
          {displayRoles && Array.isArray(displayRoles) && displayRoles.length > 0 && (
            <div
              style={{
                backgroundColor: "black",
                padding: "10px 12px",
                color: "white",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {displayRoles.join(" / ")}
              </div>
            </div>
          )}

          {/* Bottom Section - Light Gray Background */}
          <div
            style={{
              backgroundColor: "#f3f4f6",
              padding: "12px",
              color: "#111827",
            }}
          >
            {/* Percentage and Shares */}
            {node.percentage !== undefined && (
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#1f2937",
                  marginBottom: 6,
                }}
              >
                {node.percentage.toFixed(0)}%
              </div>
            )}
            
            {node.totalShares !== undefined && (
              <div
                style={{
                  fontSize: 11,
                  color: "black",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontWeight: 600 }}>Shares: </span> {node.totalShares.toLocaleString()}
                {node.class && ` (${node.class})`}
              </div>
            )}

            {/* Person/Company Indicator */}
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "black",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
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

      if (isLeaf) {
        const x = leafIndex * HORIZONTAL_SPACING;
        leafIndex++;

        nodeMap.set(nodeId, {
          id: nodeId,
          data: { label: labelContent },
          position: { x, y: level * LEVEL_GAP_Y },
          draggable: false,
          selectable: false,
          style: baseNodeStyle,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        if (parentId) {
          generatedEdges.push({ id: `${parentId}-${nodeId}`, source: parentId, target: nodeId, type: "smoothstep", style: { stroke: "#111827", strokeWidth: 1.2 } });
        }

        return { left: x, right: x + NODE_WIDTH };
      }

      let left = Infinity;
      let right = -Infinity;
      descendants.forEach((child) => {
        const childRange = build(child, nodeId, level + 1);
        left = Math.min(left, childRange.left);
        right = Math.max(right, childRange.right);
      });

      const centerX = (left + right - NODE_WIDTH) / 2;

      nodeMap.set(nodeId, {
        id: nodeId,
        data: { label: labelContent },
        position: { x: centerX, y: level * LEVEL_GAP_Y },
        draggable: false,
        selectable: false,
        style: baseNodeStyle,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      if (parentId) {
        generatedEdges.push({ id: `${parentId}-${nodeId}`, source: parentId, target: nodeId, type: "smoothstep", style: { stroke: "#111827", strokeWidth: 1.2 } });
      }

      return { left, right };
    };

    build(rootData, null, 0);

    const generatedNodes = Array.from(nodeMap.values());
    const maxX = Math.max(...generatedNodes.map((n) => n.position.x + NODE_WIDTH));
    const maxY = Math.max(...generatedNodes.map((n) => n.position.y)) + LEVEL_GAP_Y;

    return { initialNodes: generatedNodes, initialEdges: generatedEdges, bounds: { width: maxX + 200, height: maxY + 200 } };
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
      setEdges((eds) => addEdge({ ...params, type: "smoothstep", style: { stroke: "#111827", strokeWidth: 1.2 } }, eds)),
    [setEdges]
  );

  const handleWrapperFocus = useCallback(() => setScrollZoomEnabled(true), []);
  const handleWrapperBlur = useCallback(() => setScrollZoomEnabled(false), []);

  // FIX #2 — High‑quality full‑canvas PDF export
  const exportToPDF = useCallback(async () => {
    const wrap = flowWrapperRef.current;
    if (!wrap) return;

    const viewport = wrap.querySelector<HTMLElement>(".react-flow__viewport");
    const originalTransform = viewport?.style.transform ?? "";

    if (viewport) viewport.style.transform = "translate(0px,0px) scale(1)";

    await new Promise((res) => setTimeout(res, 100));

    const canvas = await html2canvas(wrap, {
      scale: 3, // HIGH DPI
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const img = canvas.toDataURL("image/png", 1.0);

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let y = 0;
    while (y < imgH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(img, "PNG", 0, -y, imgW, imgH, undefined, "FAST");
      y += pageH;
    }

    pdf.save("hierarchy.pdf");

    if (viewport) viewport.style.transform = originalTransform;
  }, []);

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
        <EnhancedLoader size="lg" text="Loading hierarchy..." />
      </div>
    );
  }

  if (rootData === null) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-500">
        <EnhancedLoader size="lg" text="No hierarchy data available." />
      </div>
    );
  }

  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    height: Math.max(bounds.height, 600),
    overflow: "visible",
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
          defaultEdgeOptions={{ style: { stroke: "#111827", strokeWidth: 1.2 }, type: "smoothstep" }}
        >
          <MiniMap nodeStrokeColor={() => "#111827"} nodeColor={() => "#fff"} />
          <Controls showInteractive={false} />
          <Background gap={16} color="#f3f4f6" />
        </ReactFlow>
      </div>
    </div>
  );
};

export default CompanyHierarchy;
