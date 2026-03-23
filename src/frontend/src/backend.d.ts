import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ChannelWithMeta {
    ownerProfile: UserProfile;
    isFollowing: boolean;
    followerCount: bigint;
    channel: Channel;
}
export type Timestamp = bigint;
export interface ChannelPostInteractions {
    likeCount: bigint;
    comments: Array<ChannelCommentWithProfile>;
    likedByMe: boolean;
}
export interface MessageContent {
    text: string;
    mediaUrl?: string;
    mediaType?: MediaType;
}
export type ConversationId = bigint;
export interface ChannelCommentWithProfile {
    id: ChannelCommentId;
    text: string;
    author: UserProfile;
    timestamp: Timestamp;
}
export interface ChannelPost {
    id: ChannelPostId;
    content: ChannelPostContent;
    channelId: ChannelId;
    author: UserId;
    timestamp: Timestamp;
}
export type ChannelPostId = bigint;
export interface ChannelPostContent {
    text: string;
    mediaUrl?: string;
    mediaType?: MediaType;
}
export type ConversationType = {
    __kind__: "group";
    group: string;
} | {
    __kind__: "direct";
    direct: null;
};
export type GoldTxId = bigint;
export interface MessageReadReceipt {
    userId: UserId;
    timestamp: Timestamp;
}
export type MediaType = {
    __kind__: "audio";
    audio: null;
} | {
    __kind__: "other";
    other: string;
} | {
    __kind__: "video";
    video: null;
} | {
    __kind__: "document";
    document: null;
} | {
    __kind__: "image";
    image: null;
};
export interface AppNotification {
    id: NotificationId;
    kind: NotificationKind;
    read: boolean;
    timestamp: Timestamp;
}
export type ChannelCommentId = bigint;
export interface DealerInfo {
    username: string;
    balance: bigint;
    avatarUrl?: string;
}
export type CommentId = bigint;
export interface StatusContent {
    text: string;
    mediaUrl?: string;
    mediaType?: MediaType;
}
export type NotificationKind = {
    __kind__: "goldGifted";
    goldGifted: {
        fromUsername: string;
        amount: bigint;
    };
} | {
    __kind__: "channelPostLiked";
    channelPostLiked: {
        channelId: bigint;
        byUsername: string;
        postId: bigint;
    };
} | {
    __kind__: "channelPostCommented";
    channelPostCommented: {
        channelId: bigint;
        byUsername: string;
        postId: bigint;
    };
} | {
    __kind__: "storyCommented";
    storyCommented: {
        byUsername: string;
        statusId: bigint;
    };
} | {
    __kind__: "storyLiked";
    storyLiked: {
        byUsername: string;
        statusId: bigint;
    };
} | {
    __kind__: "channelFollowed";
    channelFollowed: {
        channelId: bigint;
        byUsername: string;
    };
};
export interface GoldTransaction {
    id: GoldTxId;
    timestamp: Timestamp;
    txType: GoldTxType;
    counterpartyUsername?: string;
    amount: bigint;
}
export type ChannelId = bigint;
export interface Channel {
    id: ChannelId;
    owner: UserId;
    name: string;
    createdAt: Timestamp;
    description: string;
    avatarUrl?: string;
}
export type StatusId = bigint;
export type UserId = Principal;
export interface StatusInteractions {
    likeCount: bigint;
    comments: Array<StatusCommentWithProfile>;
    likedByMe: boolean;
}
export type MessageId = bigint;
export type NotificationId = bigint;
export interface StatusCommentWithProfile {
    id: CommentId;
    text: string;
    author: UserProfile;
    timestamp: Timestamp;
}
export interface Message {
    id: MessageId;
    content: MessageContent;
    readReceipts: Array<MessageReadReceipt>;
    sender: UserId;
    timestamp: Timestamp;
}
export interface Status {
    id: StatusId;
    content: StatusContent;
    author: UserId;
    timestamp: Timestamp;
}
export interface Conversation {
    id: ConversationId;
    lastMessageTimestamp: bigint;
    members: Array<UserId>;
    messages: Array<Message>;
    type: ConversationType;
}
export interface MessageInput {
    content: MessageContent;
}
export interface UserProfile {
    bio?: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    lastSeen: Timestamp;
}
export enum GoldTxType {
    buyRequest = "buyRequest",
    sent = "sent",
    claimed = "claimed",
    received = "received",
    sellRequest = "sellRequest"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addChannelPost(channelId: ChannelId, content: ChannelPostContent): Promise<ChannelPostId>;
    addGroupMember(conversationId: ConversationId, username: string): Promise<void>;
    addStatus(content: StatusContent): Promise<StatusId>;
    adminClaimGold(amount: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(targetUserId: UserId): Promise<void>;
    commentOnChannelPost(postId: ChannelPostId, text: string): Promise<ChannelCommentId>;
    commentOnStatus(statusId: StatusId, text: string): Promise<CommentId>;
    createChannel(name: string, description: string, avatarUrl: string | null): Promise<ChannelId>;
    createDirectConversation(otherUser: UserId): Promise<ConversationId>;
    createGroupConversation(name: string, members: Array<UserId>, groupAvatarUrl: string | null): Promise<ConversationId>;
    deleteChannel(channelId: ChannelId): Promise<void>;
    deleteChannelPost(postId: ChannelPostId): Promise<void>;
    deleteGroupName(conversationId: ConversationId): Promise<void>;
    deleteMessage(conversationId: ConversationId, messageId: MessageId): Promise<void>;
    editChannelPost(postId: ChannelPostId, newContent: ChannelPostContent): Promise<void>;
    editMessage(conversationId: ConversationId, messageId: MessageId, newText: string): Promise<void>;
    followChannel(channelId: ChannelId): Promise<void>;
    forwardChannelPost(postId: ChannelPostId, conversationId: ConversationId): Promise<MessageId>;
    getAdminTotalClaimed(): Promise<bigint>;
    getAllChannels(): Promise<Array<ChannelWithMeta>>;
    getAllStories(): Promise<Array<[UserProfile, Array<Status>]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChannel(channelId: ChannelId): Promise<ChannelWithMeta | null>;
    getChannelPostInteractions(postId: ChannelPostId): Promise<ChannelPostInteractions>;
    getChannelPosts(channelId: ChannelId): Promise<Array<ChannelPost>>;
    getContactStatuses(): Promise<Array<[UserProfile, Array<Status>]>>;
    getConversation(conversationId: ConversationId): Promise<Conversation | null>;
    getGroupAvatars(): Promise<Array<[ConversationId, string]>>;
    getGroupCreators(): Promise<Array<[ConversationId, UserId]>>;
    getMessageReadReceipts(conversationId: ConversationId, messageId: MessageId): Promise<Array<MessageReadReceipt> | null>;
    getMessages(conversationId: ConversationId, offset: bigint, limit: bigint): Promise<Array<Message>>;
    getMyBlockedUsers(): Promise<Array<UserProfile>>;
    getMyConversations(): Promise<Array<Conversation>>;
    getMyGoldBalance(): Promise<bigint>;
    getMyGoldTransactions(): Promise<Array<GoldTransaction>>;
    getMyNotifications(): Promise<Array<AppNotification>>;
    getMyStatuses(): Promise<Array<Status>>;
    getMyTransactionHistory(): Promise<Array<GoldTransaction>>;
    getPaginatedMessages(conversationId: ConversationId, offset: bigint, limit: bigint): Promise<Array<Message>>;
    getStatusInteractions(statusId: StatusId): Promise<StatusInteractions>;
    getUnreadCount(conversationId: ConversationId): Promise<bigint>;
    getUserByPrincipal(userId: UserId): Promise<UserProfile | null>;
    getUserProfile(userId: UserId): Promise<UserProfile | null>;
    getUsersWithGoldAbove(threshold: bigint): Promise<Array<DealerInfo>>;
    isBlockedBy(targetUserId: UserId): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isUserOnline(userId: UserId): Promise<boolean>;
    leaveConversation(conversationId: ConversationId): Promise<void>;
    likeChannelPost(postId: ChannelPostId): Promise<void>;
    likeStatus(statusId: StatusId): Promise<void>;
    listUserConversations(): Promise<Array<Conversation>>;
    markAsRead(conversationId: ConversationId): Promise<void>;
    markMessagesAsRead(conversationId: ConversationId): Promise<void>;
    markNotificationsRead(): Promise<void>;
    removeGroupMember(conversationId: ConversationId, memberId: UserId): Promise<void>;
    requestBuyGold(amount: bigint): Promise<void>;
    requestSellGold(amount: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUserByUsername(username: string): Promise<{
        userId: UserId;
        profile: UserProfile;
    } | null>;
    searchUsers(searchQuery: string): Promise<Array<{
        userId: UserId;
        profile: UserProfile;
    }>>;
    sendMessage(conversationId: ConversationId, messageInput: MessageInput): Promise<MessageId>;
    transferGold(toUsername: string, amount: bigint): Promise<void>;
    unblockUser(targetUserId: UserId): Promise<void>;
    unfollowChannel(channelId: ChannelId): Promise<void>;
    unlikeChannelPost(postId: ChannelPostId): Promise<void>;
    unlikeStatus(statusId: StatusId): Promise<void>;
    updateCallerAvatar(avatarUrl: string): Promise<void>;
    updateCallerBio(bio: string): Promise<void>;
    updateCallerDisplayName(displayName: string): Promise<void>;
    updateChannel(channelId: ChannelId, name: string, description: string, avatarUrl: string | null): Promise<void>;
    updateGroupAvatar(conversationId: ConversationId, avatarUrl: string): Promise<void>;
    updateGroupName(conversationId: ConversationId, newName: string): Promise<void>;
    updateLastSeen(): Promise<void>;
}
