import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Radio, Search, Users } from "lucide-react";
import { useState } from "react";
import {
  useFollowChannel,
  useGetAllChannels,
  useGetChannelPosts,
  useUnfollowChannel,
} from "../hooks/useQueries";
import type { ChannelId, ChannelWithMeta } from "../hooks/useQueries";
import { getChannelLastViewed } from "../lib/channelUtils";
import CreateChannelModal from "./CreateChannelModal";

const PAGE_SIZE = 9;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Fetches posts for a single followed channel and returns the unread count badge.
 * Only rendered for isFollowing channels to avoid unnecessary queries.
 */
function ChannelUnreadBadge({ channelId }: { channelId: ChannelId }) {
  const { data: posts = [] } = useGetChannelPosts(channelId);
  const lastViewed = getChannelLastViewed(channelId.toString());
  const unreadCount = posts.filter(
    (p) => Number(p.timestamp) / 1_000_000 > lastViewed,
  ).length;

  if (unreadCount === 0) return null;

  return (
    <Badge
      className="ml-2 min-w-[20px] h-5 flex items-center justify-center text-xs shrink-0 px-1.5"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
        color: "oklch(0.08 0.004 55)",
      }}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </Badge>
  );
}

function ChannelCard({
  meta,
  currentUserId,
  onSelect,
  onAvatarClick,
  index,
}: {
  meta: ChannelWithMeta;
  currentUserId: string;
  onSelect: (id: ChannelId) => void;
  onAvatarClick: (userId: string) => void;
  index: number;
}) {
  const { channel, followerCount, isFollowing } = meta;
  const { mutate: follow, isPending: following } = useFollowChannel();
  const { mutate: unfollow, isPending: unfollowing } = useUnfollowChannel();
  const isOwner = channel.owner.toString() === currentUserId;
  const ocid = index + 1;

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowing) {
      unfollow(channel.id);
    } else {
      follow(channel.id);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAvatarClick(channel.owner.toString());
  };

  return (
    <button
      type="button"
      data-ocid={`channels.item.${ocid}`}
      onClick={() => onSelect(channel.id)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left border-b border-border/30 last:border-0"
    >
      <button
        type="button"
        aria-label={`View ${channel.name} creator profile`}
        onClick={handleAvatarClick}
        className="rounded-full focus:outline-none focus:ring-2 shrink-0"
        style={{ focusRingColor: "oklch(0.82 0.15 72)" } as React.CSSProperties}
      >
        <Avatar className="w-12 h-12">
          {channel.avatarUrl && (
            <AvatarImage src={channel.avatarUrl} alt={channel.name} />
          )}
          <AvatarFallback
            className="text-base font-bold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.25), oklch(0.65 0.11 65 / 0.15))",
              color: "oklch(0.82 0.15 72)",
              border: "1.5px solid oklch(0.76 0.13 72 / 0.3)",
            }}
          >
            {getInitials(channel.name)}
          </AvatarFallback>
        </Avatar>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-sm text-foreground truncate">
            {channel.name}
          </span>
          {isOwner && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                background: "oklch(0.76 0.13 72 / 0.2)",
                color: "oklch(0.82 0.15 72)",
              }}
            >
              Owner
            </span>
          )}
          {isFollowing && !isOwner && (
            <ChannelUnreadBadge channelId={channel.id} />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {channel.description || "No description"}
        </p>
        <div className="flex items-center gap-1 mt-1 text-muted-foreground/60">
          <Users className="h-3 w-3" />
          <span className="text-[11px]">{Number(followerCount)}</span>
        </div>
      </div>

      {!isOwner && (
        <button
          type="button"
          data-ocid={`channels.toggle.${ocid}`}
          onClick={handleFollowClick}
          disabled={following || unfollowing}
          className="shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors"
          style={{
            background: isFollowing ? "transparent" : "oklch(0.82 0.15 72)",
            color: isFollowing ? "oklch(0.6 0.05 55)" : "oklch(0.08 0.004 55)",
            borderColor: isFollowing
              ? "oklch(0.3 0.01 55)"
              : "oklch(0.82 0.15 72)",
          }}
        >
          {following || unfollowing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isFollowing ? (
            "Following"
          ) : (
            "Follow"
          )}
        </button>
      )}
    </button>
  );
}

interface ChannelsTabProps {
  currentUserId: string;
  onSelectChannel: (id: ChannelId) => void;
  onAvatarClick: (userId: string) => void;
}

export default function ChannelsTab({
  currentUserId,
  onSelectChannel,
  onAvatarClick,
}: ChannelsTabProps) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { data: channels = [], isLoading } = useGetAllChannels();

  const filtered = channels.filter((c) => {
    if (!search.trim()) return true;
    return c.channel.name.toLowerCase().includes(search.toLowerCase());
  });

  const visibleChannels = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > page * PAGE_SIZE;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCreated = (channelId: bigint) => {
    onSelectChannel(channelId as ChannelId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio
              className="h-4 w-4"
              style={{ color: "oklch(0.82 0.15 72)" }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "oklch(0.82 0.15 72 / 0.8)" }}
            >
              Channels
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCreateOpen(true)}
            className="h-8 w-8 rounded-xl hover:bg-muted"
            data-ocid="channels.open_modal_button"
            aria-label="Create channel"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-ocid="channels.search_input"
            placeholder="Search channels..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9 bg-input border-border h-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div
            data-ocid="channels.loading_state"
            className="flex flex-col gap-1 p-2"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="channels.empty_state"
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 opacity-30"
              style={{ background: "oklch(0.76 0.13 72 / 0.2)" }}
            >
              <Radio
                className="h-7 w-7"
                style={{ color: "oklch(0.82 0.15 72)" }}
              />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No channels found" : "No channels yet"}
            </p>
            {!search && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                Tap + to create the first one
              </p>
            )}
          </div>
        ) : (
          <div data-ocid="channels.list">
            {visibleChannels.map((meta, idx) => (
              <ChannelCard
                key={meta.channel.id.toString()}
                meta={meta}
                currentUserId={currentUserId}
                onSelect={onSelectChannel}
                onAvatarClick={onAvatarClick}
                index={idx}
              />
            ))}
            {hasMore && (
              <button
                type="button"
                data-ocid="channels.pagination_next"
                onClick={() => setPage((p) => p + 1)}
                className="w-full py-3 text-xs font-semibold text-center transition-colors hover:bg-muted/30"
                style={{ color: "oklch(0.82 0.15 72)" }}
              >
                Show {Math.min(PAGE_SIZE, filtered.length - page * PAGE_SIZE)}{" "}
                more
              </button>
            )}
          </div>
        )}
      </div>

      <CreateChannelModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
