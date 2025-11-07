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

// --- Professional Style Enhancements ---
const levelGapX = 380;
const levelGapY = 250;
const nodeWidth = 300;
const nodeHeight = 150;

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
  const [nodes, setNodes, onNodesChange] = useNodesState<HierarchyNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

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
        // Gradient border with inner white card handled inside label
        background:
          "linear-gradient(135deg, #6366f1 0%, #22d3ee 50%, #10b981 100%)",
        padding: 2,
        borderRadius: 16,
        width: nodeWidth,
        minHeight: nodeHeight,
        boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      } as const;

      const labelContent = (
        <div className="relative animate-fadeIn group rounded-[14px] bg-white p-3">
          {/* top gradient bar */}
          <div className="pointer-events-none absolute inset-x-0 -top-[2px] h-1 rounded-t-[14px] bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400" />

          <div className="space-y-1 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:drop-shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <strong className="block text-sm capitalize leading-tight">{node.name}</strong>
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
            {node.address && (
              <div className="text-black">{node.address}</div>
            )}
               {node.totalShares !== undefined && (
              <div className="font-bold text-lg">
                Total: {node.totalShares?.toLocaleString?.() ?? node.totalShares}
              </div>
            )}

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <div className="flex items-center gap-1 text-[10px] font-medium">
              <span className="inline-block h-2 w-2 rounded-full" style={{
                background: isCompany ? "#4f46e5" : "#059669",
              }} />
              <span className="text-gray-600">{isCompany ? "Company" : "Person"}</span>
            </div>
          </div>
        </div>
      );

      if (!descendants.length) {
        const y = leafIndex * levelGapY;
        leafIndex += 1;

        nodeMap.set(nodeId, {
          id: nodeId,
          data: { label: labelContent },
          position: { x: level * levelGapX, y },
          draggable: false,
          selectable: false,
          style: baseNodeStyle,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });

        if (parentId) {
          generatedEdges.push({
            id: `${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            animated: false,
            type: "smoothstep",
          });
        }
        return { top: y, bottom: y };
      }

      let top = Infinity;
      let bottom = -Infinity;

      descendants.forEach((child) => {
        const range = buildNodesAndEdges(child, nodeId, level + 1);
        top = Math.min(top, range.top);
        bottom = Math.max(bottom, range.bottom);
      });

      const centerY = top === Infinity ? leafIndex * levelGapY : (top + bottom) / 2;

      nodeMap.set(nodeId, {
        id: nodeId,
        data: { label: labelContent },
        position: { x: level * levelGapX, y: centerY },
        draggable: false,
        selectable: false,
        style: baseNodeStyle,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      if (parentId) {
        generatedEdges.push({
          id: `${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          animated: false,
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

    const uniqueEdges = new Map<string, Edge>();
    generatedEdges.forEach((edge) => {
      const key = `${edge.source}-${edge.target}`;
      if (!uniqueEdges.has(key)) uniqueEdges.set(key, edge);
    });

    return {
      initialNodes: generatedNodes,
      initialEdges: Array.from(uniqueEdges.values()),
    };
  }, [rootData]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true, type: "smoothstep" }, eds)),
    [setEdges]
  );

  if (!rootData) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl border border-dashed border-gray-300 text-gray-500">
        No hierarchy data available.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "600px" }}>
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
  );
};

export default CompanyHierarchy;
