import { useActor } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Conversation,
  ConversationId,
  MediaType,
  Message,
  MessageInput,
  Status,
  StatusContent,
  StatusId,
  UserId,
  UserProfile,
} from "../backend";
import { createActor } from "../backend";

// ─── Shared types (not in backend.d.ts yet) ───────────────────────────────────
export type ChannelId = bigint;
export type ChannelPostId = bigint;
export type ChannelCommentId = bigint;

export interface Channel {
  id: ChannelId;
  name: string;
  description: string;
  avatarUrl?: string;
  owner: UserId;
  createdAt: bigint;
  category?: string;
}

export interface ChannelWithMeta {
  channel: Channel;
  followerCount: bigint;
  isFollowing: boolean;
  ownerProfile: UserProfile;
}

export interface ChannelPostContent {
  text: string;
  mediaUrl?: string;
  mediaType?: MediaType;
}

export interface ChannelPost {
  id: ChannelPostId;
  channelId: ChannelId;
  author: UserId;
  content: ChannelPostContent;
  timestamp: bigint;
}

export interface ChannelCommentWithProfile {
  id: ChannelCommentId;
  text: string;
  author: UserProfile;
  timestamp: bigint;
}

export interface ChannelPostInteractions {
  likeCount: bigint;
  likedByMe: boolean;
  comments: ChannelCommentWithProfile[];
}

// ─── Existing hooks ───────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useListUserConversations() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listUserConversations();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useGetMessages(conversationId: ConversationId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Message[]>({
    queryKey: ["messages", conversationId?.toString()],
    queryFn: async () => {
      if (!actor || conversationId === null) return [];
      return actor.getPaginatedMessages(conversationId, BigInt(0), BigInt(100));
    },
    enabled: !!actor && !isFetching && conversationId !== null,
    refetchInterval: 10000,
  });
}

export function useGetUserProfile(userId: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!actor || !userId) return null;
      try {
        return actor.getUserProfile(Principal.fromText(userId));
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!userId,
    staleTime: 60000,
  });
}

export function useIsUserOnline(userId: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["online", userId],
    queryFn: async () => {
      if (!actor || !userId) return false;
      try {
        return actor.isUserOnline(Principal.fromText(userId));
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching && !!userId,
    refetchInterval: 10000,
  });
}

export function useSearchUserByUsername() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.searchUserByUsername(username);
    },
  });
}

export function useSendMessage() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      messageInput,
    }: {
      conversationId: ConversationId;
      messageInput: MessageInput;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.sendMessage(conversationId, messageInput);
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useEditMessage(conversationId: ConversationId | null) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      newText,
    }: { messageId: bigint; newText: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.editMessage(BigInt(conversationId!), messageId, newText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId?.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteMessage(conversationId: ConversationId | null) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteMessage(BigInt(conversationId!), messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId?.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useCreateDirectConversation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (otherUser: UserId) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createDirectConversation(otherUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useCreateGroupConversation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      members,
      avatarUrl,
    }: {
      name: string;
      members: UserId[];
      avatarUrl?: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createGroupConversation(name, members, avatarUrl ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["groupAvatars"] });
    },
  });
}

export function useMarkMessagesAsRead() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: ConversationId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.markMessagesAsRead(conversationId);
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useUpdateLastSeen() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateLastSeen();
    },
  });
}

export function useAddStatus() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: StatusContent) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addStatus(content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myStatuses"] });
      queryClient.invalidateQueries({ queryKey: ["contactStatuses"] });
      queryClient.invalidateQueries({ queryKey: ["allStories"] });
    },
  });
}

export function useGetMyStatuses() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Status[]>({
    queryKey: ["myStatuses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyStatuses();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetContactStatuses() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Array<[UserProfile, Array<Status>]>>({
    queryKey: ["contactStatuses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getContactStatuses();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetAllStories() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Array<[UserProfile, Array<Status>]>>({
    queryKey: ["allStories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStories();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useUpdateCallerBio() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bio: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateCallerBio(bio);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useUpdateCallerAvatar() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (avatarUrl: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateCallerAvatar(avatarUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useUpdateCallerDisplayName() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (displayName: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateCallerDisplayName(displayName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useLikeStatus() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: StatusId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.likeStatus(statusId);
    },
    onSuccess: (_, statusId) => {
      queryClient.invalidateQueries({
        queryKey: ["statusInteractions", statusId.toString()],
      });
    },
  });
}

export function useUnlikeStatus() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: StatusId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unlikeStatus(statusId);
    },
    onSuccess: (_, statusId) => {
      queryClient.invalidateQueries({
        queryKey: ["statusInteractions", statusId.toString()],
      });
    },
  });
}

export function useCommentOnStatus() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      statusId,
      text,
    }: { statusId: StatusId; text: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.commentOnStatus(statusId, text);
    },
    onSuccess: (_, { statusId }) => {
      queryClient.invalidateQueries({
        queryKey: ["statusInteractions", statusId.toString()],
      });
    },
  });
}

