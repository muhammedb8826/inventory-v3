import { redirect } from "next/navigation";

/** Public inquiry site removed — staff app entry is login. */
export default function RootPage() {
  redirect("/login");
}
