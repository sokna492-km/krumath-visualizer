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
  Parameter,
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
  findRoots,
  riemannRectangles,
} from "@/math/functions/analysis";
import {
  RotateCcw,
  Maximize,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Grid,
  Edit2,
  Check,
  X,
  Plus,
  Minus,
} from "lucide-react";

// Calculate a "nice" step interval based on coordinate range and screen pixel dimension (1, 2, 2.5, 5, 10 × 10^k progression)
function calculateGridSteps(
  range: number,
  pixelDimension: number,
  targetSpacing = 85,
): { majorStep: number; minorStep: number } {
  if (!Number.isFinite(range) || range <= 0 || pixelDimension <= 0) {
    return { majorStep: 1, minorStep: 0.2 };
  }

  const targetIntervals = Math.max(3, Math.min(20, pixelDimension / targetSpacing));
  const rawStep = range / targetIntervals;

  const exponent = Math.floor(Math.log10(rawStep));
  const power = Math.pow(10, exponent);
  const fraction = rawStep / power;

  let factor = 1;
  let minorDivisions = 5;

  if (fraction < 1.4) {
    factor = 1;
    minorDivisions = 5;
  } else if (fraction < 2.8) {
    factor = 2;
    minorDivisions = 4;
  } else if (fraction < 4.5) {
    factor = 2.5;
    minorDivisions = 5;
  } else if (fraction < 7.5) {
    factor = 5;
    minorDivisions = 5;
  } else {
    factor = 10;
    minorDivisions = 5;
  }

  const majorStep = factor * power;
  const minorStep = majorStep / minorDivisions;

  return { majorStep, minorStep };
}

// Dynamically formats a grid tick value with precision matched to the step interval
function formatGridTick(val: number, step: number): string {
  if (Math.abs(val) < 1e-12) return "0";

  const absVal = Math.abs(val);
  if (absVal >= 1e7 || (absVal < 1e-4 && absVal > 0)) {
    return val.toExponential(1);
  }

  let decimals = 0;
  if (step < 1) {
    const stepStr = step.toFixed(8);
    const decimalPart = stepStr.replace(/0+$/, "").split(".")[1];
    decimals = decimalPart ? decimalPart.length : Math.max(0, -Math.floor(Math.log10(step)) + 1);
  }

  const factor = Math.pow(10, Math.min(8, decimals + 2));
  const cleanVal = Math.round(val * factor) / factor;

  const formatted = cleanVal.toFixed(decimals);
  const parsed = parseFloat(formatted);
  return Math.abs(parsed - cleanVal) < 1e-7 ? parsed.toString() : formatted;
}

interface VisualizerCanvasProps {
  scene: MathScene;
  defaultViewport?: { xmin: number; xmax: number; ymin: number; ymax: number };
  onUpdatePoint?: (pointId: string, x: number, y: number) => void;
  onUpdateGlider?: (gliderId: string, x: number) => void;
  onUpdateViewport?: (viewport: { xmin: number; xmax: number; ymin: number; ymax: number }) => void;
  onResetViewport?: () => void;
  onResetScene?: () => void;
  onUpdateParameter?: (name: string, value: number) => void;
  onToggleGrid?: () => void;
  isPresentationMode?: boolean;
  onToggleFullscreen?: () => void;
  resetKey?: number;
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

interface ExactInputTarget {
  type: "y-intercept" | "x-intercept" | "point" | "parameter";
  title: string;
  id?: string;
  paramName?: string;
  currentX?: number;
  currentY?: number;
  label?: string;
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
  defaultViewport,
  onUpdatePoint,
  onUpdateGlider,
  onUpdateViewport,
  onResetViewport,
  onResetScene,
  onUpdateParameter,
  onToggleGrid,
  isPresentationMode = false,
  onToggleFullscreen,
  resetKey = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const arrowId = useId();
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [dragVertexIndex, setDragVertexIndex] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [pointerDownStartPos, setPointerDownStartPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [hasDraggedSignificantly, setHasDraggedSignificantly] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Line & Text Thickness Scaling State (default 1.25x for crisp standard readability, ranges from 0.8x to 3.5x)
  const [thicknessScale, setThicknessScale] = useState<number>(1.25);
  const [isDraggingThickness, setIsDraggingThickness] = useState(false);

  // Reset thickness and state when resetKey changes (external reset triggers)
  useEffect(() => {
    setThicknessScale(1.25);
    setHoverInfo(null);
    setExactInputModal(null);
  }, [resetKey]);

  // Exact Value Input Modal State
  const [exactInputModal, setExactInputModal] = useState<ExactInputTarget | null>(null);
  const [inputValX, setInputValX] = useState("");
  const [inputValY, setInputValY] = useState("");

  // Base combined scale for line thickness & fonts
  const effectiveScale = isPresentationMode ? thicknessScale * 1.25 : thicknessScale;

  // Track browser full screen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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

  // Helper to find parameter for Y-intercept
  const findParamForY = useCallback((): Parameter | undefined => {
    const names = ["c", "b", "k", "d", "y0", "intercept", "offset", "shift", "a"];
    for (const name of names) {
      const p = scene.parameters.find((param) => param.name.toLowerCase() === name.toLowerCase());
      if (p) return p;
    }
    return scene.parameters[0];
  }, [scene.parameters]);

  // Helper to find parameter for X-intercept
  const findParamForX = useCallback((): Parameter | undefined => {
    const names = ["m", "h", "a", "x0", "p", "b", "c"];
    for (const name of names) {
      const p = scene.parameters.find((param) => param.name.toLowerCase() === name.toLowerCase());
      if (p) return p;
    }
    return scene.parameters[0];
  }, [scene.parameters]);

  // Multi-touch pointer tracking for pinch-to-zoom & pan
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Mouse / Touch Dragging
  const handlePointerDown = (id: string, e: React.PointerEvent, vertexIdx?: number) => {
    e.stopPropagation();
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggedObjectId(id);
    setPointerDownStartPos({ x: e.clientX, y: e.clientY });
    setHasDraggedSignificantly(false);
    if (vertexIdx !== undefined) {
      setDragVertexIndex(vertexIdx);
    } else {
      setDragVertexIndex(null);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointersRef.current.size === 2) {
      // Initialize pinch zoom
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartDistRef.current = dist;
      pinchCenterRef.current = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
      setIsPanning(false);
      setPanStart(null);
    } else if (activePointersRef.current.size === 1 && e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPointerDownStartPos({ x: e.clientX, y: e.clientY });
      setHasDraggedSignificantly(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Handle 2-finger Pinch Zoom
    if (activePointersRef.current.size >= 2 && onUpdateViewport && containerRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const currentCenter = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };

      if (pinchStartDistRef.current && pinchStartDistRef.current > 10 && currentDist > 10) {
        const factor = pinchStartDistRef.current / currentDist;
        // Limit zoom step to prevent sudden jumps
        const clampedFactor = Math.max(0.85, Math.min(1.18, factor));

        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = currentCenter.x - rect.left;
        const mouseY = currentCenter.y - rect.top;
        const mathX = toMathX(mouseX);
        const mathY = toMathY(mouseY);

        const newXmin = mathX - (mathX - xmin) * clampedFactor;
        const newXmax = mathX + (xmax - mathX) * clampedFactor;
        const newYmin = mathY - (mathY - ymin) * clampedFactor;
        const newYmax = mathY + (ymax - mathY) * clampedFactor;

        if (newXmax - newXmin > 0.05 && newXmax - newXmin < 500) {
          onUpdateViewport({
            xmin: newXmin,
            xmax: newXmax,
            ymin: newYmin,
            ymax: newYmax,
          });
        }
        pinchStartDistRef.current = currentDist;
      }
      return;
    }

    if (pointerDownStartPos) {
      const dist = Math.hypot(e.clientX - pointerDownStartPos.x, e.clientY - pointerDownStartPos.y);
      if (dist > 4) {
        setHasDraggedSignificantly(true);
      }
    }

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

    // Handle special intercept dragging
    if (draggedObjectId.startsWith("__intercept_y_")) {
      const yParam = findParamForY();
      if (yParam && onUpdateParameter) {
        const clampedY = Math.max(yParam.min, Math.min(yParam.max, mathY));
        onUpdateParameter(yParam.name, Number(clampedY.toFixed(2)));
      }
      if (onUpdatePoint) {
        const yintPoint = scene.objects.find((o) => o.id === "yint");
        if (yintPoint) onUpdatePoint("yint", 0, mathY);
      }
      return;
    }

    if (draggedObjectId.startsWith("__intercept_x_")) {
      const yParam = findParamForY();
      const xParam = findParamForX();

      // If linear function m*x + c:
      if (
        xParam &&
        (xParam.name === "m" || xParam.name === "a") &&
        mathX !== 0 &&
        onUpdateParameter
      ) {
        const cVal = yParam ? yParam.value : (scope["c"] ?? scope["b"] ?? 0);
        const newM = -cVal / mathX;
        const clampedM = Math.max(xParam.min, Math.min(xParam.max, newM));
        onUpdateParameter(xParam.name, Number(clampedM.toFixed(2)));
      } else if (xParam && (xParam.name === "h" || xParam.name === "x0") && onUpdateParameter) {
        const clampedH = Math.max(xParam.min, Math.min(xParam.max, mathX));
        onUpdateParameter(xParam.name, Number(clampedH.toFixed(2)));
      } else if (xParam && onUpdateParameter) {
        const clamped = Math.max(xParam.min, Math.min(xParam.max, mathX));
        onUpdateParameter(xParam.name, Number(clamped.toFixed(2)));
      }

      if (onUpdatePoint) {
        const xintPoint = scene.objects.find((o) => o.id === "xint");
        if (xintPoint) onUpdatePoint("xint", mathX, 0);
      }
      return;
    }

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
      onUpdatePoint(`_poly_${draggedObjectId}_${dragVertexIndex}`, mathX, mathY);
    }
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (e) {
      activePointersRef.current.delete(e.pointerId);
    } else {
      activePointersRef.current.clear();
    }
    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
      pinchCenterRef.current = null;
    }
    if (draggedObjectId) {
      setDraggedObjectId(null);
      setDragVertexIndex(null);
    }
    if (isPanning && activePointersRef.current.size === 0) {
      setIsPanning(false);
      setPanStart(null);
    }
  };

