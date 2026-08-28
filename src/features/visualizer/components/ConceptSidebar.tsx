import React, { useState } from "react";
import {
  categories,
  conceptsByCategory,
  type ConceptDefinition,
  type CategoryId,
} from "../concepts/registry";
import { Search, BookOpen, ChevronRight } from "lucide-react";

interface ConceptSidebarProps {
  selectedConceptId: string;
  onSelectConcept: (concept: ConceptDefinition) => void;
}

export const ConceptSidebar: React.FC<ConceptSidebarProps> = ({
  selectedConceptId,
  onSelectConcept,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("functions");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConcepts = conceptsByCategory(activeCategory).filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full md:w-80 flex flex-col h-full bg-card border-r border-border shrink-0">
      {/* Search Header */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-accent/50 border border-input focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto p-2 gap-1 border-b border-border no-scrollbar">
        {categories.map((cat) => {
          const count = conceptsByCategory(cat.id).length;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span>{cat.title}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Concept List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredConcepts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No concepts found in this category.
          </div>
        ) : (
          filteredConcepts.map((concept) => {
            const isSelected = concept.id === selectedConceptId;
            return (
              <button
                key={concept.id}
                onClick={() => onSelectConcept(concept)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between gap-2 group ${
                  isSelected
                    ? "bg-accent border-primary/50 text-foreground shadow-xs"
                    : "border-transparent hover:bg-accent/50 hover:border-border text-foreground"
                }`}
              >
                <div>
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{concept.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {concept.summary}
                  </p>
                </div>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    isSelected
                      ? "translate-x-0.5 text-primary"
                      : "text-muted-foreground opacity-0 group-hover:opacity-100"
                  }`}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
