import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  Coins,
  Edit,
  Image as ImageIcon,
  Loader2,
  Mic,
  MoreVertical,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Search,
  Send,
  Share2,
  Shield,
  ShieldOff,
  Square,
  Trash2,
  UserMinus,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  Conversation,
  ConversationId,
  MediaType,
  Message,
  MessageId,
} from "../backend";
import { createActor } from "../backend";
import { useMediaUpload } from "../hooks/useMediaUpload";
import {
  useAddGroupMember,
  useBlockUser,
  useDeleteMessage,
  useEditMessage,
  useGetGroupAvatars,
  useGetGroupCreators,
  useGetMessages,
  useGetMyBlockedUsers,
  useGetMyGoldBalance,
  useGetTypingUsers,
  useGetUserProfile,
  useIsUserOnline,
  useLeaveConversation,
  useListUserConversations,
  useMarkMessagesAsRead,
  usePinMessage,
  useRemoveGroupMember,
  useSendMessage,
  useTransferGold,
  useUnblockUser,
  useUnpinMessage,
  useUpdateGroupAvatar,
} from "../hooks/useQueries";
import UserProfileModal from "./UserProfileModal";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  if (ms === 0) return "";
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastSeen(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  if (ms === 0) return "";
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60000) return "last seen just now";
  if (diff < 3600000) return `last seen ${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `last seen ${Math.floor(diff / 3600000)}h ago`;
  return `last seen ${new Date(ms).toLocaleDateString()}`;
}

interface ReadReceiptIconProps {
  message: Message;
  currentUserId: string;
  memberCount: number;
}

function ReadReceiptIcon({
  message,
  currentUserId,
  memberCount,
}: ReadReceiptIconProps) {
  if (message.sender.toString() !== currentUserId) return null;

  const readCount = message.readReceipts.filter(
    (r) => r.userId.toString() !== currentUserId,
  ).length;
  const othersCount = memberCount - 1;

  if (readCount === 0) {
    return <Check className="h-3 w-3 text-muted-foreground" />;
  }
  if (readCount >= othersCount && othersCount > 0) {
    return (
      <CheckCheck
        className="h-3 w-3"
        style={{ color: "oklch(0.82 0.15 72)" }}
      />
    );
  }
  return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
}

interface MediaMessageProps {
  url: string;
  mediaType: MediaType;
  onImageClick: (url: string) => void;
}

function MediaMessage({ url, mediaType, onImageClick }: MediaMessageProps) {
  if (mediaType.__kind__ === "image") {
    return (
      <button
        type="button"
        onClick={() => onImageClick(url)}
        className="block cursor-pointer rounded-lg overflow-hidden mt-1"
        aria-label="View full image"
      >
        <img
          src={url}
          alt="Shared media"
          className="max-w-[240px] max-h-[300px] object-cover"
          loading="lazy"
        />
      </button>
    );
  }
  if (mediaType.__kind__ === "video") {
    return (
      // biome-ignore lint/a11y/useMediaCaption: user-uploaded video, captions unavailable
      <video
        controls
        muted
        playsInline
        preload="metadata"
        className="max-w-[240px] max-h-[240px] rounded-lg mt-1"
        style={{ display: "block" }}
      >
        <source src={url} />
      </video>
    );
  }
  if (mediaType.__kind__ === "audio") {
    return (
      // biome-ignore lint/a11y/useMediaCaption: user-uploaded audio, captions unavailable
      <audio
        data-ocid="chat.audio_player"
        controls
        src={url}
        className="max-w-[240px] rounded-lg mt-1"
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline text-sm"
    >
      View media
    </a>
  );
}

function ForwardMessagePicker({
  conversations,
  currentUserId,
  groupAvatarMap,
  onSelect,
}: {
  conversations: Conversation[];
  currentUserId: string;
  groupAvatarMap: Map<string, string>;
  onSelect: (convId: ConversationId) => void;
}) {
  return (
    <ScrollArea className="max-h-72">
      {conversations.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No conversations
        </p>
      ) : (
        conversations.map((conv) => {
          const isGroupConv = conv.type.__kind__ === "group";
          const convName = isGroupConv
            ? (conv.type as { __kind__: "group"; group: string }).group
            : null;
          return (
            <ForwardConvRow
              key={conv.id.toString()}
              conversation={conv}
              convName={convName}
              currentUserId={currentUserId}
              isGroupConv={isGroupConv}
              groupAvatarUrl={
                isGroupConv ? groupAvatarMap.get(conv.id.toString()) : undefined
              }
              onSelect={() => onSelect(conv.id)}
            />
          );
        })
      )}
    </ScrollArea>
  );
}

function ForwardConvRow({
  conversation,
  convName,
  currentUserId,
  isGroupConv,
  groupAvatarUrl,
  onSelect,
}: {
  conversation: Conversation;
  convName: string | null;
  currentUserId: string;
  isGroupConv: boolean;
  groupAvatarUrl?: string;
  onSelect: () => void;
}) {
  const otherUserId = isGroupConv
    ? null
    : (conversation.members
        .find((m) => m.toString() !== currentUserId)
        ?.toString() ?? null);
  const { data: otherProfile } = useGetUserProfile(otherUserId);
  const displayName =
    convName ?? otherProfile?.displayName ?? otherUserId?.slice(0, 8) ?? "Chat";
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
    >
      <Avatar className="w-9 h-9 shrink-0">
        {isGroupConv && groupAvatarUrl ? (
          <AvatarImage src={groupAvatarUrl} alt={displayName} />
        ) : !isGroupConv && otherProfile?.avatarUrl ? (
          <AvatarImage src={otherProfile.avatarUrl} alt={displayName} />
        ) : null}
        <AvatarFallback
          className="text-xs"
          style={{
            background: "oklch(0.76 0.13 72 / 0.2)",
            color: "oklch(0.82 0.15 72)",
          }}
        >
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm text-foreground truncate">{displayName}</span>
    </button>
  );
}

function MemberRow({
  memberId,
  isMe,
  isOwner,
  index,
  onRemove,
}: {
  memberId: string;
  isMe: boolean;
  isOwner: boolean;
  index: number;
  onRemove: () => void;
}) {
  const { data: profile } = useGetUserProfile(memberId);
  const displayName = profile?.displayName ?? memberId.slice(0, 8);
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
      <Avatar className="w-7 h-7 shrink-0">
        <AvatarImage src={profile?.avatarUrl} alt={displayName} />
        <AvatarFallback
          className="text-xs"
          style={{
            background: "oklch(0.76 0.13 72 / 0.2)",
            color: "oklch(0.82 0.15 72)",
          }}
        >
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm flex-1 truncate text-foreground">
        {displayName}
      </span>
      {isOwner && (
        <span
          className="text-xs font-semibold px-1.5 py-0.5 rounded-md ml-1"
          style={{
            color: "oklch(0.82 0.15 72)",
            background: "oklch(0.82 0.15 72 / 0.12)",
          }}
        >
          Owner
        </span>
      )}
      {isMe ? (
        <span className="text-xs text-muted-foreground">You</span>
      ) : (
        <Button
          data-ocid={`chat.remove_member.button.${index + 1}`}
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <UserMinus className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function SingleMemberProfileLoader({
  memberId,
  onLoaded,
}: {
  memberId: string;
  onLoaded: (id: string, displayName: string) => void;
}) {
  const { data: profile } = useGetUserProfile(memberId);
  useEffect(() => {
    const name = profile?.displayName ?? memberId.slice(0, 8);
    onLoaded(memberId, name);
  }, [memberId, profile?.displayName, onLoaded]);
  return null;
}

function SortedMemberList({
  memberIds,
  currentUserId,
  groupOwnerId,
  conversationId,
  visibleMembersCount,
  setVisibleMembersCount,
  removeGroupMember,
}: {
  memberIds: string[];
  currentUserId: string;
  groupOwnerId: string | null;
  conversationId: ConversationId;
  visibleMembersCount: number;
  setVisibleMembersCount: React.Dispatch<React.SetStateAction<number>>;
  removeGroupMember: ReturnType<typeof useRemoveGroupMember>;
}) {
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  const handleLoaded = useCallback((id: string, displayName: string) => {
    setProfileNames((prev) => {
      if (prev[id] === displayName) return prev;
      return { ...prev, [id]: displayName };
    });
  }, []);

  const sortedIds = useMemo(() => {
    return [...memberIds].sort((a, b) => {
      const nameA = (profileNames[a] ?? a.slice(0, 8)).toLowerCase();
      const nameB = (profileNames[b] ?? b.slice(0, 8)).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [memberIds, profileNames]);

  const visible = sortedIds.slice(0, visibleMembersCount);
  const remaining = sortedIds.length - visibleMembersCount;

  return (
    <>
      {memberIds.map((id) => (
        <SingleMemberProfileLoader
          key={id}
          memberId={id}
          onLoaded={handleLoaded}
        />
      ))}
      <ScrollArea className="max-h-48">
        <div className="flex flex-col gap-1">
          {visible.map((mIdStr, mi) => {
            const isMe = mIdStr === currentUserId;
            return (
              <MemberRow
                key={mIdStr}
                memberId={mIdStr}
                isMe={isMe}
                isOwner={mIdStr === groupOwnerId}
                index={mi}
                onRemove={() => {
                  removeGroupMember.mutate(
                    { conversationId, memberId: mIdStr },
                    {
                      onError: () => toast.error("Failed to remove member"),
                    },
                  );
                }}
              />
            );
          })}
        </div>
      </ScrollArea>
      {remaining > 0 && (
        <button
          type="button"
          className="text-xs font-medium mt-1"
          style={{ color: "oklch(0.82 0.15 72)" }}
          onClick={() => setVisibleMembersCount((c) => c + 19)}
        >
          More ({remaining} remaining)
        </button>
      )}
    </>
  );
}

// ─── ReplyQuoteBlock: the quoted snippet shown inside a message bubble ─────────
function ReplyQuoteBlock({
  senderUsername,
  preview,
}: {
  senderUsername: string;
  preview: string;
}) {
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 text-xs max-w-full overflow-hidden"
      style={{
        borderLeftColor: "oklch(0.82 0.15 72)",
        background: "oklch(0.82 0.15 72 / 0.08)",
      }}
    >
      <span
        className="font-semibold block truncate"
        style={{ color: "oklch(0.82 0.15 72)" }}
      >
        @{senderUsername}
      </span>
      <span className="text-muted-foreground line-clamp-2 break-words">
        {preview}
      </span>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  memberCount: number;
  isGroup: boolean;
  showSender: boolean;
  onImageClick: (url: string) => void;
  onSenderClick?: (principalId: string) => void;
  onForward?: (content: {
    text: string;
    mediaUrl?: string;
    mediaType?: string;
  }) => void;
  onReply?: (message: Message) => void;
  onPin?: (messageId: MessageId) => void;
  onUnpin?: () => void;
  pinnedMessageId?: MessageId | null;
  index: number;
  conversationId: ConversationId;
  // Optimistic reactions state managed by parent
  localReactions: string[];
  onToggleReaction: (messageId: MessageId) => void;
  /** Lowercase search term for highlighting. Empty string = no highlight. */
  searchHighlight?: string;
}

function MessageBubble({
  message,
  currentUserId,
  memberCount,
  isGroup,
  showSender,
  onImageClick,
  onSenderClick,
  onForward,
  onReply,
  onPin,
  onUnpin,
  pinnedMessageId,
  index,
  conversationId,
  localReactions,
  onToggleReaction,
  searchHighlight = "",
}: MessageBubbleProps) {
  const isSent = message.sender.toString() === currentUserId;
  const senderId = message.sender.toString();
  const isThisPinned =
    pinnedMessageId != null && pinnedMessageId === message.id;
  const { data: senderProfile } = useGetUserProfile(
    isGroup && !isSent ? senderId : null,
  );
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content.text ?? "");
  const editMessage = useEditMessage(conversationId);
  const deleteMessage = useDeleteMessage(conversationId);

  // Highlight matching text for search
  const renderText = (raw: string) => {
    if (!searchHighlight || !raw) return raw;
    const idx = raw.toLowerCase().indexOf(searchHighlight);
    if (idx === -1) return raw;
    return (
      <>
        {raw.slice(0, idx)}
        <mark
          style={{
            background: "oklch(0.82 0.15 72 / 0.35)",
            color: "inherit",
            borderRadius: "2px",
            padding: "0 1px",
          }}
        >
          {raw.slice(idx, idx + searchHighlight.length)}
        </mark>
        {raw.slice(idx + searchHighlight.length)}
      </>
    );
  };

  // Touch handling for long-press → reply
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStarted = useRef(false);

  const handleTouchStart = useCallback(() => {
    touchStarted.current = true;
    longPressTimer.current = setTimeout(() => {
      if (touchStarted.current && onReply) {
        onReply(message);
        // haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(30);
      }
    }, 500);
  }, [message, onReply]);

  const handleTouchEnd = useCallback(() => {
    touchStarted.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  async function handleSaveEdit() {
    if (!editText.trim()) return;
    await editMessage.mutateAsync({
      messageId: message.id,
      newText: editText.trim(),
    });
    setIsEditing(false);
  }

  const senderName = senderProfile?.displayName ?? senderId.slice(0, 8);
  const reactionCount = localReactions.length;
  const iReacted = localReactions.includes(currentUserId);

  return (
    <motion.div
      data-ocid={`chat.message.${index + 1}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!menuOpen) setHovered(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 ${
        isSent ? "flex-row-reverse" : "flex-row"
      } mb-1`}
    >
      {!isSent && isGroup && (
        <Avatar
          className="w-7 h-7 shrink-0 mb-0.5 cursor-pointer"
          onClick={() => onSenderClick?.(senderId)}
        >
          <AvatarImage src={senderProfile?.avatarUrl} alt={senderName} />
          <AvatarFallback
            className="text-xs font-semibold"
            style={{
              background: "oklch(0.76 0.13 72 / 0.2)",
              color: "oklch(0.82 0.15 72)",
            }}
          >
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`flex flex-col ${
          isSent ? "items-end" : "items-start"
        } max-w-[85%] sm:max-w-[72%]`}
      >
        {isGroup && !isSent && showSender && (
          <span
            className="text-xs font-medium mb-1"
            style={{ color: "oklch(0.82 0.15 72)" }}
          >
            {senderName}
          </span>
        )}
        <div
          className={`rounded-2xl px-3 py-2 ${
            isSent
              ? "message-bubble-sent rounded-br-sm"
              : "message-bubble-received rounded-bl-sm"
          }`}
        >
          {/* Reply quote block */}
          {message.replyTo && (
            <ReplyQuoteBlock
              senderUsername={message.replyTo.senderUsername}
              preview={message.replyTo.preview}
            />
          )}

          {message.content.mediaUrl &&
            message.content.mediaType &&
            (Date.now() - Number(message.timestamp) / 1_000_000 >
            72 * 60 * 60 * 1000 ? (
              <p className="text-xs text-muted-foreground italic py-1">
                📎 Media expired
              </p>
            ) : (
              <MediaMessage
                url={message.content.mediaUrl}
                mediaType={message.content.mediaType}
                onImageClick={onImageClick}
              />
            ))}
          {message.content.text && !isEditing && (
            <p className="text-sm text-foreground leading-relaxed break-words">
              {renderText(message.content.text)}
            </p>
          )}
          <div
            className={`flex items-center gap-1 mt-0.5 ${
              isSent ? "justify-end" : "justify-start"
            }`}
          >
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            <ReadReceiptIcon
              message={message}
              currentUserId={currentUserId}
              memberCount={memberCount}
            />
          </div>
        </div>

        {/* Reaction badge */}
        {reactionCount > 0 && (
          <button
            type="button"
            data-ocid={`chat.message.reaction_badge.${index + 1}`}
            onClick={() => onToggleReaction(message.id)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all mt-0.5"
            style={{
              background: iReacted
                ? "oklch(0.65 0.22 25 / 0.18)"
                : "oklch(0.82 0.15 72 / 0.08)",
              border: iReacted
                ? "1px solid oklch(0.65 0.22 25 / 0.4)"
                : "1px solid oklch(0.82 0.15 72 / 0.15)",
              color: iReacted ? "oklch(0.65 0.22 25)" : "text-muted-foreground",
            }}
            aria-label={`${reactionCount} reaction${reactionCount !== 1 ? "s" : ""}`}
          >
            ❤ {reactionCount}
          </button>
        )}

        {/* Action buttons on hover */}
        <div
          className={`flex items-center gap-0.5 mt-0.5 ${
            isSent ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {/* Heart reaction button */}
          {(hovered || menuOpen) && (
            <button
              type="button"
              data-ocid={`chat.message.react_button.${index + 1}`}
              onClick={() => onToggleReaction(message.id)}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors shrink-0 self-center"
              style={{
                color: iReacted ? "oklch(0.65 0.22 25)" : undefined,
              }}
              aria-label={iReacted ? "Remove reaction" : "React with heart"}
            >
              <span className="text-sm leading-none">
                {iReacted ? "❤" : "🤍"}
              </span>
            </button>
          )}

          {/* Reply button */}
          {(hovered || menuOpen) && onReply && (
            <button
              type="button"
              data-ocid={`chat.message.reply_button.${index + 1}`}
              onClick={() => onReply(message)}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground shrink-0 self-center"
              aria-label="Reply to message"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Forward button */}
          {(hovered || menuOpen) && onForward && (
            <button
              type="button"
              data-ocid="chat.message.forward_button"
              onClick={() =>
                onForward({
                  text: message.content.text ?? "",
                  mediaUrl: message.content.mediaUrl ?? undefined,
                  mediaType: message.content.mediaType
                    ? ((message.content.mediaType as { __kind__: string })
                        .__kind__ ??
                      Object.keys(message.content.mediaType as object)[0])
                    : undefined,
                })
              }
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground shrink-0 self-center"
              aria-label="Forward message"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Pin button — visible on hover for all users */}
          {(hovered || menuOpen) && (onPin || onUnpin) && (
            <button
              type="button"
              data-ocid={`chat.message.pin_button.${index + 1}`}
              onClick={() => {
                if (isThisPinned && onUnpin) {
                  onUnpin();
                } else if (!isThisPinned && onPin) {
                  onPin(message.id);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground shrink-0 self-center"
              aria-label={isThisPinned ? "Unpin message" : "Pin message"}
            >
              {isThisPinned ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Edit/Delete menu for own messages */}
          {isSent && (hovered || menuOpen) && (
            <DropdownMenu
              open={menuOpen}
              onOpenChange={(open) => {
                setMenuOpen(open);
                if (!open) setHovered(false);
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-ocid={`chat.message.edit_button.${index + 1}`}
                  className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground shrink-0 self-center"
                  aria-label="Message options"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-card border-border"
              >
                {message.content.text && (
                  <DropdownMenuItem
                    onClick={() => {
                      setEditText(message.content.text ?? "");
                      setIsEditing(true);
                    }}
                    className="cursor-pointer"
                    data-ocid={`chat.message.edit_item.${index + 1}`}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => deleteMessage.mutate(message.id)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  data-ocid={`chat.message.delete_item.${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Inline edit mode */}
        {isEditing && (
          <div className="flex gap-1 mt-1 w-full">
            <input
              data-ocid={`chat.message.input.${index + 1}`}
              className="flex-1 text-sm rounded-lg px-3 py-1.5 bg-muted text-foreground border border-border outline-none focus:ring-1 focus:ring-primary"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <button
              type="button"
              data-ocid={`chat.message.save_button.${index + 1}`}
              onClick={handleSaveEdit}
              disabled={editMessage.isPending}
              className="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
              style={{
                background: "oklch(0.76 0.13 72)",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              Save
            </button>
            <button
              type="button"
              data-ocid={`chat.message.cancel_button.${index + 1}`}
              onClick={() => setIsEditing(false)}
              className="text-xs px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ChatViewProps {
  conversationId: ConversationId;
  currentUserId: string;
  onBack: () => void;
  onOpenUserProfile?: (userId: string) => void;
}

function RecentContactChip({
  userId,
  onAdd,
  isPending,
}: {
  userId: string;
  onAdd: (username: string) => void;
  isPending: boolean;
}) {
  const { data: profile } = useGetUserProfile(userId);

  if (!profile) return null;

  const avatarUrl =
    profile.avatarUrl && profile.avatarUrl.length > 0
      ? profile.avatarUrl[0]
      : undefined;
  const initials = (profile.displayName || profile.username || "?")
    .slice(0, 2)
    .toUpperCase();
  const displayUsername =
    profile.username.length > 10
      ? `${profile.username.slice(0, 10)}…`
      : profile.username;

  return (
    <button
      type="button"
      data-ocid="chat.add_member.button"
      className="flex flex-col items-center gap-1 min-w-[56px] relative group"
      onClick={() => onAdd(profile.username)}
      disabled={isPending}
    >
      <div className="relative">
        <Avatar
          className="h-12 w-12 border-2"
          style={{ borderColor: "oklch(0.82 0.15 72 / 0.4)" }}
        >
          {avatarUrl && (
            <AvatarImage src={avatarUrl} alt={profile.displayName} />
          )}
          <AvatarFallback
            className="text-sm font-semibold"
            style={{
              background: "oklch(0.18 0.03 72)",
              color: "oklch(0.82 0.15 72)",
            }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2
              className="h-4 w-4 animate-spin"
              style={{ color: "oklch(0.82 0.15 72)" }}
            />
          </div>
        )}
      </div>
      <span
        className="text-[10px] text-center leading-tight"
        style={{ color: "oklch(0.75 0.05 72)" }}
      >
        @{displayUsername}
      </span>
    </button>
  );
}

function RecentContactChips({
  conversations,
  currentMembers,
  currentUserId,
  onAdd,
  isPending,
}: {
  conversations: Conversation[];
  currentMembers: string[];
  currentUserId: string;
  onAdd: (username: string) => void;
  isPending: boolean;
}) {
  const candidates = conversations
    .filter((c) => c.type.__kind__ === "direct")
    .map((c) =>
      c.members.find((m) => m.toString() !== currentUserId)?.toString(),
    )
    .filter((id): id is string => !!id && !currentMembers.includes(id));

  const unique = Array.from(new Set(candidates));

  if (unique.length === 0) {
    return (
      <p className="text-xs py-2" style={{ color: "oklch(0.55 0.03 72)" }}>
        No recent contacts to add
      </p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
      {unique.map((userId) => (
        <RecentContactChip
          key={userId}
          userId={userId}
          onAdd={onAdd}
          isPending={isPending}
        />
      ))}
    </div>
  );
}

export default function ChatView({
  conversationId,
  currentUserId,
  onBack,
  onOpenUserProfile,
}: ChatViewProps) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(
    null,
  );
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [senderProfileId, setSenderProfileId] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(
    null,
  );
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const headerAvatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [giftGoldOpen, setGiftGoldOpen] = useState(false);
  const [giftAmount, setGiftAmount] = useState("");
  const [giftError, setGiftError] = useState("");
  const [forwardMsgOpen, setForwardMsgOpen] = useState(false);
  const [forwardMsgContent, setForwardMsgContent] = useState<{
    text: string;
    mediaUrl?: string;
    mediaType?: string;
  } | null>(null);
  const [visibleMsgCount, setVisibleMsgCount] = useState(19);
  const [visibleMembersCount, setVisibleMembersCount] = useState(19);

  // In-conversation search state
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  // Reply threading state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Optimistic reactions: map messageId → Set of userId strings
  const [localReactionMap, setLocalReactionMap] = useState<
    Record<string, string[]>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: messages = [] } = useGetMessages(conversationId);
  const { data: conversations } = useListUserConversations();
  const { mutateAsync: sendMessage, isPending: sending } = useSendMessage();
  const { mutate: markRead } = useMarkMessagesAsRead();
  const { uploadMedia, uploadProgress, isUploading } = useMediaUpload();
  const { mutateAsync: leaveConversation, isPending: leaving } =
    useLeaveConversation();
  const { mutateAsync: updateGroupAvatar } = useUpdateGroupAvatar();
  const transferGold = useTransferGold();
  const { data: myGoldBalance } = useGetMyGoldBalance();
  const { data: blockedUsers = [] } = useGetMyBlockedUsers();
  const { mutate: blockUser, isPending: blocking } = useBlockUser();
  const { mutate: unblockUser, isPending: unblocking } = useUnblockUser();
  const { data: groupAvatarsData } = useGetGroupAvatars();
  const { data: groupCreators } = useGetGroupCreators();
  const addGroupMember = useAddGroupMember();
  const removeGroupMember = useRemoveGroupMember();
  const pinMessage = usePinMessage(conversationId);
  const unpinMessage = useUnpinMessage(conversationId);
  const groupAvatarMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const [id, url] of groupAvatarsData ?? []) {
      m.set(id.toString(), url);
    }
    return m;
  }, [groupAvatarsData]);
  const groupAvatarUrl = conversationId
    ? groupAvatarMap.get(conversationId.toString())
    : undefined;
  const { actor } = useActor(createActor);
  const { data: typingUsers = [] } = useGetTypingUsers(conversationId);
  const isGroupOwner = !!groupCreators?.find(
    ([cid, creatorId]) =>
      cid.toString() === conversationId?.toString() &&
      creatorId.toString() === currentUserId,
  );

  const groupOwnerId =
    groupCreators
      ?.find(([cid]) => cid.toString() === conversationId?.toString())?.[1]
      ?.toString() ?? null;

  async function handleAddMemberByUsername(username: string) {
    if (!conversationId) return;
    try {
      await addGroupMember.mutateAsync({ conversationId, username });
      toast.success(`Added @${username}`);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? `Failed to add @${username}`);
    }
  }

  const conversation = conversations?.find((c) => c.id === conversationId);
  const isGroup = conversation?.type.__kind__ === "group";
  const groupName =
    conversation?.type.__kind__ === "group"
      ? (conversation.type as { __kind__: "group"; group: string }).group
      : null;
  const otherUserId = !isGroup
    ? (conversation?.members
        .find((m) => m.toString() !== currentUserId)
        ?.toString() ?? null)
    : null;

  // Pinned message ID — handle both Candid [] | [bigint] and plain bigint shapes
  const rawPinned = conversation?.pinnedMessageId as
    | ([] | [bigint])
    | bigint
    | undefined;
  const pinnedMessageId: bigint | null =
    rawPinned == null
      ? null
      : Array.isArray(rawPinned)
        ? rawPinned.length > 0
          ? (rawPinned[0] ?? null)
          : null
        : rawPinned;
  const pinnedMessage = pinnedMessageId
    ? (messages.find((m) => m.id === pinnedMessageId) ?? null)
    : null;

  const { data: otherProfile } = useGetUserProfile(otherUserId);
  const { data: isOnline } = useIsUserOnline(otherUserId);
  const isBlocked = otherProfile
    ? blockedUsers.some((u) => u.username === otherProfile.username)
    : false;

  const chatName = isGroup
    ? (groupName ?? "Group")
    : (otherProfile?.displayName ?? otherUserId?.slice(0, 8) ?? "Chat");
  const memberCount = conversation?.members.length ?? 2;

  const msgCount = messages.length;

  // Sync backend reactions into localReactionMap whenever messages refresh
  useEffect(() => {
    if (messages.length === 0) return;
    setLocalReactionMap((prev) => {
      const next = { ...prev };
      for (const msg of messages) {
        const key = msg.id.toString();
        // Only update from backend if we don't have a pending local value
        // (prevent flicker: keep local state if it's ahead of server)
        next[key] = msg.reactions.map((r) => r.toString());
      }
      return next;
    });
  }, [messages]);

  // Toggle reaction — optimistic update then call backend
  const handleToggleReaction = useCallback(
    async (messageId: MessageId) => {
      if (!actor) return;
      const key = messageId.toString();
      const current = localReactionMap[key] ?? [];
      const alreadyReacted = current.includes(currentUserId);

      // Optimistic update
      setLocalReactionMap((prev) => {
        const existing = prev[key] ?? [];
        const updated = alreadyReacted
          ? existing.filter((id) => id !== currentUserId)
          : [...existing, currentUserId];
        return { ...prev, [key]: updated };
      });

      try {
        if (alreadyReacted) {
          await (
            actor as unknown as {
              removeMessageReaction: (
                c: ConversationId,
                m: MessageId,
              ) => Promise<void>;
            }
          ).removeMessageReaction(conversationId, messageId);
        } else {
          await (
            actor as unknown as {
              addMessageReaction: (
                c: ConversationId,
                m: MessageId,
              ) => Promise<void>;
            }
          ).addMessageReaction(conversationId, messageId);
        }
      } catch {
        // Revert optimistic update on failure
        setLocalReactionMap((prev) => ({
          ...prev,
          [key]: current,
        }));
        toast.error("Failed to update reaction");
      }
    },
    [actor, conversationId, currentUserId, localReactionMap],
  );

  useEffect(() => {
    if (conversationId) markRead(conversationId);
  }, [conversationId, markRead]);

  useEffect(() => {
    if (msgCount !== prevMessageCountRef.current) {
      prevMessageCountRef.current = msgCount;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgCount]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on conversation change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
    setVisibleMsgCount(19);
    setReplyingTo(null);
    setLocalReactionMap({});
    setChatSearchOpen(false);
    setChatSearchQuery("");
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be under 50MB");
        return;
      }
      setPendingFile(file);
      const url = URL.createObjectURL(file);
      setPendingFilePreview(url);
    },
    [],
  );

  const clearPendingFile = useCallback(() => {
    if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview);
    setPendingFile(null);
    setPendingFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [pendingFilePreview]);

  const handleGiftGold = async () => {
    const amt = Number.parseFloat(giftAmount);
    if (!amt || amt < 0.01) {
      setGiftError("Minimum gift amount is 0.01 Gold");
      return;
    }
    const recipientUsername = otherProfile?.username;
    if (!recipientUsername) return;
    try {
      await transferGold.mutateAsync({
        toUsername: recipientUsername,
        amount: BigInt(Math.round(amt * 100)),
      });
      toast.success(`Sent ✦ ${amt.toFixed(2)} Gold to ${recipientUsername}`);
      setGiftGoldOpen(false);
      setGiftAmount("");
      setGiftError("");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? "Transfer failed");
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !pendingFile) return;

    // Clear typing indicator
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    if (actor && conversationId !== null) {
      try {
        await (
          actor as ReturnType<typeof createActor> & {
            setTypingStatus: (
              convId: bigint,
              isTyping: boolean,
            ) => Promise<void>;
          }
        ).setTypingStatus(conversationId, false);
      } catch {
        // best-effort
      }
    }

    let mediaUrl: string | undefined;
    let mediaType: MediaType | undefined;

    if (pendingFile) {
      try {
        const result = await uploadMedia(pendingFile);
        mediaUrl = result.url;
        mediaType = result.mediaType;
        clearPendingFile();
      } catch {
        toast.error("Failed to upload media");
        return;
      }
    }

    const replyToId = replyingTo?.id;

    try {
      await sendMessage({
        conversationId,
        messageInput: {
          content: {
            text: text.trim(),
            ...(mediaUrl ? { mediaUrl } : {}),
            ...(mediaType ? { mediaType } : {}),
          },
          ...(replyToId !== undefined ? { replyToMessageId: replyToId } : {}),
        },
      });
      setText("");
      setReplyingTo(null);
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && replyingTo) {
      setReplyingTo(null);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (
        error?.name === "NotAllowedError" ||
        error?.name === "PermissionDeniedError"
      ) {
        toast.error("Microphone permission denied");
      } else {
        toast.error("Could not start recording");
      }
    }
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      for (const t of recorder.stream?.getTracks() ?? []) t.stop();
    }
    mediaRecorderRef.current = null;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  const sendRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    for (const t of recorder.stream?.getTracks() ?? []) t.stop();
    mediaRecorderRef.current = null;

    const mimeType = recorder.mimeType || "audio/webm";
    const blob = new Blob(recordingChunksRef.current, { type: mimeType });
    const ext = mimeType.includes("ogg") ? "ogg" : "webm";
    const audioFile = new File([blob], `audio_recording.${ext}`, {
      type: mimeType,
    });

    try {
      const result = await uploadMedia(audioFile);
      await sendMessage({
        conversationId,
        messageInput: {
          content: {
            text: "",
            mediaUrl: result.url,
            mediaType: result.mediaType,
          },
        },
      });
    } catch {
      toast.error("Failed to send voice message");
    }
  }, [uploadMedia, sendMessage, conversationId]);

  const handleAvatarClick = () => {
    if (!isGroup && otherUserId) {
      if (onOpenUserProfile) {
        onOpenUserProfile(otherUserId);
      } else {
        setProfileModalOpen(true);
      }
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div
        data-ocid="chat.header"
        className="flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar shrink-0"
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={onBack}
          className="md:hidden h-9 w-9 rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="relative group/avatar">
          <button
            type="button"
            onClick={isGroup ? undefined : handleAvatarClick}
            className={
              !isGroup && otherUserId ? "cursor-pointer" : "cursor-default"
            }
            aria-label={!isGroup ? "View profile" : undefined}
          >
            <Avatar className="w-10 h-10">
              {isGroup && groupAvatarUrl ? (
                <AvatarImage src={groupAvatarUrl} alt={chatName} />
              ) : !isGroup && otherProfile?.avatarUrl ? (
                <AvatarImage src={otherProfile.avatarUrl} alt={chatName} />
              ) : null}
              <AvatarFallback
                className="text-sm font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.3), oklch(0.65 0.11 65 / 0.2))",
                  color: "oklch(0.82 0.15 72)",
                  border: "1px solid oklch(0.76 0.13 72 / 0.3)",
                }}
              >
                {getInitials(chatName)}
              </AvatarFallback>
            </Avatar>
          </button>
          {isGroup && (
            <>
              <button
                type="button"
                data-ocid="chat.group_avatar_upload_button"
                onClick={() => headerAvatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                aria-label="Update group avatar"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input
                ref={headerAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !conversationId) return;
                  setIsUploadingAvatar(true);
                  try {
                    const { url } = await uploadMedia(file);
                    await updateGroupAvatar({ conversationId, avatarUrl: url });
                    toast.success("Group avatar updated");
                  } catch {
                    toast.error("Failed to update group avatar");
                  } finally {
                    setIsUploadingAvatar(false);
                    e.target.value = "";
                  }
                }}
              />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-foreground truncate">
            {chatName}
          </h2>
          {!isGroup && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: isOnline
                    ? "oklch(0.72 0.20 140)"
                    : "oklch(0.45 0.01 70)",
                  boxShadow: isOnline
                    ? "0 0 6px oklch(0.72 0.20 140 / 0.6)"
                    : "none",
                }}
              />
              <span className="text-xs text-muted-foreground">
                {isOnline
                  ? "Online"
                  : otherProfile
                    ? formatLastSeen(otherProfile.lastSeen)
                    : ""}
              </span>
            </div>
          )}
          {isGroup && (
            <p className="text-xs text-muted-foreground">
              {memberCount} members
            </p>
          )}
        </div>

        {/* In-chat search button */}
        <Button
          data-ocid="chat.search_button"
          size="icon"
          variant="ghost"
          onClick={() => {
            setChatSearchOpen((v) => !v);
            if (chatSearchOpen) setChatSearchQuery("");
          }}
          className="h-9 w-9 rounded-xl hover:bg-muted shrink-0"
          aria-label="Search in conversation"
          style={chatSearchOpen ? { color: "oklch(0.82 0.15 72)" } : undefined}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Three-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-xl hover:bg-muted shrink-0"
              data-ocid="chat.open_modal_button"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            {isGroup && (
              <DropdownMenuItem
                onClick={() => {
                  setNewGroupName(groupName ?? "");
                  setEditGroupOpen(true);
                }}
                className="cursor-pointer"
                data-ocid="chat.edit_button"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Group
              </DropdownMenuItem>
            )}
            {!isGroup && otherUserId && (
              <DropdownMenuItem
                onClick={() => {
                  if (isBlocked) {
                    unblockUser(otherUserId);
                  } else {
                    blockUser(otherUserId);
                  }
                }}
                disabled={blocking || unblocking}
                className="cursor-pointer"
                data-ocid={
                  isBlocked ? "chat.unblock_button" : "chat.block_button"
                }
              >
                {isBlocked ? (
                  <ShieldOff className="h-4 w-4 mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                {isBlocked ? "Unblock User" : "Block User"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setLeaveConfirmOpen(true)}
              className="cursor-pointer text-destructive focus:text-destructive"
              data-ocid="chat.delete_button"
            >
              Leave Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Leave conversation confirmation */}
        <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Conversation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave this conversation? You won't
                receive new messages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-ocid="chat.leave.cancel_button">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-ocid="chat.leave.confirm_button"
                disabled={leaving}
                onClick={async () => {
                  if (!conversationId) return;
                  try {
                    await leaveConversation(conversationId);
                    toast.success("Left conversation");
                    onBack();
                  } catch {
                    toast.error("Failed to leave conversation");
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit group dialog */}
        <Dialog
          open={editGroupOpen}
          onOpenChange={(v) => {
            setEditGroupOpen(v);
            if (!v) setGroupAvatarPreview(null);
          }}
        >
          <DialogContent
            className="bg-card border-border overflow-y-auto"
            style={{
              maxHeight: "min(90dvh, 90vh)",
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              {isGroupOwner ? (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      data-ocid="chat.group.upload_button"
                      onClick={() => groupAvatarInputRef.current?.click()}
                      className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-primary/50 hover:border-primary transition-colors flex items-center justify-center bg-muted/30"
                    >
                      {groupAvatarPreview || groupAvatarUrl ? (
                        <img
                          src={groupAvatarPreview ?? groupAvatarUrl ?? ""}
                          alt="Group avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground text-center px-1">
                          Avatar
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs">Change</span>
                      </div>
                    </button>
                    <input
                      ref={groupAvatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !conversationId) return;
                        const preview = URL.createObjectURL(file);
                        setGroupAvatarPreview(preview);
                        try {
                          const { url } = await uploadMedia(file);
                          await updateGroupAvatar({
                            conversationId,
                            avatarUrl: url,
                          });
                          toast.success("Group avatar updated");
                        } catch {
                          toast.error("Failed to update avatar");
                          setGroupAvatarPreview(null);
                        }
                      }}
                    />
                  </div>
                  <Input
                    data-ocid="chat.group.input"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    className="bg-input border-border"
                  />
                  <Button
                    data-ocid="chat.group.save_button"
                    disabled={!newGroupName.trim()}
                    onClick={async () => {
                      if (!conversationId || !newGroupName.trim() || !actor)
                        return;
                      try {
                        await actor.updateGroupName(
                          conversationId,
                          newGroupName.trim(),
                        );
                        toast.success("Group name updated");
                        setEditGroupOpen(false);
                      } catch {
                        toast.error("Failed to update group name");
                      }
                    }}
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                      color: "oklch(0.08 0.004 55)",
                    }}
                    className="rounded-xl"
                  >
                    Save
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border flex items-center justify-center bg-muted/30">
                    {groupAvatarUrl ? (
                      <img
                        src={groupAvatarUrl}
                        alt="Group avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground text-center px-1">
                        Avatar
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{newGroupName}</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Only the group owner can edit the group name and avatar
                  </p>
                </div>
              )}

              {isGroupOwner && (
                <div
                  data-ocid="chat.manage_members.section"
                  className="flex flex-col gap-3 pt-2 border-t"
                  style={{ borderColor: "oklch(0.82 0.15 72 / 0.15)" }}
                >
                  <div className="flex items-center gap-2">
                    <UserPlus
                      className="h-4 w-4"
                      style={{ color: "oklch(0.82 0.15 72)" }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "oklch(0.82 0.15 72)" }}
                    >
                      Manage Members
                    </span>
                  </div>

                  <SortedMemberList
                    memberIds={(conversation?.members ?? []).map((m) =>
                      m.toString(),
                    )}
                    currentUserId={currentUserId}
                    groupOwnerId={groupOwnerId}
                    conversationId={conversationId}
                    visibleMembersCount={visibleMembersCount}
                    setVisibleMembersCount={setVisibleMembersCount}
                    removeGroupMember={removeGroupMember}
                  />

                  <div>
                    <p
                      className="text-xs font-medium mb-2"
                      style={{ color: "oklch(0.82 0.15 72)" }}
                    >
                      Add from recent chats
                    </p>
                    <RecentContactChips
                      conversations={conversations ?? []}
                      currentMembers={(conversation?.members ?? []).map((m) =>
                        m.toString(),
                      )}
                      currentUserId={currentUserId}
                      onAdd={handleAddMemberByUsername}
                      isPending={addGroupMember.isPending}
                    />
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* End header */}

      {/* Pinned message banner */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div
            key="pinned-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            data-ocid="chat.pinned_message_banner"
            className="shrink-0 border-b border-border overflow-hidden"
            style={{ background: "oklch(0.13 0.025 65)" }}
          >
            <div className="relative">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-2 pr-10 text-left hover:bg-muted/20 transition-colors"
                onClick={() => {
                  const el = document.querySelector(
                    `[data-ocid="chat.message.${messages.indexOf(pinnedMessage) + 1}"]`,
                  );
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                aria-label="Go to pinned message"
              >
                <Pin
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: "oklch(0.82 0.15 72)" }}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider block"
                    style={{ color: "oklch(0.82 0.15 72)" }}
                  >
                    Pinned message
                  </span>
                  <span className="text-xs text-muted-foreground truncate block">
                    {pinnedMessage.content.mediaUrl
                      ? "📎 Media"
                      : (pinnedMessage.content.text?.slice(0, 60) ?? "")}
                  </span>
                </div>
              </button>
              <button
                type="button"
                data-ocid="chat.pinned_message.unpin_button"
                onClick={(e) => {
                  e.stopPropagation();
                  unpinMessage.mutate(undefined, {
                    onError: () => toast.error("Failed to unpin message"),
                  });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Unpin message"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-conversation search bar */}
      <AnimatePresence>
        {chatSearchOpen && (
          <motion.div
            key="chat-search-bar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 border-b border-border overflow-hidden"
            style={{ background: "oklch(0.11 0.015 55)" }}
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <input
                data-ocid="chat.search_input"
                // biome-ignore lint/a11y/noAutofocus: intentional for search UX
                autoFocus
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                placeholder="Search in conversation…"
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/50"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setChatSearchOpen(false);
                    setChatSearchQuery("");
                  }
                }}
              />
              {chatSearchQuery && (
                <button
                  type="button"
                  onClick={() => setChatSearchQuery("")}
                  className="text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                data-ocid="chat.search_close_button"
                onClick={() => {
                  setChatSearchOpen(false);
                  setChatSearchQuery("");
                }}
                className="text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0 ml-1"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div data-ocid="chat.message_list" className="flex flex-col px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                No messages yet. Say hello! 👋
              </p>
            </div>
          ) : (
            (() => {
              // Apply search filter if active
              const searchActive = chatSearchQuery.trim().length > 0;
              const qLow = chatSearchQuery.toLowerCase();
              const matchedMessages = searchActive
                ? messages.filter((m) =>
                    m.content.text.toLowerCase().includes(qLow),
                  )
                : messages;

              if (searchActive && matchedMessages.length === 0) {
                return (
                  <div
                    data-ocid="chat.search.empty_state"
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No messages found for &quot;{chatSearchQuery}&quot;
                    </p>
                  </div>
                );
              }

              const slicedMessages = searchActive
                ? matchedMessages
                : matchedMessages.slice(-visibleMsgCount);

              return (
                <>
                  {!searchActive && messages.length > visibleMsgCount && (
                    <div className="flex justify-center py-2">
                      <button
                        data-ocid="chat.view_more_messages.button"
                        type="button"
                        onClick={() => setVisibleMsgCount((prev) => prev + 19)}
                        className="text-xs px-3 py-1 rounded-full transition-colors hover:opacity-80"
                        style={{
                          color: "oklch(0.82 0.15 72)",
                          background: "oklch(0.82 0.15 72 / 0.1)",
                        }}
                      >
                        View more
                      </button>
                    </div>
                  )}
                  {slicedMessages.map((msg) => {
                    const idx = messages.indexOf(msg);
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showSender =
                      !prevMsg ||
                      prevMsg.sender.toString() !== msg.sender.toString();
                    const msgKey = msg.id.toString();
                    const localReactions =
                      localReactionMap[msgKey] ??
                      msg.reactions.map((r) => r.toString());

                    return (
                      <MessageBubble
                        key={msgKey}
                        message={msg}
                        currentUserId={currentUserId}
                        memberCount={memberCount}
                        isGroup={!!isGroup}
                        showSender={showSender}
                        onImageClick={setLightboxUrl}
                        onSenderClick={(id) => setSenderProfileId(id)}
                        onForward={(msgContent) => {
                          setForwardMsgContent(msgContent);
                          setForwardMsgOpen(true);
                        }}
                        onReply={(m) => setReplyingTo(m)}
                        onPin={(messageId) =>
                          pinMessage.mutate(messageId, {
                            onError: () => toast.error("Failed to pin message"),
                          })
                        }
                        onUnpin={() =>
                          unpinMessage.mutate(undefined, {
                            onError: () =>
                              toast.error("Failed to unpin message"),
                          })
                        }
                        pinnedMessageId={pinnedMessageId}
                        index={idx}
                        conversationId={conversationId}
                        localReactions={localReactions}
                        onToggleReaction={handleToggleReaction}
                        searchHighlight={searchActive ? qLow : ""}
                      />
                    );
                  })}
                </>
              );
            })()
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Upload progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 bg-muted/50 shrink-0"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">
                Uploading... {uploadProgress}%
              </span>
            </div>
            <Progress value={uploadProgress} className="h-1" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media preview */}
      <AnimatePresence>
        {pendingFile && pendingFilePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-t border-border bg-muted/30 shrink-0"
          >
            <div className="relative inline-block">
              {pendingFile.type.startsWith("image/") ? (
                <img
                  src={pendingFilePreview}
                  alt="Selected file preview"
                  className="h-20 w-auto rounded-lg object-cover"
                />
              ) : pendingFile.type.startsWith("video/") ? (
                <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2">
                  <Video className="h-5 w-5 text-primary" />
                  <span className="text-sm text-foreground truncate max-w-[200px]">
                    {pendingFile.name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <span className="text-sm text-foreground truncate max-w-[200px]">
                    {pendingFile.name}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={clearPendingFile}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                aria-label="Remove attached file"
              >
                <X className="h-3 w-3 text-destructive-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-t border-border bg-muted/20 shrink-0 flex items-center gap-2"
            data-ocid="chat.reply_bar"
          >
            <div
              className="flex-1 rounded-lg px-3 py-1.5 border-l-2 text-xs min-w-0"
              style={{
                borderLeftColor: "oklch(0.82 0.15 72)",
                background: "oklch(0.82 0.15 72 / 0.07)",
              }}
            >
              <span
                className="font-semibold block"
                style={{ color: "oklch(0.82 0.15 72)" }}
              >
                Replying to @
                {replyingTo.sender.toString() === currentUserId
                  ? "you"
                  : replyingTo.sender.toString().slice(0, 8)}
              </span>
              <span className="text-muted-foreground truncate block">
                {replyingTo.content.text
                  ? replyingTo.content.text.slice(0, 60)
                  : "📎 Media"}
              </span>
            </div>
            <button
              type="button"
              data-ocid="chat.reply_bar.cancel"
              onClick={() => setReplyingTo(null)}
              className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Cancel reply"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div
          data-ocid="chat.typing_indicator"
          className="px-4 py-1.5 shrink-0 flex items-center gap-2"
        >
          <span
            className="text-xs"
            style={{ color: "oklch(0.82 0.15 72 / 0.75)" }}
          >
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing`
              : typingUsers.length === 2
                ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
                : "Several people are typing"}
          </span>
          <span className="flex items-center gap-0.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block w-1 h-1 rounded-full"
                style={{
                  background: "oklch(0.82 0.15 72 / 0.7)",
                  animation: "typingDot 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </span>
        </div>
      )}

      {/* Input area */}
      <div
        className="px-4 py-3 border-t border-border bg-sidebar shrink-0"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-3"
            >
              <Button
                data-ocid="chat.cancel_button"
                size="icon"
                variant="ghost"
                onClick={cancelRecording}
                className="h-10 w-10 rounded-xl hover:bg-muted shrink-0"
                aria-label="Cancel recording"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </Button>

              <div className="flex-1 flex items-center gap-2 bg-muted/30 rounded-xl px-3 h-10">
                <div
                  className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0"
                  style={{ background: "oklch(0.65 0.22 25)" }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: "oklch(0.65 0.22 25)" }}
                >
                  Recording
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  {formatRecordingTime(recordingSeconds)}
                </span>
              </div>

              <Button
                data-ocid="chat.send_button"
                size="icon"
                onClick={sendRecording}
                disabled={isUploading || sending}
                className="h-10 w-10 rounded-xl shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                  color: "oklch(0.08 0.004 55)",
                }}
                aria-label="Send voice message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
                data-ocid="chat.upload_button"
              />
              <Button
                data-ocid="chat.attach_button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || sending}
                className="h-10 w-10 rounded-xl hover:bg-muted shrink-0"
              >
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </Button>

              {!isGroup && otherProfile && (
                <Button
                  data-ocid="chat.gift_gold.button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setGiftGoldOpen(true)}
                  disabled={isUploading || sending}
                  className="h-10 w-10 rounded-xl hover:bg-muted shrink-0"
                  title="Gift Gold"
                >
                  <Coins
                    className="h-5 w-5"
                    style={{ color: "oklch(0.82 0.15 72)" }}
                  />
                </Button>
              )}

              <Input
                data-ocid="chat.message_input"
                placeholder={replyingTo ? "Type a reply..." : "Message..."}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  // Typing indicator: set active, debounce clear after 4s
                  if (actor && conversationId !== null) {
                    try {
                      (
                        actor as ReturnType<typeof createActor> & {
                          setTypingStatus: (
                            convId: bigint,
                            isTyping: boolean,
                          ) => Promise<void>;
                        }
                      ).setTypingStatus(conversationId, true);
                    } catch {
                      // best-effort
                    }
                    if (typingDebounceRef.current)
                      clearTimeout(typingDebounceRef.current);
                    typingDebounceRef.current = setTimeout(() => {
                      try {
                        (
                          actor as ReturnType<typeof createActor> & {
                            setTypingStatus: (
                              convId: bigint,
                              isTyping: boolean,
                            ) => Promise<void>;
                          }
                        ).setTypingStatus(conversationId, false);
                      } catch {
                        // best-effort
                      }
                    }, 4000);
                  }
                }}
                onKeyDown={handleKeyDown}
                disabled={isUploading || sending}
                className="flex-1 bg-input border-border h-10 rounded-xl"
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                enterKeyHint="send"
              />

              {!text.trim() && !pendingFile && (
                <Button
                  data-ocid="chat.toggle"
                  size="icon"
                  variant="ghost"
                  onClick={startRecording}
                  disabled={isUploading || sending}
                  className="h-10 w-10 rounded-xl hover:bg-muted shrink-0 transition-colors"
                  aria-label="Start voice recording"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              )}

              {(text.trim() || pendingFile) && (
                <Button
                  data-ocid="chat.send_button"
                  size="icon"
                  onClick={handleSend}
                  disabled={
                    (!text.trim() && !pendingFile) || isUploading || sending
                  }
                  className="h-10 w-10 rounded-xl shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                    color: "oklch(0.08 0.004 55)",
                  }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center"
          >
            <button
              type="button"
              className="absolute inset-0 w-full h-full cursor-default"
              onClick={() => setLightboxUrl(null)}
              aria-label="Close image viewer"
            />
            <button
              type="button"
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-muted hover:bg-muted/80"
              onClick={() => setLightboxUrl(null)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightboxUrl}
              alt="Full size view"
              className="relative z-10 max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile modal (fallback if no onOpenUserProfile) */}
      {!onOpenUserProfile && (
        <UserProfileModal
          userId={otherUserId}
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          onStartChat={() => {}}
        />
      )}

      {/* Sender profile modal (group chats) */}
      {senderProfileId && (
        <UserProfileModal
          userId={senderProfileId}
          open={!!senderProfileId}
          onOpenChange={(open) => {
            if (!open) setSenderProfileId(null);
          }}
          onStartChat={() => {
            setSenderProfileId(null);
          }}
        />
      )}

      {/* Gift Gold Dialog */}
      <Dialog open={giftGoldOpen} onOpenChange={setGiftGoldOpen}>
        <DialogContent
          className="sm:max-w-sm"
          style={{
            background: "oklch(0.13 0.02 55)",
            border: "1px solid oklch(0.82 0.15 72 / 0.2)",
          }}
          data-ocid="chat.gift_gold.dialog"
        >
          <DialogHeader>
            <DialogTitle style={{ color: "oklch(0.82 0.15 72)" }}>
              Gift Gold to {otherProfile?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Amount</Label>
              <Input
                data-ocid="chat.gift_gold.input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter amount..."
                value={giftAmount}
                onChange={(e) => {
                  setGiftAmount(e.target.value);
                  setGiftError("");
                }}
                className={`bg-input border-border${giftError ? " border-destructive" : ""}`}
              />
            </div>
            {giftError && (
              <p
                className="text-xs text-destructive"
                data-ocid="chat.gift_gold.error_state"
              >
                {giftError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Your balance: ✦ {(Number(myGoldBalance ?? 0) / 100).toFixed(2)}{" "}
              Gold
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="chat.gift_gold.cancel_button"
              variant="outline"
              onClick={() => setGiftGoldOpen(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              data-ocid="chat.gift_gold.submit_button"
              onClick={handleGiftGold}
              disabled={
                transferGold.isPending ||
                !giftAmount ||
                Number.parseFloat(giftAmount) < 0.01
              }
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {transferGold.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Send Gold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward Message Dialog */}
      <Dialog open={forwardMsgOpen} onOpenChange={setForwardMsgOpen}>
        <DialogContent
          data-ocid="chat.forward_message.dialog"
          className="bg-card border-border max-w-sm"
          style={{
            background: "oklch(0.13 0.02 55)",
            border: "1px solid oklch(0.82 0.15 72 / 0.2)",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "oklch(0.82 0.15 72)" }}>
              Forward to...
            </DialogTitle>
          </DialogHeader>
          <ForwardMessagePicker
            conversations={conversations ?? []}
            currentUserId={currentUserId}
            groupAvatarMap={groupAvatarMap}
            onSelect={async (convId) => {
              if (!forwardMsgContent) return;
              try {
                await sendMessage({
                  conversationId: convId,
                  messageInput: {
                    content: {
                      text: forwardMsgContent.text || "",
                      mediaUrl: forwardMsgContent.mediaUrl,
                      mediaType: forwardMsgContent.mediaType
                        ? ({
                            [forwardMsgContent.mediaType]: null,
                          } as unknown as MediaType)
                        : undefined,
                    },
                  },
                });
                toast.success("Message forwarded");
                setForwardMsgOpen(false);
              } catch {
                toast.error("Failed to forward");
              }
            }}
          />
          <DialogFooter>
            <Button
              data-ocid="chat.forward_message.cancel_button"
              variant="ghost"
              onClick={() => setForwardMsgOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
