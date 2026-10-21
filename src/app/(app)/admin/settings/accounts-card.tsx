"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save, Users } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { submitWithoutReset } from "@/lib/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAccount } from "../actions";

type Account = { id: string; name: string; email: string; role: Role };

export function AccountsCard({ accounts }: { accounts: Account[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-400" /> Accounts
        </CardTitle>
        <CardDescription>Login names, emails and passwords. The name shows on the dashboard and payslips.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        {accounts.map((a) => (
          <AccountForm key={a.id} account={a} />
        ))}
      </CardContent>
    </Card>
  );
}

function AccountForm({ account }: { account: Account }) {
  const [state, action, pending] = useActionState(saveAccount, null);
  const p = `acct-${account.id}`;

  useEffect(() => {
    if (state) (state.ok ? toast.success : toast.error)(state.message);
  }, [state]);

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3 rounded-lg border p-4">
      <input type="hidden" name="id" value={account.id} />
      <Badge variant={account.role === "ADMIN" ? "default" : "outline"}>
        {account.role === "ADMIN" ? "Admin (you)" : "Viewer (Mom)"}
      </Badge>
      <div className="space-y-2">
        <Label htmlFor={`${p}-name`}>Name</Label>
        <Input id={`${p}-name`} name="name" defaultValue={account.name} maxLength={80} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${p}-email`}>Login email</Label>
        <Input id={`${p}-email`} name="email" type="email" defaultValue={account.email} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${p}-password`}>New password (optional)</Label>
        <Input
          id={`${p}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Leave blank to keep the current one"
          minLength={8}
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
      </Button>
    </form>
  );
}
