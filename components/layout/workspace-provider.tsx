"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  switching: boolean;
  switchWorkspace: (id: string) => Promise<void>;
  updateActiveWorkspaceName: (name: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({
  children,
  initialWorkspace,
}: {
  children: ReactNode;
  initialWorkspace: Workspace;
}) {
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    initialWorkspace,
  ]);
  const [activeId, setActiveId] = useState(initialWorkspace.id);
  const initialWorkspaceRef = useRef(initialWorkspace);
  const activeIdRef = useRef(initialWorkspace.id);
  const switchingRef = useRef(false);
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

      const loadedWorkspaces: Workspace[] = data.workspaces ?? [];
      setWorkspaces((currentWorkspaces) => {
        const currentActive =
          currentWorkspaces.find(
            (workspace) => workspace.id === activeIdRef.current,
          ) ?? initialWorkspaceRef.current;
        const activeIsLoaded = loadedWorkspaces.some(
          (workspace) => workspace.id === currentActive.id,
        );

        return activeIsLoaded
          ? loadedWorkspaces.map((workspace) =>
              workspace.id === currentActive.id ? currentActive : workspace,
            )
          : [currentActive, ...loadedWorkspaces];
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load workspaces.",
      );
    }
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (workspaceId === activeIdRef.current || switchingRef.current) return;

      const previousId = activeIdRef.current;
      const nextWorkspace = workspaces.find((w) => w.id === workspaceId);

      if (!nextWorkspace) return;

      activeIdRef.current = workspaceId;
      setActiveId(workspaceId);
      switchingRef.current = true;
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
        activeIdRef.current = previousId;
        setActiveId(previousId);

        toast.error(
          error instanceof Error ? error.message : "Workspace switch failed.",
        );
      } finally {
        switchingRef.current = false;
        setSwitching(false);
      }
    },
    [workspaces, router],
  );

  const updateActiveWorkspaceName = useCallback(
    (name: string) => {
      setWorkspaces((currentWorkspaces) =>
        currentWorkspaces.map((workspace) =>
          workspace.id === activeIdRef.current
            ? { ...workspace, name }
            : workspace,
        ),
      );
    },
    [],
  );

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        switching,
        switchWorkspace,
        updateActiveWorkspaceName,
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
