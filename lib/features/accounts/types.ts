/**
 * Two admin accounts (musician + daughter).
 * Auth is handled in lib/auth.ts — this module documents the account model.
 */
export interface AdminAccount {
  id: number;
  username: string;
  display_name: string;
  role: "admin";
}

export const ADMIN_ACCOUNTS: Omit<AdminAccount, "id">[] = [
  { username: "admin", display_name: "Admin", role: "admin" },
  { username: "daughter", display_name: "Daughter", role: "admin" },
];
