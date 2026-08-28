import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import type {
  MathScene,
  MathObject,
  FunctionObject,
  PointObject,
  GliderObject,
  LineObject,
  CircleObject,
  PolygonObject,
  VectorObject,
  InequalityObject,
  IntegralObject,
  RiemannObject,
  TransformObject,
  TextObject,
} from "../types/scene";
import {
  scopeFromParameters,
  resolveValue,
  isObjectVisible,
  makePlotFunction,
} from "../engine/values";
import {
  derivative,
  formatApprox,
  formatNumber,
  riemannRectangles,
} from "@/math/functions/analysis";

interface VisualizerCanvasProps {
  scene: MathScene;
  onUpdatePoint?: (pointId: string, x: number, y: number) => void;
  onUpdateGlider?: (gliderId: string, x: number) => void;
  onUpdateViewport?: (viewport: { xmin: number; xmax: number; ymin: number; ymax: number }) => void;
  isPresentationMode?: boolean;
}

interface HoverInfo {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  label?: string;
  sourceType?: string;
  color?: string;
}

const PALETTE = [
  "#2563eb", // 0: primary blue
  "#dc2626", // 1: red/accent
  "#16a34a", // 2: green
  "#d97706", // 3: amber/yellow
  "#8b5cf6", // 4: purple
  "#0891b2", // 5: cyan
];

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  scene,
  onUpdatePoint,
  onUpdateGlider,
  onUpdateViewport,
  isPresentationMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const arrowId = useId();
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [dragVertexIndex, setDragVertexIndex] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setSize({
            width: Math.round(entry.contentRect.width),
            height: Math.max(400, Math.round(entry.contentRect.height)),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { xmin, xmax, ymin, ymax } = scene.viewport;
  const scope = scopeFromParameters(scene.parameters);

  // Coordinate transformations
  const toScreenX = useCallback(
    (x: number) => ((x - xmin) / (xmax - xmin)) * size.width,
    [xmin, xmax, size.width],
  );
  const toScreenY = useCallback(
    (y: number) => size.height - ((y - ymin) / (ymax - ymin)) * size.height,
    [ymin, ymax, size.height],
  );
  const toMathX = useCallback(
    (sx: number) => xmin + (sx / size.width) * (xmax - xmin),
    [xmin, xmax, size.width],
  );
  const toMathY = useCallback(
    (sy: number) => ymin + ((size.height - sy) / size.height) * (ymax - ymin),
    [ymin, ymax, size.height],
  );

  // Mouse / Touch Dragging
  const handlePointerDown = (id: string, e: React.PointerEvent, vertexIdx?: number) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggedObjectId(id);
    if (vertexIdx !== undefined) {
      setDragVertexIndex(vertexIdx);
    } else {
      setDragVertexIndex(null);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && panStart && onUpdateViewport) {
      const dxScreen = e.clientX - panStart.x;
      const dyScreen = e.clientY - panStart.y;
      const dxMath = (dxScreen / size.width) * (xmax - xmin);
      const dyMath = (dyScreen / size.height) * (ymax - ymin);
      onUpdateViewport({
        xmin: xmin - dxMath,
        xmax: xmax - dxMath,
        ymin: ymin + dyMath,
        ymax: ymax + dyMath,
      });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!draggedObjectId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const mathX = Number(toMathX(sx).toFixed(2));
    const mathY = Number(toMathY(sy).toFixed(2));

    const obj = scene.objects.find((o) => o.id === draggedObjectId);
    if (!obj) return;

    if (obj.kind === "point" && onUpdatePoint) {
      onUpdatePoint(draggedObjectId, mathX, mathY);
    } else if (obj.kind === "glider" && onUpdateGlider) {
      onUpdateGlider(draggedObjectId, mathX);
    } else if (obj.kind === "polygon" && dragVertexIndex !== null && onUpdatePoint) {
      const poly = obj as PolygonObject;
      const newVertices = [...poly.vertices];
      newVertices[dragVertexIndex] = [mathX, mathY];
      (poly as { vertices: Array<[number, number]> }).vertices = newVertices;
      // Trigger update point with a dummy ID to refresh parent scene
      onUpdatePoint(`_poly_${draggedObjectId}_${dragVertexIndex}`, mathX, mathY);
    }
  };

  const handlePointerUp = () => {
    if (draggedObjectId) {
      setDraggedObjectId(null);
      setDragVertexIndex(null);
    }
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!onUpdateViewport) return;
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const midX = (xmin + xmax) / 2;
    const midY = (ymin + ymax) / 2;
    const rangeX = (xmax - xmin) * zoomFactor;
    const rangeY = (ymax - ymin) * zoomFactor;
    onUpdateViewport({
      xmin: midX - rangeX / 2,
      xmax: midX + rangeX / 2,
      ymin: midY - rangeY / 2,
      ymax: midY + rangeY / 2,
    });
  };

  // Helper function to resolve point coordinates
  const getPointCoords = useCallback(
    (id: string): [number, number] => {
      const obj = scene.objects.find((o) => o.id === id);
      if (!obj) return [0, 0];
      if (obj.kind === "point") {
        return [resolveValue(obj.x, scope), resolveValue(obj.y, scope)];
      }
      if (obj.kind === "glider") {
        const fnObj = scene.objects.find((o) => o.id === obj.fn) as FunctionObject | undefined;
        if (!fnObj) return [obj.x, 0];
        const f = makePlotFunction(fnObj.expr, () => scope);
        return [obj.x, f(obj.x)];
      }
      return [0, 0];
    },
    [scene.objects, scope],
  );

  // Render Grid and Axes
  const renderGridAndAxes = () => {
    if (!scene.settings?.showGrid && !scene.settings?.showAxes) return null;

    const gridLines = [];
    const ticks = [];
    const stepX = Math.pow(10, Math.floor(Math.log10((xmax - xmin) / 5)));
    const stepY = Math.pow(10, Math.floor(Math.log10((ymax - ymin) / 5)));

    if (scene.settings?.showGrid !== false) {
      const startX = Math.ceil(xmin / stepX) * stepX;
      for (let x = startX; x <= xmax; x += stepX) {
        const sx = toScreenX(x);
        gridLines.push(
          <line
            key={`gx-${x}`}
            x1={sx}
            y1={0}
            x2={sx}
            y2={size.height}
            stroke="var(--color-border)"
            strokeOpacity={0.4}
            strokeWidth={1}
          />,
        );
        if (Math.abs(x) > 1e-6 && scene.settings?.showAxisLabels !== false) {
          ticks.push(
            <text
              key={`tx-${x}`}
              x={sx}
              y={Math.min(size.height - 6, Math.max(16, toScreenY(0) + 16))}
              fontSize={isPresentationMode ? 13 : 11}
              fill="var(--color-muted-foreground)"
              textAnchor="middle"
            >
              {formatNumber(x, 1)}
            </text>,
          );
        }
      }

      const startY = Math.ceil(ymin / stepY) * stepY;
      for (let y = startY; y <= ymax; y += stepY) {
        const sy = toScreenY(y);
        gridLines.push(
          <line
            key={`gy-${y}`}
            x1={0}
            y1={sy}
            x2={size.width}
            y2={sy}
            stroke="var(--color-border)"
            strokeOpacity={0.4}
            strokeWidth={1}
          />,
        );
        if (Math.abs(y) > 1e-6 && scene.settings?.showAxisLabels !== false) {
          ticks.push(
            <text
              key={`ty-${y}`}
              x={Math.min(size.width - 8, Math.max(24, toScreenX(0) - 8))}
              y={sy + 4}
              fontSize={isPresentationMode ? 13 : 11}
              fill="var(--color-muted-foreground)"
              textAnchor="end"
            >
              {formatNumber(y, 1)}
            </text>,
          );
        }
      }
    }

    const originX = toScreenX(0);
    const originY = toScreenY(0);

    return (
      <g className="axes-grid">
        {gridLines}
        {scene.settings?.showAxes !== false && (
          <>
            <line
              x1={0}
              y1={originY}
              x2={size.width}
              y2={originY}
              stroke="var(--color-foreground)"
              strokeWidth={isPresentationMode ? 2 : 1.5}
            />
            <line
              x1={originX}
              y1={0}
              x2={originX}
              y2={size.height}
              stroke="var(--color-foreground)"
              strokeWidth={isPresentationMode ? 2 : 1.5}
            />
          </>
        )}
        {ticks}
      </g>
    );
  };

  const renderObject = (obj: MathObject) => {
    if (!isObjectVisible(scene, obj.requires, obj.visible)) return null;
    const color = PALETTE[obj.palette ?? 0];

    switch (obj.kind) {
      case "function": {
        const fnObj = obj as FunctionObject;
        const f = makePlotFunction(fnObj.expr, () => scope);
        const numSamples = 300;
        const pathPoints: string[] = [];
        let isSegmentStarted = false;

        for (let i = 0; i <= numSamples; i++) {
          const x = xmin + (i / numSamples) * (xmax - xmin);
          const y = f(x);
          // Check finite and reasonable bound to prevent vertical asymptote crossing
          if (Number.isFinite(y) && y >= ymin - 20 && y <= ymax + 20) {
            const sx = toScreenX(x);
            const sy = toScreenY(y);
            pathPoints.push(`${isSegmentStarted ? "L" : "M"} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
            isSegmentStarted = true;
          } else {
            isSegmentStarted = false;
          }
        }

        const handleFunctionHover = (e: React.PointerEvent) => {
          if (draggedObjectId || isPanning || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const mouseScreenX = e.clientX - rect.left;
          const mathX = toMathX(mouseScreenX);
          const mathY = f(mathX);
          if (Number.isFinite(mathY)) {
            const screenX = toScreenX(mathX);
            const screenY = toScreenY(mathY);
            setHoverInfo({
              x: mathX,
              y: mathY,
              screenX,
              screenY,
              label: fnObj.label || (fnObj.expr ? `y = ${fnObj.expr}` : "f(x)"),
              sourceType: "function",
              color,
            });
          }
        };

        return (
          <g key={obj.id}>
            {/* Visual Line */}
            <path
              d={pathPoints.join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={isPresentationMode ? 3.5 : 2.5}
              strokeDasharray={fnObj.dash ? `${fnObj.dash * 3},${fnObj.dash * 3}` : undefined}
            />
            {/* Wide Invisible Hit Area for Hover Tooltip */}
            <path
              d={pathPoints.join(" ")}
              fill="none"
              stroke="transparent"
              strokeWidth={22}
              className="cursor-crosshair"
              onPointerMove={handleFunctionHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            {fnObj.showEquation && fnObj.label && (
              <text
                x={toScreenX(xmax - 1.5)}
                y={toScreenY(f(xmax - 1.5) || 0) - 10}
                fill={color}
                fontSize={isPresentationMode ? 14 : 12}
                fontWeight="bold"
              >
                {fnObj.label}
              </text>
            )}
          </g>
        );
      }

      case "point": {
        const ptObj = obj as PointObject;
        const x = resolveValue(ptObj.x, scope);
        const y = resolveValue(ptObj.y, scope);
        const sx = toScreenX(x);
        const sy = toScreenY(y);

        const handlePointHover = () => {
          if (draggedObjectId || isPanning) return;
          setHoverInfo({
            x,
            y,
            screenX: sx,
            screenY: sy,
            label: ptObj.label || "Point",
            sourceType: "point",
            color,
          });
        };

        return (
          <g
            key={obj.id}
            className={ptObj.draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
            onPointerDown={(e) => ptObj.draggable && handlePointerDown(obj.id, e)}
            onPointerEnter={handlePointHover}
            onPointerLeave={() => setHoverInfo(null)}
          >
            <circle
              cx={sx}
              cy={sy}
              r={isPresentationMode ? 8 : 6}
              fill={color}
              stroke="#ffffff"
              strokeWidth={2}
            />
            {ptObj.label && (
              <text
                x={sx + 10}
                y={sy - 10}
                fill={color}
                fontSize={isPresentationMode ? 14 : 12}
                fontWeight="semibold"
                className="select-none"
              >
                {ptObj.label} {ptObj.showCoords ? `(${formatNumber(x)}, ${formatNumber(y)})` : ""}
              </text>
            )}
          </g>
        );
      }

      case "glider": {
        const gliderObj = obj as GliderObject;
        const fnObj = scene.objects.find((o) => o.id === gliderObj.fn) as
          FunctionObject | undefined;
        if (!fnObj) return null;
        const f = makePlotFunction(fnObj.expr, () => scope);
        const x = gliderObj.x;
        const y = f(x);
        const sx = toScreenX(x);
        const sy = toScreenY(y);

        // Tangent line calculation
        const m = derivative(f, x);
        const tanDx = 3;
        const x1 = x - tanDx;
        const y1 = y - m * tanDx;
        const x2 = x + tanDx;
        const y2 = y + m * tanDx;

        const handleGliderHover = () => {
          if (draggedObjectId || isPanning) return;
          setHoverInfo({
            x,
            y,
            screenX: sx,
            screenY: sy,
            label: `${gliderObj.label || "Glider P"} (Slope m = ${formatApprox(m)})`,
            sourceType: "point",
            color: "#dc2626",
          });
        };

        const handleTangentHover = (e: React.PointerEvent) => {
          if (draggedObjectId || isPanning || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = toMathX(e.clientX - rect.left);
          const tanY = y + m * (mouseX - x);
          setHoverInfo({
            x: mouseX,
            y: tanY,
            screenX: toScreenX(mouseX),
            screenY: toScreenY(tanY),
            label: `Tangent Line (m = ${formatApprox(m)})`,
            sourceType: "line",
            color: "#dc2626",
          });
        };

        return (
          <g key={obj.id}>
            {gliderObj.showTangent && (
              <>
                <line
                  x1={toScreenX(x1)}
                  y1={toScreenY(y1)}
                  x2={toScreenX(x2)}
                  y2={toScreenY(y2)}
                  stroke="#dc2626"
                  strokeWidth={isPresentationMode ? 2.5 : 2}
                  strokeDasharray="4,4"
                />
                <line
                  x1={toScreenX(x1)}
                  y1={toScreenY(y1)}
                  x2={toScreenX(x2)}
                  y2={toScreenY(y2)}
                  stroke="transparent"
                  strokeWidth={20}
                  className="cursor-crosshair"
                  onPointerMove={handleTangentHover}
                  onPointerLeave={() => setHoverInfo(null)}
                />
              </>
            )}
            <circle
              cx={sx}
              cy={sy}
              r={isPresentationMode ? 9 : 7}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth={2}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => handlePointerDown(obj.id, e)}
              onPointerEnter={handleGliderHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            <text
              x={sx + 10}
              y={sy - 10}
              fill="#dc2626"
              fontSize={isPresentationMode ? 14 : 12}
              fontWeight="bold"
            >
              {gliderObj.label || "P"} ({formatApprox(x)}, {formatApprox(y)})
            </text>
          </g>
        );
      }

      case "line": {
        const lineObj = obj as LineObject;
        const [x1, y1] = getPointCoords(lineObj.p1);
        const [x2, y2] = getPointCoords(lineObj.p2);
        const sx1 = toScreenX(x1);
        const sy1 = toScreenY(y1);
        const sx2 = toScreenX(x2);
        const sy2 = toScreenY(y2);

        const handleLineHover = (e: React.PointerEvent) => {
          if (draggedObjectId || isPanning || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = toMathX(e.clientX - rect.left);
          const mouseY = toMathY(e.clientY - rect.top);
          const dx = x2 - x1;
          const dy = y2 - y1;
          const lenSq = dx * dx + dy * dy;
          let t = 0.5;
          if (lenSq > 1e-8) {
            t = Math.max(0, Math.min(1, ((mouseX - x1) * dx + (mouseY - y1) * dy) / lenSq));
          }
          const mathX = x1 + t * dx;
          const mathY = y1 + t * dy;
          setHoverInfo({
            x: mathX,
            y: mathY,
            screenX: toScreenX(mathX),
            screenY: toScreenY(mathY),
            label: lineObj.label || "Line Segment",
            sourceType: "line",
            color,
          });
        };

        return (
          <g key={obj.id}>
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke={color}
              strokeWidth={isPresentationMode ? 2.5 : 2}
              strokeDasharray={lineObj.dash ? `${lineObj.dash * 3},${lineObj.dash * 3}` : undefined}
            />
            {/* Wide Invisible Hit Area for Hover Tooltip */}
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke="transparent"
              strokeWidth={20}
              className="cursor-crosshair"
              onPointerMove={handleLineHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            {lineObj.label && (
              <text
                x={(sx1 + sx2) / 2 + 8}
                y={(sy1 + sy2) / 2 - 8}
                fill={color}
                fontSize={isPresentationMode ? 13 : 11}
              >
                {lineObj.label}
              </text>
            )}
          </g>
        );
      }

      case "circle": {
        const circObj = obj as CircleObject;
        const cx = resolveValue(circObj.cx, scope);
        const cy = resolveValue(circObj.cy, scope);
        const r = resolveValue(circObj.r, scope);
        const scx = toScreenX(cx);
        const scy = toScreenY(cy);
        const sr = (r / (xmax - xmin)) * size.width;

        const handleCircleHover = (e: React.PointerEvent) => {
          if (draggedObjectId || isPanning || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = toMathX(e.clientX - rect.left);
          const mouseY = toMathY(e.clientY - rect.top);
          const angle = Math.atan2(mouseY - cy, mouseX - cx);
          const mathX = cx + r * Math.cos(angle);
          const mathY = cy + r * Math.sin(angle);
          setHoverInfo({
            x: mathX,
            y: mathY,
            screenX: toScreenX(mathX),
            screenY: toScreenY(mathY),
            label: circObj.label || `Circle (r = ${formatNumber(r, 2)})`,
            sourceType: "circle",
            color,
          });
        };

        return (
          <g key={obj.id}>
            <circle
              cx={scx}
              cy={scy}
              r={sr}
              fill={color}
              fillOpacity={0.08}
              stroke={color}
              strokeWidth={isPresentationMode ? 3 : 2}
            />
            {/* Wide Invisible Circumference Hit Area */}
            <circle
              cx={scx}
              cy={scy}
              r={sr}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              className="cursor-crosshair"
              onPointerMove={handleCircleHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            {/* Center dot */}
            <circle cx={scx} cy={scy} r={4} fill={color} />
            {circObj.showRadius && (
              <>
                <line
                  x1={scx}
                  y1={scy}
                  x2={scx + sr}
                  y2={scy}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray="3,3"
                />
                <text
                  x={scx + sr / 2}
                  y={scy - 6}
                  fill={color}
                  fontSize={isPresentationMode ? 13 : 11}
                  fontWeight="medium"
                  textAnchor="middle"
                >
                  r = {formatNumber(r)}
                </text>
              </>
            )}
          </g>
        );
      }

      case "polygon": {
        const polyObj = obj as PolygonObject;
        const pts = polyObj.vertices;
        const screenPts = pts.map(([vx, vy]) => `${toScreenX(vx)},${toScreenY(vy)}`).join(" ");

        const handlePolygonEdgeHover = (e: React.PointerEvent, idx1: number, idx2: number) => {
          if (draggedObjectId || isPanning || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = toMathX(e.clientX - rect.left);
          const mouseY = toMathY(e.clientY - rect.top);
          const [px1, py1] = pts[idx1];
          const [px2, py2] = pts[idx2];
          const dx = px2 - px1;
          const dy = py2 - py1;
          const lenSq = dx * dx + dy * dy;
          let t = 0.5;
          if (lenSq > 1e-8) {
            t = Math.max(0, Math.min(1, ((mouseX - px1) * dx + (mouseY - py1) * dy) / lenSq));
          }
          const mathX = px1 + t * dx;
          const mathY = py1 + t * dy;
          setHoverInfo({
            x: mathX,
            y: mathY,
            screenX: toScreenX(mathX),
            screenY: toScreenY(mathY),
            label: `Edge ${polyObj.vertexLabels?.[idx1] || String.fromCharCode(65 + idx1)}${polyObj.vertexLabels?.[idx2] || String.fromCharCode(65 + idx2)}`,
            sourceType: "polygon",
            color,
          });
        };

        return (
          <g key={obj.id}>
            <polygon
              points={screenPts}
              fill={color}
              fillOpacity={0.15}
              stroke={color}
              strokeWidth={isPresentationMode ? 3 : 2}
            />
            {/* Invisible Edge Hit Areas */}
            {pts.map(([vx1, vy1], idx) => {
              const [vx2, vy2] = pts[(idx + 1) % pts.length];
              return (
                <line
                  key={`edge-hit-${idx}`}
                  x1={toScreenX(vx1)}
                  y1={toScreenY(vy1)}
                  x2={toScreenX(vx2)}
                  y2={toScreenY(vy2)}
                  stroke="transparent"
                  strokeWidth={18}
                  className="cursor-crosshair"
                  onPointerMove={(e) => handlePolygonEdgeHover(e, idx, (idx + 1) % pts.length)}
                  onPointerLeave={() => setHoverInfo(null)}
                />
              );
            })}
            {/* Draggable vertices */}
            {pts.map(([vx, vy], idx) => {
              const svx = toScreenX(vx);
              const svy = toScreenY(vy);
              const lbl = polyObj.vertexLabels?.[idx] || String.fromCharCode(65 + idx);
              return (
                <g
                  key={`v-${idx}`}
                  className={polyObj.draggable ? "cursor-grab active:cursor-grabbing" : ""}
                  onPointerDown={(e) => polyObj.draggable && handlePointerDown(obj.id, e, idx)}
                  onPointerEnter={() =>
                    setHoverInfo({
                      x: vx,
                      y: vy,
                      screenX: svx,
                      screenY: svy,
                      label: `Vertex ${lbl}`,
                      sourceType: "point",
                      color,
                    })
                  }
                  onPointerLeave={() => setHoverInfo(null)}
                >
                  <circle
                    cx={svx}
                    cy={svy}
                    r={isPresentationMode ? 8 : 6}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  <text
                    x={svx + 10}
                    y={svy - 10}
                    fill={color}
                    fontSize={isPresentationMode ? 14 : 12}
                    fontWeight="bold"
                    className="select-none"
                  >
                    {lbl} ({formatNumber(vx, 1)}, {formatNumber(vy, 1)})
                  </text>
                </g>
              );
            })}
          </g>
        );
      }

      case "transform": {
        const trObj = obj as TransformObject;
        const srcPoly = scene.objects.find((o) => o.id === trObj.source) as
          PolygonObject | undefined;
        if (!srcPoly) return null;

        const srcVertices = srcPoly.vertices;
        let transVertices: Array<[number, number]> = [];

        if (trObj.type === "translate") {
          const dx = resolveValue(trObj.dx ?? 0, scope);
          const dy = resolveValue(trObj.dy ?? 0, scope);
          transVertices = srcVertices.map(([vx, vy]) => [vx + dx, vy + dy]);
        } else if (trObj.type === "reflect") {
          // Default reflection across y-axis (x = 0) or x-axis
          transVertices = srcVertices.map(([vx, vy]) => [-vx, vy]);
        } else if (trObj.type === "rotate") {
          const cx = resolveValue(trObj.cx ?? 0, scope);
          const cy = resolveValue(trObj.cy ?? 0, scope);
          const angleDeg = resolveValue(trObj.angle ?? 90, scope);
          const rad = (angleDeg * Math.PI) / 180;
          transVertices = srcVertices.map(([vx, vy]) => {
            const relX = vx - cx;
            const relY = vy - cy;
            const rotX = relX * Math.cos(rad) - relY * Math.sin(rad);
            const rotY = relX * Math.sin(rad) + relY * Math.cos(rad);
            return [cx + rotX, cy + rotY];
          });
        } else if (trObj.type === "enlarge") {
          const cx = resolveValue(trObj.cx ?? 0, scope);
          const cy = resolveValue(trObj.cy ?? 0, scope);
          const k = resolveValue(trObj.k ?? 2, scope);
          transVertices = srcVertices.map(([vx, vy]) => [cx + k * (vx - cx), cy + k * (vy - cy)]);
        }

        const screenPts = transVertices
          .map(([vx, vy]) => `${toScreenX(vx)},${toScreenY(vy)}`)
          .join(" ");

        return (
          <g key={obj.id}>
            <polygon
              points={screenPts}
              fill={color}
              fillOpacity={0.2}
              stroke={color}
              strokeWidth={isPresentationMode ? 3 : 2}
              strokeDasharray="4,4"
            />
            {/* Transformed vertices */}
            {transVertices.map(([vx, vy], idx) => {
              const svx = toScreenX(vx);
              const svy = toScreenY(vy);
              const lbl = (srcPoly.vertexLabels?.[idx] || String.fromCharCode(65 + idx)) + "'";
              return (
                <g key={`tv-${idx}`}>
                  <circle
                    cx={svx}
                    cy={svy}
                    r={isPresentationMode ? 7 : 5}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  <text
                    x={svx + 10}
                    y={svy - 10}
                    fill={color}
                    fontSize={isPresentationMode ? 14 : 12}
                    fontWeight="bold"
                    className="select-none"
                  >
                    {lbl}
                  </text>
                </g>
              );
            })}
          </g>
        );
      }

      case "vector": {
        const vecObj = obj as VectorObject;
        const fromX = resolveValue(vecObj.from[0], scope);
        const fromY = resolveValue(vecObj.from[1], scope);
        const toX = resolveValue(vecObj.to[0], scope);
        const toY = resolveValue(vecObj.to[1], scope);

        const sx1 = toScreenX(fromX);
        const sy1 = toScreenY(fromY);
        const sx2 = toScreenX(toX);
        const sy2 = toScreenY(toY);

        const handleVectorHover = (e: React.PointerEvent) => {
          if (draggedObjectId || isPanning || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = toMathX(e.clientX - rect.left);
          const mouseY = toMathY(e.clientY - rect.top);
          const dx = toX - fromX;
          const dy = toY - fromY;
          const lenSq = dx * dx + dy * dy;
          let t = 0.5;
          if (lenSq > 1e-8) {
            t = Math.max(0, Math.min(1, ((mouseX - fromX) * dx + (mouseY - fromY) * dy) / lenSq));
          }
          const mathX = fromX + t * dx;
          const mathY = fromY + t * dy;
          const mag = Math.sqrt(dx * dx + dy * dy);
          setHoverInfo({
            x: mathX,
            y: mathY,
            screenX: toScreenX(mathX),
            screenY: toScreenY(mathY),
            label: `${vecObj.label || "Vector"} (Magnitude = ${formatNumber(mag, 2)})`,
            sourceType: "vector",
            color,
          });
        };

        return (
          <g key={obj.id}>
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke={color}
              strokeWidth={isPresentationMode ? 3.5 : 2.5}
              markerEnd={`url(#${arrowId})`}
            />
            {/* Wide Invisible Hit Area */}
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke="transparent"
              strokeWidth={20}
              className="cursor-crosshair"
              onPointerMove={handleVectorHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            {vecObj.label && (
              <text
                x={(sx1 + sx2) / 2 + 10}
                y={(sy1 + sy2) / 2 - 10}
                fill={color}
                fontSize={isPresentationMode ? 14 : 12}
                fontWeight="bold"
              >
                {vecObj.label}
              </text>
            )}
          </g>
        );
      }

      case "inequality": {
        const ineqObj = obj as InequalityObject;
        const f = makePlotFunction(ineqObj.expr, () => scope);
        const numSamples = 100;
        const polyPoints: string[] = [];

        for (let i = 0; i <= numSamples; i++) {
          const x = xmin + (i / numSamples) * (xmax - xmin);
          const y = f(x);
          if (Number.isFinite(y)) {
            polyPoints.push(`${toScreenX(x)} ${toScreenY(y)}`);
          }
        }

        const isAbove = ineqObj.op === ">" || ineqObj.op === ">=";
        const topY = isAbove ? toScreenY(ymax) : toScreenY(ymin);
        const closedPath = [
          `M ${toScreenX(xmin)} ${topY}`,
          ...polyPoints.map((p, idx) => `${idx === 0 ? "L" : "L"} ${p}`),
          `L ${toScreenX(xmax)} ${topY} Z`,
        ].join(" ");

        return (
          <g key={obj.id}>
            <path d={closedPath} fill={color} fillOpacity={0.12} stroke="none" />
          </g>
        );
      }

      case "riemann": {
        const rObj = obj as RiemannObject;
        const fnObj = scene.objects.find((o) => o.id === rObj.fn) as FunctionObject | undefined;
        if (!fnObj) return null;
        const f = makePlotFunction(fnObj.expr, () => scope);
        const a = resolveValue(rObj.a, scope);
        const b = resolveValue(rObj.b, scope);
        const n = Math.max(1, Math.round(resolveValue(rObj.n, scope)));
        const rects = riemannRectangles(f, a, b, n, rObj.mode);

        return (
          <g key={obj.id}>
            {rects.map((rect, idx) => {
              const rx0 = toScreenX(rect.x0);
              const rx1 = toScreenX(rect.x1);
              const ryBase = toScreenY(0);
              const ryHeight = toScreenY(rect.height);
              const rectWidth = rx1 - rx0;
              const rectHeight = Math.abs(ryHeight - ryBase);
              const rectY = Math.min(ryBase, ryHeight);

              return (
                <rect
                  key={`r-${idx}`}
                  x={rx0}
                  y={rectY}
                  width={rectWidth}
                  height={rectHeight}
                  fill={color}
                  fillOpacity={0.25}
                  stroke={color}
                  strokeWidth={1}
                />
              );
            })}
          </g>
        );
      }

      case "integral": {
        const intObj = obj as IntegralObject;
        const fnObj = scene.objects.find((o) => o.id === intObj.fn) as FunctionObject | undefined;
        if (!fnObj) return null;
        const f = makePlotFunction(fnObj.expr, () => scope);
        const a = resolveValue(intObj.a, scope);
        const b = resolveValue(intObj.b, scope);
        const samples = 100;
        const polyPoints: string[] = [`M ${toScreenX(a)} ${toScreenY(0)}`];

        for (let i = 0; i <= samples; i++) {
          const x = a + (i / samples) * (b - a);
          polyPoints.push(`L ${toScreenX(x)} ${toScreenY(f(x))}`);
        }
        polyPoints.push(`L ${toScreenX(b)} ${toScreenY(0)} Z`);

        return (
          <path
            key={obj.id}
            d={polyPoints.join(" ")}
            fill={color}
            fillOpacity={0.15}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="2,2"
          />
        );
      }

      case "text": {
        const txtObj = obj as TextObject;
        const tx = resolveValue(txtObj.x, scope);
        const ty = resolveValue(txtObj.y, scope);
        return (
          <text
            key={obj.id}
            x={toScreenX(tx)}
            y={toScreenY(ty)}
            fill={color}
            fontSize={isPresentationMode ? 15 : 13}
            fontWeight="semibold"
          >
            {txtObj.text}
          </text>
        );
      }

      default:
        return null;
    }
  };

  // Safe clamping for tooltip position to stay nicely within view
  const tooltipLeft = hoverInfo ? Math.min(Math.max(80, hoverInfo.screenX), size.width - 80) : 0;
  const isNearTop = hoverInfo ? hoverInfo.screenY < 80 : false;
  const tooltipTop = hoverInfo ? (isNearTop ? hoverInfo.screenY + 16 : hoverInfo.screenY - 14) : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[450px] bg-background border rounded-xl shadow-sm overflow-hidden select-none ${
        isPanning ? "cursor-grabbing" : "cursor-crosshair"
      }`}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        if (!draggedObjectId && !isPanning) {
          setHoverInfo(null);
        }
      }}
      onWheel={handleWheel}
    >
      <svg width={size.width} height={size.height} className="block w-full h-full">
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={size.width} height={size.height} />
          </clipPath>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" />
          </marker>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {renderGridAndAxes()}
          {scene.objects.map(renderObject)}

          {/* Interactive Tooltip Snap Indicator & Projection Lines */}
          {hoverInfo && !isPanning && !draggedObjectId && (
            <g className="hover-indicator pointer-events-none" key="hover-guide-overlay">
              {/* Drop-line to X-axis */}
              <line
                x1={hoverInfo.screenX}
                y1={hoverInfo.screenY}
                x2={hoverInfo.screenX}
                y2={toScreenY(0)}
                stroke={hoverInfo.color || "var(--color-foreground)"}
                strokeWidth={1.2}
                strokeDasharray="3,3"
                strokeOpacity={0.65}
              />
              {/* Drop-line to Y-axis */}
              <line
                x1={hoverInfo.screenX}
                y1={hoverInfo.screenY}
                x2={toScreenX(0)}
                y2={hoverInfo.screenY}
                stroke={hoverInfo.color || "var(--color-foreground)"}
                strokeWidth={1.2}
                strokeDasharray="3,3"
                strokeOpacity={0.65}
              />
              {/* Outer soft pulse ring */}
              <circle
                cx={hoverInfo.screenX}
                cy={hoverInfo.screenY}
                r={8}
                fill={hoverInfo.color || "#2563eb"}
                fillOpacity={0.25}
              />
              {/* Inner target point on line */}
              <circle
                cx={hoverInfo.screenX}
                cy={hoverInfo.screenY}
                r={4.5}
                fill={hoverInfo.color || "#2563eb"}
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          )}
        </g>
      </svg>

      {/* Floating Interactive Coordinate Tooltip Card */}
      {hoverInfo && !isPanning && !draggedObjectId && (
        <div
          id="graph-hover-coordinate-tooltip"
          className="absolute pointer-events-none z-30 transition-all duration-75 ease-out -translate-x-1/2"
          style={{
            left: `${tooltipLeft}px`,
            top: `${tooltipTop}px`,
            transform: `translate(-50%, ${isNearTop ? "0%" : "-100%"})`,
          }}
        >
          <div className="bg-popover/95 text-popover-foreground shadow-lg border border-border/80 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex flex-col gap-1 text-xs select-none min-w-[130px]">
            {hoverInfo.label && (
              <div className="flex items-center gap-1.5 font-medium text-[11px] text-muted-foreground border-b border-border/50 pb-0.5">
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: hoverInfo.color || "#2563eb" }}
                />
                <span className="truncate max-w-[160px] font-sans font-semibold text-foreground/90">
                  {hoverInfo.label}
                </span>
              </div>
            )}
            <div className="font-mono font-bold text-foreground text-sm tracking-tight flex items-center justify-center gap-1 py-0.5">
              <span>
                ({formatNumber(hoverInfo.x, 2)}, {formatNumber(hoverInfo.y, 2)})
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/90 font-mono px-0.5 border-t border-border/30 pt-0.5">
              <span>x = {formatNumber(hoverInfo.x, 3)}</span>
              <span>y = {formatNumber(hoverInfo.y, 3)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
