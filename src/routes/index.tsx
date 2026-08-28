import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import "@/features/visualizer/concepts/all";
import {
  allConcepts,
  getConcept,
  type ConceptDefinition,
} from "@/features/visualizer/concepts/registry";
import type {
  MathScene,
  FunctionObject,
  PointObject,
  GliderObject,
  AnimationSettings,
  Viewport,
} from "@/features/visualizer/types/scene";
import { ConceptSidebar } from "@/features/visualizer/components/ConceptSidebar";
import { VisualizerCanvas } from "@/features/visualizer/components/VisualizerCanvas";
import { ParameterPanel } from "@/features/visualizer/components/ParameterPanel";
import { ReadoutsPanel } from "@/features/visualizer/components/ReadoutsPanel";
import { FlagsPanel } from "@/features/visualizer/components/FlagsPanel";
import { EquationEditor } from "@/features/visualizer/components/EquationEditor";
import { SceneStorageModal } from "@/features/visualizer/components/SceneStorageModal";
import {
  Compass,
  RotateCcw,
  Maximize2,
  Minimize2,
  FolderOpen,
  ZoomIn,
  ZoomOut,
  Grid,
  Moon,
  Sun,
  Menu,
  X,
  Play,
  Pause,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const concepts = useMemo(() => allConcepts(), []);
  const defaultConcept = concepts[0] || getConcept("linear")!;

  const [currentConcept, setCurrentConcept] = useState<ConceptDefinition>(defaultConcept);
  const [scene, setScene] = useState<MathScene>(() => defaultConcept.createScene());
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Animation Loop Effect
  useEffect(() => {
    if (!isPlaying || !scene.parameters.length) return;
    const anim = scene.animation;
    const targetParam = anim.target || scene.parameters[0]?.name;
    if (!targetParam) return;

    let direction = 1;
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      setScene((prev) => {
        const param = prev.parameters.find((p) => p.name === targetParam);
        if (!param) return prev;

        const span = param.max - param.min;
        const step = (span / (anim.duration || 4)) * delta * (anim.speed || 1);
        let nextVal = param.value + direction * step;

        if (nextVal >= param.max) {
          nextVal = param.max;
          direction = -1;
        } else if (nextVal <= param.min) {
          nextVal = param.min;
          direction = 1;
        }

        return {
          ...prev,
          parameters: prev.parameters.map((p) =>
            p.name === targetParam ? { ...p, value: Number(nextVal.toFixed(3)) } : p,
          ),
        };
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, scene.animation, scene.parameters]);

  // Switch Concept
  const handleSelectConcept = useCallback((concept: ConceptDefinition) => {
    setCurrentConcept(concept);
    setScene(concept.createScene());
    setSidebarOpen(false);
    setIsPlaying(false);
  }, []);

  // Reset Scene
  const handleResetScene = useCallback(() => {
    setScene(currentConcept.createScene());
    setIsPlaying(false);
  }, [currentConcept]);

  // Parameter Update
  const handleUpdateParameter = (name: string, value: number) => {
    setScene((prev) => ({
      ...prev,
      parameters: prev.parameters.map((p) => (p.name === name ? { ...p, value } : p)),
    }));
  };

  // Toggle Flag Update
  const handleToggleFlag = (key: string, value: boolean) => {
    setScene((prev) => ({
      ...prev,
      flags: { ...prev.flags, [key]: value },
    }));
  };

  // Point Drag Update
  const handleUpdatePoint = (pointId: string, x: number, y: number) => {
    setScene((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) =>
        obj.id === pointId && obj.kind === "point" ? ({ ...obj, x, y } as PointObject) : obj,
      ),
    }));
  };

  // Glider Drag Update
  const handleUpdateGlider = (gliderId: string, x: number) => {
    setScene((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) =>
        obj.id === gliderId && obj.kind === "glider" ? ({ ...obj, x } as GliderObject) : obj,
      ),
    }));
  };

  // Viewport Update (Pan / Zoom)
  const handleUpdateViewport = (viewport: Viewport) => {
    setScene((prev) => ({
      ...prev,
      viewport,
    }));
  };

  // Zoom In / Out Handlers
  const handleZoom = (factor: number) => {
    const { xmin, xmax, ymin, ymax } = scene.viewport;
    const midX = (xmin + xmax) / 2;
    const midY = (ymin + ymax) / 2;
    const rangeX = (xmax - xmin) * factor;
    const rangeY = (ymax - ymin) * factor;
    handleUpdateViewport({
      xmin: midX - rangeX / 2,
      xmax: midX + rangeX / 2,
      ymin: midY - rangeY / 2,
      ymax: midY + rangeY / 2,
    });
  };

  // Toggle Grid / Axes
  const handleToggleGrid = () => {
    setScene((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        showGrid: !prev.settings.showGrid,
      },
    }));
  };

  // Animation Update
  const handleUpdateAnimation = (anim: Partial<AnimationSettings>) => {
    setScene((prev) => ({
      ...prev,
      animation: { ...prev.animation, ...anim },
    }));
  };

  // Custom Expression Update
  const handleUpdateExpression = (newExpr: string) => {
    setScene((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) =>
        obj.kind === "function" ? ({ ...obj, expr: newExpr } as FunctionObject) : obj,
      ),
    }));
  };

  // Load Saved Scene
  const handleLoadScene = (loadedScene: MathScene) => {
    setScene(loadedScene);
    const matchedConcept = getConcept(loadedScene.conceptId) || concepts[0]!;
    setCurrentConcept(matchedConcept);
  };

  // Export SVG / PNG image
  const handleExportImage = () => {
    const svgEl = document.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgEl.clientWidth * 2;
      canvas.height = svgEl.clientHeight * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = isDark ? "#09090b" : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `${scene.title.toLowerCase().replace(/\s+/g, "_")}.png`;
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Toggle Presentation Mode & Fullscreen
  const togglePresentationMode = useCallback(() => {
    setIsPresentationMode((prev) => {
      const nextState = !prev;
      if (nextState) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return nextState;
    });
  }, []);

  // Keyboard Shortcuts (F = Fullscreen, R = Reset, Space = Play/Pause, Esc = Exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        togglePresentationMode();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleResetScene();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "Escape" && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresentationMode, handleResetScene, togglePresentationMode]);

  // Primary function object in scene, if any
  const primaryFnObj = scene.objects.find((o) => o.kind === "function") as
    FunctionObject | undefined;

  // Live readouts derived from concept definition
  const readouts = currentConcept.readouts ? currentConcept.readouts(scene) : [];

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark", !isDark);
  };

  return (
    <div
      ref={mainContainerRef}
      className={`min-h-screen flex flex-col bg-background text-foreground transition-colors duration-150 ${
        isDark ? "dark" : ""
      }`}
    >
      {/* Top Navigation Bar (Hidden in presentation mode for clean immersion) */}
      {!isPresentationMode && (
        <header className="h-14 px-4 border-b border-border bg-card flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 rounded-lg border border-input text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Toggle Concept Navigation"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary text-primary-foreground shadow-xs">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight tracking-tight text-foreground flex items-center gap-1.5">
                  <span>KRUMATH</span>
                  <span className="font-medium text-xs text-muted-foreground hidden sm:inline">
                    Math Visualizer
                  </span>
                </h1>
                <p className="text-[11px] text-muted-foreground hidden md:block">
                  Teacher Interactive Presentation & Demonstration Workbench
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Zoom & Grid Controls */}
            <div className="hidden sm:flex items-center gap-1 border-r border-border pr-2 mr-1">
              <button
                onClick={() => handleZoom(0.8)}
                className="p-1.5 rounded-md border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Zoom In (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleZoom(1.25)}
                className="p-1.5 rounded-md border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Zoom Out (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={handleToggleGrid}
                className={`p-1.5 rounded-md border border-input ${
                  scene.settings?.showGrid
                    ? "bg-accent text-foreground"
                    : "bg-background text-muted-foreground"
                }`}
                title="Toggle Coordinate Grid"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>

            {/* Save & Load Modal */}
            <button
              onClick={() => setStorageModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-input bg-background hover:bg-accent transition-colors shadow-2xs"
            >
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Lessons</span>
            </button>

            {/* Export PNG */}
            <button
              onClick={handleExportImage}
              className="p-2 rounded-lg border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Export Snapshot PNG"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Reset Scene */}
            <button
              onClick={handleResetScene}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-input bg-background hover:bg-accent transition-colors"
              title="Reset Scene (Key: R)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Fullscreen Presentation Mode */}
            <button
              onClick={togglePresentationMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              title="Enter Presentation Mode (Key: F)"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Present</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
      )}

      {/* Main Presentation / Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Concept Sidebar (Hidden in Presentation Mode) */}
        {!isPresentationMode && (
          <>
            <div
              className={`fixed inset-y-0 left-0 z-30 transform md:relative md:translate-x-0 transition-transform duration-200 ease-in-out ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <ConceptSidebar
                selectedConceptId={currentConcept.id}
                onSelectConcept={handleSelectConcept}
              />
            </div>

            {/* Mobile Backdrop */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-background/80 backdrop-blur-xs z-20 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </>
        )}

        {/* Content Canvas Area */}
        <div
          className={`flex-1 flex flex-col ${
            isPresentationMode
              ? "p-3 h-full"
              : "lg:flex-row overflow-y-auto lg:overflow-hidden p-4 gap-4"
          }`}
        >
          {/* Main Visualizer Canvas & Readouts Column */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
            {/* Concept Header Banner (Clean in presentation mode) */}
            <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary">
                    {currentConcept.category}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {currentConcept.title}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{currentConcept.summary}</p>
              </div>

              {/* Presentation Controls when in Fullscreen */}
              {isPresentationMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying((p) => !p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${
                      isPlaying ? "bg-amber-600 text-white" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    <span>{isPlaying ? "Pause" : "Play"}</span>
                  </button>

                  <button
                    onClick={handleResetScene}
                    className="p-1.5 rounded-lg border border-input bg-background hover:bg-accent text-foreground"
                    title="Reset Scene (R)"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={togglePresentationMode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-input bg-background hover:bg-accent text-foreground"
                    title="Exit Presentation Mode (Esc)"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>Exit</span>
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Canvas */}
            <div className="flex-1 min-h-[420px] relative">
              <VisualizerCanvas
                scene={scene}
                onUpdatePoint={handleUpdatePoint}
                onUpdateGlider={handleUpdateGlider}
                onUpdateViewport={handleUpdateViewport}
                isPresentationMode={isPresentationMode}
              />
            </div>

            {/* Live Readouts Strip */}
            <ReadoutsPanel readouts={readouts} />
          </div>

          {/* Controls Column (Sliders, Toggles, Equation Editor) - Accordion / Stacked in Presentation */}
          {!isPresentationMode ? (
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
              {primaryFnObj && (
                <EquationEditor
                  expression={primaryFnObj.expr}
                  onUpdateExpression={handleUpdateExpression}
                />
              )}

              <ParameterPanel
                parameters={scene.parameters}
                onUpdateParameter={handleUpdateParameter}
                animation={scene.animation}
                onUpdateAnimation={handleUpdateAnimation}
                onReset={handleResetScene}
              />

              <FlagsPanel
                toggles={currentConcept.toggles}
                flags={scene.flags}
                onToggleFlag={handleToggleFlag}
              />
            </div>
          ) : (
            /* Floating minimal slider bar when presenting */
            scene.parameters.length > 0 && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-2xl flex flex-wrap items-center gap-4 max-w-[90vw]">
                {scene.parameters.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-muted-foreground">{p.label || p.name}:</span>
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={p.value}
                      onChange={(e) => handleUpdateParameter(p.name, parseFloat(e.target.value))}
                      className="w-24 sm:w-32 accent-primary cursor-pointer"
                    />
                    <span className="font-mono w-10 text-right">{p.value}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Save / Load Storage Modal */}
      <SceneStorageModal
        isOpen={storageModalOpen}
        onClose={() => setStorageModalOpen(false)}
        currentScene={scene}
        onLoadScene={handleLoadScene}
      />
    </div>
  );
}
