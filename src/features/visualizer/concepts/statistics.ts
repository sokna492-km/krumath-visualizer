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

const univariateStats: ConceptDefinition = {
  id: "box-plot-stats",
  category: "statistics",
  title: "Summary Statistics & Box Plot",
  summary:
    "Mean, Median, Mode, Range, Quartiles (Q1, Q3), IQR, and Five-Number Summary on a dot/box plot.",
  toggles: [
    { key: "mean", label: "Show Mean line (dashed)" },
    { key: "median", label: "Show Median line (solid)" },
    { key: "iqr", label: "Show Interquartile Range (IQR) box" },
  ],
  createScene: () =>
    makeScene({
      title: "Summary Statistics & Box Plot",
      conceptId: "box-plot-stats",
      category: "statistics",
      viewport: { xmin: 0, xmax: 30, ymin: -2, ymax: 6 },
      parameters: [
        P("shift", 0, -5, 5, 1, "Data shift offset"),
        P("spread", 1, 0.5, 2, 0.1, "Data scale/spread"),
      ],
      flags: { mean: true, median: true, iqr: true },
      objects: [
        // Represent sample dataset: [10, 12, 14, 15, 16, 18, 19, 21, 22, 26]
        ...[10, 12, 14, 15, 16, 18, 19, 21, 22, 26].map((baseVal, idx) => ({
          id: `stat-pt-${idx}`,
          kind: "point" as const,
          x: `(${baseVal} + shift) * spread`,
          y: 1,
          label: `${baseVal}`,
          palette: 0 as const,
        })),
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const shift = scope.shift ?? 0;
    const spread = scope.spread ?? 1;

    const baseData = [10, 12, 14, 15, 16, 18, 19, 21, 22, 26];
    const data = baseData.map((x) => (x + shift) * spread).sort((a, b) => a - b);
    const n = data.length;

    const sum = data.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    const min = data[0]!;
    const max = data[n - 1]!;
    const range = max - min;
    const median = (data[4]! + data[5]!) / 2;
    const q1 = data[2]!;
    const q3 = data[7]!;
    const iqr = q3 - q1;

    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return [
      { label: "Sample Size N", value: String(n) },
      { label: "Mean (x̄)", value: formatNumber(mean, 2) },
      { label: "Median (Q2)", value: formatNumber(median, 2) },
      { label: "Standard Deviation (σ)", value: formatNumber(stdDev, 2) },
      {
        label: "Five-Number Summary",
        value: `Min: ${formatNumber(min, 1)}, Q1: ${formatNumber(q1, 1)}, Med: ${formatNumber(median, 1)}, Q3: ${formatNumber(q3, 1)}, Max: ${formatNumber(max, 1)}`,
      },
      { label: "IQR (Q3 − Q1)", value: formatNumber(iqr, 2) },
      { label: "Range (Max − Min)", value: formatNumber(range, 2) },
    ];
  },
};

const scatterRegression: ConceptDefinition = {
  id: "scatter-regression",
  category: "statistics",
  title: "Scatter Plot & Linear Regression",
  summary: "Scatter plot with line of best fit ŷ = mx + c and Pearson correlation coefficient r.",
  toggles: [
    { key: "line", label: "Show line of best fit" },
    { key: "residuals", label: "Show vertical residuals" },
  ],
  createScene: () =>
    makeScene({
      title: "Scatter Plot and Regression",
      conceptId: "scatter-regression",
      category: "statistics",
      viewport: { xmin: 0, xmax: 10, ymin: 0, ymax: 12 },
      parameters: [P("slopeOffset", 0, -1, 1, 0.1, "Slope modifier")],
      flags: { line: true, residuals: false },
      objects: [
        // Data points: (1, 2.2), (2, 3.8), (3, 4.5), (4, 6.2), (5, 6.8), (6, 8.5), (7, 9.2), (8, 10.5)
        ...[
          [1, 2.2],
          [2, 3.8],
          [3, 4.5],
          [4, 6.2],
          [5, 6.8],
          [6, 8.5],
          [7, 9.2],
          [8, 10.5],
        ].map(([x, y], idx) => ({
          id: `scat-${idx}`,
          kind: "point" as const,
          x: x!,
          y: y!,
          palette: 0 as const,
        })),
        {
          id: "regline",
          kind: "function",
          expr: "(1.18 + slopeOffset)*x + 1.1",
          label: "ŷ = mx + c",
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const slopeOffset = scope.slopeOffset ?? 0;
    const m = 1.18 + slopeOffset;
    const c = 1.1;
    const r = 0.992; // high positive correlation

    return [
      { label: "Regression Equation", value: `ŷ = ${formatNumber(m, 2)}x + ${formatNumber(c, 2)}` },
      { label: "Correlation Coefficient r", value: formatNumber(r, 3) },
      { label: "Coefficient of Determination r²", value: formatNumber(r * r, 3) },
      { label: "Correlation Strength", value: "Strong Positive Linear Correlation" },
    ];
  },
};

export const statisticsConcepts = [univariateStats, scatterRegression];
registerConcepts(statisticsConcepts);
