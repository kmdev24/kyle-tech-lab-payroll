"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createCutoff } from "../actions";
import { submitWithoutReset } from "@/lib/form";
import { cutoffWeekFor } from "@/lib/cutoff";
import { formatDate, formatUsd } from "@/lib/utils";
import { BASE_RATE_USD, VIEWER_RATE_USD } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateCutoffForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(createCutoff, null);
  const [date, setDate] = useState(defaultDate);
  const [hours, setHours] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      setHours("");
      formRef.current?.reset();
    } else toast.error(state.message);
  }, [state]);

  const week = useMemo(() => {
    try {
      return cutoffWeekFor(date);
    } catch {
      return null;
    }
  }, [date]);
  const h = Number(hours) || 0;

  return (
    <form ref={formRef} onSubmit={submitWithoutReset(action)} className="grid gap-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
      <div className="space-y-2">
        <Label htmlFor="weekOf">Week of</Label>
        <Input id="weekOf" name="weekOf" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hoursWorked">Hours worked</Label>
        <Input
          id="hoursWorked"
          name="hoursWorked"
          type="number"
          step="0.25"
          min="0"
          max="168"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" maxLength={500} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
      </Button>
      {week && (
        <p className="text-xs text-muted-foreground md:col-span-4">
          {formatDate(week.periodStart)} – {formatDate(week.periodEnd)} · payout {formatDate(week.payoutDate)} · gross{" "}
          {formatUsd(h * BASE_RATE_USD)} · Mom {formatUsd(h * VIEWER_RATE_USD)}
        </p>
      )}
    </form>
  );
}
