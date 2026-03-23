import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell } from "lucide-react";
import { useState } from "react";
import type { AppNotification } from "../backend.d";
import {
  useGetMyNotifications,
  useMarkNotificationsRead,
} from "../hooks/useQueries";

function formatRelativeTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatGoldAmount(amount: bigint): string {
  return (Number(amount) / 100).toFixed(2);
}

function getNotificationMessage(kind: AppNotification["kind"]): {
  icon: string;
  message: string;
} {
  if ("goldGifted" in kind) {
    return {
      icon: "✦",
      message: `${kind.goldGifted.fromUsername} gifted you ${formatGoldAmount(kind.goldGifted.amount)} Gold`,
    };
  }
  if ("storyLiked" in kind) {
    return {
      icon: "❤️",
      message: `${kind.storyLiked.byUsername} liked your story`,
    };
  }
  if ("storyCommented" in kind) {
    return {
      icon: "💬",
      message: `${kind.storyCommented.byUsername} commented on your story`,
    };
  }
  if ("channelPostLiked" in kind) {
    return {
      icon: "❤️",
      message: `${kind.channelPostLiked.byUsername} liked your channel post`,
    };
  }
  if ("channelPostCommented" in kind) {
    return {
      icon: "💬",
      message: `${kind.channelPostCommented.byUsername} commented on your channel post`,
    };
  }
  if ("channelFollowed" in kind) {
    return {
      icon: "📻",
      message: `${kind.channelFollowed.byUsername} followed your channel`,
    };
  }
  return { icon: "🔔", message: "New notification" };
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useGetMyNotifications();
  const markRead = useMarkNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recent = notifications.slice(0, 20);

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      markRead.mutate();
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-ocid="notification.bell.button"
          className="relative h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" style={{ color: "oklch(0.75 0.12 72)" }} />
          {unreadCount > 0 && (
            <span
              data-ocid="notification.bell.badge"
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-ocid="notification.bell.popover"
        align="end"
        className="w-80 p-0"
        style={{
          background: "oklch(0.13 0.02 55)",
          border: "1px solid oklch(0.82 0.15 72 / 0.2)",
          boxShadow: "0 8px 32px oklch(0 0 0 / 0.6)",
        }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "oklch(0.82 0.15 72 / 0.15)" }}
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: "oklch(0.82 0.15 72)" }}
          >
            Notifications
          </h3>
        </div>
        <ScrollArea className="max-h-80">
          {recent.length === 0 ? (
            <div
              data-ocid="notification.empty_state"
              className="flex flex-col items-center justify-center py-10 px-4 gap-2"
            >
              <Bell
                className="h-8 w-8 opacity-30"
                style={{ color: "oklch(0.82 0.15 72)" }}
              />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="py-1">
              {recent.map((notif, i) => {
                const { icon, message } = getNotificationMessage(notif.kind);
                return (
                  <div
                    key={String(notif.id)}
                    data-ocid={`notification.item.${i + 1}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{
                      background: notif.read
                        ? undefined
                        : "oklch(0.82 0.15 72 / 0.05)",
                      borderBottom: "1px solid oklch(0.82 0.15 72 / 0.08)",
                    }}
                  >
                    <span className="text-base mt-0.5 shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        {message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(notif.timestamp)}
                      </p>
                    </div>
                    {!notif.read && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ background: "oklch(0.76 0.13 72)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
