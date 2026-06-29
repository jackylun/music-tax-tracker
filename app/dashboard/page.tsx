import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      <NavBar displayName={session.displayName} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <DashboardClient />
      </main>
    </div>
  );
}
