import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { tryCompile } from "@/math/parser/expression";
import { Code, CheckCircle2, AlertCircle, Sparkles, Maximize2 } from "lucide-react";
import { MathView } from "./MathView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface EquationEditorProps {
  expression: string;
  onUpdateExpression: (newExpr: string) => void;
}

/** Scales KaTeX to fill the board so it stays readable from the back of a classroom. */
function FormulaBoard({ math }: { math: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;

    const fit = () => {
      const mathEl = inner.querySelector(".katex") as HTMLElement | null;
      if (!mathEl || mathEl.offsetWidth < 4 || mathEl.offsetHeight < 4) return;
      if (box.clientWidth < 8 || box.clientHeight < 8) return;

      const pad = 112;
      const next = Math.min(
        (box.clientWidth - pad) / mathEl.offsetWidth,
        (box.clientHeight - pad) / mathEl.offsetHeight,
      );
      if (!Number.isFinite(next) || next <= 0) return;
      setScale(Math.max(0.2, next));
    };

    fit();
    const frame = requestAnimationFrame(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [math]);

  return (
    <div ref={boxRef} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        ref={innerRef}
        className="formula-board-math w-fit [&_.katex-display]:m-0 [&_.katex-display]:inline-block"
        style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
      >
        <MathView math={math} displayMode={true} />
      </div>
    </div>
  );
}

const COMMON_PRESETS = [
  { label: "x²", expr: "x^2", katex: "x^2" },
  { label: "x³", expr: "x^3 - 3*x", katex: "x^3 - 3x" },
  { label: "sin(x)", expr: "sin(x)", katex: "\\sin(x)" },
  { label: "cos(x)", expr: "cos(x)", katex: "\\cos(x)" },
  { label: "1/x", expr: "1/x", katex: "\\frac{1}{x}" },
  { label: "eˣ", expr: "e^x", katex: "e^x" },
  { label: "ln(x)", expr: "log(x)", katex: "\\ln(x)" },
  { label: "|x|", expr: "abs(x)", katex: "|x|" },
];

export const EquationEditor: React.FC<EquationEditorProps> = ({
  expression,
  onUpdateExpression,
}) => {
  const [inputVal, setInputVal] = useState(expression);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const result = tryCompile(inputVal);

  useEffect(() => {
    setInputVal(expression);
  }, [expression]);

  const handleChange = (val: string) => {
    setInputVal(val);
    const res = tryCompile(val);
    if (res.ok) {
      onUpdateExpression(val);
    }
  };

  // Convert mathjs expression to basic KaTeX for preview
  const formatKaTeX = (expr: string) => {
    try {
      return expr
        .replace(/\*/g, "")
        .replace(/log\(([^)]+)\)/g, "\\ln($1)")
        .replace(/sin\(([^)]+)\)/g, "\\sin($1)")
        .replace(/cos\(([^)]+)\)/g, "\\cos($1)")
        .replace(/tan\(([^)]+)\)/g, "\\tan($1)")
        .replace(/abs\(([^)]+)\)/g, "|$1|")
        .replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
    } catch {
      return expr;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-foreground border-b border-border pb-2">
        <div className="flex items-center gap-1.5">
          <Code className="h-3.5 w-3.5 text-primary" />
          <span>Equation & Formula</span>
        </div>
        {result.ok ? (
          <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Valid
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-destructive font-medium">
            <AlertCircle className="h-3 w-3" /> Check equation
          </span>
        )}
      </div>

      {/* KaTeX Live Mathematical Preview — click to enlarge for the class */}
      <button
        type="button"
        onClick={() => setFormulaOpen(true)}
        className="relative w-full p-2.5 rounded-lg bg-accent/30 border border-border flex items-center justify-center min-h-[44px] cursor-pointer hover:bg-accent/50 hover:border-primary/40 transition-colors"
        title="Enlarge formula for the class"
        aria-label="Enlarge formula"
      >
        <MathView math={`y = ${formatKaTeX(inputVal)}`} displayMode={true} />
        <Maximize2 className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      </button>

      <Dialog open={formulaOpen} onOpenChange={setFormulaOpen}>
        <DialogContent
          className="left-0 top-0 flex h-[100dvh] w-screen max-h-none max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-0 bg-background p-8 sm:p-12 shadow-none sm:rounded-none [&>button]:right-5 [&>button]:top-5 [&>button]:p-3 [&>button>svg]:h-8 [&>button>svg]:w-8"
        >
          <DialogTitle className="sr-only">Formula</DialogTitle>
          <DialogDescription className="sr-only">
            Full-screen equation for classroom display. Press Escape or click the close button to exit.
          </DialogDescription>
          <FormulaBoard math={`y = ${formatKaTeX(inputVal)}`} />
        </DialogContent>
      </Dialog>

      {/* Input Field */}
      <div className="relative">
        <span className="absolute left-3 top-2 text-xs font-mono text-muted-foreground">y =</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="e.g. 2*x^2 - 3*x + 1"
          className="w-full pl-9 pr-3 py-1.5 font-mono text-xs rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Quick Template Chips */}
      <div className="flex flex-wrap gap-1 pt-1">
        <span className="text-[10px] text-muted-foreground w-full font-medium flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" /> Quick Presets:
        </span>
        {COMMON_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handleChange(preset.expr)}
            className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-foreground transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
