import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="container py-8">{children}</main>
    </>
  );
}
