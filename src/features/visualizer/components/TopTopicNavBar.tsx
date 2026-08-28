import React, { useRef, useState, useEffect, useCallback } from "react";
import { categories, conceptsByCategory, type CategoryId } from "../concepts/registry";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TopTopicNavBarProps {
  activeCategory: CategoryId;
  onSelectCategory: (categoryId: CategoryId) => void;
}

export const TopTopicNavBar: React.FC<TopTopicNavBarProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  // Scroll Indicators visibility state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollIndicators, { passive: true });
    window.addEventListener("resize", updateScrollIndicators);
    return () => {
      el.removeEventListener("scroll", updateScrollIndicators);
      window.removeEventListener("resize", updateScrollIndicators);
    };
  }, [updateScrollIndicators]);

  // Center active category on change
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeCategory]);

  // Smooth scroll button triggers
  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 260;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Mouse wheel horizontal scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      updateScrollIndicators();
    }
  };

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If clicking directly on a button or inside a button, do not capture pointer or interfere with button click
    const target = e.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    const el = scrollContainerRef.current;
    if (!el) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // fallback if capture not supported
    }
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.clientX);
    setScrollLeftState(el.scrollLeft);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const deltaX = e.clientX - startX;
    if (Math.abs(deltaX) > 6) {
      setHasMoved(true);
    }
    el.scrollLeft = scrollLeftState - deltaX;
    updateScrollIndicators();
  };

  const handlePointerUpOrLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setIsDragging(false);
    }
  };

  return (
    <nav
      id="top-main-topics-nav"
      className="w-full bg-card/95 backdrop-blur-md border-b border-border shadow-2xs shrink-0 select-none z-20 relative"
    >
      <div className="relative px-2 py-2 flex items-center max-w-full">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll("left")}
            aria-label="Scroll topics left"
            className="absolute left-1 z-30 p-1.5 rounded-full bg-background/90 text-foreground border border-border shadow-md hover:bg-accent transition-all hidden sm:flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Draggable Topics Bar */}
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrLeave}
          onPointerLeave={handlePointerUpOrLeave}
          className={`flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1 cursor-grab active:cursor-grabbing ${
            isDragging ? "cursor-grabbing" : ""
          }`}
          style={{
            touchAction: "pan-y",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {categories.map((cat) => {
            const count = conceptsByCategory(cat.id).length;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                data-active={isActive}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCategory(cat.id);
                }}
                className={`group relative px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border cursor-pointer select-none ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20 scale-100"
                    : "bg-background/70 text-muted-foreground border-border/80 hover:bg-accent hover:text-foreground hover:border-border"
                }`}
              >
                <span>{cat.title}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none font-medium ${
                      isActive
                        ? "bg-primary-foreground/25 text-primary-foreground font-bold"
                        : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll("right")}
            aria-label="Scroll topics right"
            className="absolute right-1 z-30 p-1.5 rounded-full bg-background/90 text-foreground border border-border shadow-md hover:bg-accent transition-all hidden sm:flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  );
};
