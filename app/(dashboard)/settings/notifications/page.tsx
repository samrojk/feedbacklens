"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Mail,
  Sparkles,
  Users,
  Activity,
  ShieldCheck,
  Monitor,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Preferences = {
  in_app_enabled: boolean;
  email_enabled: boolean;
  analysis_notifications: boolean;
  workspace_notifications: boolean;
  usage_notifications: boolean;
  security_notifications: boolean;
  system_notifications: boolean;
};

const defaultPreferences: Preferences = {
  in_app_enabled: true,
  email_enabled: false,
  analysis_notifications: true,
  workspace_notifications: true,
  usage_notifications: true,
  security_notifications: true,
  system_notifications: true,
};

type PreferenceKey = keyof Preferences;

const channels = [
  {
    key: "in_app_enabled",
    title: "In-app notifications",
    description: "Receive updates through the notification bell.",
    icon: Bell,
  },
  {
    key: "email_enabled",
    title: "Email notifications",
    description: "Receive supported updates in your inbox.",
    icon: Mail,
  },
] as const;

const categories = [
  {
    key: "analysis_notifications",
    title: "Analysis updates",
    description: "When feedback analysis is completed or fails.",
    icon: Sparkles,
  },
  {
    key: "workspace_notifications",
    title: "Workspace activity",
    description: "Member changes, invitations and workspace updates.",
    icon: Users,
  },
  {
    key: "usage_notifications",
    title: "Usage alerts",
    description: "AI usage and resource-related notifications.",
    icon: Activity,
  },
  {
    key: "security_notifications",
    title: "Security alerts",
    description: "Important account and security-related updates.",
    icon: ShieldCheck,
  },
  {
    key: "system_notifications",
    title: "System updates",
    description: "Product updates and important service announcements.",
    icon: Monitor,
  },
] as const;

function PreferenceSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span
        className={`pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/notifications", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load preferences.");
      }

      setPreferences({
        ...defaultPreferences,
        ...result.preferences,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  async function updatePreference(key: PreferenceKey, value: boolean) {
    if (savingKey) return;

    const previousValue = preferences[key];

    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

    setSavingKey(key);

    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [key]: value }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save preference.");
      }

      setPreferences({
        ...defaultPreferences,
        ...result.preferences,
      });

      toast.success("Preference updated.");
    } catch (error) {
      setPreferences((current) => ({
        ...current,
        [key]: previousValue,
      }));

      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  function renderToggle(
    key: PreferenceKey,
    title: string,
    description: string,
    Icon: typeof Bell,
  ) {
    return (
      <div key={key} className="flex items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {savingKey === key && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}

          <PreferenceSwitch
            checked={preferences[key]}
            onChange={(checked) => updatePreference(key, checked)}
            disabled={loading || savingKey !== null}
            label={title}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Personal preferences</p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Notifications
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Choose which updates you want to receive in your workspace.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading preferences...
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery channels</CardTitle>
              <CardDescription>
                Choose where you want to receive notifications.
              </CardDescription>
            </CardHeader>

            <CardContent className="divide-y">
              {channels.map((item) =>
                renderToggle(item.key, item.title, item.description, item.icon),
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Notification categories
              </CardTitle>
              <CardDescription>
                Control which types of workspace updates you receive.
              </CardDescription>
            </CardHeader>

            <CardContent className="divide-y">
              {categories.map((item) =>
                renderToggle(item.key, item.title, item.description, item.icon),
              )}
            </CardContent>
          </Card>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="size-3.5 text-emerald-600" />
            Changes are saved automatically.
          </p>
        </>
      )}
    </div>
  );
}
