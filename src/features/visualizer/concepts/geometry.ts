import { formatApprox, formatNumber } from "@/math/functions/analysis";
import { makeScene, type MathScene, type Parameter } from "../types/scene";
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

const interactiveTriangle: ConceptDefinition = {
  id: "triangle-properties",
  category: "geometry",
  title: "Triangle & Angles",
  summary: "Drag vertices A, B, C — live side lengths, interior angles, perimeter and area.",
  toggles: [
    { key: "angles", label: "Show interior angle measurements" },
    { key: "lengths", label: "Show side lengths" },
    { key: "area", label: "Show filled triangle area" },
  ],
  createScene: () =>
    makeScene({
      title: "Interactive Triangle Properties",
      conceptId: "triangle-properties",
      category: "geometry",
      viewport: { xmin: -6, xmax: 8, ymin: -4, ymax: 8 },
      parameters: [],
      flags: { angles: true, lengths: true, area: true },
      objects: [
        {
          id: "tri",
          kind: "polygon",
          vertices: [
            [-2, -1],
            [4, -1],
            [1, 5],
          ],
          vertexLabels: ["A", "B", "C"],
          draggable: true,
          showMeasurements: true,
          palette: 0,
        },
      ],
    }),
  readouts: (scene) => {
    const poly = scene.objects.find((o) => o.kind === "polygon") as
      { vertices: Array<[number, number]> } | undefined;
    if (!poly || poly.vertices.length < 3) return [];

    const [A, B, C] = poly.vertices;
    if (!A || !B || !C) return [];

    const c = Math.hypot(B[0] - A[0], B[1] - A[1]); // AB
    const a = Math.hypot(C[0] - B[0], C[1] - B[1]); // BC
    const b = Math.hypot(C[0] - A[0], C[1] - A[1]); // CA

    // Angles via cosine rule in degrees
    const angleA =
      (Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c)))) * 180) / Math.PI;
    const angleB =
      (Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c)))) * 180) / Math.PI;
    const angleC = 180 - angleA - angleB;

    // Area via shoelace / determinant
    const area = 0.5 * Math.abs(A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    const perimeter = a + b + c;

    return [
      { label: "Side AB (c)", value: formatApprox(c) },
      { label: "Side BC (a)", value: formatApprox(a) },
      { label: "Side CA (b)", value: formatApprox(b) },
      {
        label: "∠A, ∠B, ∠C",
        value: `${formatNumber(angleA, 1)}°, ${formatNumber(angleB, 1)}°, ${formatNumber(angleC, 1)}°`,
      },
      { label: "Angle Sum", value: `${formatNumber(angleA + angleB + angleC, 1)}° = 180°` },
      { label: "Perimeter", value: formatApprox(perimeter) },
      { label: "Area", value: formatApprox(area) },
    ];
  },
};

const circleGeometry: ConceptDefinition = {
  id: "circle-tangent",
  category: "geometry",
  title: "Circle & Tangent Line",
  summary: "(x − h)² + (y − k)² = r² — radius, circumference, area and tangent at angle θ.",
  toggles: [
    { key: "radius", label: "Show radius line" },
    { key: "tangent", label: "Show tangent line at P" },
    { key: "triangle", label: "Show reference right triangle" },
  ],
  createScene: () =>
    makeScene({
      title: "Circle and Tangent Geometry",
      conceptId: "circle-tangent",
      category: "geometry",
      viewport: { xmin: -8, xmax: 8, ymin: -7, ymax: 7 },
      parameters: [
        P("h", 0, -4, 4, 0.5, "Center x (h)"),
        P("k", 0, -4, 4, 0.5, "Center y (k)"),
        P("r", 4, 1, 6, 0.2, "Radius r"),
        P("theta", 45, 0, 360, 5, "Angle θ (degrees)"),
      ],
      flags: { radius: true, tangent: true, triangle: false },
      objects: [
        {
          id: "circ",
          kind: "circle",
          cx: "h",
          cy: "k",
          r: "r",
          showRadius: true,
          palette: 0,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const h = scope.h ?? 0;
    const k = scope.k ?? 0;
    const r = scope.r ?? 4;
    const thetaDeg = scope.theta ?? 45;
    const thetaRad = (thetaDeg * Math.PI) / 180;

    const px = h + r * Math.cos(thetaRad);
    const py = k + r * Math.sin(thetaRad);
    const area = Math.PI * r * r;
    const circ = 2 * Math.PI * r;

    return [
      { label: "Center (h, k)", value: `(${formatNumber(h)}, ${formatNumber(k)})` },
      { label: "Radius r", value: formatNumber(r) },
      { label: "Point P on circle", value: `(${formatApprox(px)}, ${formatApprox(py)})` },
      {
        label: "Tangent Slope",
        value:
          Math.abs(Math.sin(thetaRad)) < 1e-4
            ? "Vertical (undefined)"
            : formatApprox(-Math.cos(thetaRad) / Math.sin(thetaRad)),
      },
      { label: "Circumference 2πr", value: formatApprox(circ) },
      { label: "Area πr²", value: formatApprox(area) },
      {
        label: "Equation",
        value: `(x ${h >= 0 ? "− " + h : "+ " + Math.abs(h)})² + (y ${k >= 0 ? "− " + k : "+ " + Math.abs(k)})² = ${formatNumber(r * r)}`,
      },
    ];
  },
};

export const geometryConcepts = [interactiveTriangle, circleGeometry];
registerConcepts(geometryConcepts);
