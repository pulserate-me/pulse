import { useEffect, useRef } from "react";
import type { AppNotification } from "../backend.d";

// Module-level set so it persists across re-renders and doesn't cause re-render itself
const shownIds = new Set<string>();

function formatNotificationContent(kind: AppNotification["kind"]): {
  title: string;
  body: string;
} {
  if ("goldGifted" in kind) {
    const amount = (Number(kind.goldGifted.amount) / 100).toFixed(2);
    return {
      title: "Gold Received ✦",
      body: `${kind.goldGifted.fromUsername} gifted you ${amount} Gold`,
    };
  }
  if ("storyLiked" in kind) {
    return {
      title: "Story Liked ❤️",
      body: `${kind.storyLiked.byUsername} liked your story`,
    };
  }
  if ("storyCommented" in kind) {
    return {
      title: "New Story Comment 💬",
      body: `${kind.storyCommented.byUsername} commented on your story`,
    };
  }
  if ("channelPostLiked" in kind) {
    return {
      title: "Post Liked ❤️",
      body: `${kind.channelPostLiked.byUsername} liked your channel post`,
    };
  }
  if ("channelPostCommented" in kind) {
    return {
      title: "New Comment 💬",
      body: `${kind.channelPostCommented.byUsername} commented on your channel post`,
    };
  }
  if ("channelFollowed" in kind) {
    return {
      title: "New Follower 📻",
      body: `${kind.channelFollowed.byUsername} followed your channel`,
    };
  }
  if ("channelNewPost" in kind) {
    return {
      title: "New Channel Post 📢",
      body: `New post in ${(kind as any).channelNewPost.channelName || "a channel you follow"}`,
    };
  }
  return { title: "Pulse", body: "You have a new notification" };
}

/**
 * Requests browser notification permission (non-blocking, fire-and-forget).
 */
export function requestNotificationPermission(): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  Notification.requestPermission();
}

/**
 * Shows native notifications for new items when the page is hidden.
 * Pass the live notifications array from useGetMyNotifications.
 */
export function useBackgroundNotifications(
  notifications: AppNotification[],
): void {
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return;

    for (const notif of notifications) {
      const id = String(notif.id);
      if (!shownIds.has(id)) {
        shownIds.add(id);
        const { title, body } = formatNotificationContent(notif.kind);
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready
            .then((reg) => {
              reg.showNotification(title, {
                body,
                icon: "/icons/icon-192.png",
                badge: "/icons/icon-192.png",
                tag: id,
              });
            })
            .catch(() => {
              // fallback: use Notification directly
              try {
                new Notification(title, {
                  body,
                  icon: "/icons/icon-192.png",
                  tag: id,
                });
              } catch {
                // silently ignore
              }
            });
        } else {
          try {
            new Notification(title, {
              body,
              icon: "/icons/icon-192.png",
              tag: id,
            });
          } catch {
            // silently ignore
          }
        }
      }
    }
  }, [notifications]);
}
