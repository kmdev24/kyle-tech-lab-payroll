"use client";

import { useActionState, useEffect } from "react";
import { ArrowRightLeft, FileLock2, Landmark, Loader2, Save, Target } from "lucide-react";
import { toast } from "sonner";
import type { Settings } from "@/lib/data";
import { BANK_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettings } from "../actions";
import { submitWithoutReset } from "@/lib/form";

export function SettingsForm({ settings, emailConfigured }: { settings: Settings; emailConfigured: boolean }) {
  const [state, action, pending] = useActionState(saveSettings, null);

  useEffect(() => {
    if (state) (state.ok ? toast.success : toast.error)(state.message);
  }, [state]);

  const banks: string[] = BANK_OPTIONS.includes(settings.bankName as (typeof BANK_OPTIONS)[number])
    ? [...BANK_OPTIONS]
    : [settings.bankName, ...BANK_OPTIONS];

  return (
    <form onSubmit={submitWithoutReset(action)} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-violet-400" /> Recipient payment details
          </CardTitle>
          <CardDescription>Where Mom&apos;s 30% is sent. Shown on her payslip.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Bank / Wallet" htmlFor="bankName">
            <NativeSelect id="bankName" name="bankName" defaultValue={settings.bankName}>
              {banks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Account name" htmlFor="accountName">
            <Input id="accountName" name="accountName" defaultValue={settings.accountName} />
          </Field>
          <Field label="Account / mobile number" htmlFor="accountNumber">
            <Input id="accountNumber" name="accountNumber" defaultValue={settings.accountNumber} inputMode="numeric" />
          </Field>
          <Field
            label="InstaPay QR Ph string (optional)"
            htmlFor="qrPhPayload"
            hint="Scan Mom's own GoTyme/GCash/Maya 'Receive money' QR with any QR reader app and paste the text (starts with 000201…). The payout QR will then be a real InstaPay QR with the amount filled in."
          >
            <Textarea id="qrPhPayload" name="qrPhPayload" defaultValue={settings.qrPhPayload} rows={3} className="font-mono text-xs" />
          </Field>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileLock2 className="h-4 w-4 text-violet-400" /> Payslip delivery
            </CardTitle>
            <CardDescription>
              Emailed via Resend when a cutoff is marked Received.{" "}
              {!emailConfigured && <span className="text-amber-300">RESEND_API_KEY / EMAIL_FROM not set.</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Mom's email" htmlFor="recipientEmail">
              <Input id="recipientEmail" name="recipientEmail" type="email" defaultValue={settings.recipientEmail} />
            </Field>
            <Field label="PDF password" htmlFor="pdfPassword" hint="e.g. her PIN or birthdate (MMDDYYYY). Leave blank for no password.">
              <Input id="pdfPassword" name="pdfPassword" defaultValue={settings.pdfPassword} autoComplete="off" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-violet-400" /> FX & goals
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Stripe FX fee / margin (%)" htmlFor="fxFeePercent" hint="Deducted from the live rate to match UnionBank.">
              <Input id="fxFeePercent" name="fxFeePercent" type="number" step="0.01" min="0" max="20" defaultValue={settings.fxFeePercent} />
            </Field>
            <Field label="House fund goal (PHP)" htmlFor="houseFundGoalPhp">
              <div className="relative">
                <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="houseFundGoalPhp"
                  name="houseFundGoalPhp"
                  type="number"
                  step="1000"
                  min="0"
                  defaultValue={settings.houseFundGoalPhp}
                  className="pl-9"
                />
              </div>
            </Field>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save settings
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
