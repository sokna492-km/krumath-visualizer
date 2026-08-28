import React, { useState } from "react";
import {
  categories,
  conceptsByCategory,
  type ConceptDefinition,
  type CategoryId,
} from "../concepts/registry";
import { Search, BookOpen, ChevronRight, Layers, PanelLeftClose } from "lucide-react";

interface ConceptSidebarProps {
  activeCategory: CategoryId;
  selectedConceptId: string;
  onSelectConcept: (concept: ConceptDefinition) => void;
  onClose?: () => void;
}

export const ConceptSidebar: React.FC<ConceptSidebarProps> = ({
  activeCategory,
  selectedConceptId,
  onSelectConcept,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const currentCategoryDef = categories.find((c) => c.id === activeCategory);
  const subTopics = conceptsByCategory(activeCategory);

  const filteredConcepts = subTopics.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <aside
      id="subtopics-left-sidebar"
      className="w-full md:w-56 lg:w-60 flex flex-col h-full bg-card border-r border-border shrink-0 select-none shadow-xs"
    >
      {/* Category Title & Sub-topic Count Header */}
      <div className="p-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
                Sub-topics
              </h2>
              <p className="font-semibold text-xs sm:text-sm text-foreground truncate mt-0.5">
                {currentCategoryDef?.title || "Topic"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-muted text-muted-foreground border border-border/50">
              {subTopics.length}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                title="Close sub-topics"
                aria-label="Close sub-topics"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Header */}
        <div className="relative mt-2.5">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${currentCategoryDef?.title || "sub-topics"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground transition-all"
          />
        </div>
      </div>

      {/* Sub-Topics List - Title Only */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 overscroll-contain">
        {filteredConcepts.length === 0 ? (
          <div className="text-center py-8 px-2 text-xs text-muted-foreground">
            No sub-topics found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredConcepts.map((concept) => {
            const isSelected = concept.id === selectedConceptId;
            return (
              <button
                key={concept.id}
                onClick={() => {
                  onSelectConcept(concept);
                  if (onClose && window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs sm:text-sm transition-all flex items-center justify-between gap-2 group cursor-pointer min-h-[40px] touch-manipulation ${
                  isSelected
                    ? "bg-accent border-primary text-foreground shadow-xs font-semibold ring-1 ring-primary/30"
                    : "border-transparent bg-background/50 hover:bg-accent/60 hover:border-border text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <BookOpen
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isSelected
                        ? "text-primary font-bold"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span className="truncate">{concept.title}</span>
                </div>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    isSelected
                      ? "translate-x-0.5 text-primary opacity-100"
                      : "text-muted-foreground opacity-0 group-hover:opacity-100"
                  }`}
                />
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
