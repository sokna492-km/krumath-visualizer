import React, { useEffect } from "react";
import type { Parameter, AnimationSettings } from "../types/scene";
import { Play, Pause, RotateCcw, Sliders } from "lucide-react";

interface ParameterPanelProps {
  parameters: Parameter[];
  onUpdateParameter: (name: string, value: number) => void;
  animation: AnimationSettings;
  onUpdateAnimation: (anim: Partial<AnimationSettings>) => void;
  onReset: () => void;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  parameters,
  onUpdateParameter,
  animation,
  onUpdateAnimation,
  onReset,
}) => {
  const isAnimating = !!animation.target;

  // Animation Loop Effect
  useEffect(() => {
    if (!animation.target) return;

    const param = parameters.find((p) => p.name === animation.target);
    if (!param) return;

    let frameId: number;
    let startTime: number | null = null;
    let direction = 1;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const progress = (elapsed * animation.speed) / animation.duration;

      if (progress >= 1) {
        if (animation.loop === "pingpong") {
          direction *= -1;
          startTime = timestamp;
        } else if (animation.loop === "loop") {
          startTime = timestamp;
        } else {
          onUpdateAnimation({ target: null });
          return;
        }
      }

      const currentProgress = direction === 1 ? progress : 1 - progress;
      const newValue = animation.from + currentProgress * (animation.to - animation.from);
      onUpdateParameter(param.name, Number(newValue.toFixed(2)));

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [animation, parameters, onUpdateParameter, onUpdateAnimation]);

  const toggleAnimation = (paramName: string) => {
    if (animation.target === paramName) {
      onUpdateAnimation({ target: null });
    } else {
      const p = parameters.find((param) => param.name === paramName);
      onUpdateAnimation({
        target: paramName,
        from: p ? p.min : -5,
        to: p ? p.max : 5,
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
          <Sliders className="h-4 w-4 text-primary" />
          <span>Parameters ({parameters.length})</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {parameters.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No sliders for this concept.</p>
      ) : (
        <div className="space-y-4">
          {parameters.map((param) => {
            const isTargetAnim = animation.target === param.name;
            return (
              <div key={param.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-foreground flex items-center gap-1.5">
                    <span>{param.label || param.name}</span>
                    <span className="font-mono text-muted-foreground">({param.name})</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={param.value}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      onChange={(e) =>
                        onUpdateParameter(param.name, parseFloat(e.target.value) || 0)
                      }
                      className="w-16 px-1.5 py-0.5 text-right font-mono text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={() => toggleAnimation(param.name)}
                      title={isTargetAnim ? "Pause animation" : "Animate parameter"}
                      className={`p-1 rounded hover:bg-accent transition-colors ${
                        isTargetAnim ? "text-primary bg-primary/10" : "text-muted-foreground"
                      }`}
                    >
                      {isTargetAnim ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={param.value}
                  onChange={(e) => onUpdateParameter(param.name, parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
