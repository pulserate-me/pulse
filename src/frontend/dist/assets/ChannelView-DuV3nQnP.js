import { c as createLucideIcon, r as reactExports, u as useListUserConversations, a as useForwardChannelPost, j as jsxRuntimeExports, D as Dialog, b as DialogContent, d as DialogHeader, e as DialogTitle, S as Search, I as Input, f as ScrollArea, L as LoaderCircle, B as Button, g as ue, h as useGetUserProfile, A as Avatar, i as AvatarImage, k as AvatarFallback, l as useGetChannelPostInteractions, m as useLikeChannelPost, n as useUnlikeChannelPost, o as useCommentOnChannelPost, p as useDeleteChannelPost, q as useEditChannelPost, s as DropdownMenu, t as DropdownMenuTrigger, E as EllipsisVertical, v as DropdownMenuContent, w as DropdownMenuItem, x as SquarePen, T as Trash2, H as Heart, M as MessageCircle, y as Share2, z as Send, C as Textarea, F as AlertDialog, G as AlertDialogContent, J as AlertDialogHeader, K as AlertDialogTitle, N as AlertDialogDescription, O as AlertDialogFooter, P as AlertDialogCancel, Q as AlertDialogAction, R as useGetChannel, U as useGetChannelPosts, V as useFollowChannel, W as useUnfollowChannel, X as useAddChannelPost, Y as useMediaUpload, Z as useDeleteChannel, _ as markChannelAsViewed, $ as Skeleton, a0 as ArrowLeft, a1 as Users, a2 as X, a3 as Mic, a4 as Image, a5 as Video, a6 as useUpdateChannel, a7 as Camera, a8 as Label, a9 as ChevronDown } from "./index-CIOL25BW.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", key: "1cjeqo" }],
  ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", key: "19qd67" }]
];
const Link = createLucideIcon("link", __iconNode);
function getInitials$2(name) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function ConvItem({
  conversation,
  currentUserId,
  onSelect
}) {
  var _a;
  const isGroup = conversation.type.__kind__ === "group";
  const otherUserId = isGroup ? null : ((_a = conversation.members.find((m) => m.toString() !== currentUserId)) == null ? void 0 : _a.toString()) ?? null;
  const { data: otherProfile } = useGetUserProfile(otherUserId);
  const name = isGroup ? conversation.type.group : (otherProfile == null ? void 0 : otherProfile.displayName) ?? (otherUserId == null ? void 0 : otherUserId.slice(0, 8)) ?? "Unknown";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: onSelect,
      className: "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "w-10 h-10 shrink-0", children: [
          (otherProfile == null ? void 0 : otherProfile.avatarUrl) && /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: otherProfile.avatarUrl, alt: name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            AvatarFallback,
            {
              className: "text-sm font-semibold",
              style: {
                background: "oklch(0.76 0.13 72 / 0.2)",
                color: "oklch(0.82 0.15 72)"
              },
              children: getInitials$2(name)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-foreground truncate", children: name })
      ]
    }
  );
}
function ForwardPostModal({
  open,
  onOpenChange,
  postId,
  currentUserId
}) {
  const [search, setSearch] = reactExports.useState("");
  const { data: conversations = [] } = useListUserConversations();
  const { mutateAsync: forwardPost, isPending } = useForwardChannelPost();
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (c.type.__kind__ === "group") {
      return c.type.group.toLowerCase().includes(q);
    }
    return true;
  });
  const handleForward = async (conversationId) => {
    if (!postId) return;
    try {
      await forwardPost({ postId, conversationId });
      ue.success("Post forwarded!");
      onOpenChange(false);
    } catch {
      ue.error("Failed to forward post");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      "data-ocid": "channel.forward.dialog",
      className: "bg-card border-border max-w-sm",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "font-display text-foreground", children: "Forward to..." }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              "data-ocid": "channel.forward.search_input",
              placeholder: "Search conversations...",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              className: "pl-9 bg-input border-border"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, { className: "max-h-80", children: filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            "data-ocid": "channel.forward.empty_state",
            className: "text-center text-sm text-muted-foreground py-8",
            children: "No conversations found"
          }
        ) : filtered.map((conv) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConvItem,
          {
            conversation: conv,
            currentUserId,
            onSelect: () => handleForward(conv.id)
          },
          conv.id.toString()
        )) }),
        isPending && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
          "Forwarding..."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            "data-ocid": "channel.forward.cancel_button",
            variant: "ghost",
            onClick: () => onOpenChange(false),
            children: "Cancel"
          }
        ) })
      ]
    }
  ) });
}
function getInitials$1(name) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function formatTime(ts) {
  const ms = Number(ts) / 1e6;
  const now = Date.now();
  const diff = now - ms;
  if (diff < 6e4) return "just now";
  if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
  if (diff < 864e5) return `${Math.floor(diff / 36e5)}h ago`;
  return new Date(ms).toLocaleDateString();
}
function extractYouTubeId(url) {
  const pattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/\s]+)/;
  const m = url.match(pattern);
  return m ? m[1] : null;
}
function extractTikTokId(url) {
  const m = url.match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}
