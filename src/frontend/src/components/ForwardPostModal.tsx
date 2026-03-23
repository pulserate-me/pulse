import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ConversationId } from "../backend";
import {
  useForwardChannelPost,
  useGetUserProfile,
  useListUserConversations,
} from "../hooks/useQueries";
import type { ChannelPostId } from "../hooks/useQueries";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ConvItem({
  conversation,
  currentUserId,
  onSelect,
}: {
  conversation: any;
  currentUserId: string;
  onSelect: () => void;
}) {
  const isGroup = conversation.type.__kind__ === "group";
  const otherUserId = isGroup
    ? null
    : (conversation.members
        .find((m: any) => m.toString() !== currentUserId)
        ?.toString() ?? null);
  const { data: otherProfile } = useGetUserProfile(otherUserId);
  const name = isGroup
    ? (conversation.type as { __kind__: "group"; group: string }).group
    : (otherProfile?.displayName ?? otherUserId?.slice(0, 8) ?? "Unknown");

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
    >
      <Avatar className="w-10 h-10 shrink-0">
        {otherProfile?.avatarUrl && (
          <AvatarImage src={otherProfile.avatarUrl} alt={name} />
        )}
        <AvatarFallback
          className="text-sm font-semibold"
          style={{
            background: "oklch(0.76 0.13 72 / 0.2)",
            color: "oklch(0.82 0.15 72)",
          }}
        >
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm text-foreground truncate">{name}</span>
    </button>
  );
}

interface ForwardPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: ChannelPostId | null;
  currentUserId: string;
}

export default function ForwardPostModal({
  open,
  onOpenChange,
  postId,
  currentUserId,
}: ForwardPostModalProps) {
  const [search, setSearch] = useState("");
  const { data: conversations = [] } = useListUserConversations();
  const { mutateAsync: forwardPost, isPending } = useForwardChannelPost();

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (c.type.__kind__ === "group") {
      return (c.type as any).group.toLowerCase().includes(q);
    }
    return true;
  });

  const handleForward = async (conversationId: ConversationId) => {
    if (!postId) return;
    try {
      await forwardPost({ postId, conversationId });
      toast.success("Post forwarded!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to forward post");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="channel.forward.dialog"
        className="bg-card border-border max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            Forward to...
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-ocid="channel.forward.search_input"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>

        <ScrollArea className="max-h-80">
          {filtered.length === 0 ? (
            <p
              data-ocid="channel.forward.empty_state"
              className="text-center text-sm text-muted-foreground py-8"
            >
              No conversations found
            </p>
          ) : (
            filtered.map((conv) => (
              <ConvItem
                key={conv.id.toString()}
                conversation={conv}
                currentUserId={currentUserId}
                onSelect={() => handleForward(conv.id)}
              />
            ))
          )}
        </ScrollArea>

        {isPending && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Forwarding...
          </div>
        )}

        <div className="flex justify-end">
          <Button
            data-ocid="channel.forward.cancel_button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
