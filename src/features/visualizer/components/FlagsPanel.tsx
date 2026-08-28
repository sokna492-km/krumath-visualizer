import React from "react";
import type { ConceptToggle } from "../concepts/registry";
import { Eye } from "lucide-react";

interface FlagsPanelProps {
  toggles?: ConceptToggle[];
  flags: Record<string, boolean>;
  onToggleFlag: (key: string, value: boolean) => void;
}

export const FlagsPanel: React.FC<FlagsPanelProps> = ({ toggles, flags, onToggleFlag }) => {
  if (!toggles || toggles.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex items-center gap-2 font-semibold text-sm text-foreground border-b border-border pb-2.5">
        <Eye className="h-4 w-4 text-primary" />
        <span>Display Elements</span>
      </div>

      <div className="space-y-2">
        {toggles.map((t) => {
          const isEnabled = flags[t.key] ?? true;
          return (
            <label
              key={t.key}
              className="flex items-center justify-between text-xs text-foreground cursor-pointer select-none py-1 hover:opacity-80 transition-opacity"
            >
              <span>{t.label}</span>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => onToggleFlag(t.key, e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring accent-primary cursor-pointer"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
};
