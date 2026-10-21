"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, LayoutDashboard, Settings, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { dashboard: LayoutDashboard, cutoffs: CalendarRange, goals: Target, settings: Settings };

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function NavLinks({ links }: { links: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
            pathname.startsWith(l.href) && "bg-secondary text-foreground",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileTabBar({ links }: { links: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map((l) => {
          const Icon = ICONS[l.icon];
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
                active && "text-violet-300",
              )}
            >
              <Icon className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
