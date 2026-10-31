import { redirect } from "next/navigation";

/** Trading accounts moved to their own module; keep old links working. */
export default function SettingsAccounts() {
  redirect("/app/accounts");
}
