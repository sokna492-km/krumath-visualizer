import { formatApprox, formatNumber, findRoots, stationaryPoints } from "@/math/functions/analysis";
import { makePlotFunction, scopeFromParameters } from "../engine/values";
import { makeScene, type MathScene, type Parameter } from "../types/scene";
import { registerConcepts, type ConceptDefinition } from "./registry";

const P = (name: string, value: number, min: number, max: number, step = 0.1, label?: string): Parameter => ({
  name,
  value,
  min,
  max,
  step,
  label,
});

const linear: ConceptDefinition = {
  id: "linear",
  category: "functions",
  title: "Linear",
  summary: "y = mx + c — gradient, intercepts and the gradient triangle.",
  toggles: [
    { key: "intercepts", label: "Show intercepts" },
    { key: "triangle", label: "Show gradient triangle" },
  ],
  createScene: () =>
    makeScene({
      title: "Linear function",
      conceptId: "linear",
      category: "functions",
      viewport: { xmin: -10, xmax: 10, ymin: -8, ymax: 8 },
      parameters: [P("m", 2, -5, 5, 0.1, "Gradient m"), P("c", -3, -10, 10, 0.5, "y-intercept c")],
      flags: { intercepts: true, triangle: true },
      objects: [
        { id: "f", kind: "function", expr: "m*x + c", label: "y = mx + c", showEquation: true, palette: 0 },
        { id: "yint", kind: "point", x: 0, y: "c", label: "y-intercept", showCoords: true, palette: 1, requires: "intercepts" },
        { id: "xint", kind: "point", x: "-c/m", y: 0, label: "x-intercept", showCoords: true, palette: 2, requires: "intercepts" },
        { id: "t0", kind: "point", x: 0, y: "c", visible: false, requires: "triangle" },
        { id: "t1", kind: "point", x: 1, y: "c", visible: false, requires: "triangle" },
        { id: "t2", kind: "point", x: 1, y: "m + c", visible: false, requires: "triangle" },
        { id: "run", kind: "line", p1: "t0", p2: "t1", mode: "segment", dash: 2, palette: 3, label: "run = 1", requires: "triangle" },
        { id: "rise", kind: "line", p1: "t1", p2: "t2", mode: "segment", dash: 2, palette: 3, label: "rise = m", requires: "triangle" },
      ],
    }),
  readouts: (scene) => {
    const { m, c } = scopeFromParameters(scene.parameters);
    return [
      { label: "Gradient", value: formatNumber(m ?? 0) },
      { label: "y-intercept", value: `(0, ${formatNumber(c ?? 0)})` },
      { label: "x-intercept", value: m ? `(${formatApprox(-(c ?? 0) / m)}, 0)` : "none (horizontal line)" },
      { label: "Equation", value: `y = ${formatNumber(m ?? 0)}x ${(c ?? 0) < 0 ? "−" : "+"} ${formatNumber(Math.abs(c ?? 0))}` },
    ];
  },
};

