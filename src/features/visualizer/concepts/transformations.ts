import { formatApprox, formatNumber } from "@/math/functions/analysis";
import { makeScene, type Parameter } from "../types/scene";
import { registerConcepts, type ConceptDefinition } from "./registry";

const P = (
  name: string,
  value: number,
  min: number,
  max: number,
  step = 0.1,
  label?: string,
): Parameter => ({
  name,
  value,
  min,
  max,
  step,
  label,
});

const translationDemo: ConceptDefinition = {
  id: "translation",
  category: "transformations",
  title: "Translation",
  summary:
    "Sliding a shape across the screen without turning it or changing its size, just like sliding a toy car along a table!",
  toggles: [
    { key: "vectors", label: "Show translation vectors" },
    { key: "labels", label: "Show image vertices A', B', C'" },
  ],
  createScene: () =>
    makeScene({
      title: "Polygon Translation",
      conceptId: "translation",
      category: "transformations",
      viewport: { xmin: -6, xmax: 8, ymin: -5, ymax: 7 },
      parameters: [
        P("dx", 3, -6, 6, 0.5, "Horizontal shift dx"),
        P("dy", 2, -6, 6, 0.5, "Vertical shift dy"),
        P("t", 1, 0, 1, 0.05, "Transition progress t"),
      ],
      flags: { vectors: true, labels: true },
      objects: [
        {
          id: "orig",
          kind: "polygon",
          vertices: [
            [-2, -1],
            [1, -1],
            [-0.5, 2],
          ],
          vertexLabels: ["A", "B", "C"],
          draggable: true,
          palette: 0,
        },
        {
          id: "trans",
          kind: "transform",
          source: "orig",
          type: "translate",
          dx: "dx * t",
          dy: "dy * t",
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const dx = scope.dx ?? 3;
    const dy = scope.dy ?? 2;
    const t = scope.t ?? 1;
    const mag = Math.hypot(dx, dy);

    return [
      { label: "Translation Vector", value: `(${formatNumber(dx)}, ${formatNumber(dy)})` },
      { label: "Vector Magnitude", value: formatApprox(mag) },
      { label: "Animation Progress", value: `${Math.round(t * 100)}%` },
      {
        label: "Mapping Rule",
        value: `(x, y) ↦ (x + ${formatNumber(dx)}, y + ${formatNumber(dy)})`,
      },
    ];
  },
};

const reflectionDemo: ConceptDefinition = {
  id: "reflection",
  category: "transformations",
  title: "Reflection",
  summary:
    "Flipping a shape across a mirror line! Everything stays the exact same size, just flipped backwards like looking in a mirror.",
  toggles: [
    { key: "mirror", label: "Show mirror line" },
    { key: "connectors", label: "Show perpendicular connecting lines" },
  ],
  createScene: () =>
    makeScene({
      title: "Polygon Reflection",
      conceptId: "reflection",
      category: "transformations",
      viewport: { xmin: -7, xmax: 7, ymin: -6, ymax: 6 },
      parameters: [
        P("mirror", 0, -4, 4, 0.5, "Mirror line position c (x = c)"),
        P("t", 1, 0, 1, 0.05, "Transition progress t"),
      ],
      flags: { mirror: true, connectors: true },
      objects: [
        {
          id: "orig",
          kind: "polygon",
          vertices: [
            [1, 1],
            [4, 1],
            [2.5, 4],
          ],
          vertexLabels: ["A", "B", "C"],
          draggable: true,
          palette: 0,
        },
        {
          id: "trans",
          kind: "transform",
          source: "orig",
          type: "reflect",
          axis: "y",
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    return [
      { label: "Mirror Line", value: "y-axis (x = 0)" },
      { label: "Mapping Rule", value: "(x, y) ↦ (−x, y)" },
      {
        label: "Properties",
        value: "Isometry (preserves lengths and angles, reverses orientation)",
      },
    ];
  },
};

const rotationDemo: ConceptDefinition = {
  id: "rotation",
  category: "transformations",
  title: "Rotation",
  summary:
    "Spinning a shape around a fixed pivot point by a number of degrees, just like the turning hands on a clock!",
  toggles: [
    { key: "center", label: "Show center of rotation" },
    { key: "arcs", label: "Show rotation trajectory arcs" },
  ],
  createScene: () =>
    makeScene({
      title: "Polygon Rotation",
      conceptId: "rotation",
      category: "transformations",
      viewport: { xmin: -7, xmax: 7, ymin: -7, ymax: 7 },
      parameters: [
        P("cx", 0, -4, 4, 0.5, "Center x"),
        P("cy", 0, -4, 4, 0.5, "Center y"),
        P("angle", 90, -180, 180, 5, "Angle θ (degrees)"),
      ],
      flags: { center: true, arcs: true },
      objects: [
        {
          id: "orig",
          kind: "polygon",
          vertices: [
            [1, 1],
            [4, 1],
            [3, 3],
          ],
          vertexLabels: ["A", "B", "C"],
          draggable: true,
          palette: 0,
        },
        {
          id: "trans",
          kind: "transform",
          source: "orig",
          type: "rotate",
          cx: "cx",
          cy: "cy",
          angle: "angle",
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const angle = scope.angle ?? 90;
    const cx = scope.cx ?? 0;
    const cy = scope.cy ?? 0;

    return [
      { label: "Center of Rotation", value: `(${formatNumber(cx)}, ${formatNumber(cy)})` },
      {
        label: "Angle of Rotation",
        value: `${formatNumber(angle)}° (${angle >= 0 ? "anticlockwise" : "clockwise"})`,
      },
      {
        label: "Matrix representation",
        value: `[cos(${angle}°), -sin(${angle}°); sin(${angle}°), cos(${angle}°)]`,
      },
    ];
  },
};

const enlargementDemo: ConceptDefinition = {
  id: "enlargement",
  category: "transformations",
  title: "Enlargement / Dilation",
  summary:
    "Growing or shrinking a shape from a center point! The shape keeps its exact appearance, just zoomed in bigger or zoomed out smaller.",
  toggles: [{ key: "rays", label: "Show projection rays from center" }],
  createScene: () =>
    makeScene({
      title: "Polygon Enlargement",
      conceptId: "enlargement",
      category: "transformations",
      viewport: { xmin: -6, xmax: 10, ymin: -6, ymax: 10 },
      parameters: [
        P("cx", 0, -4, 4, 0.5, "Center x"),
        P("cy", 0, -4, 4, 0.5, "Center y"),
        P("k", 2, -3, 3, 0.1, "Scale factor k"),
      ],
      flags: { rays: true },
      objects: [
        {
          id: "orig",
          kind: "polygon",
          vertices: [
            [1, 1],
            [3, 1],
            [2, 3],
          ],
          vertexLabels: ["A", "B", "C"],
          draggable: true,
          palette: 0,
        },
        {
          id: "trans",
          kind: "transform",
          source: "orig",
          type: "enlarge",
          cx: "cx",
          cy: "cy",
          k: "k",
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const k = scope.k ?? 2;
    const cx = scope.cx ?? 0;
    const cy = scope.cy ?? 0;

    return [
      { label: "Center of Enlargement", value: `(${formatNumber(cx)}, ${formatNumber(cy)})` },
      { label: "Scale Factor k", value: formatNumber(k) },
      { label: "Area Scale Factor", value: `k² = ${formatNumber(k * k)}` },
      {
        label: "Orientation",
        value: k >= 0 ? "Direct (same orientation)" : "Inverted (rotated 180°)",
      },
    ];
  },
};

export const transformationConcepts = [
  translationDemo,
  reflectionDemo,
  rotationDemo,
  enlargementDemo,
];
registerConcepts(transformationConcepts);
