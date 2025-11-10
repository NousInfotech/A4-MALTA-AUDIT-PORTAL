"use client";

import { useEffect, useMemo, useCallback } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "../ui/button";

// GAP settings for TOP -> BOTTOM
const levelGapY = 250; // vertical gap between levels
const levelGapX = 380; // horizontal spacing
const nodeWidth = 300;

interface HierarchyTreeNode {
  id: string;
  type?: string;
  name: string;
  percentage?: number;
  class?: string;
  address?: string;
  totalShares?: number;
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
  const [nodes, setNodes, onNodesChange] =
    useNodesState<HierarchyNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

  /* ------------------------
        ✅ Export to PDF
  -------------------------*/
  const exportToPDF = async () => {
    const el = document.getElementById("hierarchy-wrapper");
    if (!el) return;

    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let y = 0;
    while (y < imgH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -y, imgW, imgH);
      y += pageH;
    }

    pdf.save("hierarchy.pdf");
  };

  /* ------------------------
      ✅ Generate Nodes
  -------------------------*/
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!rootData) return { initialNodes: [], initialEdges: [] };

    const generatedEdges: Edge[] = [];
    const nodeMap = new Map<string, Node<HierarchyNodeData>>();
    let leafIndex = 0;

    const buildNodesAndEdges = (
      node: HierarchyTreeNode,
      parentId: string | null,
      level: number
    ): { top: number; bottom: number } => {
      const nodeId = String(node.id);
      const isCompany = node.type === "company";
      const descendants = node.children ?? node.shareholders ?? [];

      const baseNodeStyle = {
        background:
          "linear-gradient(135deg, #6366f1 0%, #22d3ee 50%, #10b981 100%)",
        padding: 2,
        borderRadius: 16,
        width: nodeWidth,
        height: "auto", // ✅ AUTO HEIGHT
        boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
      } as const;

      const labelContent = (
        <div className="relative animate-fadeIn group rounded-[14px] bg-white p-3 h-auto">
          <div className="pointer-events-none absolute inset-x-0 -top-[2px] h-1 rounded-t-[14px] bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400" />

          <div className="space-y-1">
            <div className="flex flex-col items-center gap-2">
              <strong className="block text-sm capitalize leading-tight">
                {node.name}
              </strong>

              {(node.percentage !== undefined || node.class) && (
                <div className="flex items-center gap-1">
                  {node.percentage !== undefined && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[15px] font-bold">
                      {node.percentage}%
                    </span>
                  )}
                  {node.class && (
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {node.class}
                    </span>
                  )}
                </div>
              )}
            </div>

            {node.address && <div className="text-black">{node.address}</div>}

            {node.totalShares !== undefined && (
              <div className="font-bold text-lg">
                Total: {node.totalShares?.toLocaleString?.()}
              </div>
            )}

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <div className="flex items-center gap-1 text-[10px] font-medium">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: isCompany ? "#4f46e5" : "#059669",
                }}
              />
              <span className="text-gray-600">
                {isCompany ? "Company" : "Person"}
              </span>
            </div>
          </div>
        </div>
      );

      /* ✅ LEAF NODE */
      if (!descendants.length) {
        const y = leafIndex * levelGapX;
        leafIndex += 1;

        nodeMap.set(nodeId, {
          id: nodeId,
          data: { label: labelContent },
          position: { x: y, y: level * levelGapY }, // ✅ TOP → BOTTOM
          draggable: false,
          selectable: false,
          style: baseNodeStyle,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        if (parentId) {
          generatedEdges.push({
            id: `${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            type: "smoothstep",
          });
        }
        return { top: y, bottom: y };
      }

      /* ✅ NON LEAF NODE */
      let top = Infinity;
      let bottom = -Infinity;

      descendants.forEach((child) => {
        const range = buildNodesAndEdges(child, nodeId, level + 1);
        top = Math.min(top, range.top);
        bottom = Math.max(bottom, range.bottom);
      });

      const centerY =
        top === Infinity ? leafIndex * levelGapX : (top + bottom) / 2;

      nodeMap.set(nodeId, {
        id: nodeId,
        data: { label: labelContent },
        position: { x: centerY, y: level * levelGapY },
        draggable: false,
        selectable: false,
        style: baseNodeStyle,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      if (parentId) {
        generatedEdges.push({
          id: `${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          type: "smoothstep",
        });
      }

      return {
        top: top === Infinity ? centerY : top,
        bottom: bottom === -Infinity ? centerY : bottom,
      };
    };

    buildNodesAndEdges(rootData, null, 0);

    const generatedNodes = Array.from(nodeMap.values());
    return { initialNodes: generatedNodes, initialEdges: generatedEdges };
  }, [rootData]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, type: "smoothstep", animated: true }, eds)
      ),
    [setEdges]
  );

  if (!rootData) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-500">
        No hierarchy data available.
      </div>
    );
  }

  return (
    <div>
      {/* ✅ Download Button */}
      <Button
        onClick={exportToPDF}
        variant="default"
      >
        Download PDF
      </Button>

      <div id="hierarchy-wrapper" style={{ width: "100%", height: "800px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <MiniMap pannable zoomable style={{ background: "#f8fafc" }} />
          <Controls showInteractive={false} />
          <Background gap={16} color="#e5e7eb" />
        </ReactFlow>
      </div>
    </div>
  );
};

export default CompanyHierarchy;
