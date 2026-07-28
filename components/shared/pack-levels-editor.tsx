"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPackLevelId } from "@/lib/sales/pricing";
import type { PackLevelTemplate } from "@/lib/types";

type PackLevelsEditorProps = {
  baseUnitName: string;
  levels: PackLevelTemplate[];
  onChange: (levels: PackLevelTemplate[]) => void;
};

export function PackLevelsEditor({
  baseUnitName,
  levels,
  onChange,
}: PackLevelsEditorProps) {
  const updateLevel = (index: number, patch: Partial<PackLevelTemplate>) => {
    onChange(
      levels.map((level, i) => (i === index ? { ...level, ...patch } : level)),
    );
  };

  const addLevel = () => {
    onChange([
      ...levels,
      {
        id: createPackLevelId(),
        name: "",
        unitsOfBase: 12,
      },
    ]);
  };

  const removeLevel = (index: number) => {
    const level = levels[index];
    if (level.unitsOfBase === 1) return;
    onChange(levels.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Conditionnements</Label>
        <Button type="button" size="sm" variant="outline" onClick={addLevel}>
          <Plus className="h-3.5 w-3.5" />
          Niveau
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Unite de base = 1 {baseUnitName || "unite"}. Ajoutez carton, cartouche,
        casier…
      </p>
      <div className="space-y-2">
        {levels.map((level, index) => {
          const isBase = level.unitsOfBase === 1;
          return (
            <div
              key={level.id}
              className="grid grid-cols-[1fr_88px_36px] gap-2 rounded-xl bg-surface-2 p-2"
            >
              <Input
                value={level.name}
                placeholder={isBase ? baseUnitName || "unite" : "Ex. casier 12"}
                disabled={isBase}
                onChange={(e) => updateLevel(index, { name: e.target.value })}
                className="h-10"
              />
              <Input
                type="number"
                min={1}
                value={level.unitsOfBase}
                disabled={isBase}
                onChange={(e) =>
                  updateLevel(index, {
                    unitsOfBase: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className="h-10"
                title="Unites de base"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-9 text-destructive"
                disabled={isBase}
                onClick={() => removeLevel(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
