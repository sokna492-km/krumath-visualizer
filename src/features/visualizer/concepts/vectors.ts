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

const vectorAddition: ConceptDefinition = {
  id: "vector-addition",
  category: "vectors",
  title: "Vector Addition & Parallelogram",
  summary: "Vectors u and v — head-to-tail triangle law, parallelogram law and resultant u + v.",
  toggles: [
    { key: "parallelogram", label: "Show parallelogram law" },
    { key: "components", label: "Show vector components" },
  ],
  createScene: () =>
    makeScene({
      title: "Vector Addition",
      conceptId: "vector-addition",
      category: "vectors",
      viewport: { xmin: -3, xmax: 9, ymin: -3, ymax: 9 },
      parameters: [
        P("ux", 4, -5, 5, 0.5, "Vector u (x)"),
        P("uy", 1, -5, 5, 0.5, "Vector u (y)"),
        P("vx", 2, -5, 5, 0.5, "Vector v (x)"),
        P("vy", 4, -5, 5, 0.5, "Vector v (y)"),
      ],
      flags: { parallelogram: true, components: true },
      objects: [
        {
          id: "u",
          kind: "vector",
          from: [0, 0],
          to: ["ux", "uy"],
          label: "u",
          palette: 0,
        },
        {
          id: "v",
          kind: "vector",
          from: [0, 0],
          to: ["vx", "vy"],
          label: "v",
          palette: 2,
        },
        {
          id: "u_plus_v",
          kind: "vector",
          from: [0, 0],
          to: ["ux + vx", "uy + vy"],
          label: "u + v (Resultant)",
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const ux = scope.ux ?? 4;
    const uy = scope.uy ?? 1;
    const vx = scope.vx ?? 2;
    const vy = scope.vy ?? 4;

    const rx = ux + vx;
    const ry = uy + vy;

    const magU = Math.hypot(ux, uy);
    const magV = Math.hypot(vx, vy);
    const magR = Math.hypot(rx, ry);

    // Dot product & Angle
    const dot = ux * vx + uy * vy;
    const cosTheta = magU * magV > 0 ? Math.max(-1, Math.min(1, dot / (magU * magV))) : 0;
    const thetaDeg = (Math.acos(cosTheta) * 180) / Math.PI;

    return [
      {
        label: "Vector u",
        value: `(${formatNumber(ux)}, ${formatNumber(uy)}), |u| = ${formatApprox(magU)}`,
      },
      {
        label: "Vector v",
        value: `(${formatNumber(vx)}, ${formatNumber(vy)}), |v| = ${formatApprox(magV)}`,
      },
      {
        label: "Resultant u + v",
        value: `(${formatNumber(rx)}, ${formatNumber(ry)}), |u+v| = ${formatApprox(magR)}`,
      },
      { label: "Dot Product u · v", value: formatNumber(dot) },
      { label: "Angle between u & v", value: `${formatNumber(thetaDeg, 1)}°` },
    ];
  },
};

const scalarMultiplication: ConceptDefinition = {
  id: "scalar-multiplication",
  category: "vectors",
  title: "Scalar Multiplication",
  summary: "Scale vector u by scalar k — changes magnitude and reverses direction when k < 0.",
  toggles: [],
  createScene: () =>
    makeScene({
      title: "Vector Scalar Multiplication",
      conceptId: "scalar-multiplication",
      category: "vectors",
      viewport: { xmin: -8, xmax: 8, ymin: -8, ymax: 8 },
      parameters: [
        P("ux", 3, -4, 4, 0.5, "Vector u (x)"),
        P("uy", 2, -4, 4, 0.5, "Vector u (y)"),
        P("k", 1.5, -3, 3, 0.1, "Scalar multiplier k"),
      ],
      flags: {},
      objects: [
        {
          id: "u",
          kind: "vector",
          from: [0, 0],
          to: ["ux", "uy"],
          label: "u",
          palette: 0,
        },
        {
          id: "ku",
          kind: "vector",
          from: [0, 0],
          to: ["k * ux", "k * uy"],
          label: "k·u",
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const ux = scope.ux ?? 3;
    const uy = scope.uy ?? 2;
    const k = scope.k ?? 1.5;

    const magU = Math.hypot(ux, uy);
    const magKU = Math.hypot(k * ux, k * uy);

    return [
      {
        label: "Original Vector u",
        value: `(${formatNumber(ux)}, ${formatNumber(uy)}), |u| = ${formatApprox(magU)}`,
      },
      { label: "Scaled Vector k·u", value: `(${formatApprox(k * ux)}, ${formatApprox(k * uy)})` },
      {
        label: "Scaled Magnitude",
        value: `${formatApprox(magKU)} = |${formatNumber(k)}| × ${formatApprox(magU)}`,
      },
      {
        label: "Direction",
        value: k > 0 ? "Same direction as u" : k < 0 ? "Opposite direction to u" : "Zero vector",
      },
    ];
  },
};

export const vectorConcepts = [vectorAddition, scalarMultiplication];
registerConcepts(vectorConcepts);
