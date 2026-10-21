import Link from "next/link";
import { FlaskConical } from "lucide-react";
import type { Role } from "@prisma/client";
import { SignOutButton } from "./sign-out-button";
import { NavLinks } from "./nav-links";

export function AppHeader({ name, role }: { name: string; role: Role }) {
  const links =
    role === "ADMIN"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/admin/cutoffs", label: "Cutoffs" },
          { href: "/admin/settings", label: "Settings" },
        ]
      : [{ href: "/dashboard", label: "My Earnings" }];

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-violet-400 ring-1 ring-violet-500/30">
            <FlaskConical className="h-4 w-4" />
          </span>
          KYLE TECH LAB
        </Link>
        <NavLinks links={links} />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{name}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
