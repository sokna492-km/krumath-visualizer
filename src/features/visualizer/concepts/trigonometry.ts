import { formatApprox, formatNumber } from "@/math/functions/analysis";
import { scopeFromParameters } from "../engine/values";
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

const unitCircleDemo: ConceptDefinition = {
  id: "unit-circle",
  category: "trigonometry",
  title: "Unit Circle",
  summary:
    "Point P(cos θ, sin θ) on unit circle x² + y² = 1 — trigonometric values, quadrants and right triangle.",
  toggles: [
    { key: "triangle", label: "Show reference right triangle" },
    { key: "projections", label: "Show cos θ and sin θ axis projections" },
    { key: "tangent", label: "Show tan θ line" },
  ],
  createScene: () =>
    makeScene({
      title: "Interactive Unit Circle",
      conceptId: "unit-circle",
      category: "trigonometry",
      viewport: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 },
      parameters: [P("theta", 45, 0, 360, 5, "Angle θ (degrees)")],
      flags: { triangle: true, projections: true, tangent: false },
      objects: [
        {
          id: "circ",
          kind: "circle",
          cx: 0,
          cy: 0,
          r: 1,
          showRadius: false,
          palette: 0,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scopeFromParameters(scene.parameters);
    const thetaDeg = scope.theta ?? 45;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const cosVal = Math.cos(thetaRad);
    const sinVal = Math.sin(thetaRad);
    const tanVal = Math.abs(cosVal) < 1e-4 ? "undefined" : formatApprox(Math.tan(thetaRad));

    const quadrant =
      thetaDeg === 0 || thetaDeg === 360
        ? "+x axis"
        : thetaDeg === 90
          ? "+y axis"
          : thetaDeg === 180
            ? "−x axis"
            : thetaDeg === 270
              ? "−y axis"
              : thetaDeg < 90
                ? "Quadrant I"
                : thetaDeg < 180
                  ? "Quadrant II"
                  : thetaDeg < 270
                    ? "Quadrant III"
                    : "Quadrant IV";

    return [
      { label: "Angle θ", value: `${formatNumber(thetaDeg)}° = ${formatApprox(thetaRad)} rad` },
      { label: "cos θ (x-coord)", value: formatApprox(cosVal) },
      { label: "sin θ (y-coord)", value: formatApprox(sinVal) },
      { label: "tan θ (sin/cos)", value: tanVal },
      { label: "Quadrant", value: quadrant },
      { label: "Pythagorean Identity", value: "cos²θ + sin²θ = 1" },
    ];
  },
};

const sineWave: ConceptDefinition = {
  id: "sine-wave",
  category: "trigonometry",
  title: "Sine Function",
  summary: "y = a·sin(b(x − c)) + d — amplitude, period, phase shift and vertical shift.",
  toggles: [
    { key: "amplitude", label: "Show amplitude marker" },
    { key: "period", label: "Show period marker" },
  ],
  createScene: () =>
    makeScene({
      title: "Sine Function Transformation",
      conceptId: "sine-wave",
      category: "trigonometry",
      viewport: { xmin: -7, xmax: 7, ymin: -5, ymax: 5 },
      parameters: [
        P("a", 1, -3, 3, 0.1, "Amplitude a"),
        P("b", 1, 0.1, 4, 0.1, "Frequency b"),
        P("c", 0, -3.14, 3.14, 0.1, "Phase shift c"),
        P("d", 0, -3, 3, 0.1, "Vertical shift d"),
      ],
      flags: { amplitude: true, period: true },
      objects: [
        {
          id: "f",
          kind: "function",
          expr: "a*sin(b*(x - c)) + d",
          label: "y = a sin(b(x−c)) + d",
          showEquation: true,
          palette: 0,
        },
      ],
    }),
  readouts: (scene) => {
    const { a = 1, b = 1, c = 0, d = 0 } = scopeFromParameters(scene.parameters);
    const period = Math.abs((2 * Math.PI) / (b || 1));
    return [
      { label: "Amplitude", value: formatNumber(Math.abs(a)) },
      { label: "Period", value: `${formatApprox(period)} (2π / ${formatNumber(Math.abs(b))})` },
      { label: "Phase Shift", value: `${formatApprox(c)} rad` },
      { label: "Vertical Shift (Midline)", value: `y = ${formatNumber(d)}` },
      {
        label: "Range",
        value: `[${formatNumber(d - Math.abs(a))}, ${formatNumber(d + Math.abs(a))}]`,
      },
    ];
  },
};

const cosineWave: ConceptDefinition = {
  id: "cosine-wave",
  category: "trigonometry",
  title: "Cosine Function",
  summary: "y = a·cos(b(x − c)) + d — cosine wave transformations.",
  toggles: [],
  createScene: () =>
    makeScene({
      title: "Cosine Function Transformation",
      conceptId: "cosine-wave",
      category: "trigonometry",
      viewport: { xmin: -7, xmax: 7, ymin: -5, ymax: 5 },
      parameters: [
        P("a", 1, -3, 3, 0.1, "Amplitude a"),
        P("b", 1, 0.1, 4, 0.1, "Frequency b"),
        P("c", 0, -3.14, 3.14, 0.1, "Phase shift c"),
        P("d", 0, -3, 3, 0.1, "Vertical shift d"),
      ],
      flags: {},
      objects: [
        {
          id: "f",
          kind: "function",
          expr: "a*cos(b*(x - c)) + d",
          label: "y = a cos(b(x−c)) + d",
          showEquation: true,
          palette: 0,
        },
      ],
    }),
  readouts: (scene) => {
    const { a = 1, b = 1, c = 0, d = 0 } = scopeFromParameters(scene.parameters);
    const period = Math.abs((2 * Math.PI) / (b || 1));
    return [
      { label: "Amplitude", value: formatNumber(Math.abs(a)) },
      { label: "Period", value: `${formatApprox(period)}` },
      { label: "Midline", value: `y = ${formatNumber(d)}` },
    ];
  },
};

const tangentWave: ConceptDefinition = {
  id: "tangent-wave",
  category: "trigonometry",
  title: "Tangent Function",
  summary: "y = a·tan(bx) — vertical asymptotes at x = (2k+1)π/(2b) and period π/b.",
  toggles: [],
  createScene: () =>
    makeScene({
      title: "Tangent Function Transformation",
      conceptId: "tangent-wave",
      category: "trigonometry",
      viewport: { xmin: -6, xmax: 6, ymin: -6, ymax: 6 },
      parameters: [P("a", 1, -3, 3, 0.1, "Scale factor a"), P("b", 1, 0.2, 3, 0.1, "Frequency b")],
      flags: {},
      objects: [
        {
          id: "f",
          kind: "function",
          expr: "a*tan(b*x)",
          label: "y = a tan(bx)",
          showEquation: true,
          palette: 0,
        },
      ],
    }),
  readouts: (scene) => {
    const { a = 1, b = 1 } = scopeFromParameters(scene.parameters);
    const period = Math.abs(Math.PI / (b || 1));
    return [
      { label: "Period", value: `${formatApprox(period)} (π / ${formatNumber(Math.abs(b))})` },
      {
        label: "Vertical Asymptotes",
        value: `x = ±${formatApprox(period / 2)}, ±${formatApprox((3 * period) / 2)}, ...`,
      },
      { label: "Domain", value: `x ≠ (2k + 1)π / (2b)` },
      { label: "Range", value: "(−∞, +∞)" },
    ];
  },
};

export const trigConcepts = [unitCircleDemo, sineWave, cosineWave, tangentWave];
registerConcepts(trigConcepts);
