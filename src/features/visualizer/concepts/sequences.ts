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

const arithmeticSequence: ConceptDefinition = {
  id: "arithmetic-sequence",
  category: "sequences",
  title: "Arithmetic Sequence",
  summary:
    "uₙ = a + (n − 1)d — common difference d, discrete progression and partial sum Sₙ = n/2 (2a + (n-1)d).",
  toggles: [{ key: "trend", label: "Show continuous trend line" }],
  createScene: () =>
    makeScene({
      title: "Arithmetic Sequence",
      conceptId: "arithmetic-sequence",
      category: "sequences",
      viewport: { xmin: 0, xmax: 12, ymin: -5, ymax: 25 },
      parameters: [
        P("a", 2, -10, 10, 1, "First term a (u₁)"),
        P("d", 2, -5, 5, 0.5, "Common difference d"),
        P("N", 8, 1, 10, 1, "Number of terms N"),
      ],
      flags: { trend: true },
      objects: [
        {
          id: "trendline",
          kind: "function",
          expr: "a + (x - 1)*d",
          label: "u(n) = a + (n−1)d",
          dash: 2,
          palette: 3,
          requires: "trend",
        },
        ...Array.from({ length: 10 }, (_, i) => {
          const n = i + 1;
          return {
            id: `pt-${n}`,
            kind: "point" as const,
            x: n,
            y: `a + (${n} - 1)*d`,
            label: `u${n}`,
            showCoords: true,
            palette: 0 as const,
          };
        }),
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const a = scope.a ?? 2;
    const d = scope.d ?? 2;
    const N = Math.max(1, Math.round(scope.N ?? 8));

    const uN = a + (N - 1) * d;
    const sN = (N / 2) * (2 * a + (N - 1) * d);

    return [
      { label: "First Term a", value: formatNumber(a) },
      { label: "Common Difference d", value: formatNumber(d) },
      { label: `N-th Term u_${N}`, value: formatNumber(uN) },
      { label: `Partial Sum S_${N}`, value: formatNumber(sN) },
      {
        label: "General Term Formula",
        value: `u_n = ${formatNumber(a)} + (n − 1)·(${formatNumber(d)})`,
      },
    ];
  },
};

const geometricSequence: ConceptDefinition = {
  id: "geometric-sequence",
  category: "sequences",
  title: "Geometric Sequence",
  summary: "uₙ = a·r^(n − 1) — common ratio r, exponential discrete terms and sum Sₙ.",
  toggles: [{ key: "trend", label: "Show continuous curve" }],
  createScene: () =>
    makeScene({
      title: "Geometric Sequence",
      conceptId: "geometric-sequence",
      category: "sequences",
      viewport: { xmin: 0, xmax: 10, ymin: -5, ymax: 30 },
      parameters: [
        P("a", 1, 0.5, 5, 0.5, "First term a"),
        P("r", 1.5, -2, 2, 0.1, "Common ratio r"),
        P("N", 6, 1, 8, 1, "Number of terms N"),
      ],
      flags: { trend: true },
      objects: [
        {
          id: "trendline",
          kind: "function",
          expr: "a * r^(x - 1)",
          label: "u(n) = a·r^(n−1)",
          dash: 2,
          palette: 3,
          requires: "trend",
        },
        ...Array.from({ length: 8 }, (_, i) => {
          const n = i + 1;
          return {
            id: `gpt-${n}`,
            kind: "point" as const,
            x: n,
            y: `a * (r^(${n} - 1))`,
            label: `u${n}`,
            showCoords: true,
            palette: 0 as const,
          };
        }),
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const a = scope.a ?? 1;
    const r = scope.r ?? 1.5;
    const N = Math.max(1, Math.round(scope.N ?? 6));

    const uN = a * Math.pow(r, N - 1);
    const sN = r === 1 ? a * N : (a * (1 - Math.pow(r, N))) / (1 - r);
    const sInf = Math.abs(r) < 1 ? a / (1 - r) : null;

    return [
      { label: "First Term a", value: formatNumber(a) },
      { label: "Common Ratio r", value: formatNumber(r) },
      { label: `N-th Term u_${N}`, value: formatApprox(uN) },
      { label: `Partial Sum S_${N}`, value: formatApprox(sN) },
      {
        label: "Infinite Sum S_∞",
        value: sInf !== null ? formatApprox(sInf) : "Diverges (|r| ≥ 1)",
      },
    ];
  },
};

export const sequenceConcepts = [arithmeticSequence, geometricSequence];
registerConcepts(sequenceConcepts);
