import {
  derivative,
  secondDerivative,
  formatApprox,
  formatNumber,
  integrate,
  riemannSum,
  stationaryPoints,
} from "@/math/functions/analysis";
import { makePlotFunction, scopeFromParameters } from "../engine/values";
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

const tangentGlider: ConceptDefinition = {
  id: "tangent-line",
  category: "calculus",
  title: "Derivative & Tangent Line",
  summary:
    "Slide point P along y = f(x) to inspect the instantaneous gradient f'(x) and tangent line equation.",
  toggles: [
    { key: "tangent", label: "Show tangent line" },
    { key: "normal", label: "Show normal line" },
  ],
  createScene: () =>
    makeScene({
      title: "Derivative and Tangent Line",
      conceptId: "tangent-line",
      category: "calculus",
      viewport: { xmin: -5, xmax: 5, ymin: -4, ymax: 8 },
      parameters: [P("x0", 1, -4, 4, 0.1, "Point x-coordinate (x₀)")],
      flags: { tangent: true, normal: false },
      objects: [
        {
          id: "f",
          kind: "function",
          expr: "x^3 - 3*x",
          label: "y = x³ − 3x",
          showEquation: true,
          palette: 0,
        },
        {
          id: "p",
          kind: "glider",
          fn: "f",
          x: 1,
          label: "P",
          showTangent: true,
          showCoords: true,
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    const { x0 = 1 } = scopeFromParameters(scene.parameters);
    const f = makePlotFunction("x^3 - 3*x", () => ({}));
    const y0 = f(x0);
    const m = derivative(f, x0);
    const c = y0 - m * x0;
    return [
      { label: "Point P", value: `(${formatApprox(x0)}, ${formatApprox(y0)})` },
      { label: "Gradient f'(x₀)", value: formatApprox(m) },
      {
        label: "Tangent Equation",
        value: `y = ${formatApprox(m)}x ${c < 0 ? "−" : "+"} ${formatApprox(Math.abs(c))}`,
      },
      { label: "Derivative Formula", value: "f'(x) = 3x² − 3" },
    ];
  },
};

const secantToTangent: ConceptDefinition = {
  id: "secant-limit",
  category: "calculus",
  title: "Secant Line & Limit as h → 0",
  summary:
    "Animate h → 0 to demonstrate how the average rate of change [f(x+h) − f(x)] / h converges to the instantaneous derivative.",
  toggles: [{ key: "triangle", label: "Show rise/run triangle" }],
  createScene: () =>
    makeScene({
      title: "Limit of Difference Quotient",
      conceptId: "secant-limit",
      category: "calculus",
      viewport: { xmin: -1, xmax: 5, ymin: -1, ymax: 12 },
      parameters: [
        P("x0", 1.5, 0, 3.5, 0.1, "Base point x₀"),
        P("h", 1.5, 0.05, 3, 0.05, "Step size h"),
      ],
      flags: { triangle: true },
      objects: [
        {
          id: "f",
          kind: "function",
          expr: "0.5*x^2 + 1",
          label: "y = 0.5x² + 1",
          showEquation: true,
          palette: 0,
        },
        {
          id: "p1",
          kind: "point",
          x: "x0",
          y: "0.5*x0^2 + 1",
          label: "P(x₀, f(x₀))",
          palette: 1,
        },
        {
          id: "p2",
          kind: "point",
          x: "x0 + h",
          y: "0.5*(x0+h)^2 + 1",
          label: "Q(x₀+h, f(x₀+h))",
          palette: 2,
        },
        {
          id: "secant",
          kind: "line",
          p1: "p1",
          p2: "p2",
          mode: "line",
          palette: 3,
          label: "Secant Line",
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scopeFromParameters(scene.parameters);
    const x0 = scope.x0 ?? 1.5;
    const h = scope.h ?? 1.5;
    const f = (x: number) => 0.5 * x * x + 1;
    const y0 = f(x0);
    const y1 = f(x0 + h);
    const secantSlope = (y1 - y0) / h;
    const exactDerivative = x0; // d/dx (0.5x^2+1) = x

    return [
      { label: "Step size h", value: formatNumber(h, 3) },
      { label: "Secant Slope Δy/Δx", value: formatNumber(secantSlope, 3) },
      { label: "Instantaneous Derivative f'(x₀)", value: formatNumber(exactDerivative, 3) },
      {
        label: "Difference Error",
        value: formatNumber(Math.abs(secantSlope - exactDerivative), 4),
      },
      { label: "Definition", value: "f'(x₀) = lim(h→0) [f(x₀+h) − f(x₀)] / h" },
    ];
  },
};

const riemannIntegration: ConceptDefinition = {
  id: "riemann-sum",
  category: "calculus",
  title: "Riemann Sum & Area Under Curve",
  summary: "Approximate definite integral ∫ₐᵇ f(x)dx using n rectangular strips.",
  toggles: [],
  createScene: () =>
    makeScene({
      title: "Riemann Sum Integration",
      conceptId: "riemann-sum",
      category: "calculus",
      viewport: { xmin: -1, xmax: 5, ymin: -1, ymax: 9 },
      parameters: [
        P("a", 0, -1, 4, 0.1, "Lower limit a"),
        P("b", 3, 0, 5, 0.1, "Upper limit b"),
        P("n", 6, 1, 30, 1, "Number of rectangles n"),
      ],
      flags: {},
      objects: [
        {
          id: "f",
          kind: "function",
          expr: "x^2 + 1",
          label: "y = x² + 1",
          showEquation: true,
          palette: 0,
        },
        {
          id: "riemann",
          kind: "riemann",
          fn: "f",
          a: "a",
          b: "b",
          n: "n",
          mode: "midpoint",
          palette: 2,
        },
        {
          id: "exact",
          kind: "integral",
          fn: "f",
          a: "a",
          b: "b",
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    const { a = 0, b = 3, n = 6 } = scopeFromParameters(scene.parameters);
    const f = makePlotFunction("x^2 + 1", () => ({}));
    const exact = integrate(f, a, b);
    const approx = riemannSum(f, a, b, Math.max(1, Math.round(n)), "midpoint");
    const error = Math.abs(exact - approx);
    return [
      { label: "Exact Integral ∫ₐᵇ f(x)dx", value: formatApprox(exact) },
      { label: "Riemann Sum (n=" + Math.round(n) + ")", value: formatApprox(approx) },
      { label: "Approximation Error", value: formatApprox(error) },
    ];
  },
};

export const calculusConcepts = [tangentGlider, secantToTangent, riemannIntegration];
registerConcepts(calculusConcepts);
