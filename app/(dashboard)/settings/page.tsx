import { Suspense } from "react";
import { connection } from "next/server";

import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { SettingsForm } from "@/components/settings/settings-form";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

import { Layers } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata = {
  title: "Settings",
};

async function SettingsContent() {
  // Supabase auth checks session expiry using the current time.
  await connection();

  const result = await getUserWorkspace();

  if (!result.success) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h1 className="font-semibold">Unable to load settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <SettingsForm
      workspaceName={result.workspace.name}
      role={result.role}
      deletionScheduledFor={result.workspace.deletion_scheduled_for}
    />
  );
}

function SettingsLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
      <Card className="min-h-100 mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Layers className="size-5" />
            </div>
            <div>
              <CardTitle>Switch workspace</CardTitle>
              <CardDescription>
                Switch between workspaces you belong to.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <WorkspaceSwitcher variant="settings" />
          <p className="mt-3 text-xs text-muted-foreground">
            Switching workspaces changes which workspace's feedback, analyses,
            and settings you see.
          </p>
        </CardContent>
      </Card>
    </Suspense>
  );
}
