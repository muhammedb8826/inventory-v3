import { cookies } from "next/headers";
import { WorkspaceFrame } from "@/components/workspace-frame";
import { AuthGuardClient } from "@/components/auth-guard-client";
import { AppProviders } from "@/components/app-providers";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <AuthGuardClient>
      <AppProviders>
        <WorkspaceFrame defaultOpen={defaultOpen}>{children}</WorkspaceFrame>
      </AppProviders>
    </AuthGuardClient>
  );
}
