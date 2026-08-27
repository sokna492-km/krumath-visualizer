import type { MathScene } from "../types/scene";

export type Readout = { label: string; value: string; hint?: string };

export type ConceptToggle = { key: string; label: string };

export type ConceptDefinition = {
  id: string;
  category: CategoryId;
  title: string;
  /** One-line teaching summary shown in the sidebar and header. */
  summary: string;
  createScene: () => MathScene;
  /** Optional toggles surfaced in the control panel; keys map to `scene.flags`. */
  toggles?: ConceptToggle[];
  /** Live measurements derived from the scene, shown in the readout strip. */
  readouts?: (scene: MathScene) => Readout[];
};

export type CategoryId =
  | "functions"
  | "coordinate"
  | "geometry"
  | "transformations"
  | "vectors"
  | "trigonometry"
  | "calculus"
  | "inequalities"
  | "sequences"
  | "statistics"
  | "probability";

export type Category = { id: CategoryId; title: string };

export const categories: Category[] = [
  { id: "functions", title: "Functions" },
  { id: "coordinate", title: "Coordinate Geometry" },
  { id: "geometry", title: "Geometry" },
  { id: "transformations", title: "Transformations" },
  { id: "vectors", title: "Vectors" },
  { id: "trigonometry", title: "Trigonometry" },
  { id: "calculus", title: "Calculus" },
  { id: "inequalities", title: "Inequalities" },
  { id: "sequences", title: "Sequences & Series" },
  { id: "statistics", title: "Statistics" },
  { id: "probability", title: "Probability" },
];

const registry = new Map<string, ConceptDefinition>();

/** Adding a concept requires no changes to core components. */
export function registerConcept(concept: ConceptDefinition): ConceptDefinition {
  registry.set(concept.id, concept);
  return concept;
}

export function registerConcepts(concepts: ConceptDefinition[]): void {
  concepts.forEach(registerConcept);
}

export function getConcept(id: string): ConceptDefinition | undefined {
  return registry.get(id);
}

export function allConcepts(): ConceptDefinition[] {
  return [...registry.values()];
}

export function conceptsByCategory(category: CategoryId): ConceptDefinition[] {
  return allConcepts().filter((c) => c.category === category);
}