const quadratic: ConceptDefinition = {
  id: "quadratic",
  category: "functions",
  title: "Quadratic",
  summary: "y = a(x − h)² + k — vertex form, axis of symmetry and roots.",
  toggles: [
    { key: "vertex", label: "Show vertex" },
    { key: "axis", label: "Show axis of symmetry" },
    { key: "roots", label: "Show roots" },
    { key: "parent", label: "Show y = x² for comparison" },
  ],
  createScene: () =>
    makeScene({
      title: "Quadratic transformation",
      conceptId: "quadratic",
      category: "functions",
      viewport: { xmin: -9, xmax: 9, ymin: -6, ymax: 10 },
      parameters: [P("a", 1, -5, 5, 0.1), P("h", 0, -8, 8, 0.5), P("k", 0, -8, 8, 0.5)],
      flags: { vertex: true, axis: true, roots: true, parent: false },
      objects: [
        { id: "f", kind: "function", expr: "a*(x-h)^2 + k", label: "y = a(x−h)² + k", showEquation: true, palette: 0, showRoots: true },
        { id: "parent", kind: "function", expr: "x^2", label: "y = x²", dash: 2, palette: 4, requires: "parent" },
        { id: "v", kind: "point", x: "h", y: "k", label: "vertex", showCoords: true, palette: 1, requires: "vertex" },
        { id: "a1", kind: "point", x: "h", y: -20, visible: false, requires: "axis" },
        { id: "a2", kind: "point", x: "h", y: 20, visible: false, requires: "axis" },
        { id: "axis", kind: "line", p1: "a1", p2: "a2", mode: "line", dash: 3, palette: 3, label: "axis of symmetry", requires: "axis" },
      ],
    }),
  readouts: (scene) => {
    const scope = scopeFromParameters(scene.parameters);
    const f = makePlotFunction("a*(x-h)^2 + k", () => scope);
    const roots = findRoots(f, scene.viewport.xmin, scene.viewport.xmax);
    return [
      { label: "Vertex", value: `(${formatNumber(scope.h ?? 0)}, ${formatNumber(scope.k ?? 0)})` },
      { label: "Axis of symmetry", value: `x = ${formatNumber(scope.h ?? 0)}` },
      { label: "Shape", value: (scope.a ?? 0) >= 0 ? "opens upwards" : "opens downwards" },
      {
        label: "Roots",
        value: roots.length ? roots.map((r) => formatApprox(r)).join(", ") : "no real roots",
        hint: "numerical approximation",
      },
    ];
  },
};

