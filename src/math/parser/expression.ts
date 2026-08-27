/**
 * Safe mathematical expression parsing.
 *
 * All teacher-entered text goes through math.js `parse()` / `compile()`.
 * We never use eval() or `new Function()`; math.js evaluates its own AST.
 */
import { parse, type MathNode, type EvalFunction } from "mathjs";

export type CompiledExpression = {
  /** Original source text, e.g. "a*(x-h)^2 + k" */
  source: string;
  /** Free identifiers that are not the plot variable or known constants. */
  variables: string[];
  /** Evaluate at a given x with a parameter scope. Returns NaN when undefined. */
  evaluate: (x: number, scope?: Record<string, number>) => number;
};

const KNOWN_CONSTANTS = new Set(["pi", "e", "tau", "phi", "i", "Infinity", "NaN", "true", "false"]);

/** Identifiers that are functions in math.js and therefore not parameters. */
function isFunctionCallName(node: MathNode, name: string): boolean {
  return node.type === "FunctionNode" && (node as unknown as { fn: { name?: string } }).fn?.name === name;
}

/** Normalise common teacher notation into math.js syntax. */
export function normalizeExpression(input: string): string {
  let s = input.trim();
  // Strip a leading "y =" / "f(x) =" style prefix.
  s = s.replace(/^\s*(y|f|g|h|p|q)\s*(\([^)]*\))?\s*=\s*/i, "");
  s = s
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/∞/g, "Infinity")
    .replace(/ln\s*\(/g, "log(")
    .replace(/\|([^|]+)\|/g, "abs($1)");
  return s;
}

export class ExpressionError extends Error {}

export function compileExpression(source: string, variable = "x"): CompiledExpression {
  const normalized = normalizeExpression(source);
  if (!normalized) throw new ExpressionError("Please enter an equation.");

  let node: MathNode;
  try {
    node = parse(normalized);
  } catch {
    throw new ExpressionError("Please check the equation.");
  }

  let compiled: EvalFunction;
  try {
    compiled = node.compile();
  } catch {
    throw new ExpressionError("Please check the equation.");
  }

  const variables = new Set<string>();
  node.traverse((child, _path, parent) => {
    if (child.type !== "SymbolNode") return;
    const name = (child as unknown as { name: string }).name;
    if (name === variable || KNOWN_CONSTANTS.has(name)) return;
    if (parent && isFunctionCallName(parent, name)) return;
    if (name.length > 3) return; // treat long identifiers as unknown functions, not sliders
    variables.add(name);
  });

  // Fail fast on expressions that cannot be evaluated at all.
  try {
    compiled.evaluate({ [variable]: 1, ...Object.fromEntries([...variables].map((v) => [v, 1])) });
  } catch {
    throw new ExpressionError("Please check the equation.");
  }

  return {
    source: normalized,
    variables: [...variables].sort(),
    evaluate: (x, scope) => {
      try {
        const value = compiled.evaluate({ ...scope, [variable]: x });
        return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
      } catch {
        return Number.NaN;
      }
    },
  };
}

/** Validate without throwing — used by the equation editor for inline feedback. */
export function tryCompile(source: string, variable = "x"):
  | { ok: true; value: CompiledExpression }
  | { ok: false; error: string } {
  try {
    return { ok: true, value: compileExpression(source, variable) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Please check the equation." };
  }
}
