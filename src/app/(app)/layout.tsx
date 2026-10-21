import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className={user.role === "ADMIN" ? "container py-6 pb-24 sm:py-8 md:pb-8" : "container py-6 sm:py-8"}>
        {children}
      </main>
    </>
  );
}
