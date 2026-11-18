"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type WorkspaceContextType = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  switching: boolean;
  switchWorkspace: (id: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    try {
      const response = await fetch("/api/workspaces", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load workspaces.");
      }

      setWorkspaces(data.workspaces ?? []);
      setActiveId(data.activeWorkspaceId ?? "");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load workspaces.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (workspaceId === activeId || switching) return;

      const previousId = activeId;
      const nextWorkspace = workspaces.find((w) => w.id === workspaceId);

      if (!nextWorkspace) return;

      // Update the shared UI immediately.
      setActiveId(workspaceId);
      setSwitching(true);

      try {
        const response = await fetch("/api/workspaces", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not switch workspace.");
        }

        toast.success(`Switched to ${nextWorkspace.name}`);

        // Refresh server-rendered data using the new workspace.
        router.refresh();
      } catch (error) {
        // Restore the previous workspace if the API fails.
        setActiveId(previousId);

        toast.error(
          error instanceof Error ? error.message : "Workspace switch failed.",
        );
      } finally {
        setSwitching(false);
      }
    },
    [activeId, switching, workspaces, router],
  );

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loading,
        switching,
        switchWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  return context;
}
