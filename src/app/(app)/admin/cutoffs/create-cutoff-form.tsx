"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createCutoff } from "../actions";
import { submitWithoutReset } from "@/lib/form";
import { cutoffWeekFor } from "@/lib/cutoff";
import { formatDate, formatUsd, round2 } from "@/lib/utils";
import { BASE_RATE_USD, VIEWER_SHARE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateCutoffForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(createCutoff, null);
  const [kind, setKind] = useState<"CONTRACT" | "INCENTIVE">("CONTRACT");
  const [date, setDate] = useState(defaultDate);
  const [hours, setHours] = useState("");
  const [earned, setEarned] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      setHours("");
      setEarned("");
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
  const isIncentive = kind === "INCENTIVE";
  const gross = earned !== "" ? Number(earned) || 0 : isIncentive ? 0 : (Number(hours) || 0) * BASE_RATE_USD;

  return (
    <form
      ref={formRef}
      onSubmit={submitWithoutReset(action)}
      className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr_2fr_auto] md:items-end"
    >
      <div className="space-y-2">
        <Label htmlFor="kind">Type</Label>
        <NativeSelect id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="CONTRACT">Contract hours</option>
          <option value="INCENTIVE">Incentive</option>
        </NativeSelect>
      </div>
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
          step="0.01"
          min="0"
          max="168"
          inputMode="decimal"
          value={isIncentive ? "" : hours}
          onChange={(e) => setHours(e.target.value)}
          disabled={isIncentive}
          placeholder={isIncentive ? "–" : "e.g. 15.83"}
          required={!isIncentive}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="earnedUsd">{isIncentive ? "Amount (USD)" : "Earned USD (optional)"}</Label>
        <Input
          id="earnedUsd"
          name="earnedUsd"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={earned}
          onChange={(e) => setEarned(e.target.value)}
          placeholder={isIncentive ? "e.g. 20.00" : "as shown, e.g. 475.26"}
          required={isIncentive}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" maxLength={500} placeholder={isIncentive ? "e.g. Assessment bonus" : ""} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
      </Button>
      {week && (
        <p className="text-xs text-muted-foreground md:col-span-6">
          {formatDate(week.periodStart)} – {formatDate(week.periodEnd)} · payout {formatDate(week.payoutDate)} · gross{" "}
          {formatUsd(gross)} · Mom {formatUsd(round2(gross * VIEWER_SHARE))}
          {!isIncentive && " · Leave Earned USD blank to use hours × $30. Fill it in when the platform's amount differs from that (its hours are rounded)."}
        </p>
      )}
    </form>
  );
}