function TikTokEmbed({ url }) {
  const videoId = extractTikTokId(url);
  const [loading, setLoading] = reactExports.useState(false);
  const [failed, setFailed] = reactExports.useState(false);
  const containerRef = reactExports.useRef(null);
  const injectedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (videoId) return;
    if (injectedRef.current) return;
    injectedRef.current = true;
    setLoading(true);
    setFailed(false);
    fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`).then((r) => r.json()).then((data) => {
      if (data.html && containerRef.current) {
        containerRef.current.innerHTML = data.html;
      } else {
        setFailed(true);
      }
    }).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, [url, videoId]);
  if (videoId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "w-full overflow-hidden rounded-xl",
        style: { maxHeight: 560 },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "iframe",
          {
            src: `https://www.tiktok.com/embed/v2/${videoId}`,
            className: "w-full",
            style: { height: 560, border: "none" },
            allow: "autoplay; encrypted-media",
            allowFullScreen: true,
            title: "TikTok video",
            scrolling: "no"
          }
        )
      }
    );
  }
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "w-full rounded-xl flex items-center justify-center py-8",
        style: { background: "oklch(0.18 0.02 240)" },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          LoaderCircle,
          {
            className: "h-6 w-6 animate-spin",
            style: { color: "oklch(0.82 0.15 72)" }
          }
        )
      }
    );
  }
  if (failed) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "w-full rounded-xl p-4 flex items-center gap-3",
        style: {
          background: "oklch(0.18 0.02 240)",
          border: "1px solid oklch(0.28 0.02 240)"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              style: { background: "oklch(0.12 0.01 240)" },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white font-bold text-sm", children: "TT" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: "TikTok Video" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground truncate", children: url })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: url, target: "_blank", rel: "noopener noreferrer", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "shrink-0 text-xs", children: "Watch" }) })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: containerRef, className: "w-full rounded-xl overflow-hidden" });
}
function XEmbedCard({ url }) {
  const containerRef = reactExports.useRef(null);
  const injectedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (injectedRef.current || !containerRef.current) return;
    injectedRef.current = true;
    fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
    ).then((r) => r.json()).then((data) => {
      var _a;
      if (!containerRef.current || !data.html) return;
      containerRef.current.innerHTML = data.html;
      if ((_a = window.twttr) == null ? void 0 : _a.widgets) {
        window.twttr.widgets.load(containerRef.current);
      } else {
        const script = document.createElement("script");
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.charset = "utf-8";
        document.head.appendChild(script);
      }
    }).catch(() => {
      if (containerRef.current) {
        containerRef.current.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:inherit">View post on X</a>`;
      }
    });
  }, [url]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ref: containerRef,
      className: "px-1 pb-1 [&_iframe]:max-w-full [&_.twitter-tweet]:mx-0"
    }
  );
}
function ChannelPostCard({
  post,
  authorName,
  authorAvatar,
  isOwner: _isOwner,
  isPostAuthor,
  currentUserId,
  channelId,
  index
}) {
  var _a, _b;
  const [showComments, setShowComments] = reactExports.useState(false);
  const [commentText, setCommentText] = reactExports.useState("");
  const [forwardOpen, setForwardOpen] = reactExports.useState(false);
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const [editText, setEditText] = reactExports.useState(post.content.text);
  const [deleteOpen, setDeleteOpen] = reactExports.useState(false);
  const [showFullText, setShowFullText] = reactExports.useState(false);
  const { data: interactions } = useGetChannelPostInteractions(post.id);
  const likePost = useLikeChannelPost();
  const unlikePost = useUnlikeChannelPost();
  const commentOnPost = useCommentOnChannelPost();
  const deletePost = useDeleteChannelPost(channelId);
  const editPost = useEditChannelPost(channelId);
  const likeCount = Number((interactions == null ? void 0 : interactions.likeCount) ?? 0);
  const likedByMe = (interactions == null ? void 0 : interactions.likedByMe) ?? false;
  const comments = (interactions == null ? void 0 : interactions.comments) ?? [];
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
      { onSuccess: () => setCommentText("") }
    );
  };
  const handleEdit = async () => {
    try {
      await editPost.mutateAsync({
        postId: post.id,
        content: { ...post.content, text: editText.trim() }
      });
      ue.success("Post updated");
      setEditOpen(false);
    } catch {
      ue.error("Failed to update post");
    }
  };
  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      ue.success("Post deleted");
    } catch {
      ue.error("Failed to delete post");
    }
  };
  const mediaKind = (_a = post.content.mediaType) == null ? void 0 : _a.__kind__;
  const embedVariant = mediaKind === "other" ? (_b = post.content.mediaType) == null ? void 0 : _b.other : null;
  const ocid = index + 1;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "article",
    {
      "data-ocid": `channel.post.item.${ocid}`,
      className: "rounded-2xl border border-border bg-card/60 overflow-hidden",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-4 pt-4 pb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "w-9 h-9 shrink-0", children: [
            authorAvatar && /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: authorAvatar, alt: authorName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AvatarFallback,
              {
                className: "text-xs font-semibold",
                style: {
                  background: "oklch(0.76 0.13 72 / 0.2)",
                  color: "oklch(0.82 0.15 72)"
                },
                children: getInitials$1(authorName)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-foreground", children: authorName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: formatTime(post.timestamp) })
          ] }),
          isPostAuthor && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "icon",
                variant: "ghost",
                className: "h-7 w-7 rounded-lg hover:bg-muted shrink-0",
                "data-ocid": `channel.post.open_modal_button.${ocid}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(EllipsisVertical, { className: "h-3.5 w-3.5" })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "bg-card border-border", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                DropdownMenuItem,
                {
                  onClick: () => {
                    setEditText(post.content.text);
                    setEditOpen(true);
                  },
                  className: "cursor-pointer",
                  "data-ocid": `channel.post.edit_button.${ocid}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, { className: "h-4 w-4 mr-2" }),
                    "Edit Post"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                DropdownMenuItem,
                {
                  onClick: () => setDeleteOpen(true),
                  className: "cursor-pointer text-destructive focus:text-destructive",
                  "data-ocid": `channel.post.delete_button.${ocid}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4 mr-2" }),
                    "Delete Post"
                  ]
                }
              )
            ] })
          ] })
        ] }),
        post.content.text && (() => {
          const words = post.content.text.trim().split(/\s+/);
          const isLong = words.length > 69;
          const displayText = isLong && !showFullText ? `${words.slice(0, 69).join(" ")}…` : post.content.text;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap", children: displayText }),
            isLong && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setShowFullText(!showFullText),
                className: "text-xs font-semibold mt-1",
                style: { color: "oklch(0.82 0.15 72)" },
                children: showFullText ? "Show less" : "Read more"
              }
            )
          ] });
        })(),
        post.content.mediaUrl && mediaKind === "image" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: post.content.mediaUrl,
            alt: "Post media",
            className: "w-full max-h-80 object-cover"
          }
        ) }),
        post.content.mediaUrl && mediaKind === "video" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "video",
          {
            src: post.content.mediaUrl,
            controls: true,
            muted: true,
            playsInline: true,
            "data-webkit-playsinline": "true",
            className: "w-full max-h-80 object-cover",
            style: { WebkitTransform: "translateZ(0)" }
          }
        ) }),
        post.content.mediaUrl && mediaKind === "audio" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("audio", { src: post.content.mediaUrl, controls: true, className: "w-full" }) }),
        post.content.mediaUrl && mediaKind === "other" && embedVariant === "embedYouTube" && (() => {
          const videoId = extractYouTubeId(post.content.mediaUrl);
          if (!videoId) return null;
          return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full overflow-hidden rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "iframe",
            {
              src: `https://www.youtube.com/embed/${videoId}`,
              className: "w-full aspect-video",
              allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
              allowFullScreen: true,
              title: "YouTube video"
            }
          ) }) });
        })(),
        post.content.mediaUrl && mediaKind === "other" && embedVariant === "embedTikTok" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TikTokEmbed, { url: post.content.mediaUrl }) }),
        post.content.mediaUrl && mediaKind === "other" && embedVariant === "embedX" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(XEmbedCard, { url: post.content.mediaUrl }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 px-3 py-2 border-t border-border/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-ocid": `channel.post.toggle.${ocid}`,
              onClick: handleLike,
              disabled: isPostAuthor,
              className: "flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-40",
              "aria-label": likedByMe ? "Unlike" : "Like",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Heart,
                  {
                    className: "h-4 w-4",
                    style: {
                      color: likedByMe ? "oklch(0.65 0.25 25)" : "oklch(0.6 0.02 55)",
                      fill: likedByMe ? "oklch(0.65 0.25 25)" : "transparent",
                      transition: "color 0.2s, fill 0.2s"
                    }
                  }
                ),
                likeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: likeCount })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-ocid": `channel.post.secondary_button.${ocid}`,
              onClick: () => setShowComments((v) => !v),
              className: "flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors",
              "aria-label": "Comments",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4 text-muted-foreground" }),
                comments.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: comments.length })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-ocid": `channel.post.button.${ocid}`,
              onClick: () => setForwardOpen(true),
              className: "flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors",
              "aria-label": "Forward",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { className: "h-4 w-4 text-muted-foreground" })
            }
          )
        ] }),
        showComments && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border/50 px-4 py-3 flex flex-col gap-3", children: [
          comments.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", children: comments.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "w-6 h-6 shrink-0", children: [
              c.author.avatarUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AvatarImage,
                {
                  src: c.author.avatarUrl,
                  alt: c.author.displayName
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                AvatarFallback,
                {
                  className: "text-[10px]",
                  style: {
                    background: "oklch(0.76 0.13 72 / 0.2)",
                    color: "oklch(0.82 0.15 72)"
                  },
                  children: getInitials$1(c.author.displayName)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "text-xs font-semibold mr-1.5",
                  style: { color: "oklch(0.82 0.15 72)" },
                  children: c.author.displayName
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-foreground/80", children: c.text })
            ] })
          ] }, String(c.id))) }),
          !isPostAuthor && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                "data-ocid": `channel.post.input.${ocid}`,
                value: commentText,
                onChange: (e) => setCommentText(e.target.value),
                onKeyDown: (e) => e.key === "Enter" && handleComment(),
                placeholder: "Add a comment...",
                className: "flex-1 h-8 text-xs bg-input border-border"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "icon",
                className: "h-8 w-8 shrink-0",
                disabled: !commentText.trim() || commentOnPost.isPending,
                onClick: handleComment,
                style: {
                  background: commentText.trim() ? "oklch(0.82 0.15 72)" : "oklch(0.2 0.01 55)",
                  color: "oklch(0.08 0.004 55)"
                },
                "data-ocid": `channel.post.submit_button.${ocid}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3.5 w-3.5" })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ForwardPostModal,
          {
            open: forwardOpen,
            onOpenChange: setForwardOpen,
            postId: post.id,
            currentUserId
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: editOpen, onOpenChange: setEditOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DialogContent,
          {
            "data-ocid": `channel.post.edit.dialog.${ocid}`,
            className: "bg-card border-border max-w-md",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "font-display text-foreground", children: "Edit Post" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Textarea,
                {
                  "data-ocid": `channel.post.edit.textarea.${ocid}`,
                  value: editText,
                  onChange: (e) => setEditText(e.target.value),
                  className: "bg-input border-border resize-none h-24 text-sm",
                  placeholder: "Post text..."
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 mt-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "ghost",
                    onClick: () => setEditOpen(false),
                    disabled: editPost.isPending,
                    "data-ocid": `channel.post.edit.cancel_button.${ocid}`,
                    children: "Cancel"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    onClick: handleEdit,
                    disabled: editPost.isPending || !editText.trim(),
                    "data-ocid": `channel.post.edit.save_button.${ocid}`,
                    style: {
                      background: "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                      color: "oklch(0.08 0.004 55)"
                    },
                    children: editPost.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : "Save"
                  }
                )
              ] })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: deleteOpen, onOpenChange: setDeleteOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { className: "bg-card border-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: "Delete Post" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: "Are you sure you want to delete this post? This action cannot be undone." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AlertDialogCancel,
              {
                "data-ocid": `channel.post.delete.cancel_button.${ocid}`,
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              AlertDialogAction,
              {
                "data-ocid": `channel.post.delete.confirm_button.${ocid}`,
                disabled: deletePost.isPending,
                onClick: handleDelete,
                className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                children: [
                  deletePost.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin mr-2" }) : null,
                  "Delete"
                ]
              }
            )
          ] })
        ] }) })
      ]
    }
  );
}
const POSTS_PAGE_SIZE = 9;
function getInitials(name) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function detectEmbedPlatform(url) {
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/") || url.includes("youtube.com/shorts/"))
    return "youtube";
  if (url.includes("twitter.com/") || url.includes("x.com/")) return "x";
  if (url.includes("tiktok.com/") || url.includes("vt.tiktok.com"))
    return "tiktok";
  return null;
}
const CHANNEL_CATEGORIES = [
  "Music",
  "Finance",
  "Sports",
  "News",
  "Entertainment",
  "Technology",
  "Health",
  "Education",
  "Other"
];
function EditChannelModal({
  open,
  onOpenChange,
  channelId,
  initialName,
  initialDescription,
  initialAvatarUrl,
  initialCategory
}) {
  const [name, setName] = reactExports.useState(initialName);
  const [description, setDescription] = reactExports.useState(initialDescription);
  const [category, setCategory] = reactExports.useState(initialCategory ?? "");
  const [avatarPreview, setAvatarPreview] = reactExports.useState(
    initialAvatarUrl ?? null
  );
  const [pendingAvatar, setPendingAvatar] = reactExports.useState(null);
  const fileRef = reactExports.useRef(null);
  const { mutateAsync: updateChannel, isPending } = useUpdateChannel();
  const { uploadMedia, isUploading } = useMediaUpload();
  const isBusy = isPending || isUploading;
  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      let avatarUrl = initialAvatarUrl;
      if (pendingAvatar) {
        const result = await uploadMedia(pendingAvatar);
        avatarUrl = result.url;
      }
      await updateChannel({
        channelId,
        name: name.trim(),
        description: description.trim(),
        avatarUrl,
        category: category || void 0
      });
      ue.success("Channel updated");
      onOpenChange(false);
    } catch {
      ue.error("Failed to update channel");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      "data-ocid": "channel.edit.dialog",
      className: "bg-card border-border max-w-md",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "font-display text-foreground", children: "Edit Channel" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                className: "relative group",
                onClick: () => {
                  var _a;
                  return (_a = fileRef.current) == null ? void 0 : _a.click();
                },
                disabled: isBusy,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "w-20 h-20", children: [
                    avatarPreview && /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: avatarPreview, alt: "avatar" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      AvatarFallback,
                      {
                        className: "text-2xl font-bold",
                        style: {
                          background: "oklch(0.76 0.13 72 / 0.3)",
                          color: "oklch(0.82 0.15 72)"
                        },
                        children: getInitials(name || "CH")
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                      style: { background: "oklch(0 0 0 / 0.5)" },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "h-6 w-6 text-white" })
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ref: fileRef,
                type: "file",
                accept: "image/*",
                className: "hidden",
                onChange: (e) => {
                  var _a;
                  const f = (_a = e.target.files) == null ? void 0 : _a[0];
                  if (f) {
                    setPendingAvatar(f);
                    setAvatarPreview(URL.createObjectURL(f));
                  }
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm text-muted-foreground", children: "Channel Name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                "data-ocid": "channel.edit.input",
                value: name,
                onChange: (e) => setName(e.target.value),
                className: "bg-input border-border",
                maxLength: 60
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm text-muted-foreground", children: "Description" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Textarea,
              {
                "data-ocid": "channel.edit.textarea",
                value: description,
                onChange: (e) => setDescription(e.target.value),
                className: "bg-input border-border resize-none h-20",
                maxLength: 300
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm text-muted-foreground", children: "Category" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  "data-ocid": "channel.edit.category_select",
                  value: category,
                  onChange: (e) => setCategory(e.target.value),
                  disabled: isBusy,
                  className: "w-full h-9 rounded-md px-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-1",
                  style: {
                    background: "oklch(0.16 0.015 55)",
                    border: "1px solid oklch(0.3 0.01 55)",
                    color: category ? "oklch(0.9 0.01 55)" : "oklch(0.5 0.02 55)"
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "No category" }),
                    CHANNEL_CATEGORIES.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "option",
                      {
                        value: cat,
                        style: {
                          background: "oklch(0.16 0.015 55)",
                          color: "oklch(0.9 0.01 55)"
                        },
                        children: cat
                      },
                      cat
                    ))
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ChevronDown,
                {
                  className: "absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none",
                  style: { color: "oklch(0.5 0.02 55)" }
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              "data-ocid": "channel.edit.cancel_button",
              variant: "ghost",
              onClick: () => onOpenChange(false),
              disabled: isBusy,
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              "data-ocid": "channel.edit.save_button",
              onClick: handleSubmit,
              disabled: isBusy || !name.trim(),
              style: {
                background: "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)"
              },
              children: isBusy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : "Save"
            }
          )
        ] })
      ]
    }
  ) });
}
function ChannelView({
  channelId,
  currentUserId,
  onBack
}) {
  const { data: channelMeta, isLoading: channelLoading } = useGetChannel(channelId);
  const { data: posts = [], isLoading: postsLoading } = useGetChannelPosts(channelId);
  const { mutate: follow, isPending: following } = useFollowChannel();
  const { mutate: unfollow, isPending: unfollowing } = useUnfollowChannel();
  const { mutateAsync: addPost, isPending: posting } = useAddChannelPost(channelId);
  const { uploadMedia, isUploading } = useMediaUpload();
  const [postText, setPostText] = reactExports.useState("");
  const [pendingMedia, setPendingMedia] = reactExports.useState(null);
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = reactExports.useState(false);
  const [postsPage, setPostsPage] = reactExports.useState(1);
  const { mutateAsync: deleteChannel, isPending: deleting } = useDeleteChannel();
  const imageRef = reactExports.useRef(null);
  const videoRef = reactExports.useRef(null);
  const mediaRecorderRef = reactExports.useRef(null);
  const recordingChunksRef = reactExports.useRef([]);
  const recordingTimerRef = reactExports.useRef(null);
  const [isRecording, setIsRecording] = reactExports.useState(false);
  const [recordingSeconds, setRecordingSeconds] = reactExports.useState(0);
  const [showEmbedInput, setShowEmbedInput] = reactExports.useState(false);
  const [embedUrl, setEmbedUrl] = reactExports.useState("");
  reactExports.useEffect(() => {
    markChannelAsViewed(channelId.toString());
  }, [channelId]);
  reactExports.useEffect(() => {
    return () => {
      var _a;
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (((_a = mediaRecorderRef.current) == null ? void 0 : _a.state) === "recording") {
        mediaRecorderRef.current.stop();
        for (const t of mediaRecorderRef.current.stream.getTracks()) {
          t.stop();
        }
      }
    };
  }, []);
  const isBusy = posting || isUploading;
  const detectedPlatform = embedUrl.trim() ? detectEmbedPlatform(embedUrl.trim()) : null;
  const startRecording = reactExports.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1e3);
    } catch {
      ue.error("Microphone access denied");
    }
  }, []);
  const stopRecording = reactExports.useCallback(() => {
    var _a;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (((_a = mediaRecorderRef.current) == null ? void 0 : _a.state) === "recording") {
      mediaRecorderRef.current.stop();
      for (const t of mediaRecorderRef.current.stream.getTracks()) {
        t.stop();
      }
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);
  const cancelRecording = reactExports.useCallback(() => {
    stopRecording();
    recordingChunksRef.current = [];
  }, [stopRecording]);
  const sendRecording = reactExports.useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    await new Promise((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state === "recording") {
        recorder.stop();
        for (const t of recorder.stream.getTracks()) {
          t.stop();
        }
      } else {
        resolve();
      }
    });
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    const mimeType = recorder.mimeType || "audio/webm";
    const blob = new Blob(recordingChunksRef.current, { type: mimeType });
    recordingChunksRef.current = [];
    const ext = mimeType.includes("ogg") ? "ogg" : "webm";
    const audioFile = new File([blob], `audio_recording.${ext}`, {
      type: mimeType
    });
    try {
      const result = await uploadMedia(audioFile);
      await addPost({
        text: postText.trim(),
        mediaUrl: result.url,
        mediaType: result.mediaType
      });
      setPostText("");
      setPendingMedia(null);
      setPostsPage(1);
      ue.success("Post published!");
    } catch {
      ue.error("Failed to publish post");
    }
  }, [addPost, uploadMedia, postText]);
  if (channelLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "channel.view.loading_state",
        className: "flex flex-col h-full",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-10 rounded-full" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-32 mb-1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3 w-20" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 p-4 flex flex-col gap-4", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-32 rounded-2xl" }, i)) })
        ]
      }
    );
  }
  if (!channelMeta) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-ocid": "channel.view.error_state",
        className: "flex-1 flex items-center justify-center text-muted-foreground",
        children: "Channel not found"
      }
    );
  }
  const { channel, followerCount, isFollowing, ownerProfile } = channelMeta;
  const isOwner = channel.owner.toString() === currentUserId;
  const handleFollowToggle = () => {
    if (isFollowing) {
      unfollow(channelId);
    } else {
      follow(channelId);
    }
  };
  const handlePost = async () => {
    const hasEmbed = embedUrl.trim() && detectedPlatform;
    if (!postText.trim() && !pendingMedia && !hasEmbed) return;
    try {
      let mediaUrl;
      let mediaType;
      if (hasEmbed) {
        mediaUrl = embedUrl.trim();
        const platformMap = {
          youtube: "embedYouTube",
          x: "embedX",
          tiktok: "embedTikTok"
        };
        mediaType = { other: platformMap[detectedPlatform] };
      } else if (pendingMedia) {
        const result = await uploadMedia(pendingMedia);
        mediaUrl = result.url;
        mediaType = result.mediaType;
      }
      await addPost({
        text: postText.trim(),
        mediaUrl,
        mediaType
      });
      setPostText("");
      setPendingMedia(null);
      setEmbedUrl("");
      setShowEmbedInput(false);
      setPostsPage(1);
      ue.success("Post published!");
    } catch {
      ue.error("Failed to publish post");
    }
  };
  const formatRecordingTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const sortedPosts = [...posts].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp)
  );
  const visiblePosts = sortedPosts.slice(0, postsPage * POSTS_PAGE_SIZE);
  const hasMorePosts = sortedPosts.length > postsPage * POSTS_PAGE_SIZE;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full min-h-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "shrink-0 border-b border-border px-4 py-3",
        style: {
          background: "linear-gradient(135deg, oklch(0.12 0.01 55), oklch(0.10 0.008 55))"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "icon",
                variant: "ghost",
                onClick: onBack,
                className: "h-9 w-9 rounded-xl hover:bg-muted md:hidden",
                "data-ocid": "channel.view.button",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-5 w-5" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "w-12 h-12 shrink-0", children: [
              channel.avatarUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: channel.avatarUrl, alt: channel.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                AvatarFallback,
                {
                  className: "text-lg font-bold",
                  style: {
                    background: "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.3), oklch(0.65 0.11 65 / 0.2))",
                    color: "oklch(0.82 0.15 72)"
                  },
                  children: getInitials(channel.name)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display font-bold text-lg text-foreground truncate", children: channel.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-3 w-3" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  Number(followerCount),
                  " followers"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
              isOwner && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      size: "icon",
                      variant: "ghost",
                      className: "h-9 w-9 rounded-xl hover:bg-muted",
                      "data-ocid": "channel.view.open_modal_button",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(EllipsisVertical, { className: "h-4 w-4" })
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    DropdownMenuContent,
                    {
                      align: "end",
                      className: "bg-card border-border",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          DropdownMenuItem,
                          {
                            onClick: () => setEditOpen(true),
                            className: "cursor-pointer",
                            "data-ocid": "channel.view.edit_button",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, { className: "h-4 w-4 mr-2" }),
                              "Edit Channel"
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          DropdownMenuItem,
                          {
                            onClick: () => setDeleteConfirmOpen(true),
                            className: "cursor-pointer text-destructive focus:text-destructive",
                            "data-ocid": "channel.view.delete_button",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4 mr-2" }),
                              "Delete Channel"
                            ]
                          }
                        )
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  AlertDialog,
                  {
                    open: deleteConfirmOpen,
                    onOpenChange: setDeleteConfirmOpen,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { className: "bg-card border-border", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: "Delete Channel" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogDescription, { children: [
                          'Are you sure you want to delete "',
                          channel.name,
                          '"? This action cannot be undone and all posts will be lost.'
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { "data-ocid": "channel.delete.cancel_button", children: "Cancel" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          AlertDialogAction,
                          {
                            "data-ocid": "channel.delete.confirm_button",
                            disabled: deleting,
                            onClick: async () => {
                              try {
                                await deleteChannel(channelId);
                                ue.success("Channel deleted");
                                onBack();
                              } catch {
                                ue.error("Failed to delete channel");
                              }
                            },
                            className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                            children: [
                              deleting ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin mr-2" }) : null,
                              "Delete"
                            ]
                          }
                        )
                      ] })
                    ] })
                  }
                )
              ] }),
              !isOwner && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  onClick: handleFollowToggle,
                  disabled: following || unfollowing,
                  size: "sm",
                  "data-ocid": "channel.view.toggle",
                  style: {
                    background: isFollowing ? "oklch(0.2 0.01 55)" : "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                    color: isFollowing ? "oklch(0.7 0.05 55)" : "oklch(0.08 0.004 55)",
                    border: isFollowing ? "1px solid oklch(0.3 0.01 55)" : "none"
                  },
                  className: "rounded-xl text-xs px-4",
                  children: following || unfollowing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : isFollowing ? "Following" : "Follow"
                }
              )
            ] })
          ] }),
          channel.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-2 leading-relaxed", children: channel.description })
        ]
      }
    ),
    isOwner && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "shrink-0 border-b border-border px-4 py-3 flex flex-col gap-2",
        style: { background: "oklch(0.11 0.008 55)" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Textarea,
            {
              "data-ocid": "channel.post.textarea",
              placeholder: "Share something with your followers...",
              value: postText,
              onChange: (e) => setPostText(e.target.value),
              className: "bg-input border-border resize-none min-h-[4rem] text-sm",
              disabled: isBusy || isRecording
            }
          ),
          pendingMedia && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate max-w-48", children: pendingMedia.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setPendingMedia(null),
                className: "text-destructive hover:underline",
                children: "Remove"
              }
            )
          ] }),
          showEmbedInput && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  "data-ocid": "channel.post.input",
                  placeholder: "Paste YouTube, X, or TikTok URL...",
                  value: embedUrl,
                  onChange: (e) => setEmbedUrl(e.target.value),
                  className: "flex-1 h-8 text-xs bg-input border-border",
                  disabled: isBusy
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setEmbedUrl("");
                    setShowEmbedInput(false);
                  },
                  className: "p-1 rounded hover:bg-muted text-muted-foreground",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" })
                }
              )
            ] }),
            detectedPlatform && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "span",
              {
                className: "text-xs font-semibold px-1",
                style: { color: "oklch(0.82 0.15 72)" },
                children: [
                  detectedPlatform === "youtube" && "▶ YouTube detected",
                  detectedPlatform === "x" && "𝕏 X / Twitter detected",
                  detectedPlatform === "tiktok" && "TT TikTok detected"
                ]
              }
            )
          ] }),
          isRecording ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 py-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "relative flex h-2.5 w-2.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    style: { background: "oklch(0.55 0.22 25)" }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "relative inline-flex rounded-full h-2.5 w-2.5",
                    style: { background: "oklch(0.6 0.25 25)" }
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Mic,
                {
                  className: "h-4 w-4",
                  style: { color: "oklch(0.6 0.25 25)" }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "text-sm font-mono font-semibold",
                  style: { color: "oklch(0.6 0.25 25)" },
                  children: formatRecordingTime(recordingSeconds)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: cancelRecording,
                className: "px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors text-muted-foreground",
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                onClick: sendRecording,
                disabled: isBusy,
                style: {
                  background: "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                  color: "oklch(0.08 0.004 55)"
                },
                className: "rounded-xl text-xs px-4",
                "data-ocid": "channel.post.submit_button",
                children: isBusy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3 w-3 mr-1.5" }),
                  "Send"
                ] })
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                "data-ocid": "channel.post.upload_button",
                onClick: () => {
                  var _a;
                  return (_a = imageRef.current) == null ? void 0 : _a.click();
                },
                disabled: isBusy,
                className: "p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                title: "Attach image",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "h-4 w-4" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  var _a;
                  return (_a = videoRef.current) == null ? void 0 : _a.click();
                },
                disabled: isBusy,
                className: "p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                title: "Attach video",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { className: "h-4 w-4" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: startRecording,
                disabled: isBusy,
                className: "p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                title: "Record audio",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { className: "h-4 w-4" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setShowEmbedInput((v) => !v),
                disabled: isBusy,
                className: "p-1.5 rounded-lg hover:bg-muted transition-colors hover:text-foreground",
                style: {
                  color: showEmbedInput ? "oklch(0.82 0.15 72)" : void 0
                },
                title: "Embed YouTube / X / TikTok",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { className: "h-4 w-4" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ref: imageRef,
                type: "file",
                accept: "image/*",
                className: "hidden",
                onChange: (e) => {
                  var _a;
                  return setPendingMedia(((_a = e.target.files) == null ? void 0 : _a[0]) ?? null);
                }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ref: videoRef,
                type: "file",
                accept: "video/*",
                className: "hidden",
                onChange: (e) => {
                  var _a;
                  return setPendingMedia(((_a = e.target.files) == null ? void 0 : _a[0]) ?? null);
                }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                "data-ocid": "channel.post.submit_button",
                size: "sm",
                onClick: handlePost,
                disabled: isBusy || !postText.trim() && !pendingMedia && !(embedUrl.trim() && detectedPlatform),
                style: {
                  background: "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                  color: "oklch(0.08 0.004 55)"
                },
                className: "rounded-xl text-xs px-4",
                children: isBusy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3 w-3 mr-1.5" }),
                  "Post"
                ] })
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 flex flex-col gap-4", children: postsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-ocid": "channel.view.loading_state", children: [1, 2].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-32 rounded-2xl mb-4" }, i)) }) : sortedPosts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "channel.view.empty_state",
        className: "flex flex-col items-center justify-center py-20 text-center",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 opacity-30",
              style: { background: "oklch(0.76 0.13 72 / 0.2)" },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Send,
                {
                  className: "h-7 w-7",
                  style: { color: "oklch(0.82 0.15 72)" }
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "No posts yet" }),
          isOwner && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground/60 mt-1", children: "Share something with your followers" })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      visiblePosts.map((post, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        ChannelPostCard,
        {
          post,
          authorName: ownerProfile.displayName,
          authorAvatar: ownerProfile.avatarUrl,
          isOwner,
          isPostAuthor: post.author.toString() === currentUserId,
          currentUserId,
          channelId,
          index: idx
        },
        post.id.toString()
      )),
      hasMorePosts && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setPostsPage((p) => p + 1),
          className: "w-full py-3 text-xs font-semibold text-center rounded-xl transition-colors hover:bg-muted/30",
          style: { color: "oklch(0.82 0.15 72)" },
          children: [
            "Load",
            " ",
            Math.min(
              POSTS_PAGE_SIZE,
              sortedPosts.length - postsPage * POSTS_PAGE_SIZE
            ),
            " ",
            "more posts"
          ]
        }
      )
    ] }) }) }),
    isOwner && /* @__PURE__ */ jsxRuntimeExports.jsx(
      EditChannelModal,
      {
        open: editOpen,
        onOpenChange: setEditOpen,
        channelId,
        initialName: channel.name,
        initialDescription: channel.description,
        initialAvatarUrl: channel.avatarUrl,
        initialCategory: channel.category
      }
    )
  ] });
}
export {
  ChannelView as default
};
