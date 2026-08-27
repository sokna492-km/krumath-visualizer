import { compileExpression, type CompiledExpression } from "@/math/parser/expression";
import type { MathScene, NumberOrExpr, Parameter } from "../types/scene";

const cache = new Map<string, CompiledExpression>();

function compileCached(source: string): CompiledExpression | null {
  const hit = cache.get(source);
  if (hit) return hit;
  try {
    const compiled = compileExpression(source);
    cache.set(source, compiled);
    return compiled;
  } catch {
    return null;
  }
}

export type Scope = Record<string, number>;

export function scopeFromParameters(parameters: Parameter[]): Scope {
  return Object.fromEntries(parameters.map((p) => [p.name, p.value]));
}

/** Resolve a scene value that may be a literal number or a parameter expression. */
export function resolveValue(value: NumberOrExpr | undefined, scope: Scope, fallback = 0): number {
  if (value === undefined) return fallback;
  if (typeof value === "number") return value;
  const compiled = compileCached(value);
  if (!compiled) return fallback;
  const result = compiled.evaluate(0, scope);
  return Number.isFinite(result) ? result : fallback;
}

/** Build a plotting function for an expression, reading parameters from a live scope getter. */
export function makePlotFunction(expr: string, getScope: () => Scope): (x: number) => number {
  const compiled = compileCached(expr);
  if (!compiled) return () => Number.NaN;
  return (x: number) => compiled.evaluate(x, getScope());
}

export function isObjectVisible(scene: MathScene, requires?: string, visible?: boolean): boolean {
  if (visible === false) return false;
  if (!requires) return true;
  return scene.flags[requires] === true;
}
