import Link from "next/link";
import { FlaskConical } from "lucide-react";
import type { Role } from "@prisma/client";
import { SignOutButton } from "./sign-out-button";
import { MobileTabBar, NavLinks, type NavItem } from "./nav-links";

export function AppHeader({ name, role }: { name: string; role: Role }) {
  const links: NavItem[] =
    role === "ADMIN"
      ? [
          { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
          { href: "/admin/cutoffs", label: "Cutoffs", icon: "cutoffs" },
          { href: "/admin/goals", label: "Goals", icon: "goals" },
          { href: "/admin/settings", label: "Settings", icon: "settings" },
        ]
      : [{ href: "/dashboard", label: "My Earnings", icon: "dashboard" }];

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center gap-6 sm:h-16">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-violet-400 ring-1 ring-violet-500/30">
              <FlaskConical className="h-4 w-4" />
            </span>
            KYLE TECH LAB
          </Link>
          <div className="hidden md:block">
            <NavLinks links={links} />
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">{name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      {/* Phones: bottom tab bar (only when there is more than one page) */}
      {links.length > 1 && <MobileTabBar links={links} />}
    </>
  );
}
