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
import { Textarea } from "@/components/ui/textarea";
import {
  Edit,
  Heart,
  Loader2,
  MessageCircle,
  MoreVertical,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCommentOnChannelPost,
  useDeleteChannelPost,
  useEditChannelPost,
  useGetChannelPostInteractions,
  useLikeChannelPost,
  useUnlikeChannelPost,
} from "../hooks/useQueries";
import type {
  ChannelId,
  ChannelPost,
  ChannelPostId,
} from "../hooks/useQueries";
import ForwardPostModal from "./ForwardPostModal";

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
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ms).toLocaleDateString();
}

interface ChannelPostCardProps {
  post: ChannelPost;
  authorName: string;
  authorAvatar?: string;
  isOwner: boolean;
  isPostAuthor: boolean;
  currentUserId: string;
  channelId: ChannelId;
  index: number;
}

export default function ChannelPostCard({
  post,
  authorName,
  authorAvatar,
  isOwner,
  isPostAuthor,
  currentUserId,
  channelId,
  index,
}: ChannelPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [forwardOpen, setForwardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(post.content.text);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: interactions } = useGetChannelPostInteractions(post.id);
  const likePost = useLikeChannelPost();
  const unlikePost = useUnlikeChannelPost();
  const commentOnPost = useCommentOnChannelPost();
  const deletePost = useDeleteChannelPost(channelId);
  const editPost = useEditChannelPost(channelId);

  const likeCount = Number(interactions?.likeCount ?? 0);
  const likedByMe = interactions?.likedByMe ?? false;
  const comments = interactions?.comments ?? [];

  const handleLike = () => {
    if (likedByMe) {
      unlikePost.mutate(post.id);
    } else {
      likePost.mutate(post.id);
    }
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    commentOnPost.mutate(
      { postId: post.id, text: commentText.trim() },
      { onSuccess: () => setCommentText("") },
    );
  };

  const handleEdit = async () => {
    try {
      await editPost.mutateAsync({
        postId: post.id,
        content: { ...post.content, text: editText.trim() },
      });
      toast.success("Post updated");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update post");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const mediaKind = post.content.mediaType?.__kind__;
  const ocid = index + 1;

  return (
    <article
      data-ocid={`channel.post.item.${ocid}`}
      className="rounded-2xl border border-border bg-card/60 overflow-hidden"
    >
      {/* Author row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar className="w-9 h-9 shrink-0">
          {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
          <AvatarFallback
            className="text-xs font-semibold"
            style={{
              background: "oklch(0.76 0.13 72 / 0.2)",
              color: "oklch(0.82 0.15 72)",
            }}
          >
            {getInitials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{authorName}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(post.timestamp)}
          </p>
        </div>

        {/* Edit/Delete menu for owner */}
        {isPostAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-lg hover:bg-muted shrink-0"
                data-ocid={`channel.post.open_modal_button.${ocid}`}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem
                onClick={() => {
                  setEditText(post.content.text);
                  setEditOpen(true);
                }}
                className="cursor-pointer"
                data-ocid={`channel.post.edit_button.${ocid}`}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Post
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="cursor-pointer text-destructive focus:text-destructive"
                data-ocid={`channel.post.delete_button.${ocid}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Text content */}
      {post.content.text && (
        <p className="px-4 pb-3 text-sm text-foreground/90 leading-relaxed">
          {post.content.text}
        </p>
      )}

      {/* Media */}
      {post.content.mediaUrl && mediaKind === "image" && (
        <img
          src={post.content.mediaUrl}
          alt="Post media"
          className="w-full max-h-80 object-cover"
        />
      )}

      {post.content.mediaUrl && mediaKind === "video" && (
        // biome-ignore lint/a11y/useMediaCaption: user-uploaded content
        <video
          src={post.content.mediaUrl}
          controls
          muted
          playsInline
          data-webkit-playsinline="true"
          className="w-full max-h-80 object-cover"
          style={{ WebkitTransform: "translateZ(0)" }}
        />
      )}

      {post.content.mediaUrl && mediaKind === "audio" && (
        // biome-ignore lint/a11y/useMediaCaption: user-uploaded content
        <audio
          src={post.content.mediaUrl}
          controls
          className="w-full px-4 pb-3"
        />
      )}

      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border/50">
        <button
          type="button"
          data-ocid={`channel.post.toggle.${ocid}`}
          onClick={handleLike}
          disabled={isOwner}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-40"
          aria-label={likedByMe ? "Unlike" : "Like"}
        >
          <Heart
            className="h-4 w-4"
            style={{
              color: likedByMe ? "oklch(0.65 0.25 25)" : "oklch(0.6 0.02 55)",
              fill: likedByMe ? "oklch(0.65 0.25 25)" : "transparent",
              transition: "color 0.2s, fill 0.2s",
            }}
          />
          {likeCount > 0 && (
            <span className="text-xs text-muted-foreground">{likeCount}</span>
          )}
        </button>

        <button
          type="button"
          data-ocid={`channel.post.secondary_button.${ocid}`}
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          aria-label="Comments"
        >
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {comments.length}
            </span>
          )}
        </button>

        <button
          type="button"
          data-ocid={`channel.post.button.${ocid}`}
          onClick={() => setForwardOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          aria-label="Forward"
        >
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-border/50 px-4 py-3 flex flex-col gap-3">
          {comments.length > 0 && (
            <div className="flex flex-col gap-2">
              {comments.map((c) => (
                <div key={String(c.id)} className="flex items-start gap-2">
                  <Avatar className="w-6 h-6 shrink-0">
                    {c.author.avatarUrl && (
                      <AvatarImage
                        src={c.author.avatarUrl}
                        alt={c.author.displayName}
                      />
                    )}
                    <AvatarFallback
                      className="text-[10px]"
                      style={{
                        background: "oklch(0.76 0.13 72 / 0.2)",
                        color: "oklch(0.82 0.15 72)",
                      }}
                    >
                      {getInitials(c.author.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span
                      className="text-xs font-semibold mr-1.5"
                      style={{ color: "oklch(0.82 0.15 72)" }}
                    >
                      {c.author.displayName}
                    </span>
                    <span className="text-xs text-foreground/80">{c.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isOwner && (
            <div className="flex gap-2">
              <Input
                data-ocid={`channel.post.input.${ocid}`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Add a comment..."
                className="flex-1 h-8 text-xs bg-input border-border"
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={!commentText.trim() || commentOnPost.isPending}
                onClick={handleComment}
                style={{
                  background: commentText.trim()
                    ? "oklch(0.82 0.15 72)"
                    : "oklch(0.2 0.01 55)",
                  color: "oklch(0.08 0.004 55)",
                }}
                data-ocid={`channel.post.submit_button.${ocid}`}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      <ForwardPostModal
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        postId={post.id as ChannelPostId}
        currentUserId={currentUserId}
      />

      {/* Edit Post Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          data-ocid={`channel.post.edit.dialog.${ocid}`}
          className="bg-card border-border max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              Edit Post
            </DialogTitle>
          </DialogHeader>
          <Textarea
            data-ocid={`channel.post.edit.textarea.${ocid}`}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="bg-input border-border resize-none h-24 text-sm"
            placeholder="Post text..."
          />
          <div className="flex justify-end gap-2 mt-1">
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={editPost.isPending}
              data-ocid={`channel.post.edit.cancel_button.${ocid}`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editPost.isPending || !editText.trim()}
              data-ocid={`channel.post.edit.save_button.${ocid}`}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {editPost.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Post Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid={`channel.post.delete.cancel_button.${ocid}`}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid={`channel.post.delete.confirm_button.${ocid}`}
              disabled={deletePost.isPending}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePost.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
