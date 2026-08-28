import React from "react";
import type { Readout } from "../concepts/registry";
import { Activity } from "lucide-react";

interface ReadoutsPanelProps {
  readouts: Readout[];
}

export const ReadoutsPanel: React.FC<ReadoutsPanelProps> = ({ readouts }) => {
  if (!readouts || readouts.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex items-center gap-2 font-semibold text-sm text-foreground border-b border-border pb-2.5">
        <Activity className="h-4 w-4 text-primary" />
        <span>Live Measurements & Properties</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {readouts.map((r, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-accent/40 border border-border/50 flex flex-col justify-between"
          >
            <span className="text-xs text-muted-foreground font-medium">{r.label}</span>
            <span className="text-sm font-semibold font-mono text-foreground mt-1 break-all">
              {r.value}
            </span>
            {r.hint && <span className="text-[10px] text-muted-foreground mt-0.5">{r.hint}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
