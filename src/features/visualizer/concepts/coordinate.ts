import { formatApprox, formatNumber } from "@/math/functions/analysis";
import { intersections } from "@/math/functions/analysis";
import { makePlotFunction, scopeFromParameters } from "../engine/values";
import { makeScene, type PointObject } from "../types/scene";
import { registerConcepts, type ConceptDefinition } from "./registry";

function point(id: string, x: number, y: number, label: string, palette: 0 | 1 | 2 | 3): PointObject {
  return { id, kind: "point", x, y, label, draggable: true, showCoords: true, palette };
}

function readPoint(scene: { objects: Array<{ id: string; kind: string }> }, id: string): [number, number] {
  const obj = scene.objects.find((o) => o.id === id) as PointObject | undefined;
  return obj ? [Number(obj.x), Number(obj.y)] : [0, 0];
}

const twoPoints: ConceptDefinition = {
  id: "two-points",
  category: "coordinate",
  title: "Gradient, distance & midpoint",
  summary: "Drag A and B — gradient, length and midpoint update live.",
  toggles: [
    { key: "triangle", label: "Show gradient triangle" },
    { key: "midpoint", label: "Show midpoint" },
  ],
  createScene: () =>
    makeScene({
      title: "Gradient, distance and midpoint",
      conceptId: "two-points",
      category: "coordinate",
      viewport: { xmin: -8, xmax: 8, ymin: -6, ymax: 6 },
      parameters: [],
      flags: { triangle: true, midpoint: true },
      objects: [
        point("A", -2, -1, "A", 1),
        point("B", 2, 3, "B", 2),
        { id: "AB", kind: "line", p1: "A", p2: "B", mode: "segment", palette: 0, showLength: true, label: "AB" },
        { id: "C", kind: "point", x: 2, y: -1, visible: false, requires: "triangle" },
        { id: "run", kind: "line", p1: "A", p2: "C", mode: "segment", dash: 2, palette: 3, label: "run", requires: "triangle" },
        { id: "rise", kind: "line", p1: "C", p2: "B", mode: "segment", dash: 2, palette: 3, label: "rise", requires: "triangle" },
      ],
    }),
  readouts: (scene) => {
    const [ax, ay] = readPoint(scene, "A");
    const [bx, by] = readPoint(scene, "B");
    const dx = bx - ax;
    const dy = by - ay;
    return [
      { label: "Gradient", value: dx === 0 ? "undefined (vertical)" : formatApprox(dy / dx) },
      { label: "Distance AB", value: formatApprox(Math.hypot(dx, dy)), hint: "numerical approximation" },
      { label: "Midpoint", value: `(${formatNumber((ax + bx) / 2)}, ${formatNumber((ay + by) / 2)})` },
      { label: "Change", value: `Δx = ${formatNumber(dx)}, Δy = ${formatNumber(dy)}` },
    ];
  },
};

const simultaneous: ConceptDefinition = {
  id: "simultaneous",
  category: "coordinate",
  title: "Simultaneous equations",
  summary: "Two lines and their point of intersection — the solution.",
  toggles: [{ key: "solution", label: "Show intersection" }],
  createScene: () =>
    makeScene({
      title: "Simultaneous equations",
      conceptId: "simultaneous",
      category: "coordinate",
      viewport: { xmin: -8, xmax: 8, ymin: -6, ymax: 8 },
      parameters: [
        { name: "m", value: 2, min: -5, max: 5, step: 0.1, label: "gradient of line 1" },
        { name: "c", value: 1, min: -8, max: 8, step: 0.5, label: "intercept of line 1" },
        { name: "n", value: -1, min: -5, max: 5, step: 0.1, label: "gradient of line 2" },
        { name: "d", value: 4, min: -8, max: 8, step: 0.5, label: "intercept of line 2" },
      ],
      flags: { solution: true },
      objects: [
        { id: "f", kind: "function", expr: "m*x + c", label: "y = mx + c", showEquation: true, palette: 0 },
        { id: "g", kind: "function", expr: "n*x + d", label: "y = nx + d", showEquation: true, palette: 2, dash: 2 },
      ],
    }),
  readouts: (scene) => {
    const { m = 0, c = 0, n = 0, d = 0 } = scopeFromParameters(scene.parameters);
    if (m === n) {
      return [{ label: "Solution", value: c === d ? "infinitely many (same line)" : "no solution (parallel lines)" }];
    }
    const x = (d - c) / (m - n);
    return [
      { label: "Solution", value: `x = ${formatApprox(x)}, y = ${formatApprox(m * x + c)}` },
      { label: "Method", value: "equate the two expressions for y" },
    ];
  },
};

const curveIntersections: ConceptDefinition = {
  id: "line-curve-intersection",
  category: "coordinate",
  title: "Line & curve intersections",
  summary: "Move the line and count the intersections with a parabola.",
  createScene: () =>
    makeScene({
      title: "Line and curve intersections",
      conceptId: "line-curve-intersection",
      category: "coordinate",
      viewport: { xmin: -6, xmax: 6, ymin: -4, ymax: 12 },
      parameters: [
        { name: "m", value: 1, min: -6, max: 6, step: 0.1, label: "gradient m" },
        { name: "c", value: 2, min: -8, max: 8, step: 0.25, label: "intercept c" },
      ],
      flags: {},
      objects: [
        { id: "f", kind: "function", expr: "x^2", label: "y = x²", showEquation: true, palette: 0 },
        { id: "g", kind: "function", expr: "m*x + c", label: "y = mx + c", showEquation: true, palette: 2, dash: 2 },
      ],
    }),
  readouts: (scene) => {
    const scope = scopeFromParameters(scene.parameters);
    const f = makePlotFunction("x^2", () => scope);
    const g = makePlotFunction("m*x + c", () => scope);
    const pts = intersections(f, g, scene.viewport.xmin, scene.viewport.xmax);
    return [
      { label: "Intersections", value: String(pts.length) },
      ...pts.map((p, i) => ({
        label: `Point ${i + 1}`,
        value: `(${formatApprox(p.x)}, ${formatApprox(p.y)})`,
        hint: "numerical approximation",
      })),
    ];
  },
};

export const coordinateConcepts = [twoPoints, simultaneous, curveIntersections];
registerConcepts(coordinateConcepts);
