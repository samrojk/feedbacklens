"use client";

import { useState } from "react";
import { Check, ChevronDown, Layers, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/layout/workspace-provider";

type Props = {
  variant?: "sidebar" | "settings";
};

export function WorkspaceSwitcher({ variant = "sidebar" }: Props) {
  const [open, setOpen] = useState(false);

  const { workspaces, activeWorkspace, switching, switchWorkspace } =
    useWorkspace();

  async function handleSwitch(id: string) {
    await switchWorkspace(id);
    setOpen(false);
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={switching}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={
          variant === "sidebar"
            ? "flex w-full items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/50"
            : "flex w-full max-w-xl items-center justify-between rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50"
        }
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Layers className="size-5" />
          </span>

          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {activeWorkspace?.name ?? "Select workspace"}
            </span>
            <span className="block text-xs capitalize text-muted-foreground">
              {activeWorkspace
                ? `${activeWorkspace.role} · Workspace`
                : "Choose a workspace"}
            </span>
          </span>
        </span>

        {switching ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose workspace"
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-64 rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl"
        >
          <p className="px-2 py-2 text-xs font-medium text-muted-foreground">
            YOUR WORKSPACES
          </p>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {workspaces.map((workspace) => {
              const active = workspace.id === activeWorkspace?.id;

              return (
                <button
                  key={workspace.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={switching}
                  onClick={() => handleSwitch(workspace.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-60"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Layers className="size-4" />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {workspace.name}
                      </span>
                      <span className="block text-xs capitalize text-muted-foreground">
                        {workspace.role}
                      </span>
                    </span>
                  </span>

                  {active && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
