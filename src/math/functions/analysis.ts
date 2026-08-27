/**
 * Numerical analysis helpers.
 *
 * Every value produced here is a numerical approximation; callers must present
 * it as such (see `formatApprox`). Exact symbolic results are out of scope.
 */

export type Fn = (x: number) => number;

/** Central-difference first derivative (O(h^2) accurate). */
export function derivative(f: Fn, x: number, h = 1e-5): number {
  const step = h * Math.max(1, Math.abs(x));
  return (f(x + step) - f(x - step)) / (2 * step);
}

/** Central-difference second derivative. */
export function secondDerivative(f: Fn, x: number, h = 1e-4): number {
  const step = h * Math.max(1, Math.abs(x));
  return (f(x + step) - 2 * f(x) + f(x - step)) / (step * step);
}

/** Composite Simpson's rule. `n` is forced even. */
export function integrate(f: Fn, a: number, b: number, n = 500): number {
  if (a === b) return 0;
  const steps = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / steps;
  let sum = 0;
  for (let i = 0; i <= steps; i += 1) {
    const y = f(a + i * h);
    if (!Number.isFinite(y)) return Number.NaN;
    sum += y * (i === 0 || i === steps ? 1 : i % 2 === 0 ? 2 : 4);
  }
  return (h / 3) * sum;
}

export type RiemannMode = "left" | "right" | "midpoint" | "trapezium";

export type Rectangle = { x0: number; x1: number; height: number };

export function riemannRectangles(f: Fn, a: number, b: number, n: number, mode: RiemannMode): Rectangle[] {
  const rects: Rectangle[] = [];
  const width = (b - a) / n;
  for (let i = 0; i < n; i += 1) {
    const x0 = a + i * width;
    const x1 = x0 + width;
    const height =
      mode === "left"
        ? f(x0)
        : mode === "right"
          ? f(x1)
          : mode === "midpoint"
            ? f((x0 + x1) / 2)
            : (f(x0) + f(x1)) / 2;
    rects.push({ x0, x1, height });
  }
  return rects;
}

export function riemannSum(f: Fn, a: number, b: number, n: number, mode: RiemannMode): number {
  const width = (b - a) / n;
  return riemannRectangles(f, a, b, n, mode).reduce((acc, r) => acc + r.height * width, 0);
}

/** Scan the interval for sign changes, then refine each root by bisection. */
export function findRoots(f: Fn, a: number, b: number, samples = 800): number[] {
  const roots: number[] = [];
  const step = (b - a) / samples;
  let prevX = a;
  let prevY = f(a);
  for (let i = 1; i <= samples; i += 1) {
    const x = a + i * step;
    const y = f(x);
    if (Number.isFinite(prevY) && Number.isFinite(y)) {
      if (prevY === 0) roots.push(prevX);
      else if (prevY * y < 0) {
        // Skip poles: a genuine root keeps |f| small near the crossing.
        const root = bisect(f, prevX, x);
        if (Number.isFinite(root) && Math.abs(f(root)) < 1e-6) roots.push(root);
      }
    }
    prevX = x;
    prevY = y;
  }
  return dedupe(roots);
}

function bisect(f: Fn, lo: number, hi: number, iterations = 80): number {
  let a = lo;
  let b = hi;
  let fa = f(a);
  for (let i = 0; i < iterations; i += 1) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (fm === 0) return mid;
    if (fa * fm < 0) b = mid;
    else {
      a = mid;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

/** Stationary points: roots of f'. Classified with f''. */
export function stationaryPoints(
  f: Fn,
  a: number,
  b: number,
): Array<{ x: number; y: number; kind: "maximum" | "minimum" | "inflection" }> {
  return findRoots((x) => derivative(f, x), a, b, 600).map((x) => {
    const curvature = secondDerivative(f, x);
    const kind = curvature > 1e-4 ? "minimum" : curvature < -1e-4 ? "maximum" : "inflection";
    return { x, y: f(x), kind };
  });
}

/** Numerical intersections of two functions on an interval. */
export function intersections(f: Fn, g: Fn, a: number, b: number): Array<{ x: number; y: number }> {
  return findRoots((x) => f(x) - g(x), a, b).map((x) => ({ x, y: f(x) }));
}

function dedupe(values: number[], tolerance = 1e-4): number[] {
  const out: number[] = [];
  for (const v of values.sort((p, q) => p - q)) {
    if (!out.length || Math.abs(v - out[out.length - 1]!) > tolerance) out.push(v);
  }
  return out;
}

/** Round for display. Returns "—" for undefined values. */
export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** Prefix with ≈ when the displayed value has been rounded. */
export function formatApprox(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(digits));
  return (rounded === value ? "" : "≈ ") + formatNumber(value, digits);
}