  // Open exact value editor
  const handleOpenExactEditor = (target: ExactInputTarget) => {
    setExactInputModal(target);
    if (target.type === "y-intercept") {
      setInputValY(target.currentY !== undefined ? String(formatNumber(target.currentY, 2)) : "0");
      setInputValX("0");
    } else if (target.type === "x-intercept") {
      setInputValX(target.currentX !== undefined ? String(formatNumber(target.currentX, 2)) : "0");
      setInputValY("0");
    } else {
      setInputValX(target.currentX !== undefined ? String(formatNumber(target.currentX, 2)) : "0");
      setInputValY(target.currentY !== undefined ? String(formatNumber(target.currentY, 2)) : "0");
    }
  };

  // Apply exact value changes
  const handleApplyExactValue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!exactInputModal) return;

    const numX = parseFloat(inputValX);
    const numY = parseFloat(inputValY);

    if (exactInputModal.type === "y-intercept" && !isNaN(numY)) {
      const yParam = findParamForY();
      if (yParam && onUpdateParameter) {
        onUpdateParameter(yParam.name, numY);
      }
      if (onUpdatePoint) {
        onUpdatePoint("yint", 0, numY);
      }
    } else if (exactInputModal.type === "x-intercept" && !isNaN(numX)) {
      const yParam = findParamForY();
      const xParam = findParamForX();
      if (
        xParam &&
        (xParam.name === "m" || xParam.name === "a") &&
        numX !== 0 &&
        onUpdateParameter
      ) {
        const cVal = yParam ? yParam.value : (scope["c"] ?? scope["b"] ?? 0);
        const newM = -cVal / numX;
        onUpdateParameter(xParam.name, Number(newM.toFixed(2)));
      } else if (xParam && (xParam.name === "h" || xParam.name === "x0") && onUpdateParameter) {
        onUpdateParameter(xParam.name, numX);
      } else if (xParam && onUpdateParameter) {
        onUpdateParameter(xParam.name, numX);
      }
      if (onUpdatePoint) {
        onUpdatePoint("xint", numX, 0);
      }
    } else if (exactInputModal.type === "point" && exactInputModal.id && onUpdatePoint) {
      if (!isNaN(numX) && !isNaN(numY)) {
        onUpdatePoint(exactInputModal.id, numX, numY);
      }
    }

    setExactInputModal(null);
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

  // Local Zoom Helper for toolbar buttons
  const handleLocalZoom = (factor: number) => {
    if (!onUpdateViewport) return;
    const midX = (xmin + xmax) / 2;
    const midY = (ymin + ymax) / 2;
    const rangeX = (xmax - xmin) * factor;
    const rangeY = (ymax - ymin) * factor;
    onUpdateViewport({
      xmin: midX - rangeX / 2,
      xmax: midX + rangeX / 2,
      ymin: midY - rangeY / 2,
      ymax: midY + rangeY / 2,
    });
  };

  // Reset View Handler: Reverts to default values, default thickness, and default screen view
  const handleResetView = () => {
    // 1. Reset thickness to default 1.25x
    setThicknessScale(1.25);
    setHoverInfo(null);
    setExactInputModal(null);

    // 2. Reset full scene values / parameters if onResetScene is provided
    if (onResetScene) {
      onResetScene();
    }

    // 3. Reset viewport to default coordinate boundaries
    if (onResetViewport) {
      onResetViewport();
    } else if (onUpdateViewport) {
      const def = defaultViewport || { xmin: -10, xmax: 10, ymin: -8, ymax: 8 };
      onUpdateViewport(def);
    }
  };

