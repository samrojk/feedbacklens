"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Sparkles,
  Users,
  ShieldAlert,
  Info,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { useWorkspace } from "@/components/layout/workspace-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  INVITATIONS_UPDATED_EVENT,
  NOTIFICATIONS_UPDATED_EVENT,
} from "@/lib/notifications/events";

type Notification = {
  id: string;
  type:
    | "invitation"
    | "usage"
    | "analysis"
    | "workspace"
    | "security"
    | "system";
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  action_url: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  expires_at: string;
  created_at: string;
};

type NotificationResponse = {
  notifications: Notification[];
  unreadCount: number;
};

type PendingInvitation = {
  id: string;
  workspace_id: string;
  workspaceName: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

type PendingInvitationResponse = {
  invitations: PendingInvitation[];
  error?: string;
};

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "invitation":
    case "workspace":
      return Users;
    case "analysis":
      return Sparkles;
    case "security":
      return ShieldAlert;
    case "usage":
      return CircleAlert;
    default:
      return Info;
  }
}

function getSeverityStyle(severity: Notification["severity"]) {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-600";
    case "warning":
      return "bg-amber-50 text-amber-600";
    case "success":
      return "bg-emerald-50 text-emerald-600";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatTime(date: string) {
  const elapsed = Date.now() - new Date(date).getTime();

  if (!Number.isFinite(elapsed) || elapsed < 0) return "Just now";

  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationBell() {
  const { activeWorkspace, switching } = useWorkspace();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [pendingInvitationsLoading, setPendingInvitationsLoading] =
    useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [open, setOpen] = useState(false);
  const requestsRef = useRef(new Map<string, Promise<void>>());
  const pendingInvitationsRequestRef = useRef<Promise<void> | null>(null);
  const activeWorkspaceIdRef = useRef(activeWorkspace?.id ?? null);
  activeWorkspaceIdRef.current = activeWorkspace?.id ?? null;

  const fetchNotifications = useCallback((workspaceId: string) => {
    const existingRequest = requestsRef.current.get(workspaceId);

    if (existingRequest) return existingRequest;

    const request = (async () => {
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to fetch notifications.");
        }

        const data: NotificationResponse = await response.json();

        if (activeWorkspaceIdRef.current === workspaceId) {
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch (error) {
        console.error("Notification fetch error:", error);
      } finally {
        if (activeWorkspaceIdRef.current === workspaceId) {
          setLoading(false);
        }
        requestsRef.current.delete(workspaceId);
      }
    })();

    requestsRef.current.set(workspaceId, request);
    return request;
  }, []);

  const fetchPendingInvitations = useCallback(() => {
    if (pendingInvitationsRequestRef.current) {
      return pendingInvitationsRequestRef.current;
    }

    const request = (async () => {
      try {
        const response = await fetch("/api/workspace-invitations/pending", {
          cache: "no-store",
        });
        const data: PendingInvitationResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load invitations.");
        }

        setPendingInvitations(data.invitations ?? []);
      } catch (error) {
        console.error("Pending invitation fetch error:", error);
        toast.error(
          error instanceof Error ? error.message : "Unable to load invitations.",
        );
      } finally {
        setPendingInvitationsLoading(false);
        pendingInvitationsRequestRef.current = null;
      }
    })();

    pendingInvitationsRequestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    if (!activeWorkspace?.id || switching) return;

    setNotifications([]);
    setUnreadCount(0);
    setLoading(true);
    void fetchNotifications(activeWorkspace.id);
  }, [activeWorkspace?.id, fetchNotifications, switching]);

  useEffect(() => {
    void fetchPendingInvitations();
  }, [fetchPendingInvitations]);

  useEffect(() => {
    function handleNotificationsUpdated() {
      const workspaceId = activeWorkspaceIdRef.current;
      if (workspaceId && !switching) void fetchNotifications(workspaceId);
    }

    window.addEventListener(
      NOTIFICATIONS_UPDATED_EVENT,
      handleNotificationsUpdated,
    );

    return () => {
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        handleNotificationsUpdated,
      );
    };
  }, [fetchNotifications, switching]);

  useEffect(() => {
    function handleInvitationsUpdated() {
      void fetchPendingInvitations();
    }

    window.addEventListener(
      INVITATIONS_UPDATED_EVENT,
      handleInvitationsUpdated,
    );

    return () => {
      window.removeEventListener(
        INVITATIONS_UPDATED_EVENT,
        handleInvitationsUpdated,
      );
    };
  }, [fetchPendingInvitations]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      const workspaceId = activeWorkspaceIdRef.current;
      if (workspaceId && !switching) {
        void fetchNotifications(workspaceId);
      }

      void fetchPendingInvitations();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications, fetchPendingInvitations, switching]);

  async function markAsRead(id: string) {
    const notification = notifications.find((item) => item.id === id);

    if (!notification || notification.read_at || updatingId) return;

    setUpdatingId(id);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update notification.");
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update notifications.");
      }

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: readAt })),
      );

      setUnreadCount(0);
      toast.success("All notifications marked as read.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  const pendingInvitationIds = new Set(
    pendingInvitations.map((invitation) => invitation.id),
  );
  const duplicateInvitationNotificationIds = new Set(
    notifications
      .filter(
        (notification) =>
          notification.type === "invitation" &&
          typeof notification.metadata?.invitationId === "string" &&
          pendingInvitationIds.has(notification.metadata.invitationId),
      )
      .map((notification) => notification.id),
  );
  const displayedNotifications = notifications.filter(
    (notification) => !duplicateInvitationNotificationIds.has(notification.id),
  );
  const displayedUnreadCount = displayedNotifications.filter(
    (notification) => !notification.read_at,
  ).length;
  const badgeCount = displayedUnreadCount + pendingInvitations.length;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) void fetchPendingInvitations();
        if (nextOpen && activeWorkspace?.id && !switching) {
          void fetchNotifications(activeWorkspace.id);
        }
      }}
    >
      <DropdownMenuTrigger
        aria-label="Open notifications"
        className="relative flex size-10 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-4.5" />

        {badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-[9px] font-semibold leading-4 text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-xl p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Notifications</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {displayedUnreadCount > 0 &&
                `${displayedUnreadCount} unread notification${displayedUnreadCount === 1 ? "" : "s"}`}
              {displayedUnreadCount > 0 && pendingInvitations.length > 0 && " · "}
              {pendingInvitations.length > 0 &&
                `${pendingInvitations.length} pending invitation${pendingInvitations.length === 1 ? "" : "s"}`}
              {displayedUnreadCount === 0 &&
                pendingInvitations.length === 0 &&
                "You're all caught up"}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-105 overflow-y-auto">
          {!loading &&
            !pendingInvitationsLoading &&
            pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="group relative flex gap-3 border-b bg-muted/30 px-4 py-3 transition-colors"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Users className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-5">
                    Workspace invitation
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    Join {invitation.workspaceName} as {invitation.role}.
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {formatTime(invitation.created_at)}
                    </span>
                    <Link
                      href="/invitations"
                      onClick={() => setOpen(false)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Review invitation
                    </Link>
                  </div>
                </div>
              </div>
            ))}

          {loading || pendingInvitationsLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading notifications...
            </div>
          ) : displayedNotifications.length === 0 &&
            pendingInvitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
                <Bell className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Updates from your workspace will appear here.
              </p>
            </div>
          ) : (
            displayedNotifications.slice(0, 20).map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const isUnread = !notification.read_at;
              const isUpdating = updatingId === notification.id;

              return (
                <div
                  key={notification.id}
                  className={`group relative flex gap-3 border-b px-4 py-3 transition-colors last:border-0 ${
                    isUnread ? "bg-muted/30" : "bg-background"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${getSeverityStyle(notification.severity)}`}
                  >
                    <Icon className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-5">
                        {notification.title}
                      </p>

                      {isUnread && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {notification.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(notification.created_at)}
                      </span>

                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification.id)}
                            disabled={isUpdating}
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            {isUpdating ? "Saving..." : "Mark read"}
                          </button>
                        )}

                        {notification.action_url && (
                          <Link
                            href={notification.action_url}
                            onClick={() => {
                              if (isUnread) void markAsRead(notification.id);
                              setOpen(false);
                            }}
                            className="text-[11px] font-semibold text-primary hover:underline"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t px-4 py-2.5">
          <Link
            href="/settings/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Notification settings
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
