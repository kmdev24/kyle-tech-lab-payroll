"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { AdminCutoff } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCutoff } from "../actions";
import { submitWithoutReset } from "@/lib/form";

export function EditCutoffDialog({ cutoff, onClose }: { cutoff: AdminCutoff; onClose: () => void }) {
  const [state, action, pending] = useActionState(updateCutoff, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      onClose();
    } else toast.error(state.message);
  }, [state, onClose]);

  return (
    <Modal title={`Edit ${formatDate(cutoff.periodStart, { year: undefined })} – ${formatDate(cutoff.periodEnd)}`} onClose={onClose}>
      <form onSubmit={submitWithoutReset(action)} className="space-y-4">
        <input type="hidden" name="id" value={cutoff.id} />
        {cutoff.kind === "CONTRACT" && (
          <div className="space-y-2">
            <Label htmlFor="edit-hours">Hours worked</Label>
            <Input id="edit-hours" name="hoursWorked" type="number" step="0.01" min="0" max="168" inputMode="decimal" defaultValue={cutoff.hoursWorked} required />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="edit-earned">{cutoff.kind === "INCENTIVE" ? "Amount (USD)" : "Earned USD (optional)"}</Label>
          <Input
            id="edit-earned"
            name="earnedUsd"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={cutoff.earnedUsd ?? ""}
            placeholder={cutoff.kind === "INCENTIVE" ? "" : "blank = hours × $30"}
            required={cutoff.kind === "INCENTIVE"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-stripe">Stripe rate from receipt (optional)</Label>
          <Input
            id="edit-stripe"
            name="stripeRate"
            type="number"
            step="0.0001"
            min="1"
            inputMode="decimal"
            defaultValue={cutoff.stripeRate ?? ""}
            placeholder="e.g. 62.3271"
          />
          <p className="text-xs text-muted-foreground">
            The &quot;Exchange rate&quot; on the Stripe payment. Used exactly, with no extra fee. Leave blank to use the
            payout date&apos;s rate minus the FX fee.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-notes">Notes</Label>
          <Input id="edit-notes" name="notes" defaultValue={cutoff.notes ?? ""} maxLength={500} />
        </div>
        {cutoff.status === "RECEIVED" && (
          <p className="text-xs text-amber-300">
            This cutoff is already received. Changing amounts won&apos;t re-send the payslip; use the mail button afterwards.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
      </form>
    </Modal>
  );
}
