import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-violet-400 ring-1 ring-violet-500/30">
            <FlaskConical className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">KYLE TECH LAB</h1>
          <p className="text-sm text-muted-foreground">Sign in to view payroll</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
