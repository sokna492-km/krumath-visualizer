/**
 * Math Scene data model.
 *
 * A scene is fully serialisable JSON: it is the unit of save / load / share.
 * Keep it declarative — the rendering engine reads it, nothing else.
 */

export type NumberOrExpr = number | string;

export type ParameterUnit = "number" | "degrees";

export type Parameter = {
  name: string;
  label?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: ParameterUnit;
};

/** Palette slot index. Objects also differ by dash pattern so colour is never the only cue. */
export type PaletteSlot = 0 | 1 | 2 | 3 | 4 | 5;
export type DashPattern = 0 | 1 | 2 | 3;

type Base = {
  id: string;
  label?: string;
  visible?: boolean;
  /** Only rendered when this flag is enabled in `scene.flags`. */
  requires?: string;
  palette?: PaletteSlot;
};

export type FunctionObject = Base & {
  kind: "function";
  expr: string;
  dash?: DashPattern;
  showRoots?: boolean;
  showStationary?: boolean;
  showEquation?: boolean;
};

export type PointObject = Base & {
  kind: "point";
  x: NumberOrExpr;
  y: NumberOrExpr;
  draggable?: boolean;
  showCoords?: boolean;
};

export type GliderObject = Base & {
  kind: "glider";
  /** id of a `function` object the glider slides along. */
  fn: string;
  x: number;
  showTangent?: boolean;
  showNormal?: boolean;
  showCoords?: boolean;
};

export type LineObject = Base & {
  kind: "line";
  p1: string;
  p2: string;
  mode: "line" | "segment" | "ray";
  dash?: DashPattern;
  showGradientTriangle?: boolean;
  showLength?: boolean;
};

export type CircleObject = Base & {
  kind: "circle";
  cx: NumberOrExpr;
  cy: NumberOrExpr;
  r: NumberOrExpr;
  draggable?: boolean;
  showRadius?: boolean;
};

export type PolygonObject = Base & {
  kind: "polygon";
  vertices: Array<[number, number]>;
  vertexLabels?: string[];
  draggable?: boolean;
  showMeasurements?: boolean;
};

export type VectorObject = Base & {
  kind: "vector";
  from: [NumberOrExpr, NumberOrExpr];
  to: [NumberOrExpr, NumberOrExpr];
  draggable?: boolean;
  dash?: DashPattern;
  showComponents?: boolean;
};

export type InequalityObject = Base & {
  kind: "inequality";
  /** Right-hand side in terms of x, e.g. "2x + 1" for `y > 2x + 1`. */
  expr: string;
  op: "<" | "<=" | ">" | ">=";
};

export type IntegralObject = Base & {
  kind: "integral";
  fn: string;
  a: NumberOrExpr;
  b: NumberOrExpr;
};

export type RiemannObject = Base & {
  kind: "riemann";
  fn: string;
  a: NumberOrExpr;
  b: NumberOrExpr;
  n: NumberOrExpr;
  mode: "left" | "right" | "midpoint" | "trapezium";
};

export type DerivativeObject = Base & {
  kind: "derivative";
  fn: string;
  order: 1 | 2;
  dash?: DashPattern;
};

export type TransformObject = Base & {
  kind: "transform";
  /** id of a `polygon` object. */
  source: string;
  type: "translate" | "reflect" | "rotate" | "enlarge";
  /** translate: dx, dy | reflect: axis | rotate: cx, cy, angle | enlarge: cx, cy, k */
  dx?: NumberOrExpr;
  dy?: NumberOrExpr;
  axis?: "x" | "y" | "y=x" | "y=-x";
  cx?: NumberOrExpr;
  cy?: NumberOrExpr;
  angle?: NumberOrExpr;
  k?: NumberOrExpr;
};

export type TextObject = Base & {
  kind: "text";
  x: NumberOrExpr;
  y: NumberOrExpr;
  text: string;
  draggable?: boolean;
};

export type MathObject =
  | FunctionObject
  | PointObject
  | GliderObject
  | LineObject
  | CircleObject
  | PolygonObject
  | VectorObject
  | InequalityObject
  | IntegralObject
  | RiemannObject
  | DerivativeObject
  | TransformObject
  | TextObject;

export type Viewport = { xmin: number; xmax: number; ymin: number; ymax: number };

export type SceneSettings = {
  showGrid: boolean;
  showAxes: boolean;
  showAxisLabels: boolean;
  equalAspect: boolean;
  angleUnit: "degrees" | "radians";
};

export type AnimationSettings = {
  /** parameter name being animated, or null */
  target: string | null;
  from: number;
  to: number;
  /** seconds for one sweep */
  duration: number;
  loop: "once" | "loop" | "pingpong";
  speed: number;
};

export type Annotation = {
  id: string;
  text: string;
  x: number;
  y: number;
};

export type MathScene = {
  id: string;
  title: string;
  conceptId: string;
  category: string;
  viewport: Viewport;
  objects: MathObject[];
  parameters: Parameter[];
  annotations: Annotation[];
  /** Toggleable feature flags referenced by `MathObject.requires`. */
  flags: Record<string, boolean>;
  settings: SceneSettings;
  animation: AnimationSettings;
};

export const defaultSettings: SceneSettings = {
  showGrid: true,
  showAxes: true,
  showAxisLabels: true,
  equalAspect: true,
  angleUnit: "degrees",
};

export const defaultAnimation: AnimationSettings = {
  target: null,
  from: -5,
  to: 5,
  duration: 4,
  loop: "pingpong",
  speed: 1,
};

export function makeScene(scene: Omit<MathScene, "id" | "annotations" | "settings" | "animation"> &
  Partial<Pick<MathScene, "id" | "annotations" | "settings" | "animation">>): MathScene {
  return {
    id: scene.id ?? `${scene.conceptId}-${Date.now().toString(36)}`,
    annotations: scene.annotations ?? [],
    settings: { ...defaultSettings, ...scene.settings },
    animation: { ...defaultAnimation, ...scene.animation },
    ...scene,
  } as MathScene;
}
