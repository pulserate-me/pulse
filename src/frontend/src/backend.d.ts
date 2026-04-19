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
export interface ChannelPost {
    id: ChannelPostId;
    content: ChannelPostContent;
    channelId: ChannelId;
    author: UserId;
    timestamp: Timestamp;
}
export interface ChannelCommentWithProfile {
    id: ChannelCommentId;
    text: string;
    author: UserProfile;
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
    category?: string;
    pinnedPostId?: ChannelPostId;
}
export type StatusId = bigint;
export type UserId = Principal;
export interface StatusInteractions {
    likeCount: bigint;
    viewCount: bigint;
    comments: Array<StatusCommentWithProfile>;
    likedByMe: boolean;
}
export interface ReplyToInfo {
    messageId: MessageId;
    preview: string;
    senderUsername: string;
}
export type NotificationId = bigint;
export type MessageId = bigint;
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
    replyTo?: ReplyToInfo;
    reactions: Array<UserId>;
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
    pinnedMessageId?: MessageId;
}
export interface MessageInput {
    content: MessageContent;
    replyToMessageId?: MessageId;
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
    addMessageReaction(conversationId: ConversationId, messageId: MessageId): Promise<void>;
    addStatus(content: StatusContent): Promise<StatusId>;
    adminClaimGold(amount: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(targetUserId: UserId): Promise<void>;
    commentOnChannelPost(postId: ChannelPostId, text: string): Promise<ChannelCommentId>;
    commentOnStatus(statusId: StatusId, text: string): Promise<CommentId>;
    createChannel(name: string, description: string, avatarUrl: string | null, category: string | null): Promise<ChannelId>;
    createDirectConversation(otherUser: UserId): Promise<ConversationId>;
    createGroupConversation(name: string, members: Array<UserId>, groupAvatarUrl: string | null): Promise<ConversationId>;
    deleteChannel(channelId: ChannelId): Promise<void>;
    deleteChannelPost(postId: ChannelPostId): Promise<void>;
    deleteGroupName(conversationId: ConversationId): Promise<void>;
    deleteHighlight(statusId: StatusId): Promise<void>;
    deleteMessage(conversationId: ConversationId, messageId: MessageId): Promise<void>;
    editChannelPost(postId: ChannelPostId, newContent: ChannelPostContent): Promise<void>;
    editMessage(conversationId: ConversationId, messageId: MessageId, newText: string): Promise<void>;
    followChannel(channelId: ChannelId): Promise<void>;
    forwardChannelPost(postId: ChannelPostId, conversationId: ConversationId): Promise<MessageId>;
    getActiveUsersCount(): Promise<bigint>;
    getAdminTotalClaimed(): Promise<bigint>;
    getAllChannels(): Promise<Array<ChannelWithMeta>>;
    getAllStories(): Promise<Array<[UserProfile, Array<Status>]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChannel(channelId: ChannelId): Promise<ChannelWithMeta | null>;
    getChannelPostInteractions(postId: ChannelPostId): Promise<ChannelPostInteractions>;
    getChannelPosts(channelId: ChannelId): Promise<Array<ChannelPost>>;
    getChannelsByCategory(category: string): Promise<Array<ChannelWithMeta>>;
    getContactStatuses(): Promise<Array<[UserProfile, Array<Status>]>>;
    getConversation(conversationId: ConversationId): Promise<Conversation | null>;
    getGroupAvatars(): Promise<Array<[ConversationId, string]>>;
    getGroupCreators(): Promise<Array<[ConversationId, UserId]>>;
    getHighlights(userId: UserId): Promise<Array<Status>>;
    getMessageReactions(conversationId: ConversationId, messageId: MessageId): Promise<Array<UserId>>;
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
    getStoryViewers(statusId: StatusId): Promise<Array<string>>;
    getStoryViewersList(statusId: StatusId): Promise<Array<string>>;
    getStoryViewersWithAvatars(statusId: StatusId): Promise<Array<{
        username: string;
        avatarUrl?: string;
    }>>;
    getTotalChannelsCreated(): Promise<bigint>;
    getTotalGoldVolume(): Promise<number>;
    getTotalMessagesCount(): Promise<bigint>;
    getTotalStoriesPosted(): Promise<bigint>;
    getTotalUsers(): Promise<bigint>;
    getTypingUsers(convId: ConversationId): Promise<Array<string>>;
    getUnreadCount(conversationId: ConversationId): Promise<bigint>;
    getUserByPrincipal(userId: UserId): Promise<UserProfile | null>;
    getUserChannelsCreated(): Promise<bigint>;
    getUserMessageCount(): Promise<bigint>;
    getUserProfile(userId: UserId): Promise<UserProfile | null>;
    getUserStoriesPosted(): Promise<bigint>;
    getUsersWithGoldAbove(threshold: bigint): Promise<Array<DealerInfo>>;
    isBlockedBy(targetUserId: UserId): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isHighlighted(statusId: StatusId): Promise<boolean>;
    isUserOnline(userId: UserId): Promise<boolean>;
    leaveConversation(conversationId: ConversationId): Promise<void>;
    likeChannelPost(postId: ChannelPostId): Promise<void>;
    likeStatus(statusId: StatusId): Promise<void>;
    listUserConversations(): Promise<Array<Conversation>>;
    markAsRead(conversationId: ConversationId): Promise<void>;
    markMessagesAsRead(conversationId: ConversationId): Promise<void>;
    markNotificationsRead(): Promise<void>;
    /**
     * / Pin a post in a channel.
     * / Only the channel owner may pin.
     */
    pinChannelPost(channelId: ChannelId, postId: ChannelPostId): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Pin a message in a conversation or group.
     * / - Direct conversations: any member may pin.
     * / - Group conversations: only the group owner (creator) may pin.
     */
    pinMessage(conversationId: ConversationId, messageId: MessageId): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    recordStoryView(statusId: StatusId): Promise<void>;
    removeFromHighlights(statusId: StatusId): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    removeGroupMember(conversationId: ConversationId, memberId: UserId): Promise<void>;
    removeMessageReaction(conversationId: ConversationId, messageId: MessageId): Promise<void>;
    requestBuyGold(amount: bigint): Promise<void>;
    requestSellGold(amount: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveToHighlights(statusId: StatusId): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    searchUserByUsername(username: string): Promise<{
        userId: UserId;
        profile: UserProfile;
    } | null>;
    searchUsers(searchQuery: string): Promise<Array<{
        userId: UserId;
        profile: UserProfile;
    }>>;
    sendMessage(conversationId: ConversationId, messageInput: MessageInput): Promise<MessageId>;
    setTypingStatus(convId: ConversationId, isTyping: boolean): Promise<void>;
    transferGold(toUsername: string, amount: bigint): Promise<void>;
    unblockUser(targetUserId: UserId): Promise<void>;
    unfollowChannel(channelId: ChannelId): Promise<void>;
    unlikeChannelPost(postId: ChannelPostId): Promise<void>;
    unlikeStatus(statusId: StatusId): Promise<void>;
    /**
     * / Remove the pinned post from a channel.
     * / Only the channel owner may unpin.
     */
    unpinChannelPost(channelId: ChannelId): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Remove the pinned message from a conversation.
     * / Any conversation member may unpin.
     */
    unpinMessage(conversationId: ConversationId): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateCallerAvatar(avatarUrl: string): Promise<void>;
    updateCallerBio(bio: string): Promise<void>;
    updateCallerDisplayName(displayName: string): Promise<void>;
    updateChannel(channelId: ChannelId, name: string, description: string, avatarUrl: string | null, category: string | null): Promise<void>;
    updateGroupAvatar(conversationId: ConversationId, avatarUrl: string): Promise<void>;
    updateGroupName(conversationId: ConversationId, newName: string): Promise<void>;
    updateLastSeen(): Promise<void>;
}
