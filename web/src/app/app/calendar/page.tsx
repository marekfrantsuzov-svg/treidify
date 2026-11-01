import { redirect } from "next/navigation";

export default function Calendar() {
  redirect("/app/news?tab=calendar");
}