export function useGetStatusInteractions(statusId: StatusId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["statusInteractions", statusId?.toString()],
    queryFn: async () => {
      if (!actor || statusId === null) return null;
      return actor.getStatusInteractions(statusId);
    },
    enabled: !!actor && !isFetching && statusId !== null,
    refetchInterval: 5000,
  });
}

// ─── Channel hooks ────────────────────────────────────────────────────────────

export function useGetAllChannels() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ChannelWithMeta[]>({
    queryKey: ["channels"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllChannels();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

export function useGetChannel(channelId: ChannelId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ChannelWithMeta | null>({
    queryKey: ["channel", channelId?.toString()],
    queryFn: async () => {
      if (!actor || channelId === null) return null;
      return actor.getChannel(channelId);
    },
    enabled: !!actor && !isFetching && channelId !== null,
    refetchInterval: 10000,
  });
}

export function useCreateChannel() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      avatarUrl,
      category,
    }: {
      name: string;
      description: string;
      avatarUrl?: string;
      category?: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createChannel(
        name,
        description,
        avatarUrl ?? null,
        category ?? null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useUpdateChannel() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      channelId,
      name,
      description,
      avatarUrl,
      category,
    }: {
      channelId: ChannelId;
      name: string;
      description: string;
      avatarUrl?: string;
      category?: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateChannel(
        channelId,
        name,
        description,
        avatarUrl ?? null,
        category ?? null,
      );
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({
        queryKey: ["channel", channelId.toString()],
      });
    },
  });
}

export function useGetChannelsByCategory(category: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ChannelWithMeta[]>({
    queryKey: ["channelsByCategory", category],
    queryFn: async () => {
      if (!actor || !category) return [];
      return actor.getChannelsByCategory(category);
    },
    enabled: !!actor && !isFetching && !!category,
    refetchInterval: 15000,
  });
}

export function useFollowChannel() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: ChannelId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.followChannel(channelId);
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({
        queryKey: ["channel", channelId.toString()],
      });
    },
  });
}

export function useUnfollowChannel() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: ChannelId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unfollowChannel(channelId);
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({
        queryKey: ["channel", channelId.toString()],
      });
    },
  });
}

export function useGetChannelPosts(channelId: ChannelId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ChannelPost[]>({
    queryKey: ["channelPosts", channelId?.toString()],
    queryFn: async () => {
      if (!actor || channelId === null) return [];
      return actor.getChannelPosts(channelId);
    },
    enabled: !!actor && !isFetching && channelId !== null,
    refetchInterval: 10000,
  });
}

export function useAddChannelPost(channelId: ChannelId | null) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: ChannelPostContent) => {
      if (!actor || channelId === null) throw new Error("Actor not available");
      return actor.addChannelPost(channelId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["channelPosts", channelId?.toString()],
      });
    },
  });
}

export function useGetChannelPostInteractions(postId: ChannelPostId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ChannelPostInteractions | null>({
    queryKey: ["channelPostInteractions", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === null) return null;
      return actor.getChannelPostInteractions(postId);
    },
    enabled: !!actor && !isFetching && postId !== null,
    refetchInterval: 10000,
  });
}

export function useLikeChannelPost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: ChannelPostId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.likeChannelPost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: ["channelPostInteractions", postId.toString()],
      });
    },
  });
}

export function useUnlikeChannelPost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: ChannelPostId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unlikeChannelPost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: ["channelPostInteractions", postId.toString()],
      });
    },
  });
}

export function useCommentOnChannelPost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      text,
    }: { postId: ChannelPostId; text: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.commentOnChannelPost(postId, text);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: ["channelPostInteractions", postId.toString()],
      });
    },
  });
}

export function useForwardChannelPost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      conversationId,
    }: {
      postId: ChannelPostId;
      conversationId: ConversationId;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.forwardChannelPost(postId, conversationId);
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteChannel() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: ChannelId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteChannel(channelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useDeleteChannelPost(channelId: ChannelId | null) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: ChannelPostId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteChannelPost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["channelPosts", channelId?.toString()],
      });
    },
  });
}

export function useEditChannelPost(channelId: ChannelId | null) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      content,
    }: { postId: ChannelPostId; content: ChannelPostContent }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.editChannelPost(postId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["channelPosts", channelId?.toString()],
      });
    },
  });
}

export function useGetGroupAvatars() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Array<[ConversationId, string]>>({
    queryKey: ["groupAvatars"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGroupAvatars();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useUpdateGroupAvatar() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      avatarUrl,
    }: {
      conversationId: ConversationId;
      avatarUrl: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateGroupAvatar(conversationId, avatarUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["groupAvatars"] });
    },
  });
}