  // Fullscreen Handler
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          if (onToggleFullscreen) onToggleFullscreen();
        });
      } else if (onToggleFullscreen) {
        onToggleFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Handle Thickness Vertical Slider Drag
  const handleThicknessDrag = useCallback((clientY: number) => {
    if (!sliderTrackRef.current) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    // Invert: top of track = maximum thickness (3.5x), bottom = minimum thickness (0.8x)
    const ratio = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
    const minScale = 0.8;
    const maxScale = 3.5;
    const newScale = Number((minScale + ratio * (maxScale - minScale)).toFixed(2));
    setThicknessScale(newScale);
  }, []);

  const handleThicknessPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingThickness(true);
    handleThicknessDrag(e.clientY);
  };

  const handleThicknessPointerMove = (e: React.PointerEvent) => {
    if (isDraggingThickness) {
      e.stopPropagation();
      handleThicknessDrag(e.clientY);
    }
  };

  const handleThicknessPointerUp = (e: React.PointerEvent) => {
    if (isDraggingThickness) {
      e.stopPropagation();
      setIsDraggingThickness(false);
    }
  };

  // Helper: Smart collision-aware Badge Renderer for labels and values
  const renderSmartPill = (
    text: string,
    anchorX: number,
    anchorY: number,
    options: {
      color?: string;
      direction?:
        | "top-right"
        | "top-left"
        | "bottom-right"
        | "bottom-left"
        | "top"
        | "bottom"
        | "left"
        | "right";
      fontSize?: number;
      fontWeight?: string;
      offset?: number;
      badgeStyle?: "solid" | "subtle" | "none";
      onClick?: () => void;
      className?: string;
    } = {},
  ) => {
    const {
      color = "var(--color-foreground)",
      direction = "top-right",
      fontSize = Math.max(10, Math.round(11 * Math.sqrt(effectiveScale))),
      fontWeight = "600",
      offset = 8,
      badgeStyle = "solid",
      onClick,
      className = "",
    } = options;

    const charWidth = fontSize * 0.58;
    const paddingX = 6;
    const paddingY = 3;
    const pillWidth = Math.round(text.length * charWidth + paddingX * 2);
    const pillHeight = Math.round(fontSize + paddingY * 2 + 2);

    let rawX = anchorX;
    let rawY = anchorY;

    switch (direction) {
      case "top-right":
        rawX = anchorX + offset;
        rawY = anchorY - pillHeight - offset;
        break;
      case "top-left":
        rawX = anchorX - pillWidth - offset;
        rawY = anchorY - pillHeight - offset;
        break;
      case "bottom-right":
        rawX = anchorX + offset;
        rawY = anchorY + offset;
        break;
      case "bottom-left":
        rawX = anchorX - pillWidth - offset;
        rawY = anchorY + offset;
        break;
      case "top":
        rawX = anchorX - pillWidth / 2;
        rawY = anchorY - pillHeight - offset;
        break;
      case "bottom":
        rawX = anchorX - pillWidth / 2;
        rawY = anchorY + offset;
        break;
      case "left":
        rawX = anchorX - pillWidth - offset;
        rawY = anchorY - pillHeight / 2;
        break;
      case "right":
        rawX = anchorX + offset;
        rawY = anchorY - pillHeight / 2;
        break;
    }

    // Responsive screen bounds clamping with margin
    const margin = 8;
    const clampedX = Math.max(margin, Math.min(size.width - pillWidth - margin, rawX));
    const clampedY = Math.max(margin, Math.min(size.height - pillHeight - margin, rawY));

    return (
      <g className={`select-none pointer-events-none ${className}`} onClick={onClick}>
        {badgeStyle !== "none" && (
          <rect
            x={clampedX}
            y={clampedY}
            width={pillWidth}
            height={pillHeight}
            rx={4}
            fill="var(--color-card)"
            fillOpacity={badgeStyle === "solid" ? 0.94 : 0.85}
            stroke="var(--color-border)"
            strokeWidth={1}
            className="shadow-2xs"
          />
        )}
        <text
          x={clampedX + pillWidth / 2}
          y={clampedY + pillHeight / 2 + fontSize * 0.35}
          fill={color}
          fontSize={fontSize}
          fontWeight={fontWeight}
          textAnchor="middle"
        >
          {text}
        </text>
      </g>
    );
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

  // Render Dynamic Grid and Axes with adaptive density, minor/major subdivisions, and scaled typography
  const renderGridAndAxes = () => {
    if (!scene.settings?.showGrid && !scene.settings?.showAxes) return null;

    const gridLines: React.ReactNode[] = [];
    const ticks: React.ReactNode[] = [];

    // Calculate dynamic "nice" 1-2-5 major and minor step increments based on current pixel dimensions & zoom span
    const targetSpacing = Math.max(65, Math.min(110, 85 * (isPresentationMode ? 1.15 : 1)));
    const { majorStep: stepX, minorStep: minorStepX } = calculateGridSteps(
      xmax - xmin,
      size.width,
      targetSpacing,
    );
    const { majorStep: stepY, minorStep: minorStepY } = calculateGridSteps(
      ymax - ymin,
      size.height,
      targetSpacing,
    );

    const majorGridLineWidth = Math.max(1, Math.round(1 * effectiveScale * 0.85));
    const minorGridLineWidth = Math.max(0.75, Math.round(0.6 * effectiveScale));
    const gridOpacity = Math.min(0.75, 0.42 + (effectiveScale - 1) * 0.12);
    const minorGridOpacity = gridOpacity * 0.35;

    const tickFontSize = Math.max(
      10,
      Math.round((isPresentationMode ? 13 : 11) * Math.sqrt(effectiveScale)),
    );
    const tickFontWeight = effectiveScale >= 1.5 ? "bold" : "medium";
    const axisLineWidth = Math.max(
      1.5,
      Math.round((isPresentationMode ? 2.5 : 1.8) * effectiveScale),
    );

    const originX = toScreenX(0);
    const originY = toScreenY(0);

    const isYAxisOnScreen = originY >= 0 && originY <= size.height;
    const isXAxisOnScreen = originX >= 0 && originX <= size.width;

    // 1. Render Minor Grid Lines (sub-intervals for graph precision)
    if (scene.settings?.showGrid !== false) {
      // Minor X lines
      const minMinorX = Math.ceil((xmin - 1e-9) / minorStepX);
      const maxMinorX = Math.floor((xmax + 1e-9) / minorStepX);
      for (let i = minMinorX; i <= maxMinorX; i++) {
        const x = i * minorStepX;
        const isMajor = Math.abs(x / stepX - Math.round(x / stepX)) < 1e-4;
        if (isMajor) continue;
        const sx = toScreenX(x);
        gridLines.push(
          <line
            key={`gmx-${i}`}
            x1={sx}
            y1={0}
            x2={sx}
            y2={size.height}
            stroke="var(--color-border)"
            strokeOpacity={minorGridOpacity}
            strokeWidth={minorGridLineWidth}
            className="pointer-events-none"
          />,
        );
      }

      // Minor Y lines
      const minMinorY = Math.ceil((ymin - 1e-9) / minorStepY);
      const maxMinorY = Math.floor((ymax + 1e-9) / minorStepY);
      for (let j = minMinorY; j <= maxMinorY; j++) {
        const y = j * minorStepY;
        const isMajor = Math.abs(y / stepY - Math.round(y / stepY)) < 1e-4;
        if (isMajor) continue;
        const sy = toScreenY(y);
        gridLines.push(
          <line
            key={`gmy-${j}`}
            x1={0}
            y1={sy}
            x2={size.width}
            y2={sy}
            stroke="var(--color-border)"
            strokeOpacity={minorGridOpacity}
            strokeWidth={minorGridLineWidth}
            className="pointer-events-none"
          />,
        );
      }
    }

    // 2. Render Major Grid Lines, Axis Ticks, and Numerical Labels
    // Y position for X axis tick labels (pinned to viewport if axis is panned off-screen)
    const xLabelY = isYAxisOnScreen
      ? Math.min(size.height - 10, Math.max(16, originY + 16 + (tickFontSize - 11) * 0.8))
      : originY < 0
        ? 18
        : size.height - 10;

    // X position for Y axis tick labels (pinned to viewport if axis is panned off-screen)
    const yLabelX = isXAxisOnScreen
      ? Math.min(size.width - 10, Math.max(30, originX - 8))
      : originX < 0
        ? 34
        : size.width - 10;

    // Major X grid lines & ticks
    const minMajorX = Math.ceil((xmin - 1e-9) / stepX);
    const maxMajorX = Math.floor((xmax + 1e-9) / stepX);

    for (let i = minMajorX; i <= maxMajorX; i++) {
      const x = i * stepX;
      const sx = toScreenX(x);
      const isAxis = Math.abs(x) < 1e-9;

      if (scene.settings?.showGrid !== false && !isAxis) {
        gridLines.push(
          <line
            key={`gx-${i}`}
            x1={sx}
            y1={0}
            x2={sx}
            y2={size.height}
            stroke="var(--color-border)"
            strokeOpacity={gridOpacity}
            strokeWidth={majorGridLineWidth}
            className="pointer-events-none"
          />,
        );
      }

      // Tick mark on X axis line
      if (scene.settings?.showAxes !== false && isYAxisOnScreen && !isAxis) {
        ticks.push(
          <line
            key={`tick-x-${i}`}
            x1={sx}
            y1={originY - 3.5}
            x2={sx}
            y2={originY + 3.5}
            stroke="var(--color-foreground)"
            strokeWidth={Math.max(1, Math.round(1.2 * effectiveScale))}
            className="pointer-events-none"
          />,
        );
      }

      // Label for X tick
      if (!isAxis && scene.settings?.showAxisLabels !== false) {
        ticks.push(
          <text
            key={`tx-${i}`}
            x={sx}
            y={xLabelY}
            fontSize={tickFontSize}
            fontWeight={tickFontWeight}
            fill="var(--color-muted-foreground)"
            textAnchor="middle"
            className="select-none pointer-events-none"
          >
            {formatGridTick(x, stepX)}
          </text>,
        );
      }
    }

    // Major Y grid lines & ticks
    const minMajorY = Math.ceil((ymin - 1e-9) / stepY);
    const maxMajorY = Math.floor((ymax + 1e-9) / stepY);

    for (let j = minMajorY; j <= maxMajorY; j++) {
      const y = j * stepY;
      const sy = toScreenY(y);
      const isAxis = Math.abs(y) < 1e-9;

      if (scene.settings?.showGrid !== false && !isAxis) {
        gridLines.push(
          <line
            key={`gy-${j}`}
            x1={0}
            y1={sy}
            x2={size.width}
            y2={sy}
            stroke="var(--color-border)"
            strokeOpacity={gridOpacity}
            strokeWidth={majorGridLineWidth}
            className="pointer-events-none"
          />,
        );
      }

      // Tick mark on Y axis line
      if (scene.settings?.showAxes !== false && isXAxisOnScreen && !isAxis) {
        ticks.push(
          <line
            key={`tick-y-${j}`}
            x1={originX - 3.5}
            y1={sy}
            x2={originX + 3.5}
            y2={sy}
            stroke="var(--color-foreground)"
            strokeWidth={Math.max(1, Math.round(1.2 * effectiveScale))}
            className="pointer-events-none"
          />,
        );
      }

      // Label for Y tick
      if (!isAxis && scene.settings?.showAxisLabels !== false) {
        ticks.push(
          <text
            key={`ty-${j}`}
            x={yLabelX}
            y={sy + tickFontSize * 0.35}
            fontSize={tickFontSize}
            fontWeight={tickFontWeight}
            fill="var(--color-muted-foreground)"
            textAnchor="end"
            className="select-none pointer-events-none"
          >
            {formatGridTick(y, stepY)}
          </text>,
        );
      }
    }

    // Origin (0,0) Label
    if (scene.settings?.showAxisLabels !== false && isXAxisOnScreen && isYAxisOnScreen) {
      ticks.push(
        <text
          key="origin-0"
          x={originX - 8}
          y={originY + 16}
          fontSize={tickFontSize}
          fontWeight={tickFontWeight}
          fill="var(--color-muted-foreground)"
          textAnchor="end"
          className="select-none pointer-events-none opacity-85"
        >
          0
        </text>,
      );
    }

    return (
      <g className="axes-grid pointer-events-none">
        {gridLines}
        {scene.settings?.showAxes !== false && (
          <>
            {/* Horizontal X Axis */}
            <line
              x1={0}
              y1={originY}
              x2={size.width}
              y2={originY}
              stroke="var(--color-foreground)"
              strokeWidth={axisLineWidth}
            />
            {/* Vertical Y Axis */}
            <line
              x1={originX}
              y1={0}
              x2={originX}
              y2={size.height}
              stroke="var(--color-foreground)"
              strokeWidth={axisLineWidth}
            />
            {/* Axis Direction Indicators / Name Labels if in view */}
            {isYAxisOnScreen && (
              <text
                x={size.width - 12}
                y={Math.max(16, Math.min(size.height - 8, originY - 8))}
                fill="var(--color-foreground)"
                fontSize={Math.max(11, Math.round(12 * Math.sqrt(effectiveScale)))}
                fontWeight="bold"
                textAnchor="end"
                className="select-none pointer-events-none"
              >
                x
              </text>
            )}
            {isXAxisOnScreen && (
              <text
                x={Math.max(16, Math.min(size.width - 12, originX + 12))}
                y={18}
                fill="var(--color-foreground)"
                fontSize={Math.max(11, Math.round(12 * Math.sqrt(effectiveScale)))}
                fontWeight="bold"
                textAnchor="start"
                className="select-none pointer-events-none"
              >
                y
              </text>
            )}
          </>
        )}
        {ticks}
      </g>
    );
  };

  // Render Interactive Function Intercepts (Y-Intercept & X-Intercepts) with dynamic collision resolution
  const renderFunctionIntercepts = () => {
    const interceptElements: React.ReactNode[] = [];
    const visibleFunctions = scene.objects.filter(
      (o) => o.kind === "function" && isObjectVisible(scene, o.requires, o.visible),
    ) as FunctionObject[];

    const markerRadius = Math.max(5, Math.round(6 * Math.sqrt(effectiveScale)));
    const markerStrokeWidth = Math.max(2, Math.round(2 * Math.sqrt(effectiveScale)));
    const haloRadius = Math.max(12, Math.round(14 * Math.sqrt(effectiveScale)));
    const tagFontSize = Math.max(9, Math.round(10 * Math.min(1.5, Math.sqrt(effectiveScale))));

    visibleFunctions.forEach((fnObj, fnIdx) => {
      const f = makePlotFunction(fnObj.expr, () => scope);

      // Collect potential intercepts for this function
      let yInterceptData: { sx: number; sy: number; y0: number; id: string } | null = null;
      if (0 >= xmin && 0 <= xmax) {
        const y0 = f(0);
        if (Number.isFinite(y0) && y0 >= ymin - 5 && y0 <= ymax + 5) {
          yInterceptData = {
            sx: toScreenX(0),
            sy: toScreenY(y0),
            y0,
            id: `__intercept_y_${fnObj.id}_${fnIdx}`,
          };
        }
      }

      const rawRoots = findRoots(f, xmin, xmax, 400);
      const rootList = rawRoots.map((root, rIdx) => ({
        root,
        sx: toScreenX(root),
        sy: toScreenY(0),
        id: `__intercept_x_${fnObj.id}_${rIdx}`,
        rIdx,
      }));

      // Check for proximity between Y-intercept and any Root (especially near origin (0, 0))
      let yInterceptDir: "top-left" | "top-right" | "right" | "left" = "top-right";
      const rootDirections: Array<"bottom" | "top" | "bottom-right" | "bottom-left"> = [];

      rootList.forEach((r, idx) => {
        let dir: "bottom" | "top" | "bottom-right" | "bottom-left" =
          idx % 2 === 0 ? "bottom" : "top";

        if (yInterceptData) {
          const distToY = Math.hypot(r.sx - yInterceptData.sx, r.sy - yInterceptData.sy);
          if (distToY < 48) {
            // Collision between Y-intercept and X-intercept near origin!
            // Assign opposing non-overlapping quadrants
            yInterceptDir = "top-left";
            dir = "bottom-right";
          }
        }
        rootDirections.push(dir);
      });

      // 1. Render Y-Intercept
      if (yInterceptData) {
        const { sx, sy, y0, id } = yInterceptData;
        interceptElements.push(
          <g
            key={id}
            className="cursor-grab active:cursor-grabbing group select-none"
            onPointerDown={(e) => handlePointerDown(id, e)}
            onClick={() => {
              if (!hasDraggedSignificantly) {
                handleOpenExactEditor({
                  type: "y-intercept",
                  title: "Edit Y-Intercept",
                  currentY: y0,
                  currentX: 0,
                  label: `y-intercept (0, ${formatNumber(y0, 2)})`,
                });
              }
            }}
            onPointerEnter={() =>
              setHoverInfo({
                x: 0,
                y: y0,
                screenX: sx,
                screenY: sy,
                label: `Y-Intercept (0, ${formatNumber(y0, 2)}) • Click to set value, drag to shift`,
                sourceType: "point",
                color: "#dc2626",
              })
            }
            onPointerLeave={() => setHoverInfo(null)}
          >
            {/* Outer Glow Halo on Hover */}
            <circle
              cx={sx}
              cy={sy}
              r={haloRadius}
              fill="#dc2626"
              fillOpacity={0.15}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <circle
              cx={sx}
              cy={sy}
              r={markerRadius}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth={markerStrokeWidth}
              className="shadow-sm"
            />
            {/* Intercept Label Tag with Collision Avoidance */}
            {renderSmartPill(`(0, ${formatNumber(y0, 1)})`, sx, sy, {
              color: "#dc2626",
              direction: yInterceptDir,
              fontSize: tagFontSize,
              fontWeight: "bold",
              offset: 8,
              badgeStyle: "solid",
            })}
          </g>,
        );
      }

      // 2. Render X-Intercepts (Roots)
      rootList.forEach((r, idx) => {
        const { sx, sy, root, id } = r;
        const dir = rootDirections[idx] || "bottom";

        interceptElements.push(
          <g
            key={id}
            className="cursor-grab active:cursor-grabbing group select-none"
            onPointerDown={(e) => handlePointerDown(id, e)}
            onClick={() => {
              if (!hasDraggedSignificantly) {
                handleOpenExactEditor({
                  type: "x-intercept",
                  title: "Edit X-Intercept (Root)",
                  currentX: root,
                  currentY: 0,
                  label: `x-intercept (${formatNumber(root, 2)}, 0)`,
                });
              }
            }}
            onPointerEnter={() =>
              setHoverInfo({
                x: root,
                y: 0,
                screenX: sx,
                screenY: sy,
                label: `X-Intercept (${formatNumber(root, 2)}, 0) • Click to set value, drag to shift`,
                sourceType: "point",
                color: "#16a34a",
              })
            }
            onPointerLeave={() => setHoverInfo(null)}
          >
            {/* Outer Glow Halo on Hover */}
            <circle
              cx={sx}
              cy={sy}
              r={haloRadius}
              fill="#16a34a"
              fillOpacity={0.15}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <circle
              cx={sx}
              cy={sy}
              r={markerRadius}
              fill="#16a34a"
              stroke="#ffffff"
              strokeWidth={markerStrokeWidth}
              className="shadow-sm"
            />
            {/* Root Label Tag with Collision Avoidance */}
            {renderSmartPill(`(${formatNumber(root, 1)}, 0)`, sx, sy, {
              color: "#16a34a",
              direction: dir,
              fontSize: tagFontSize,
              fontWeight: "bold",
              offset: 8,
              badgeStyle: "solid",
            })}
          </g>,
        );
      });
    });

    return <g className="interactive-intercepts-layer">{interceptElements}</g>;
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

        const fnStrokeWidth = Math.max(
          2,
          Math.round((isPresentationMode ? 3.8 : 2.6) * effectiveScale),
        );
        const fnFontSize = Math.max(
          11,
          Math.round((isPresentationMode ? 14 : 12) * Math.sqrt(effectiveScale)),
        );

        return (
          <g key={obj.id}>
            <path
              d={pathPoints.join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={fnStrokeWidth}
              strokeDasharray={
                fnObj.dash
                  ? `${fnObj.dash * 3 * effectiveScale},${fnObj.dash * 3 * effectiveScale}`
                  : undefined
              }
            />
            <path
              d={pathPoints.join(" ")}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(22, 18 + fnStrokeWidth * 2)}
              className="cursor-grab"
              onPointerMove={handleFunctionHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            {fnObj.showEquation && fnObj.label && (
              <text
                x={toScreenX(xmax - 1.5)}
                y={toScreenY(f(xmax - 1.5) || 0) - 10}
                fill={color}
                fontSize={fnFontSize}
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

        const ptRadius = Math.max(
          5,
          Math.round((isPresentationMode ? 8 : 6) * Math.sqrt(effectiveScale)),
        );
        const ptStroke = Math.max(2, Math.round(2 * Math.sqrt(effectiveScale)));
        const ptFontSize = Math.max(
          11,
          Math.round((isPresentationMode ? 14 : 12) * Math.sqrt(effectiveScale)),
        );

        const handlePointHover = () => {
          if (draggedObjectId || isPanning) return;
          setHoverInfo({
            x,
            y,
            screenX: sx,
            screenY: sy,
            label: `${ptObj.label || "Point"} (${formatNumber(x, 2)}, ${formatNumber(y, 2)}) • Click to edit exact coordinates`,
            sourceType: "point",
            color,
          });
        };

        // Determine optimal direction for point label avoiding borders
        let ptDir: "top-right" | "top-left" | "bottom-right" | "bottom-left" = "top-right";
        if (sx > size.width - 90) {
          ptDir = sy < 60 ? "bottom-left" : "top-left";
        } else if (sy < 50) {
          ptDir = "bottom-right";
        }

        const labelText = ptObj.label
          ? `${ptObj.label}${ptObj.showCoords ? ` (${formatNumber(x, 1)}, ${formatNumber(y, 1)})` : ""}`
          : ptObj.showCoords
            ? `(${formatNumber(x, 1)}, ${formatNumber(y, 1)})`
            : "";

        return (
          <g
            key={obj.id}
            className="cursor-grab active:cursor-grabbing group"
            onPointerDown={(e) => handlePointerDown(obj.id, e)}
            onClick={() => {
              if (!hasDraggedSignificantly) {
                handleOpenExactEditor({
                  type: "point",
                  id: obj.id,
                  title: `Edit Point ${ptObj.label || ""}`,
                  currentX: x,
                  currentY: y,
                  label: ptObj.label,
                });
              }
            }}
            onPointerEnter={handlePointHover}
            onPointerLeave={() => setHoverInfo(null)}
          >
            <circle
              cx={sx}
              cy={sy}
              r={ptRadius * 2}
              fill={color}
              fillOpacity={0.15}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <circle
              cx={sx}
              cy={sy}
              r={ptRadius}
              fill={color}
              stroke="#ffffff"
              strokeWidth={ptStroke}
            />
            {labelText &&
              renderSmartPill(labelText, sx, sy, {
                color,
                direction: ptDir,
                fontSize: ptFontSize,
                fontWeight: "bold",
                offset: 8,
                badgeStyle: "solid",
              })}
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

        const m = derivative(f, x);
        const tanDx = 3;
        const x1 = x - tanDx;
        const y1 = y - m * tanDx;
        const x2 = x + tanDx;
        const y2 = y + m * tanDx;

        const gliderRadius = Math.max(
          6,
          Math.round((isPresentationMode ? 9 : 7) * Math.sqrt(effectiveScale)),
        );
        const gliderStroke = Math.max(
          2,
          Math.round((isPresentationMode ? 2.5 : 2) * effectiveScale),
        );
        const gliderFontSize = Math.max(
          11,
          Math.round((isPresentationMode ? 14 : 12) * Math.sqrt(effectiveScale)),
        );

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
                  strokeWidth={gliderStroke}
                  strokeDasharray="4,4"
                />
                <line
                  x1={toScreenX(x1)}
                  y1={toScreenY(y1)}
                  x2={toScreenX(x2)}
                  y2={toScreenY(y2)}
                  stroke="transparent"
                  strokeWidth={20}
                  className="cursor-grab"
                  onPointerMove={handleTangentHover}
                  onPointerLeave={() => setHoverInfo(null)}
                />
              </>
            )}
            <circle
              cx={sx}
              cy={sy}
              r={gliderRadius}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth={Math.max(2, Math.round(2 * Math.sqrt(effectiveScale)))}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => handlePointerDown(obj.id, e)}
              onPointerEnter={handleGliderHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            {renderSmartPill(
              `${gliderObj.label || "P"} (${formatApprox(x)}, ${formatApprox(y)})`,
              sx,
              sy,
              {
                color: "#dc2626",
                direction: "top-right",
                fontSize: gliderFontSize,
                fontWeight: "bold",
                offset: 8,
                badgeStyle: "solid",
              },
            )}
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

        const lineStroke = Math.max(2, Math.round((isPresentationMode ? 2.5 : 2) * effectiveScale));
        const lineFontSize = Math.max(
          10,
          Math.round((isPresentationMode ? 13 : 11) * Math.sqrt(effectiveScale)),
        );

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

        // Determine smart direction for line labels (rise, run, slope triangles, segments)
        const isRun =
          lineObj.id === "run" || (lineObj.label && lineObj.label.toLowerCase().includes("run"));
        const isRise =
          lineObj.id === "rise" || (lineObj.label && lineObj.label.toLowerCase().includes("rise"));

        let midSx = (sx1 + sx2) / 2;
        const midSy = (sy1 + sy2) / 2;
        let lineDir: "bottom" | "top" | "right" | "left" | "top-right" = "top-right";

        if (isRun) {
          lineDir = "bottom";
        } else if (isRise) {
          const dy = Math.abs(sy2 - sy1);
          if (dy < 18) {
            // When slope is near 0 or rise is tiny, shift to right to avoid overlapping run
            midSx += 24;
            lineDir = "top-right";
          } else {
            lineDir = "right";
          }
        } else {
          // General segment: check angle
          const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
          if (Math.abs(Math.sin(angle)) < 0.3) {
            lineDir = "top";
          } else {
            lineDir = "top-right";
          }
        }

        return (
          <g key={obj.id}>
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke={color}
              strokeWidth={lineStroke}
              strokeDasharray={
                lineObj.dash
                  ? `${lineObj.dash * 3 * effectiveScale},${lineObj.dash * 3 * effectiveScale}`
                  : undefined
              }
            />
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke="transparent"
              strokeWidth={20}
              className="cursor-grab"
              onPointerMove={handleLineHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            {lineObj.label &&
              renderSmartPill(lineObj.label, midSx, midSy, {
                color,
                direction: lineDir,
                fontSize: lineFontSize,
                fontWeight: "semibold",
                offset: 8,
                badgeStyle: "solid",
              })}
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

        const circStroke = Math.max(2, Math.round((isPresentationMode ? 3 : 2) * effectiveScale));
        const circFontSize = Math.max(
          10,
          Math.round((isPresentationMode ? 13 : 11) * Math.sqrt(effectiveScale)),
        );

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
              strokeWidth={circStroke}
            />
            <circle
              cx={scx}
              cy={scy}
              r={sr}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              className="cursor-grab"
              onPointerMove={handleCircleHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            <circle
              cx={scx}
              cy={scy}
              r={Math.max(3, Math.round(4 * Math.sqrt(effectiveScale)))}
              fill={color}
            />
            {circObj.showRadius && (
              <>
                <line
                  x1={scx}
                  y1={scy}
                  x2={scx + sr}
                  y2={scy}
                  stroke={color}
                  strokeWidth={Math.max(1.5, Math.round(1.5 * effectiveScale))}
                  strokeDasharray="3,3"
                />
                <text
                  x={scx + sr / 2}
                  y={scy - 6}
                  fill={color}
                  fontSize={circFontSize}
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

        const polyStroke = Math.max(2, Math.round((isPresentationMode ? 3 : 2) * effectiveScale));
        const vertexRadius = Math.max(
          5,
          Math.round((isPresentationMode ? 8 : 6) * Math.sqrt(effectiveScale)),
        );
        const polyFontSize = Math.max(
          11,
          Math.round((isPresentationMode ? 14 : 12) * Math.sqrt(effectiveScale)),
        );

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
              strokeWidth={polyStroke}
            />
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
                  className="cursor-grab"
                  onPointerMove={(e) => handlePolygonEdgeHover(e, idx, (idx + 1) % pts.length)}
                  onPointerLeave={() => setHoverInfo(null)}
                />
              );
            })}
            {pts.map(([vx, vy], idx) => {
              const svx = toScreenX(vx);
              const svy = toScreenY(vy);
              const lbl = polyObj.vertexLabels?.[idx] || String.fromCharCode(65 + idx);

              // Orient label outward from polygon center
              const centerMathX = pts.reduce((acc, p) => acc + p[0], 0) / pts.length;
              const centerMathY = pts.reduce((acc, p) => acc + p[1], 0) / pts.length;
              const vDir: "top-right" | "top-left" | "bottom-right" | "bottom-left" =
                vx >= centerMathX
                  ? vy >= centerMathY
                    ? "top-right"
                    : "bottom-right"
                  : vy >= centerMathY
                    ? "top-left"
                    : "bottom-left";

              return (
                <g
                  key={`v-${idx}`}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => handlePointerDown(obj.id, e, idx)}
                  onPointerEnter={() =>
                    setHoverInfo({
                      x: vx,
                      y: vy,
                      screenX: svx,
                      screenY: svy,
                      label: `Vertex ${lbl} (${formatNumber(vx, 1)}, ${formatNumber(vy, 1)})`,
                      sourceType: "point",
                      color,
                    })
                  }
                  onPointerLeave={() => setHoverInfo(null)}
                >
                  <circle
                    cx={svx}
                    cy={svy}
                    r={vertexRadius}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={Math.max(2, Math.round(2 * Math.sqrt(effectiveScale)))}
                  />
                  {renderSmartPill(
                    `${lbl} (${formatNumber(vx, 1)}, ${formatNumber(vy, 1)})`,
                    svx,
                    svy,
                    {
                      color,
                      direction: vDir,
                      fontSize: polyFontSize,
                      fontWeight: "bold",
                      offset: 6,
                      badgeStyle: "solid",
                    },
                  )}
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

        const trStroke = Math.max(2, Math.round((isPresentationMode ? 3 : 2) * effectiveScale));
        const trVertexRadius = Math.max(
          4,
          Math.round((isPresentationMode ? 7 : 5) * Math.sqrt(effectiveScale)),
        );
        const trFontSize = Math.max(
          11,
          Math.round((isPresentationMode ? 14 : 12) * Math.sqrt(effectiveScale)),
        );

        return (
          <g key={obj.id}>
            <polygon
              points={screenPts}
              fill={color}
              fillOpacity={0.2}
              stroke={color}
              strokeWidth={trStroke}
              strokeDasharray="4,4"
            />
            {transVertices.map(([vx, vy], idx) => {
              const svx = toScreenX(vx);
              const svy = toScreenY(vy);
              const lbl = (srcPoly.vertexLabels?.[idx] || String.fromCharCode(65 + idx)) + "'";
              return (
                <g key={`tv-${idx}`}>
                  <circle
                    cx={svx}
                    cy={svy}
                    r={trVertexRadius}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  {renderSmartPill(lbl, svx, svy, {
                    color,
                    direction: "top-right",
                    fontSize: trFontSize,
                    fontWeight: "bold",
                    offset: 6,
                    badgeStyle: "solid",
                  })}
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

        const vecStroke = Math.max(
          2,
          Math.round((isPresentationMode ? 3.5 : 2.5) * effectiveScale),
        );
        const vecFontSize = Math.max(
          11,
          Math.round((isPresentationMode ? 14 : 12) * Math.sqrt(effectiveScale)),
        );

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
              strokeWidth={vecStroke}
              markerEnd={`url(#${arrowId})`}
            />
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke="transparent"
              strokeWidth={20}
              className="cursor-grab"
              onPointerMove={handleVectorHover}
              onPointerLeave={() => setHoverInfo(null)}
            />
            {vecObj.label &&
              renderSmartPill(vecObj.label, (sx1 + sx2) / 2, (sy1 + sy2) / 2, {
                color,
                direction: "top-right",
                fontSize: vecFontSize,
                fontWeight: "bold",
                offset: 8,
                badgeStyle: "solid",
              })}
          </g>
        );
      }

      case "inequality": {
        const ineqObj = obj as InequalityObject;
        const f = makePlotFunction(ineqObj.rhs, () => scope);
        const samples = 200;
        const polyPoints: string[] = [];

        for (let i = 0; i <= samples; i++) {
          const x = xmin + (i / samples) * (xmax - xmin);
          const y = f(x);
          if (Number.isFinite(y)) {
            polyPoints.push(`${toScreenX(x)},${toScreenY(y)}`);
          }
        }

        const isGreater = ineqObj.op.startsWith(">");
        const boundaryY = isGreater ? toScreenY(ymax) : toScreenY(ymin);
        polyPoints.push(`${toScreenX(xmax)},${boundaryY}`);
        polyPoints.push(`${toScreenX(xmin)},${boundaryY}`);

        return (
          <polygon
            key={obj.id}
            points={polyPoints.join(" ")}
            fill={color}
            fillOpacity={0.15}
            stroke="none"
          />
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
                  strokeWidth={Math.max(1, Math.round(1 * effectiveScale))}
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
            strokeWidth={Math.max(1.5, Math.round(1.5 * effectiveScale))}
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
            fontSize={Math.max(
              11,
              Math.round((isPresentationMode ? 15 : 13) * Math.sqrt(effectiveScale)),
            )}
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

  const tooltipLeft = hoverInfo ? Math.min(Math.max(80, hoverInfo.screenX), size.width - 80) : 0;
  const isNearTop = hoverInfo ? hoverInfo.screenY < 80 : false;
  const tooltipTop = hoverInfo ? (isNearTop ? hoverInfo.screenY + 16 : hoverInfo.screenY - 14) : 0;

  return (
    <div
      ref={containerRef}
      id="math-graph-visualization-area"
      className={`relative w-full h-full min-h-[280px] sm:min-h-[380px] bg-background border rounded-xl shadow-xs overflow-hidden select-none touch-none ${
        isPanning ? "cursor-grabbing" : "cursor-grab"
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
      {/* Floating Graph Toolbar: Reset View, Zoom, Grid, Fullscreen in Bottom-Left */}
      <div
        id="graph-floating-controls-toolbar"
        className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-30 flex items-center gap-0.5 sm:gap-1 bg-card/95 backdrop-blur-md border border-border shadow-md rounded-lg p-0.5 sm:p-1 max-w-[calc(100%-80px)] overflow-x-auto no-scrollbar"
      >
        {/* Reset View Button */}
        <button
          onClick={handleResetView}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer shrink-0"
          title="Reset View to Default Coordinates"
          aria-label="Reset View"
        >
          <RotateCcw className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] hidden sm:inline">Reset View</span>
        </button>

        <div className="w-[1px] h-3.5 sm:h-4 bg-border/80 mx-0.5 shrink-0" />

        {/* Zoom In */}
        <button
          onClick={() => handleLocalZoom(0.8)}
          className="p-1 sm:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer shrink-0"
          title="Zoom In (+)"
          aria-label="Zoom In"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => handleLocalZoom(1.25)}
          className="p-1 sm:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer shrink-0"
          title="Zoom Out (-)"
          aria-label="Zoom Out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>

        {/* Toggle Grid */}
        {onToggleGrid && (
          <button
            onClick={onToggleGrid}
            className={`p-1 sm:p-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
              scene.settings?.showGrid
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            title="Toggle Coordinate Grid"
            aria-label="Toggle Coordinate Grid"
          >
            <Grid className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="w-[1px] h-3.5 sm:h-4 bg-border/80 mx-0.5 shrink-0" />

        {/* Full Screen Button */}
        <button
          onClick={handleToggleFullscreen}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
            isFullscreen
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
          title={isFullscreen ? "Exit Fullscreen" : "Full Screen Graph"}
          aria-label="Toggle Full Screen"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] hidden sm:inline">Exit</span>
            </>
          ) : (
            <>
              <Maximize className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] hidden sm:inline">Full Screen</span>
            </>
          )}
        </button>
      </div>

      {/* Minimalist Vertical Thickness Slider at Bottom Right */}
      <div
        id="graph-thickness-vertical-controller"
        className="absolute bottom-3 right-3 z-30 flex flex-col items-center bg-card/90 backdrop-blur-md border border-border/80 shadow-md rounded-xl p-1.5 select-none gap-1"
      >
        {/* Quick Step Up (+) */}
        <button
          type="button"
          onClick={() =>
            setThicknessScale((prev) => Math.min(3.5, Number((prev + 0.25).toFixed(2))))
          }
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all cursor-pointer"
          title="Increase Thickness (+)"
          aria-label="Increase Thickness"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Vertical Drag Track / Line */}
        <div className="relative flex items-center justify-center py-0.5">
          <div
            ref={sliderTrackRef}
            onPointerDown={handleThicknessPointerDown}
            onPointerMove={handleThicknessPointerMove}
            onPointerUp={handleThicknessPointerUp}
            onPointerCancel={handleThicknessPointerUp}
            className="relative w-6 h-24 flex items-center justify-center cursor-ns-resize touch-none group"
            title="Drag vertically to adjust thickness"
          >
            {/* Background Track with tapered stroke width indicator */}
            <div className="absolute inset-y-0 w-1.5 bg-muted/80 rounded-full overflow-hidden" />

            {/* Dynamic Active Fill Track */}
            <div
              className="absolute bottom-0 w-1.5 bg-primary rounded-full transition-all duration-75 pointer-events-none"
              style={{
                height: `${Math.max(6, Math.min(100, ((thicknessScale - 0.8) / (3.5 - 0.8)) * 100))}%`,
              }}
            />

            {/* Draggable Handle / Thumb with visual live indicator */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-card border-2 border-primary shadow-sm flex items-center justify-center transition-transform ${isDraggingThickness ? "scale-110 ring-2 ring-primary/40" : "group-hover:scale-105"}`}
              style={{
                top: `${100 - ((thicknessScale - 0.8) / (3.5 - 0.8)) * 100}%`,
              }}
            >
              <div
                className="rounded-full bg-primary"
                style={{
                  width: `${Math.max(3, Math.min(8, 2.5 * thicknessScale))}px`,
                  height: `${Math.max(3, Math.min(8, 2.5 * thicknessScale))}px`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Quick Step Down (-) */}
        <button
          type="button"
          onClick={() =>
            setThicknessScale((prev) => Math.max(0.8, Number((prev - 0.25).toFixed(2))))
          }
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all cursor-pointer"
          title="Decrease Thickness (-)"
          aria-label="Decrease Thickness"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      <svg
        width={size.width}
        height={size.height}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      >
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
          {renderFunctionIntercepts()}

          {/* Interactive Tooltip Snap Indicator & Projection Lines */}
          {hoverInfo && !isPanning && !draggedObjectId && (
            <g className="hover-indicator pointer-events-none" key="hover-guide-overlay">
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
              <circle
                cx={hoverInfo.screenX}
                cy={hoverInfo.screenY}
                r={8}
                fill={hoverInfo.color || "#2563eb"}
                fillOpacity={0.25}
              />
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
                <span className="truncate max-w-[200px] font-sans font-semibold text-foreground/90">
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

      {/* Exact Coordinate / Intercept Input Modal */}
      {exactInputModal && (
        <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-xl p-4 w-full max-w-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Edit2 className="w-3.5 h-3.5 text-primary" />
                <span>{exactInputModal.title}</span>
              </div>
              <button
                onClick={() => setExactInputModal(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyExactValue} className="space-y-3">
              {exactInputModal.type === "x-intercept" && (
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    X-Coordinate (Root where y = 0)
                  </label>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    value={inputValX}
                    onChange={(e) => setInputValX(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm font-mono rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    placeholder="e.g. 2.5 or -4"
                  />
                </div>
              )}

              {exactInputModal.type === "y-intercept" && (
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Y-Coordinate (Y-Intercept where x = 0)
                  </label>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    value={inputValY}
                    onChange={(e) => setInputValY(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm font-mono rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    placeholder="e.g. 3 or -1.5"
                  />
                </div>
              )}

              {exactInputModal.type === "point" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      X Value
                    </label>
                    <input
                      type="number"
                      step="any"
                      autoFocus
                      value={inputValX}
                      onChange={(e) => setInputValX(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm font-mono rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Y Value
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={inputValY}
                      onChange={(e) => setInputValY(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm font-mono rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Adjusts the graph and synchronizes parameter values automatically.
              </p>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setExactInputModal(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-input bg-background hover:bg-accent text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
