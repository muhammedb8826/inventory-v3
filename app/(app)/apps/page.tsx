"use client";

import { AppsHome } from "@/components/apps/apps-home";
import { useBranding } from "@/components/branding/branding-provider";

export default function AppsPage() {
  const { appName } = useBranding();

  return (
    <main
      id="workspace-content"
      tabIndex={-1}
      className="workspace-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden outline-none"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-10 space-y-2 text-center sm:mb-12">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {appName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose an application to get started
          </p>
        </div>
        <AppsHome />
      </div>
    </main>
  );
}
