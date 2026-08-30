import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import "@/features/visualizer/concepts/all";
import {
  allConcepts,
  getConcept,
  conceptsByCategory,
  type ConceptDefinition,
  type CategoryId,
} from "@/features/visualizer/concepts/registry";
import type {
  MathScene,
  FunctionObject,
  PointObject,
  GliderObject,
  AnimationSettings,
  Viewport,
} from "@/features/visualizer/types/scene";
import { TopTopicNavBar } from "@/features/visualizer/components/TopTopicNavBar";
import { ConceptSidebar } from "@/features/visualizer/components/ConceptSidebar";
import { VisualizerCanvas } from "@/features/visualizer/components/VisualizerCanvas";
import { ParameterPanel } from "@/features/visualizer/components/ParameterPanel";
import { FlagsPanel } from "@/features/visualizer/components/FlagsPanel";
import { EquationEditor } from "@/features/visualizer/components/EquationEditor";
import {
  RotateCcw,
  Minimize2,
  Moon,
  Sun,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  LineChart,
  X,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const concepts = useMemo(() => allConcepts(), []);
  const defaultConcept = concepts[0] || getConcept("linear")!;

  const [currentConcept, setCurrentConcept] = useState<ConceptDefinition>(defaultConcept);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(() => defaultConcept.category);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState<"none" | "subtopics" | "controls">("none");
  const [scene, setScene] = useState<MathScene>(() => defaultConcept.createScene());
  const [isDark, setIsDark] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resetCount, setResetCount] = useState(0);

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
    setActiveCategory(concept.category);
    setScene(concept.createScene());
    setIsPlaying(false);
    setResetCount((c) => c + 1);
  }, []);

  // Switch Category from Top Bar
  const handleSelectCategory = useCallback(
    (categoryId: CategoryId) => {
      setActiveCategory(categoryId);
      const conceptsInCat = conceptsByCategory(categoryId);
      if (conceptsInCat.length > 0) {
        const isCurrentInCat = conceptsInCat.some((c) => c.id === currentConcept.id);
        if (!isCurrentInCat) {
          handleSelectConcept(conceptsInCat[0]);
        }
      }
    },
    [currentConcept.id, handleSelectConcept],
  );

  // Reset Scene
  const handleResetScene = useCallback(() => {
    setScene(currentConcept.createScene());
    setIsPlaying(false);
    setResetCount((c) => c + 1);
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
      className={`h-[100dvh] w-full max-w-full overflow-hidden flex flex-col bg-background text-foreground transition-colors duration-150 overscroll-none select-none ${
        isDark ? "dark" : ""
      }`}
    >
      {/* Mobile Top Header (Always visible on mobile < md for seamless touch access) */}
      {!isPresentationMode && (
        <header className="md:hidden h-12 px-3 border-b border-border bg-card/95 backdrop-blur-md flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/favicon.svg"
              alt="Krumath"
              className="h-7 w-7 shrink-0 rounded-lg"
            />
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-none tracking-tight text-foreground">
                KruMath Visualizer
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
      )}

      {/* Desktop Navigation Header */}
      {!isPresentationMode && (
        <header className="hidden md:flex h-14 px-4 border-b border-border bg-card items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2.5">
            <img
              src="/favicon.svg"
              alt="Krumath"
              className="h-8 w-8 shrink-0 rounded-lg"
            />
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight text-foreground">
                KruMath Visualizer
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
      )}

      {/* Top Main Topics Navigation Bar (Always visible) */}
      {!isPresentationMode && (
        <TopTopicNavBar activeCategory={activeCategory} onSelectCategory={handleSelectCategory} />
      )}

      {/* Main Presentation / Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative min-h-0 w-full">
        {/* Desktop Left Sidebar (Visible >= md) */}
        {!isPresentationMode && sidebarOpen && (
          <div className="hidden md:block relative shrink-0 h-full">
            {/* Full Height Vertical Collapse Tab Handle for Sub-topics */}
            <button
              id="toggle-subtopics-panel-btn"
              onClick={() => setSidebarOpen(false)}
              className="absolute -right-3.5 top-0 bottom-0 z-30 w-4.5 bg-card/95 hover:bg-accent border-y border-r border-border shadow-xs hover:shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer group select-none"
              title="Collapse Sub-topics"
              aria-label="Collapse Sub-topics"
            >
              <div className="w-full h-16 rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ChevronLeft className="h-5 w-5 stroke-[2.5] text-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
              </div>
            </button>

            <ConceptSidebar
              activeCategory={activeCategory}
              selectedConceptId={currentConcept.id}
              onSelectConcept={handleSelectConcept}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}

        {/* Mobile Sub-topics Slide-Over Drawer (< lg) */}
        {!isPresentationMode && mobileDrawer === "subtopics" && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setMobileDrawer("none")}
            />
            {/* Drawer Content */}
            <div className="relative w-80 max-w-[85vw] h-full bg-card shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
              <ConceptSidebar
                activeCategory={activeCategory}
                selectedConceptId={currentConcept.id}
                onSelectConcept={(concept) => {
                  handleSelectConcept(concept);
                  setMobileDrawer("none");
                }}
                onClose={() => setMobileDrawer("none")}
              />
            </div>
          </div>
        )}

        {/* Content Canvas Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
            isPresentationMode ? "p-2 sm:p-3" : "lg:flex-row p-2 sm:p-3 gap-2 sm:gap-3"
          }`}
        >
          {/* Main Visualizer Canvas Column */}
          <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0 min-h-0 h-full relative">
            {/* Desktop Full Height Vertical Expand Sub-topics Tab Handle */}
            {!isPresentationMode && !sidebarOpen && (
              <button
                id="expand-subtopics-panel-btn"
                onClick={() => setSidebarOpen(true)}
                className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 w-4.5 bg-card/95 hover:bg-accent border-y border-r border-border shadow-xs hover:shadow-md items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer group select-none"
                title="Expand Sub-topics"
                aria-label="Expand Sub-topics"
              >
                <div className="w-full h-16 rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <ChevronRight className="h-5 w-5 stroke-[2.5] text-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            )}

            {/* Desktop Full Height Vertical Expand Formulas & Controls Tab Handle */}
            {!isPresentationMode && !rightPanelOpen && (
              <button
                id="expand-formulas-panel-btn"
                onClick={() => setRightPanelOpen(true)}
                className="hidden lg:flex absolute right-0 top-0 bottom-0 z-20 w-4.5 bg-card/95 hover:bg-accent border-y border-l border-border shadow-xs hover:shadow-md items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer group select-none"
                title="Expand Formulas & Controls"
                aria-label="Expand Formulas & Controls"
              >
                <div className="w-full h-16 rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <ChevronLeft className="h-5 w-5 stroke-[2.5] text-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
                </div>
              </button>
            )}

            {/* Interactive Canvas Container with Full Height */}
            <div className="flex-1 min-h-0 w-full h-full relative">
              {/* Floating Concept Header Card in Top-Left of Canvas */}
              <div
                id="canvas-floating-concept-header"
                className={`absolute top-2.5 sm:top-3 z-30 flex flex-col gap-1 bg-card/90 backdrop-blur-md border border-border/80 shadow-md rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 select-none pointer-events-auto transition-all max-w-[calc(100%-150px)] sm:max-w-xs md:max-w-sm lg:max-w-md ${
                  !sidebarOpen ? "left-6 sm:left-7" : "left-2.5 sm:left-3"
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary shrink-0">
                    {currentConcept.category}
                  </span>
                  <h2 className="text-xs sm:text-sm md:text-base font-bold text-foreground truncate">
                    {currentConcept.title}
                  </h2>
                </div>
                <p className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground line-clamp-2 sm:line-clamp-none">
                  {currentConcept.summary}
                </p>

                {/* Presentation Controls when in Fullscreen */}
                {isPresentationMode && (
                  <div className="flex items-center gap-1 sm:gap-1.5 mt-1 pt-1 border-t border-border/60">
                    <button
                      onClick={() => setIsPlaying((p) => !p)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md ${
                        isPlaying ? "bg-amber-600 text-white" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      <span>{isPlaying ? "Pause" : "Play"}</span>
                    </button>

                    <button
                      onClick={handleResetScene}
                      className="p-1 rounded-md border border-input bg-background hover:bg-accent text-foreground"
                      title="Reset Scene (R)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={togglePresentationMode}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border border-input bg-background hover:bg-accent text-foreground"
                      title="Exit Presentation Mode (Esc)"
                    >
                      <Minimize2 className="h-3 w-3" />
                      <span>Exit</span>
                    </button>
                  </div>
                )}
              </div>

              <VisualizerCanvas
                scene={scene}
                defaultViewport={currentConcept.createScene().viewport}
                onUpdatePoint={handleUpdatePoint}
                onUpdateGlider={handleUpdateGlider}
                onUpdateViewport={handleUpdateViewport}
                onResetViewport={() => handleUpdateViewport(currentConcept.createScene().viewport)}
                onResetScene={handleResetScene}
                onUpdateParameter={handleUpdateParameter}
                onToggleGrid={handleToggleGrid}
                isPresentationMode={isPresentationMode}
                onToggleFullscreen={togglePresentationMode}
                resetKey={resetCount}
              />
            </div>
          </div>

          {/* Desktop Right Column Controls (Visible >= lg) */}
          {!isPresentationMode && rightPanelOpen && (
            <div className="hidden lg:block relative w-72 xl:w-80 shrink-0 h-full">
              {/* Full Height Vertical Collapse Tab Handle for Formulas & Controls */}
              <button
                id="toggle-formulas-panel-btn"
                onClick={() => setRightPanelOpen(false)}
                className="absolute -left-3.5 top-0 bottom-0 z-30 w-4.5 bg-card/95 hover:bg-accent border-y border-l border-border shadow-xs hover:shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer group select-none"
                title="Collapse Formulas & Controls"
                aria-label="Collapse Formulas & Controls"
              >
                <div className="w-full h-16 rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <ChevronRight className="h-5 w-5 stroke-[2.5] text-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>

              <div className="w-full h-full flex flex-col gap-3 overflow-y-auto pr-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 pb-1 border-b border-border/70 shrink-0">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  <span>Formulas & Controls</span>
                </div>

                {primaryFnObj && (
                  <div className="shrink-0">
                    <EquationEditor
                      expression={primaryFnObj.expr}
                      onUpdateExpression={handleUpdateExpression}
                    />
                  </div>
                )}

                <div className="shrink-0">
                  <ParameterPanel
                    parameters={scene.parameters}
                    onUpdateParameter={handleUpdateParameter}
                    animation={scene.animation}
                    onUpdateAnimation={handleUpdateAnimation}
                    onReset={handleResetScene}
                  />
                </div>

                <div className="shrink-0">
                  <FlagsPanel
                    toggles={currentConcept.toggles}
                    flags={scene.flags}
                    onToggleFlag={handleToggleFlag}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Floating minimal slider bar when in Presentation Mode */}
          {isPresentationMode && scene.parameters.length > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border border-border rounded-xl p-2.5 sm:p-3 shadow-2xl flex flex-wrap items-center gap-3 sm:gap-4 max-w-[95vw]">
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
                    className="w-20 sm:w-32 accent-primary cursor-pointer"
                  />
                  <span className="font-mono w-8 sm:w-10 text-right">{p.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slide-Up Controls Drawer Sheet (< lg) */}
      {!isPresentationMode && mobileDrawer === "controls" && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMobileDrawer("none")}
          />
          {/* Sheet Body */}
          <div className="relative w-full max-h-[82dvh] bg-card border-t border-border rounded-t-2xl shadow-2xl z-10 flex flex-col animate-in slide-in-from-bottom duration-200 overflow-hidden">
            {/* Sheet Header */}
            <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-primary/10 text-primary">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Formulas & Controls</h3>
              </div>
              <button
                onClick={() => setMobileDrawer("none")}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Done</span>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable controls */}
            <div className="p-3 overflow-y-auto space-y-3 overscroll-contain">
              {primaryFnObj && (
                <div>
                  <EquationEditor
                    expression={primaryFnObj.expr}
                    onUpdateExpression={handleUpdateExpression}
                  />
                </div>
              )}

              <div>
                <ParameterPanel
                  parameters={scene.parameters}
                  onUpdateParameter={handleUpdateParameter}
                  animation={scene.animation}
                  onUpdateAnimation={handleUpdateAnimation}
                  onReset={handleResetScene}
                />
              </div>

              <div>
                <FlagsPanel
                  toggles={currentConcept.toggles}
                  flags={scene.flags}
                  onToggleFlag={handleToggleFlag}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (< lg) */}
      {!isPresentationMode && (
        <nav
          id="mobile-bottom-navigation-bar"
          className="lg:hidden h-14 border-t border-border bg-card/95 backdrop-blur-md px-3 flex items-center justify-around shrink-0 z-30 shadow-lg"
        >
          {/* Canvas Tab */}
          <button
            onClick={() => setMobileDrawer("none")}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors cursor-pointer touch-manipulation ${
              mobileDrawer === "none"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LineChart className="h-4 w-4" />
            <span className="text-[10px] tracking-tight">Canvas</span>
          </button>

          {/* Sub-topics Tab */}
          <button
            onClick={() => setMobileDrawer((d) => (d === "subtopics" ? "none" : "subtopics"))}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors cursor-pointer touch-manipulation relative ${
              mobileDrawer === "subtopics"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span className="text-[10px] tracking-tight">Sub-topics</span>
          </button>

          {/* Controls Tab */}
          <button
            onClick={() => setMobileDrawer((d) => (d === "controls" ? "none" : "controls"))}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors cursor-pointer touch-manipulation relative ${
              mobileDrawer === "controls"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="text-[10px] tracking-tight">Controls</span>
          </button>
        </nav>
      )}

    </div>
  );
}