export function useLeaveConversation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: ConversationId) => {
      if (!actor) throw new Error("Actor not available");
      await actor.leaveConversation(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ─── Gold Credit Hooks ────────────────────────────────────────────────────────

import type { GoldTransaction } from "../backend.d";
export type { GoldTransaction };

export function useGetMyGoldBalance() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["goldBalance"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getMyGoldBalance();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useGetMyTransactionHistory() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GoldTransaction[]>({
    queryKey: ["goldTransactions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyTransactionHistory();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useGetAdminTotalClaimed() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["adminTotalClaimed"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getAdminTotalClaimed();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdminClaimGold() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.adminClaimGold(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goldBalance"] });
      queryClient.invalidateQueries({ queryKey: ["goldTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["adminTotalClaimed"] });
    },
  });
}

export function useTransferGold() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      toUsername,
      amount,
    }: { toUsername: string; amount: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.transferGold(toUsername, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goldBalance"] });
      queryClient.invalidateQueries({ queryKey: ["goldTransactions"] });
    },
  });
}

export function useRequestBuyGold() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.requestBuyGold(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goldBalance"] });
      queryClient.invalidateQueries({ queryKey: ["goldTransactions"] });
    },
  });
}

export function useRequestSellGold() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.requestSellGold(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goldBalance"] });
      queryClient.invalidateQueries({ queryKey: ["goldTransactions"] });
    },
  });
}

export function useGetUsersWithGoldAbove(threshold: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["goldDealers", threshold.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUsersWithGoldAbove(threshold);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetMyNotifications() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["myNotifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyNotifications();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

export function useMarkNotificationsRead() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.markNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
    },
  });
}

// ─── Block / Unblock Hooks ────────────────────────────────────────────────────

export function useGetMyBlockedUsers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<UserProfile[]>({
    queryKey: ["blockedUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyBlockedUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBlockUser() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!actor) throw new Error("Actor not available");
      const { Principal } = await import("@icp-sdk/core/principal");
      await actor.blockUser(Principal.fromText(targetUserId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
  });
}

export function useUnblockUser() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!actor) throw new Error("Actor not available");
      const { Principal } = await import("@icp-sdk/core/principal");
      await actor.unblockUser(Principal.fromText(targetUserId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
  });
}

// ─── Group Member Management Hooks ──────────────────────────────────────────

export function useGetGroupCreators() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Array<[ConversationId, UserId]>>({
    queryKey: ["groupCreators"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGroupCreators();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useAddGroupMember() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      username,
    }: {
      conversationId: ConversationId;
      username: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.addGroupMember(conversationId, username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useRemoveGroupMember() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      memberId,
    }: {
      conversationId: ConversationId;
      memberId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const { Principal } = await import("@icp-sdk/core/principal");
      await actor.removeGroupMember(
        conversationId,
        Principal.fromText(memberId),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSearchUsers() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (query: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.searchUsers(query);
    },
  });
}

// ─── Analytics Hooks (public platform + personal user stats) ─────────────────

export function useGetTotalUsersCount() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["analytics", "totalUsers"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getTotalUsers();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetTotalMessagesSent() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["analytics", "messagesSent"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getTotalMessagesCount();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetTotalGoldVolume() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<number>({
    queryKey: ["analytics", "goldVolume"],
    queryFn: async () => {
      if (!actor) return 0;
      return actor.getTotalGoldVolume();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetActiveUsersCount() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["analytics", "activeUsers"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getActiveUsersCount();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetTotalChannelsCreated() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["analytics", "channelsCreated"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getTotalChannelsCreated();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetTotalStoriesPosts() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["analytics", "storiesPosts"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getTotalStoriesPosted();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

// ─── Personal User Analytics Hooks ───────────────────────────────────────────

export function useGetUserMessageCount() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["analytics", "userMessageCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return (
        actor as ReturnType<typeof createActor> & {
          getUserMessageCount: () => Promise<bigint>;
        }
      ).getUserMessageCount();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetUserStoriesPosted() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["analytics", "userStoriesPosted"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return (
        actor as ReturnType<typeof createActor> & {
          getUserStoriesPosted: () => Promise<bigint>;
        }
      ).getUserStoriesPosted();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetUserChannelsCreated() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint>({
    queryKey: ["analytics", "userChannelsCreated"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return (
        actor as ReturnType<typeof createActor> & {
          getUserChannelsCreated: () => Promise<bigint>;
        }
      ).getUserChannelsCreated();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetStoryViewersList(statusId: StatusId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<string[]>({
    queryKey: ["storyViewersList", statusId?.toString()],
    queryFn: async () => {
      if (!actor || statusId === null) return [];
      return (
        actor as ReturnType<typeof createActor> & {
          getStoryViewersList: (id: StatusId) => Promise<string[]>;
        }
      ).getStoryViewersList(statusId);
    },
    enabled: !!actor && !isFetching && statusId !== null,
    staleTime: 15000,
  });
}
