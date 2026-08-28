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

const linearInequality: ConceptDefinition = {
  id: "linear-inequality",
  category: "inequalities",
  title: "Linear Inequality",
  summary:
    "Shading in a whole territory of winning answers! Every point in the colored zone makes the rule true, separated by a boundary line.",
  toggles: [{ key: "testpoint", label: "Show test point (0, 0)" }],
  createScene: () =>
    makeScene({
      title: "Linear Inequality Region",
      conceptId: "linear-inequality",
      category: "inequalities",
      viewport: { xmin: -6, xmax: 6, ymin: -6, ymax: 6 },
      parameters: [P("m", 1, -4, 4, 0.2, "Gradient m"), P("c", 1, -5, 5, 0.5, "y-intercept c")],
      flags: { testpoint: true },
      objects: [
        {
          id: "ineq",
          kind: "inequality",
          expr: "m*x + c",
          op: ">",
          palette: 0,
        },
        {
          id: "line",
          kind: "function",
          expr: "m*x + c",
          label: "y = mx + c",
          dash: 2,
          palette: 0,
        },
        {
          id: "origin",
          kind: "point",
          x: 0,
          y: 0,
          label: "(0,0)",
          showCoords: true,
          palette: 1,
          requires: "testpoint",
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const m = scope.m ?? 1;
    const c = scope.c ?? 1;
    const originSatisfies = 0 > c;

    return [
      {
        label: "Inequality",
        value: `y > ${formatNumber(m)}x ${c < 0 ? "− " + Math.abs(c) : "+ " + c}`,
      },
      { label: "Boundary Line", value: "Dashed (strict inequality >)" },
      {
        label: "Origin Test (0, 0)",
        value: originSatisfies ? "0 > c (Satisfies: Shaded)" : "0 ≤ c (Does not satisfy)",
      },
      { label: "Shaded Region", value: "Half-plane above boundary line" },
    ];
  },
};

const quadraticInequality: ConceptDefinition = {
  id: "quadratic-inequality",
  category: "inequalities",
  title: "Quadratic Inequality",
  summary:
    "Shading all the points inside or outside a curved bowl! Points inside the colored zone satisfy the quadratic inequality rule.",
  toggles: [],
  createScene: () =>
    makeScene({
      title: "Quadratic Inequality Region",
      conceptId: "quadratic-inequality",
      category: "inequalities",
      viewport: { xmin: -6, xmax: 6, ymin: -6, ymax: 8 },
      parameters: [
        P("a", 1, -3, 3, 0.2, "Coefficient a"),
        P("c", -2, -5, 5, 0.5, "Vertical shift c"),
      ],
      flags: {},
      objects: [
        {
          id: "ineq",
          kind: "inequality",
          expr: "a*x^2 + c",
          op: ">=",
          palette: 0,
        },
        {
          id: "parabola",
          kind: "function",
          expr: "a*x^2 + c",
          label: "y = ax² + c",
          palette: 0,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const a = scope.a ?? 1;
    const c = scope.c ?? -2;

    return [
      {
        label: "Inequality",
        value: `y ≥ ${formatNumber(a)}x² ${c < 0 ? "− " + Math.abs(c) : "+ " + c}`,
      },
      { label: "Boundary Curve", value: "Solid parabola (inclusive inequality ≥)" },
      { label: "Region Type", value: "Parabolic bowl interior (above curve)" },
    ];
  },
};

export const inequalityConcepts = [linearInequality, quadraticInequality];
registerConcepts(inequalityConcepts);
