"use client";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  OfficeRelationship,
  CapabilitySupport,
} from "@/features/portfolio/capabilities/public";
import type { GovernmentTarget } from "./target-contracts";
import styles from "./office-depth.module.css";

type OfficeNode = Node<
  { name: string; detail: string; supportCount: number; onOpen: () => void },
  "office"
>;
function OfficeNodeCard({ data }: NodeProps<OfficeNode>) {
  return (
    <button className={`nodrag nopan ${styles.node}`} onClick={data.onOpen}>
      <Handle type="target" position={Position.Top} />
      <strong>{data.name}</strong>
      <small>{data.detail}</small>
      <small>{data.supportCount} capability links</small>
      <Handle type="source" position={Position.Bottom} />
    </button>
  );
}
const nodeTypes = { office: OfficeNodeCard };
export function OfficeRelationshipMap({
  relationships,
  targets,
  supports,
  onOpen,
}: {
  relationships: OfficeRelationship[];
  targets: GovernmentTarget[];
  supports: CapabilitySupport[];
  onOpen: (memberId: string) => void;
}) {
  const nodes = useMemo(() => {
    const result: OfficeNode[] = [
      {
        id: "client",
        type: "office",
        position: { x: 260, y: 0 },
        data: {
          name: "Client relationships",
          detail: "Parent office links",
          supportCount: supports.length,
          onOpen: () =>
            document.getElementById("office-relationship-list")?.focus(),
        },
      },
    ];
    const groups = ["senate", "house", "state", "staff", "other"];
    const positions = new Map<string, number>();
    relationships.forEach((relationship) => {
      const target = targets.find((target) => target.id === relationship.id);
      const group =
        relationship.sourceDirectory === "state"
          ? "state"
          : relationship.sourceDirectory === "staff"
            ? "staff"
            : target?.chamber?.toLowerCase().includes("senate")
              ? "senate"
              : target?.chamber?.toLowerCase().includes("house")
                ? "house"
                : "other";
      const row = positions.get(group) ?? 0;
      positions.set(group, row + 1);
      result.push({
        id: relationship.id,
        type: "office",
        position: { x: groups.indexOf(group) * 260, y: 180 + row * 170 },
        data: {
          name: target?.memberName ?? "Saved office",
          detail: [
            target?.state,
            target?.chamber,
            relationship.relationshipStatus.replaceAll("_", " "),
          ]
            .filter(Boolean)
            .join(" · "),
          supportCount: supports.filter(
            (support) => support.targetId === relationship.id,
          ).length,
          onOpen: () => onOpen(relationship.id),
        },
      });
    });
    return result;
  }, [relationships, targets, supports, onOpen]);
  return (
    <div
      className={styles.chart}
      aria-label="Client and office relationship map"
    >
      <ReactFlow
        nodes={nodes}
        edges={relationships.map((relationship) => ({
          id: relationship.id,
          source: "client",
          target: relationship.id,
          type: "smoothstep",
          ariaLabel: "Saved client to office relationship",
        }))}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
      >
        <Controls showInteractive={false} />
        <Background />
      </ReactFlow>
    </div>
  );
}
