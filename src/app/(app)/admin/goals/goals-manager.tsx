"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Save, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { GoalProgress } from "@/lib/data";
import { submitWithoutReset } from "@/lib/form";
import { formatPhp } from "@/lib/utils";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { deleteGoal, saveGoal } from "../actions";

export function GoalsManager({ goals }: { goals: GoalProgress[] }) {
  const [editing, setEditing] = useState<GoalProgress | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const nextPriority = goals.reduce((m, g) => Math.max(m, g.priority), 0) + 1;

  function remove(g: GoalProgress) {
    if (!confirm(`Delete the "${g.name}" goal?`)) return;
    setDeleting(g.id);
    startTransition(async () => {
      const res = await deleteGoal(g.id);
      setDeleting(null);
      (res.ok ? toast.success : toast.error)(res.message);
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-400" /> Goals
          </CardTitle>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus /> Add goal
          </Button>
        </CardHeader>
        <CardContent className="divide-y">
          {goals.map((g) => (
            <div key={g.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    <span className="mr-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">#{g.priority}</span>
                    {g.name}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatPhp(g.savedPhp)} of {formatPhp(g.targetPhp)}
                    {g.startingPhp > 0 && ` · incl. ${formatPhp(g.startingPhp)} starting`}
                  </span>
                </div>
                <Progress value={g.percent} />
              </div>
              <div className="flex gap-1 sm:ml-4">
                <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(g)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Delete"
                  className="text-red-400 hover:text-red-300"
                  disabled={deleting === g.id}
                  onClick={() => remove(g)}
                >
                  {deleting === g.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            </div>
          ))}
          {goals.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No goals yet.</p>}
        </CardContent>
      </Card>

      {(adding || editing) && (
        <GoalDialog
          goal={editing}
          defaultPriority={nextPriority}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function GoalDialog({
  goal,
  defaultPriority,
  onClose,
}: {
  goal: GoalProgress | null;
  defaultPriority: number;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(saveGoal, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      onClose();
    } else toast.error(state.message);
  }, [state, onClose]);

  return (
    <Modal title={goal ? "Edit goal" : "New goal"} onClose={onClose}>
      <form onSubmit={submitWithoutReset(action)} className="space-y-4">
        {goal && <input type="hidden" name="id" value={goal.id} />}
        <div className="space-y-2">
          <Label htmlFor="goal-name">Name</Label>
          <Input id="goal-name" name="name" defaultValue={goal?.name ?? ""} placeholder="e.g. House Fund" maxLength={80} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="goal-target">Target (PHP)</Label>
            <Input id="goal-target" name="targetPhp" type="number" step="0.01" min="1" inputMode="decimal" defaultValue={goal?.targetPhp ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-priority">Priority</Label>
            <Input id="goal-priority" name="priority" type="number" step="1" min="1" max="999" defaultValue={goal?.priority ?? defaultPriority} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal-start">Already saved elsewhere (PHP, optional)</Label>
          <Input id="goal-start" name="startingPhp" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={goal?.startingPhp || ""} placeholder="0" />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} {goal ? "Save" : "Add goal"}
        </Button>
      </form>
    </Modal>
  );
}
