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

const coinTossSimulation: ConceptDefinition = {
  id: "coin-toss-law",
  category: "probability",
  title: "Coin Toss & Law of Large Numbers",
  summary:
    "Simulate N coin flips — observe convergence of experimental relative frequency to theoretical P(Heads) = 0.5.",
  toggles: [{ key: "theoretical", label: "Show theoretical line P = 0.5" }],
  createScene: () =>
    makeScene({
      title: "Coin Toss Law of Large Numbers",
      conceptId: "coin-toss-law",
      category: "probability",
      viewport: { xmin: 0, xmax: 100, ymin: 0, ymax: 1 },
      parameters: [
        P("trials", 50, 10, 100, 10, "Number of Flips (N)"),
        P("seed", 42, 1, 100, 1, "Simulation Seed"),
      ],
      flags: { theoretical: true },
      objects: [
        {
          id: "theorLine",
          kind: "function",
          expr: "0.5",
          label: "P(Heads) = 0.5",
          dash: 2,
          palette: 1,
          requires: "theoretical",
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const trials = Math.max(1, Math.round(scope.trials ?? 50));
    const seed = scope.seed ?? 42;

    // Deterministic pseudo-random sequence based on seed
    let heads = 0;
    for (let i = 1; i <= trials; i++) {
      const pseudoRand = Math.sin(seed * 1000 + i * 999.1) * 10000;
      if (pseudoRand - Math.floor(pseudoRand) > 0.48) heads++;
    }
    const tails = trials - heads;
    const expProb = heads / trials;
    const error = Math.abs(expProb - 0.5);

    return [
      { label: "Total Flips N", value: String(trials) },
      { label: "Heads Count (H)", value: `${heads} (${formatNumber(expProb * 100, 1)}%)` },
      { label: "Tails Count (T)", value: `${tails} (${formatNumber((1 - expProb) * 100, 1)}%)` },
      { label: "Experimental Probability", value: formatNumber(expProb, 3) },
      { label: "Theoretical Probability", value: "0.500" },
      { label: "Absolute Deviation", value: formatNumber(error, 3) },
      {
        label: "Law of Large Numbers",
        value: "As N → ∞, experimental probability converges to 0.5",
      },
    ];
  },
};

const diceRollSimulation: ConceptDefinition = {
  id: "dice-roll-distribution",
  category: "probability",
  title: "Dice Roll & Uniform Distribution",
  summary:
    "Roll a fair 6-sided die N times — uniform theoretical probability P(X = k) = 1/6 ≈ 0.167.",
  toggles: [],
  createScene: () =>
    makeScene({
      title: "Dice Roll Distribution",
      conceptId: "dice-roll-distribution",
      category: "probability",
      viewport: { xmin: 0, xmax: 7, ymin: 0, ymax: 0.35 },
      parameters: [P("rolls", 120, 30, 300, 30, "Total Rolls (N)")],
      flags: {},
      objects: [
        {
          id: "unifLine",
          kind: "function",
          expr: "1/6",
          label: "P(k) = 1/6 ≈ 0.167",
          dash: 2,
          palette: 1,
        },
      ],
    }),
  readouts: (scene) => {
    const scope = scene.parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {} as Record<string, number>,
    );
    const rolls = Math.max(1, Math.round(scope.rolls ?? 120));

    return [
      { label: "Total Rolls N", value: String(rolls) },
      { label: "Theoretical P(k)", value: "1/6 ≈ 0.167" },
      { label: "Expected per Face", value: formatNumber(rolls / 6, 1) },
      { label: "Sample Space S", value: "{1, 2, 3, 4, 5, 6}" },
    ];
  },
};

export const probabilityConcepts = [coinTossSimulation, diceRollSimulation];
registerConcepts(probabilityConcepts);