const cubic: ConceptDefinition = {
  id: "cubic",
  category: "functions",
  title: "Cubic & polynomial",
  summary: "y = ax³ + bx² + cx + d — turning points and inflection.",
  toggles: [{ key: "stationary", label: "Show stationary points" }],
  createScene: () =>
    makeScene({
      title: "Cubic function",
      conceptId: "cubic",
      category: "functions",
      viewport: { xmin: -6, xmax: 6, ymin: -10, ymax: 10 },
      parameters: [P("a", 1, -3, 3, 0.1), P("b", 0, -6, 6, 0.1), P("c", -3, -10, 10, 0.5), P("d", 0, -10, 10, 0.5)],
      flags: { stationary: true },
      objects: [
        {
          id: "f",
          kind: "function",
          expr: "a*x^3 + b*x^2 + c*x + d",
          label: "y = ax³ + bx² + cx + d",
          showEquation: true,
          palette: 0,
          showStationary: true,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scopeFromParameters(scene.parameters);
    const f = makePlotFunction("a*x^3 + b*x^2 + c*x + d", () => scope);
    const pts = stationaryPoints(f, scene.viewport.xmin, scene.viewport.xmax);
    return pts.length
      ? pts.map((p) => ({
          label: p.kind,
          value: `(${formatApprox(p.x)}, ${formatApprox(p.y)})`,
          hint: "numerical approximation",
        }))
      : [{ label: "Stationary points", value: "none in view" }];
  },
};

const reciprocal: ConceptDefinition = {
  id: "reciprocal",
  category: "functions",
  title: "Reciprocal",
  summary: "y = a/(x − h) + k — asymptotes and discontinuity.",
  toggles: [{ key: "asymptotes", label: "Show asymptotes" }],
  createScene: () =>
    makeScene({
      title: "Reciprocal function",
      conceptId: "reciprocal",
      category: "functions",
      viewport: { xmin: -8, xmax: 8, ymin: -8, ymax: 8 },
      parameters: [P("a", 1, -6, 6, 0.1), P("h", 0, -6, 6, 0.5), P("k", 0, -6, 6, 0.5)],
      flags: { asymptotes: true },
      objects: [
        { id: "f", kind: "function", expr: "a/(x-h) + k", label: "y = a/(x−h) + k", showEquation: true, palette: 0 },
        { id: "v1", kind: "point", x: "h", y: -20, visible: false, requires: "asymptotes" },
        { id: "v2", kind: "point", x: "h", y: 20, visible: false, requires: "asymptotes" },
        { id: "va", kind: "line", p1: "v1", p2: "v2", mode: "line", dash: 3, palette: 3, label: "x = h", requires: "asymptotes" },
        { id: "h1", kind: "point", x: -20, y: "k", visible: false, requires: "asymptotes" },
        { id: "h2", kind: "point", x: 20, y: "k", visible: false, requires: "asymptotes" },
        { id: "ha", kind: "line", p1: "h1", p2: "h2", mode: "line", dash: 3, palette: 2, label: "y = k", requires: "asymptotes" },
      ],
    }),
  readouts: (scene) => {
    const scope = scopeFromParameters(scene.parameters);
    return [
      { label: "Vertical asymptote", value: `x = ${formatNumber(scope.h ?? 0)}` },
      { label: "Horizontal asymptote", value: `y = ${formatNumber(scope.k ?? 0)}` },
      { label: "Domain", value: `x ≠ ${formatNumber(scope.h ?? 0)}` },
    ];
  },
};

const exponential: ConceptDefinition = {
  id: "exponential",
  category: "functions",
  title: "Exponential",
  summary: "y = a·e^(bx) + c — growth, decay and the horizontal asymptote.",
  createScene: () =>
    makeScene({
      title: "Exponential function",
      conceptId: "exponential",
      category: "functions",
      viewport: { xmin: -6, xmax: 6, ymin: -4, ymax: 12 },
      parameters: [P("a", 1, -5, 5, 0.1), P("b", 1, -3, 3, 0.1), P("c", 0, -6, 6, 0.5)],
      flags: {},
      objects: [
        { id: "f", kind: "function", expr: "a*e^(b*x) + c", label: "y = a·e^(bx) + c", showEquation: true, palette: 0 },
      ],
    }),
  readouts: (scene) => {
    const scope = scopeFromParameters(scene.parameters);
    return [
      { label: "Behaviour", value: (scope.b ?? 0) >= 0 ? "growth" : "decay" },
      { label: "Horizontal asymptote", value: `y = ${formatNumber(scope.c ?? 0)}` },
      { label: "y-intercept", value: `(0, ${formatNumber((scope.a ?? 0) + (scope.c ?? 0))})` },
    ];
  },
};

const logarithmic: ConceptDefinition = {
  id: "logarithmic",
  category: "functions",
  title: "Logarithmic",
  summary: "y = a·log(x − h) + k — domain restriction and asymptote.",
  createScene: () =>
    makeScene({
      title: "Logarithmic function",
      conceptId: "logarithmic",
      category: "functions",
      viewport: { xmin: -4, xmax: 12, ymin: -6, ymax: 6 },
      parameters: [P("a", 1, -4, 4, 0.1), P("h", 0, -5, 5, 0.5), P("k", 0, -5, 5, 0.5)],
      flags: {},
      objects: [
        { id: "f", kind: "function", expr: "a*log(x-h) + k", label: "y = a·ln(x−h) + k", showEquation: true, palette: 0 },
      ],
    }),
  readouts: (scene) => {
    const scope = scopeFromParameters(scene.parameters);
    return [
      { label: "Domain", value: `x > ${formatNumber(scope.h ?? 0)}` },
      { label: "Vertical asymptote", value: `x = ${formatNumber(scope.h ?? 0)}` },
    ];
  },
};

const absoluteValue: ConceptDefinition = {
  id: "absolute",
  category: "functions",
  title: "Absolute value",
  summary: "y = a|x − h| + k — the vertex and the two branches.",
  toggles: [{ key: "vertex", label: "Show vertex" }],
  createScene: () =>
    makeScene({
      title: "Absolute value function",
      conceptId: "absolute",
      category: "functions",
      viewport: { xmin: -8, xmax: 8, ymin: -6, ymax: 8 },
      parameters: [P("a", 1, -4, 4, 0.1), P("h", 0, -6, 6, 0.5), P("k", 0, -6, 6, 0.5)],
      flags: { vertex: true },
      objects: [
        { id: "f", kind: "function", expr: "a*abs(x-h) + k", label: "y = a|x−h| + k", showEquation: true, palette: 0 },
        { id: "v", kind: "point", x: "h", y: "k", label: "vertex", showCoords: true, palette: 1, requires: "vertex" },
      ],
    }),
};

export const functionConcepts = [linear, quadratic, cubic, reciprocal, exponential, logarithmic, absoluteValue];
registerConcepts(functionConcepts);
