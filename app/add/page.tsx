import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import TransactionForm from "@/components/TransactionForm";

export default async function AddPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <NavBar displayName={session.displayName} />
      <main className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8">
          <h1 className="page-title">Add Record</h1>
          <p className="page-subtitle">Log income or expense — optimised for iPad</p>
        </div>
        <div className="card">
          <TransactionForm large />
        </div>
      </main>
    </div>
  );
}
