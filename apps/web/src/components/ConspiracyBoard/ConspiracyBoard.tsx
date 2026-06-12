"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { ConspiracyBoardProps, ConspiracyNode } from "@nightcrawler/contracts";
import { NODE_KIND_COLORS, NODE_KIND_LABELS } from "./nodeStyles";

type ConspiracyNodeData = ConspiracyNode & { selected?: boolean };

function ConspiracyNodeCard({ data }: NodeProps<ConspiracyNodeData>) {
  const color = NODE_KIND_COLORS[data.kind];
  return (
    <div
      style={{
        background: "#12121a",
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: "10px 12px",
        minWidth: 200,
        maxWidth: 240,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          color,
          marginBottom: 4,
        }}
      >
        {NODE_KIND_LABELS[data.kind]}
        {data.confidence != null && (
          <span style={{ float: "right", color: "#8888a0" }}>
            {(data.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{data.label}</div>
      <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.4 }}>{data.detail}</div>
      {data.sourceUrl && (
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 10, display: "block", marginTop: 6 }}
        >
          source →
        </a>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

const nodeTypes = { conspiracy: ConspiracyNodeCard };

function layoutNodes(nodes: ConspiracyNode[]): Node<ConspiracyNodeData>[] {
  const cols = 3;
  return nodes.map((n, i) => ({
    id: n.id,
    type: "conspiracy",
    position: { x: (i % cols) * 280, y: Math.floor(i / cols) * 180 },
    data: n,
  }));
}

function layoutEdges(edges: ConspiracyBoardProps["edges"]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    style: { stroke: "#5a5a7a" },
    labelStyle: { fill: "#aaa", fontSize: 10 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#5a5a7a" },
  }));
}

export function ConspiracyBoard({
  title,
  thesis,
  confidence,
  nodes,
  edges,
}: ConspiracyBoardProps) {
  const flowNodes = useMemo(() => layoutNodes(nodes), [nodes]);
  const flowEdges = useMemo(() => layoutEdges(edges), [edges]);

  const onInit = useCallback(() => {}, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #2a2a3a",
          background: "#0e0e16",
        }}
      >
        <div style={{ fontSize: 11, color: "#7c5cff", letterSpacing: "0.1em" }}>{title}</div>
        <div style={{ fontSize: 13, marginTop: 4, color: "#ccc", lineHeight: 1.5 }}>{thesis}</div>
        {confidence > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
            Aggregate confidence:{" "}
            <span style={{ color: "#3dd68c" }}>{(confidence * 100).toFixed(0)}%</span>
          </div>
        )}
      </header>
      <div style={{ flex: 1, minHeight: 400 }}>
        {nodes.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#555",
              fontSize: 13,
            }}
          >
            Awaiting intelligence nodes…
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onInit={onInit}
            fitView
            proOptions={{ hideAttribution: true }}
            style={{ background: "#0a0a0f" }}
          >
            <Background color="#1a1a28" gap={20} />
            <Controls style={{ background: "#12121a", border: "1px solid #2a2a3a" }} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
