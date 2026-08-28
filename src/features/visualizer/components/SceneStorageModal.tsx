import React, { useState, useEffect } from "react";
import type { MathScene } from "../types/scene";
import { Save, FolderOpen, Trash2, Download, Upload, Copy, Check } from "lucide-react";

interface SceneStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScene: MathScene;
  onLoadScene: (scene: MathScene) => void;
}

interface SavedSceneItem {
  id: string;
  title: string;
  conceptId: string;
  category: string;
  savedAt: string;
  sceneData: MathScene;
}

const STORAGE_KEY = "krumath_saved_scenes_v1";

export const SceneStorageModal: React.FC<SceneStorageModalProps> = ({
  isOpen,
  onClose,
  currentScene,
  onLoadScene,
}) => {
  const [savedScenes, setSavedScenes] = useState<SavedSceneItem[]>([]);
  const [saveName, setSaveName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setSavedScenes(JSON.parse(data));
      }
    } catch {
      setSavedScenes([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentScene) {
      setSaveName(`${currentScene.title} (${new Date().toLocaleDateString()})`);
    }
  }, [currentScene]);

  if (!isOpen) return null;

  const handleSaveCurrent = () => {
    if (!saveName.trim()) return;
    const newItem: SavedSceneItem = {
      id: `scene_${Date.now()}`,
      title: saveName.trim(),
      conceptId: currentScene.conceptId,
      category: currentScene.category,
      savedAt: new Date().toLocaleString(),
      sceneData: { ...currentScene, title: saveName.trim() },
    };
    const updated = [newItem, ...savedScenes];
    setSavedScenes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    const updated = savedScenes.filter((s) => s.id !== id);
    setSavedScenes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleExportJson = (scene: MathScene) => {
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scene.title.toLowerCase().replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as MathScene;
        if (imported.viewport && imported.objects) {
          onLoadScene(imported);
          onClose();
        }
      } catch {
        alert("Invalid scene file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleCopyJson = (scene: MathScene, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(scene, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base text-foreground">
            <FolderOpen className="h-5 w-5 text-primary" />
            <span>Save & Load Lesson Demonstrations</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Save Current Section */}
          <div className="p-4 rounded-lg bg-accent/40 border border-border/60 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Save className="h-4 w-4 text-primary" />
              Save Current Lesson State
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Lesson Name..."
                className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSaveCurrent}
                className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
              >
                Save
              </button>
            </div>
          </div>

          {/* Saved Scenes List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Saved Lessons ({savedScenes.length})</span>
              <label className="cursor-pointer text-primary hover:underline flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" />
                <span>Import JSON</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>

            {savedScenes.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                No saved lessons yet. Save your current scene above or import a JSON file.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedScenes.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {item.category} • {item.savedAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          onLoadScene(item.sceneData);
                          onClose();
                        }}
                        className="px-3 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleExportJson(item.sceneData)}
                        title="Download JSON file"
                        className="p-1.5 rounded-md border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopyJson(item.sceneData, item.id)}
                        title="Copy JSON"
                        className="p-1.5 rounded-md border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                        className="p-1.5 rounded-md border border-input bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-accent/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium rounded-lg border border-input bg-background hover:bg-accent transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
