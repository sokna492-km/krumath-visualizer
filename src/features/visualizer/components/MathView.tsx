import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathViewProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({
  math,
  displayMode = false,
  className = "",
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        output: "htmlAndMathml",
      });
    } catch {
      return math;
    }
  }, [math, displayMode]);

  return <span className={`inline-math ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
