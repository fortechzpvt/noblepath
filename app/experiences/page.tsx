import { redirect } from "next/navigation";

/**
 * The header, footer and destination pages link to /experiences. The activity
 * catalogue lives at /activities, so this sends visitors there instead of a 404.
 */
export default function ExperiencesPage(): never {
  redirect("/activities");
}
