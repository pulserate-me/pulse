import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import VarArray "mo:core/VarArray";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import _Storage "blob-storage/Storage";



actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // Type Definitions
  type UserId = Principal;
  type ConversationId = Nat;
  type MessageId = Nat;
  type StatusId = Nat;
  type CommentId = Nat;
  type ChannelId = Nat;
  type ChannelPostId = Nat;
  type ChannelCommentId = Nat;
  type Timestamp = Int;
  type GoldTxId = Nat;

  public type ConversationType = {
    #direct;
    #group : Text;
  };

  public type MediaType = {
    #image; // JPEG/PNG
    #video; // MP4/webm
    #audio; // MP3
    #document; // PDF, docx, etc.
    #other : Text;
  };

  public type UserProfile = {
    username : Text;
    displayName : Text;
    lastSeen : Timestamp;
    bio : ?Text;
    avatarUrl : ?Text;
  };

  public type MessageContent = {
    text : Text;
    mediaUrl : ?Text;
    mediaType : ?MediaType;
  };

  public type MessageReadReceipt = {
    userId : UserId;
    timestamp : Timestamp;
  };

  public type Message = {
    id : MessageId;
    sender : UserId;
    content : MessageContent;
    timestamp : Timestamp;
    readReceipts : [MessageReadReceipt];
  };

  public type Conversation = {
    id : ConversationId;
    members : [UserId];
    messages : [Message];
    type_ : ConversationType;
    lastMessageTimestamp : Int;
  };

  public type StatusContent = {
    text : Text;
    mediaUrl : ?Text;
    mediaType : ?MediaType;
  };

  public type Status = {
    id : StatusId;
    author : UserId;
    content : StatusContent;
    timestamp : Timestamp;
  };

  public type StatusComment = {
    id : CommentId;
    statusId : StatusId;
    author : UserId;
    text : Text;
    timestamp : Timestamp;
  };

  public type StatusCommentWithProfile = {
    id : CommentId;
    author : UserProfile;
    text : Text;
    timestamp : Timestamp;
  };

  public type StatusInteractions = {
    likeCount : Nat;
    likedByMe : Bool;
    comments : [StatusCommentWithProfile];
  };

  // Channel Types
  public type Channel = {
    id : ChannelId;
    name : Text;
    description : Text;
    avatarUrl : ?Text;
    owner : UserId;
    createdAt : Timestamp;
  };

  public type ChannelPostContent = {
    text : Text;
    mediaUrl : ?Text;
    mediaType : ?MediaType;
  };

  public type ChannelPost = {
    id : ChannelPostId;
    channelId : ChannelId;
    author : UserId;
    content : ChannelPostContent;
    timestamp : Timestamp;
  };

  public type ChannelComment = {
    id : ChannelCommentId;
    postId : ChannelPostId;
    author : UserId;
    text : Text;
    timestamp : Timestamp;
  };

  public type ChannelCommentWithProfile = {
    id : ChannelCommentId;
    author : UserProfile;
    text : Text;
    timestamp : Timestamp;
  };

  public type ChannelPostInteractions = {
    likeCount : Nat;
    likedByMe : Bool;
    comments : [ChannelCommentWithProfile];
  };

  public type ChannelWithMeta = {
    channel : Channel;
    followerCount : Nat;
    isFollowing : Bool;
    ownerProfile : UserProfile;
  };

  // Notification Types
  type NotificationId = Nat;

  public type NotificationKind = {
    #goldGifted : { fromUsername : Text; amount : Nat };
    #storyLiked : { byUsername : Text; statusId : Nat };
    #storyCommented : { byUsername : Text; statusId : Nat };
    #channelPostLiked : { byUsername : Text; postId : Nat; channelId : Nat };
    #channelPostCommented : { byUsername : Text; postId : Nat; channelId : Nat };
    #channelFollowed : { byUsername : Text; channelId : Nat };
  };

  public type AppNotification = {
    id : NotificationId;
    kind : NotificationKind;
    read : Bool;
    timestamp : Timestamp;
  };

  // Gold Credit Types
  public type GoldTxType = {
    #sent;
    #received;
    #claimed;
    #buyRequest;
    #sellRequest;
  };

  public type GoldTransaction = {
    id : GoldTxId;
    txType : GoldTxType;
    amount : Nat;
    counterpartyUsername : ?Text;
    timestamp : Timestamp;
  };

  // Message DTOs
  public type MessageInput = {
    content : MessageContent;
  };

  // State Management
  var nextConversationId : ConversationId = 1;
  var nextMessageId : MessageId = 1;
  var nextStatusId : StatusId = 1;
  var nextCommentId : CommentId = 1;
  var nextChannelId : ChannelId = 1;
  var nextChannelPostId : ChannelPostId = 1;
  var nextChannelCommentId : ChannelCommentId = 1;
  var nextGoldTxId : GoldTxId = 1;
  var nextNotificationId : NotificationId = 1;

  let conversations = Map.empty<ConversationId, Conversation>();
  let users = Map.empty<UserId, UserProfile>();
  let statuses = Map.empty<StatusId, Status>();
  let statusLikes = Map.empty<StatusId, Set.Set<UserId>>();
  let statusComments = Map.empty<CommentId, StatusComment>();

  // Group avatar storage (separate from Conversation to preserve stable compatibility)
  let groupAvatars = Map.empty<ConversationId, Text>();
  let groupCreators = Map.empty<ConversationId, UserId>();

  // Channel state
  let channels = Map.empty<ChannelId, Channel>();
  let channelPosts = Map.empty<ChannelPostId, ChannelPost>();
  let channelFollowers = Map.empty<ChannelId, Set.Set<UserId>>();
  let channelPostLikes = Map.empty<ChannelPostId, Set.Set<UserId>>();
  let channelComments = Map.empty<ChannelCommentId, ChannelComment>();

  // Gold credit state
  let goldBalances = Map.empty<UserId, Nat>();
  let goldTransactions = Map.empty<UserId, List.List<GoldTransaction>>();
  var adminTotalClaimed : Nat = 0;
  let goldMaxClaim : Nat = 999_999_900;
  let adminUsername : Text = "pulse";

  // Stable notifications store
  let notifications = Map.empty<UserId, List.List<AppNotification>>();

  // Block System State
  let blockedUsers = Map.empty<UserId, Set.Set<UserId>>();

  // Internal functions
  func addNotification(userId : UserId, kind : NotificationKind) {
    let notif : AppNotification = {
      id = nextNotificationId;
      kind;
      read = false;
      timestamp = Time.now();
    };
    nextNotificationId += 1;
    let existing = switch (notifications.get(userId)) {
      case (null) { List.empty<AppNotification>() };
      case (?lst) { lst };
    };
    existing.add(notif);
    notifications.add(userId, existing);
  };

  func getConversationOrTrap(conversationId : ConversationId) : Conversation {
    switch (conversations.get(conversationId)) {
      case (null) { Runtime.trap("Conversation not found") };
      case (?conv) { conv };
    };
  };

  func getUserProfileOrTrap(userId : UserId) : UserProfile {
    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) { profile };
    };
  };

  func saveConversation(conversation : Conversation) {
    conversations.add(conversation.id, conversation);
  };

  func isConversationMember(conversationId : ConversationId, userId : UserId) : Bool {
    switch (conversations.get(conversationId)) {
      case (null) { false };
      case (?conv) {
        conv.members.findIndex(func(m) { m == userId }) != null;
      };
    };
  };

  func findUserByUsername(username : Text) : ?(UserId, UserProfile) {
    let uLower = username.toLower();
    users.toArray().find(func((_, p)) { p.username.toLower() == uLower });
  };

  func recordGoldTx(userId : UserId, tx : GoldTransaction) {
    switch (goldTransactions.get(userId)) {
      case (null) {
        let lst = List.empty<GoldTransaction>();
        lst.add(tx);
        goldTransactions.add(userId, lst);
      };
      case (?lst) { lst.add(tx) };
    };
  };

  func hasBlockedCaller(userId : UserId, caller : UserId) : Bool {
    switch (blockedUsers.get(userId)) {
      case (null) { false };
      case (?blocked) { blocked.contains(caller) };
    };
  };

  func hasCallerBlocked(caller : UserId, userId : UserId) : Bool {
    switch (blockedUsers.get(caller)) {
      case (null) { false };
      case (?blocked) { blocked.contains(userId) };
    };
  };

  // Block System Endpoints
  public shared ({ caller }) func blockUser(targetUserId : UserId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can block other users");
    };
    if (caller == targetUserId) {
      Runtime.trap("You cannot block yourself");
    };

    let callerProfile = getUserProfileOrTrap(caller);
    let targetProfile = getUserProfileOrTrap(targetUserId);

    let blocked = switch (blockedUsers.get(caller)) {
      case (null) {
        let newSet = Set.empty<UserId>();
        newSet;
      };
      case (?existing) { existing };
    };
    if (blocked.contains(targetUserId)) {
      Runtime.trap("User is already blocked");
    };
    blocked.add(targetUserId);
    blockedUsers.add(caller, blocked);
  };

  public shared ({ caller }) func unblockUser(targetUserId : UserId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unblock other users");
    };
    let callerProfile = getUserProfileOrTrap(caller);
    let targetProfile = getUserProfileOrTrap(targetUserId);

    switch (blockedUsers.get(caller)) {
      case (null) {
        Runtime.trap("You have not blocked this user");
      };
      case (?blocked) {
        if (not blocked.contains(targetUserId)) {
          Runtime.trap("You have not blocked this user");
        };
        blocked.remove(targetUserId);
        blockedUsers.add(caller, blocked);
      };
    };
  };

  public query ({ caller }) func getMyBlockedUsers() : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view blocked users");
    };
    switch (blockedUsers.get(caller)) {
      case (null) { return [] };
      case (?blocked) {
        let userIds = blocked.toArray();
        let profiles = userIds.filterMap(func(userId) { users.get(userId) });
        profiles;
      };
    };
  };

  public query ({ caller }) func isBlockedBy(targetUserId : UserId) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check block status");
    };
    switch (blockedUsers.get(targetUserId)) {
      case (null) { false };
      case (?blocked) { blocked.contains(caller) };
    };
  };

  // User Endpoints
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    users.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    // Auto-elevate @pulse username to admin role
    if (profile.username == adminUsername) {
      accessControlState.userRoles.add(caller, #admin);
    };
    users.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(userId : UserId) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    users.get(userId);
  };

  public query ({ caller }) func getUserByPrincipal(userId : UserId) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    users.get(userId);
  };

  public shared ({ caller }) func updateLastSeen() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update last seen");
    };
    let now = Time.now();
    let currentUser = getUserProfileOrTrap(caller);
    users.add(
      caller,
      {
        username = currentUser.username;
        displayName = currentUser.displayName;
        lastSeen = now;
        bio = currentUser.bio;
        avatarUrl = currentUser.avatarUrl;
      },
    );
  };

  public shared ({ caller }) func updateCallerBio(bio : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update bio");
    };
    let currentUser = getUserProfileOrTrap(caller);
    users.add(
      caller,
      {
        username = currentUser.username;
        displayName = currentUser.displayName;
        lastSeen = currentUser.lastSeen;
        bio = ?bio;
        avatarUrl = currentUser.avatarUrl;
      },
    );
  };

  public shared ({ caller }) func updateCallerAvatar(avatarUrl : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update avatar");
    };
    let currentUser = getUserProfileOrTrap(caller);
    users.add(
      caller,
      {
        username = currentUser.username;
        displayName = currentUser.displayName;
        lastSeen = currentUser.lastSeen;
        bio = currentUser.bio;
        avatarUrl = ?avatarUrl;
      },
    );
  };

  public shared ({ caller }) func updateCallerDisplayName(displayName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update display name");
    };
    let currentUser = getUserProfileOrTrap(caller);
    users.add(
      caller,
      {
        username = currentUser.username;
        displayName = displayName;
        lastSeen = currentUser.lastSeen;
        bio = currentUser.bio;
        avatarUrl = currentUser.avatarUrl;
      },
    );
  };

  public query ({ caller }) func isUserOnline(userId : UserId) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check online status");
    };
    switch (users.get(userId)) {
      case (null) { false };
      case (?profile) {
        Time.now() - profile.lastSeen < 300_000_000_000;
      };
    };
  };

  public shared ({ caller }) func searchUserByUsername(username : Text) : async ?{ userId : UserId; profile : UserProfile } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search profiles");
    };
    let searchLower = username.toLower();
    let result = users.toArray().find(
      func((userId, profile)) { profile.username.toLower() == searchLower }
    );

    switch (result) {
      case (null) { null };
      case (?entry) {
        let (userId, profile) = entry;
        ?{ userId; profile };
      };
    };
  };

  public query ({ caller }) func searchUsers(searchQuery : Text) : async [{ userId : UserId; profile : UserProfile }] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (searchQuery.size() == 0) { return [] };
    let q = searchQuery.toLower();
    users.toArray().filterMap(func((userId, profile)) : ?{ userId : UserId; profile : UserProfile } {
      let uLower = profile.username.toLower();
      let dLower = profile.displayName.toLower();
      // Simple prefix match or contains via iterating chars
      let matchUser = uLower.size() >= q.size() and Text.fromIter(uLower.chars().take(q.size())) == q;
      let matchDisplay = dLower.size() >= q.size() and Text.fromIter(dLower.chars().take(q.size())) == q;
      if (matchUser or matchDisplay) {
        ?{ userId; profile };
      } else { null };
    });
  };

  // Conversation Endpoints
  public shared ({ caller }) func createDirectConversation(otherUser : UserId) : async ConversationId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create conversations");
    };
    let existing = conversations.values().toArray().find(
      func(conv) {
        switch (conv.type_) {
          case (#group(_)) { false };
          case (#direct) {
            let hasCallerMember = conv.members.findIndex(func(m) { m == caller }) != null;
            let hasOtherMember = conv.members.findIndex(func(m) { m == otherUser }) != null;
            hasCallerMember and hasOtherMember;
          };
        };
      }
    );
    switch (existing) {
      case (?conv) { conv.id };
      case (null) {
        let convId = nextConversationId;
        nextConversationId += 1;
        let conversation = {
          id = convId;
          members = [caller, otherUser];
          messages = [];
          type_ = #direct;
          lastMessageTimestamp = Time.now();
        };
        saveConversation(conversation);
        convId;
      };
    };
  };

  public shared ({ caller }) func createGroupConversation(name : Text, members : [UserId], groupAvatarUrl : ?Text) : async ConversationId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create conversations");
    };

    // Filter out members who have blocked the caller or whom the caller has blocked
    let filteredMembers = members.filter(func(memberId : UserId) : Bool {
      not hasBlockedCaller(memberId, caller) and not hasCallerBlocked(caller, memberId)
    });

    let convId = nextConversationId;
    nextConversationId += 1;
    let conversation = {
      id = convId;
      members = filteredMembers.concat([caller]);
      messages = [];
      type_ = #group(name);
      lastMessageTimestamp = Time.now();
    };
    saveConversation(conversation);
    groupCreators.add(convId, caller);
    switch (groupAvatarUrl) {
      case (null) { () };
      case (?url) { groupAvatars.add(convId, url) };
    };
    convId;
  };

  public query ({ caller }) func getConversation(conversationId : ConversationId) : async ?Conversation {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };
    conversations.get(conversationId);
  };

  public query ({ caller }) func getMyConversations() : async [Conversation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list conversations");
    };
    conversations.values().toArray().filter(
      func(conv) {
        conv.members.findIndex(func(m) { m == caller }) != null;
      }
    );
  };

  public query ({ caller }) func listUserConversations() : async [Conversation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list conversations");
    };
    conversations.values().toArray().filter(
      func(conv) {
        conv.members.findIndex(func(m) { m == caller }) != null;
      }
    );
  };

  // Message Endpoints
  public shared ({ caller }) func sendMessage(conversationId : ConversationId, messageInput : MessageInput) : async MessageId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);

    // Check block for direct conversations
    switch (conversation.type_) {
      case (#direct) {
        // Find the other member
        let otherMember = conversation.members.find(func(m) { m != caller });
        switch (otherMember) {
          case (?other) {
            if (hasBlockedCaller(other, caller)) {
              Runtime.trap("You have been blocked by this user");
            };
          };
          case (null) { () };
        };
      };
      case (#group(_)) { () };
    };

    let message = {
      id = nextMessageId;
      sender = caller;
      content = messageInput.content;
      timestamp = Time.now();
      readReceipts = [{ userId = caller; timestamp = Time.now() }];
    };

    let updatedMessages = conversation.messages.concat([message]);
    let updatedConversation = {
      conversation with
      messages = updatedMessages;
      lastMessageTimestamp = Time.now();
    };
    saveConversation(updatedConversation);

    nextMessageId += 1;
    message.id;
  };

  public shared ({ caller }) func editMessage(conversationId : ConversationId, messageId : MessageId, newText : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit messages");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    var conversation = getConversationOrTrap(conversationId);
    let messageIndex = switch (conversation.messages.findIndex(
      func(msg) { msg.id == messageId }
    )) {
      case (null) { Runtime.trap("Message not found") };
      case (?index) { index };
    };

    let originalMessage = conversation.messages[messageIndex];
    if (originalMessage.sender != caller) {
      Runtime.trap("Only the sender can edit the message");
    };
    let updatedMsg = {
      originalMessage with content = { originalMessage.content with text = newText };
    };
    let messagesArray : [var Message] = conversation.messages.toVarArray();
    messagesArray[messageIndex] := updatedMsg;
    let updatedConversation = { conversation with messages = messagesArray.toArray() };
    saveConversation(updatedConversation);
  };

  public shared ({ caller }) func deleteMessage(conversationId : ConversationId, messageId : MessageId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete messages");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    let messageIndex = switch (conversation.messages.findIndex(
      func(msg) { msg.id == messageId }
    )) {
      case (null) { Runtime.trap("Message not found") };
      case (?index) { index };
    };

    let message = conversation.messages[messageIndex];
    if (caller != message.sender) {
      Runtime.trap("Only the sender can delete the message");
    };

    // Remove the message at messageIndex
    let messages = conversation.messages;
    let before = if (messageIndex == 0) { [] } else { messages.sliceToArray(0, messageIndex) };
    let after = if (messageIndex + 1 >= messages.size()) { [] } else { messages.sliceToArray(messageIndex + 1, messages.size()) };
    let newMessages = before.concat(after);

    let updatedConversation = { conversation with messages = newMessages };
    saveConversation(updatedConversation);
  };

  public query ({ caller }) func getMessages(conversationId : ConversationId, offset : Nat, limit : Nat) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    let msgs = conversation.messages;
    if (offset >= msgs.size()) { return [] };
    let end = Nat.min(offset + limit, msgs.size());
    let varMsgs : [var Message] = msgs.toVarArray();
    varMsgs.sliceToArray(offset, end);
  };

  public query ({ caller }) func getPaginatedMessages(conversationId : ConversationId, offset : Nat, limit : Nat) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    let msgs = conversation.messages;
    if (offset >= msgs.size()) { return [] };
    let end = Nat.min(offset + limit, msgs.size());
    let varMsgs : [var Message] = msgs.toVarArray();
    varMsgs.sliceToArray(offset, end);
  };

  public shared ({ caller }) func markAsRead(conversationId : ConversationId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark messages as read");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    let now = Time.now();

    let updatedMessages = conversation.messages.map(
      func(msg) {
        if (msg.readReceipts.findIndex(func(rr) { rr.userId == caller }) != null) {
          msg;
        } else {
          let newReceipts = msg.readReceipts.concat([{ userId = caller; timestamp = now }]);
          { msg with readReceipts = newReceipts };
        };
      }
    );
    let updatedConversation = { conversation with messages = updatedMessages };
    saveConversation(updatedConversation);
  };

  public shared ({ caller }) func markMessagesAsRead(conversationId : ConversationId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark messages as read");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    let now = Time.now();

    let updatedMessages = conversation.messages.map(
      func(msg) {
        if (msg.readReceipts.findIndex(func(rr) { rr.userId == caller }) != null) {
          msg;
        } else {
          let newReceipts = msg.readReceipts.concat([{ userId = caller; timestamp = now }]);
          { msg with readReceipts = newReceipts };
        };
      }
    );
    let updatedConversation = { conversation with messages = updatedMessages };
    saveConversation(updatedConversation);
  };

  public query ({ caller }) func getUnreadCount(conversationId : ConversationId) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view unread count");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    var count = 0;
    for (msg in conversation.messages.vals()) {
      let hasRead = msg.readReceipts.findIndex(func(rr) { rr.userId == caller }) != null;
      if (not hasRead and msg.sender != caller) {
        count += 1;
      };
    };
    count;
  };

  public query ({ caller }) func getMessageReadReceipts(conversationId : ConversationId, messageId : MessageId) : async ?[MessageReadReceipt] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view read receipts");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    switch (conversation.messages.find(
      func(msg) { msg.id == messageId }
    )) {
      case (null) { null };
      case (?msg) { ?msg.readReceipts };
    };
  };

  public shared ({ caller }) func updateGroupName(conversationId : ConversationId, newName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update group name");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    switch (conversation.type_) {
      case (#direct) {
        Runtime.trap("Cannot update name of direct conversation");
      };
      case (#group(_)) {
        let updatedConversation = {
          conversation with
          type_ = #group(newName);
        };
        saveConversation(updatedConversation);
      };
    };
  };

  public shared ({ caller }) func updateGroupAvatar(conversationId : ConversationId, avatarUrl : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update group avatar");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    switch (conversation.type_) {
      case (#direct) {
        Runtime.trap("Cannot update avatar of direct conversation");
      };
      case (#group(_)) {
        groupAvatars.add(conversationId, avatarUrl);
      };
    };
  };

  public query ({ caller }) func getGroupAvatars() : async [(ConversationId, Text)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    // Return avatars only for conversations the caller is a member of
    let myConvIds = conversations.values().toArray()
      .filter(func(conv) { conv.members.findIndex(func(m) { m == caller }) != null })
      .map(func(conv) { conv.id });
    myConvIds.filterMap(func(id) {
      switch (groupAvatars.get(id)) {
        case (null) { null };
        case (?url) { ?(id, url) };
      };
    });
  };

  public shared ({ caller }) func deleteGroupName(conversationId : ConversationId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete group name");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };

    let conversation = getConversationOrTrap(conversationId);
    switch (conversation.type_) {
      case (#direct) {
        Runtime.trap("Cannot delete name of direct conversation");
      };
      case (#group(_)) {
        let updatedConversation = {
          conversation with
          type_ = #group("");
        };
        saveConversation(updatedConversation);
      };
    };
  };

  func _compareUserId(a : UserId, b : UserId) : Order.Order {
    let aBytes = a.toBlob();
    let bBytes = b.toBlob();
    switch (Nat.compare(aBytes.size(), bBytes.size())) {
      case (#equal) {
        var i = 0;
        while (i < aBytes.size()) {
          switch (Nat.compare(aBytes[i].toNat(), bBytes[i].toNat())) {
            case (#equal) { i += 1 };
            case (other) { return other };
          };
        };
        #equal;
      };
      case (other) { other };
    };
  };

  // Status Endpoints
  public shared ({ caller }) func addStatus(content : StatusContent) : async StatusId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add statuses");
    };
    let statusId = nextStatusId;
    nextStatusId += 1;

    let status = {
      id = statusId;
      author = caller;
      content;
      timestamp = Time.now();
    };
    statuses.add(statusId, status);
    statusId;
  };

  public query ({ caller }) func getMyStatuses() : async [Status] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view statuses");
    };
    let now = Time.now();
    let expiryTime = 72 * 60 * 60 * 1_000_000_000;
    statuses.values().toArray().filter(
      func(status) {
        status.author == caller and (now - status.timestamp) < expiryTime;
      }
    );
  };

  public query ({ caller }) func getContactStatuses() : async [(UserProfile, [Status])] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view contact statuses");
    };

    let directContacts = Set.empty<UserId>();

    conversations.values().toArray().forEach(
      func(conv) {
        switch (conv.type_) {
          case (#direct) {
            if (conv.members.findIndex(func(m) { m == caller }) != null) {
              if (conv.members[0] == caller) {
                directContacts.add(conv.members[1]);
              } else {
                directContacts.add(conv.members[0]);
              };
            };
          };
          case (_) { () };
        };
      }
    );

    let now = Time.now();
    let expiryTime = 72 * 60 * 60 * 1_000_000_000;
    let contactStatuses = directContacts.toArray().map(func(contact) {
      let author = contact;
      let userStatuses = statuses.values().toArray().filter(
        func(status) {
          status.author == author and (now - status.timestamp) < expiryTime;
        }
      );
      let authorProfile = getUserProfileOrTrap(author);
      (authorProfile, userStatuses);
    });

    contactStatuses;
  };

  public query ({ caller }) func getAllStories() : async [(UserProfile, [Status])] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view all stories");
    };

    let now = Time.now();
    let expiryTime = 72 * 60 * 60 * 1_000_000_000;

    let statusesByAuthor = Map.empty<UserId, List.List<Status>>();

    for (status in statuses.values()) {
      if ((now - status.timestamp) < expiryTime) {
        switch (statusesByAuthor.get(status.author)) {
          case (null) {
            let statuses = List.empty<Status>();
            statuses.add(status);
            statusesByAuthor.add(status.author, statuses);
          };
          case (?existing) {
            existing.add(status);
          };
        };
      };
    };

    let resultList = List.empty<(UserProfile, [Status])>();
    for ((authorId, statusList) in statusesByAuthor.entries()) {
      if (statusList.size() > 0) {
        switch (users.get(authorId)) {
          case (?profile) {
            resultList.add((profile, statusList.toArray()));
          };
          case (null) { () };
        };
      };
    };

    resultList.toArray();
  };

  public shared ({ caller }) func likeStatus(statusId : StatusId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like statuses");
    };

    // Check if status author has blocked the caller
    switch (statuses.get(statusId)) {
      case (null) { Runtime.trap("Status not found") };
      case (?status) {
        if (hasBlockedCaller(status.author, caller)) {
          Runtime.trap("Action not permitted");
        };
      };
    };

    switch (statusLikes.get(statusId)) {
      case (null) {
        let likers = Set.empty<UserId>();
        likers.add(caller);
        statusLikes.add(statusId, likers);
      };
      case (?likers) {
        likers.add(caller);
      };
    };
    // Notify story owner
    switch (statuses.get(statusId)) {
      case (?status) {
        if (status.author != caller) {
          let callerProfile = getUserProfileOrTrap(caller);
          addNotification(status.author, #storyLiked { byUsername = callerProfile.username; statusId });
        };
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func unlikeStatus(statusId : StatusId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike statuses");
    };
    switch (statusLikes.get(statusId)) {
      case (null) { () };
      case (?likers) {
        likers.remove(caller);
      };
    };
  };

  public shared ({ caller }) func commentOnStatus(statusId : StatusId, text : Text) : async CommentId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment on statuses");
    };

    // Check if status author has blocked the caller
    switch (statuses.get(statusId)) {
      case (null) { Runtime.trap("Status not found") };
      case (?status) {
        if (hasBlockedCaller(status.author, caller)) {
          Runtime.trap("Action not permitted");
        };
      };
    };

    let commentId = nextCommentId;
    nextCommentId += 1;
    let comment = {
      id = commentId;
      statusId;
      author = caller;
      text;
      timestamp = Time.now();
    };
    statusComments.add(commentId, comment);
    // Notify story owner
    switch (statuses.get(statusId)) {
      case (?status) {
        if (status.author != caller) {
          let callerProfile = getUserProfileOrTrap(caller);
          addNotification(status.author, #storyCommented { byUsername = callerProfile.username; statusId });
        };
      };
      case (null) {};
    };
    commentId;
  };

  public query ({ caller }) func getStatusInteractions(statusId : StatusId) : async StatusInteractions {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view status interactions");
    };
    let likeCount = switch (statusLikes.get(statusId)) {
      case (null) { 0 };
      case (?likers) { likers.size() };
    };
    let likedByMe = switch (statusLikes.get(statusId)) {
      case (null) { false };
      case (?likers) { likers.contains(caller) };
    };
    let comments = statusComments.values().toArray()
      .filter(func(c) { c.statusId == statusId })
      .map(func(c) {
        let authorProfile = switch (users.get(c.author)) {
          case (null) { { username = "unknown"; displayName = "Unknown"; lastSeen = 0; bio = null; avatarUrl = null } };
          case (?p) { p };
        };
        { id = c.id; author = authorProfile; text = c.text; timestamp = c.timestamp };
      });
    { likeCount; likedByMe; comments };
  };

  // ============================================================
  // Channel Endpoints
  // ============================================================

  public shared ({ caller }) func createChannel(name : Text, description : Text, avatarUrl : ?Text) : async ChannelId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create channels");
    };
    let channelId = nextChannelId;
    nextChannelId += 1;
    let channel = {
      id = channelId;
      name;
      description;
      avatarUrl;
      owner = caller;
      createdAt = Time.now();
    };
    channels.add(channelId, channel);
    channelId;
  };

  public shared ({ caller }) func updateChannel(channelId : ChannelId, name : Text, description : Text, avatarUrl : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update channels");
    };
    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?ch) {
        if (ch.owner != caller) { Runtime.trap("Only the channel owner can update it") };
        channels.add(channelId, { ch with name; description; avatarUrl });
      };
    };
  };

  public query ({ caller }) func getAllChannels() : async [ChannelWithMeta] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view channels");
    };
    channels.values().toArray().map(func(ch) {
      let followerCount = switch (channelFollowers.get(ch.id)) {
        case (null) { 0 };
        case (?s) { s.size() };
      };
      let isFollowing = switch (channelFollowers.get(ch.id)) {
        case (null) { false };
        case (?s) { s.contains(caller) };
      };
      let ownerProfile = switch (users.get(ch.owner)) {
        case (null) { { username = "unknown"; displayName = "Unknown"; lastSeen = 0; bio = null; avatarUrl = null } };
        case (?p) { p };
      };
      { channel = ch; followerCount; isFollowing; ownerProfile };
    });
  };

  public query ({ caller }) func getChannel(channelId : ChannelId) : async ?ChannelWithMeta {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view channels");
    };
    switch (channels.get(channelId)) {
      case (null) { null };
      case (?ch) {
        let followerCount = switch (channelFollowers.get(ch.id)) {
          case (null) { 0 };
          case (?s) { s.size() };
        };
        let isFollowing = switch (channelFollowers.get(ch.id)) {
          case (null) { false };
          case (?s) { s.contains(caller) };
        };
        let ownerProfile = switch (users.get(ch.owner)) {
          case (null) { { username = "unknown"; displayName = "Unknown"; lastSeen = 0; bio = null; avatarUrl = null } };
          case (?p) { p };
        };
        ?{ channel = ch; followerCount; isFollowing; ownerProfile };
      };
    };
  };

  public shared ({ caller }) func followChannel(channelId : ChannelId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow channels");
    };
    switch (channelFollowers.get(channelId)) {
      case (null) {
        let s = Set.empty<UserId>();
        s.add(caller);
        channelFollowers.add(channelId, s);
      };
      case (?s) { s.add(caller) };
    };
    // Notify channel owner
    switch (channels.get(channelId)) {
      case (?channel) {
        if (channel.owner != caller) {
          let callerProfile = getUserProfileOrTrap(caller);
          addNotification(channel.owner, #channelFollowed { byUsername = callerProfile.username; channelId });
        };
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func unfollowChannel(channelId : ChannelId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow channels");
    };
    switch (channelFollowers.get(channelId)) {
      case (null) { () };
      case (?s) { s.remove(caller) };
    };
  };

  public shared ({ caller }) func addChannelPost(channelId : ChannelId, content : ChannelPostContent) : async ChannelPostId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can post to channels");
    };
    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?ch) {
        if (ch.owner != caller) { Runtime.trap("Only the channel owner can post") };
      };
    };
    let postId = nextChannelPostId;
    nextChannelPostId += 1;
    let post = {
      id = postId;
      channelId;
      author = caller;
      content;
      timestamp = Time.now();
    };
    channelPosts.add(postId, post);
    postId;
  };

  public shared ({ caller }) func editChannelPost(postId : ChannelPostId, newContent : ChannelPostContent) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (channelPosts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (post.author != caller) { Runtime.trap("Only the post author can edit") };
        let updated = { id = post.id; channelId = post.channelId; author = post.author; content = newContent; timestamp = post.timestamp };
        channelPosts.add(postId, updated);
      };
    };
  };

  public shared ({ caller }) func deleteChannelPost(postId : ChannelPostId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (channelPosts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (post.author != caller) { Runtime.trap("Only the post author can delete") };
        channelPosts.remove(postId);
      };
    };
  };

  public query ({ caller }) func getChannelPosts(channelId : ChannelId) : async [ChannelPost] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view channel posts");
    };
    channelPosts.values().toArray().filter(func(p) { p.channelId == channelId });
  };

  public shared ({ caller }) func likeChannelPost(postId : ChannelPostId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };

    // Check if post author has blocked the caller
    switch (channelPosts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (hasBlockedCaller(post.author, caller)) {
          Runtime.trap("Action not permitted");
        };
      };
    };

    switch (channelPostLikes.get(postId)) {
      case (null) {
        let s = Set.empty<UserId>();
        s.add(caller);
        channelPostLikes.add(postId, s);
      };
      case (?s) { s.add(caller) };
    };
    // Notify post author
    switch (channelPosts.get(postId)) {
      case (?post) {
        if (post.author != caller) {
          let callerProfile = getUserProfileOrTrap(caller);
          addNotification(post.author, #channelPostLiked { byUsername = callerProfile.username; postId; channelId = post.channelId });
        };
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func unlikeChannelPost(postId : ChannelPostId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike posts");
    };
    switch (channelPostLikes.get(postId)) {
      case (null) { () };
      case (?s) { s.remove(caller) };
    };
  };

  public shared ({ caller }) func commentOnChannelPost(postId : ChannelPostId, text : Text) : async ChannelCommentId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment on posts");
    };

    // Check if post author has blocked the caller
    switch (channelPosts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (hasBlockedCaller(post.author, caller)) {
          Runtime.trap("Action not permitted");
        };
      };
    };

    let commentId = nextChannelCommentId;
    nextChannelCommentId += 1;
    channelComments.add(commentId, { id = commentId; postId; author = caller; text; timestamp = Time.now() });
    // Notify post author
    switch (channelPosts.get(postId)) {
      case (?post) {
        if (post.author != caller) {
          let callerProfile = getUserProfileOrTrap(caller);
          addNotification(post.author, #channelPostCommented { byUsername = callerProfile.username; postId; channelId = post.channelId });
        };
      };
      case (null) {};
    };
    commentId;
  };

  public query ({ caller }) func getChannelPostInteractions(postId : ChannelPostId) : async ChannelPostInteractions {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view post interactions");
    };
    let likeCount = switch (channelPostLikes.get(postId)) {
      case (null) { 0 };
      case (?s) { s.size() };
    };
    let likedByMe = switch (channelPostLikes.get(postId)) {
      case (null) { false };
      case (?s) { s.contains(caller) };
    };
    let comments = channelComments.values().toArray()
      .filter(func(c) { c.postId == postId })
      .map(func(c) {
        let authorProfile = switch (users.get(c.author)) {
          case (null) { { username = "unknown"; displayName = "Unknown"; lastSeen = 0; bio = null; avatarUrl = null } };
          case (?p) { p };
        };
        { id = c.id; author = authorProfile; text = c.text; timestamp = c.timestamp };
      });
    { likeCount; likedByMe; comments };
  };

  public shared ({ caller }) func forwardChannelPost(postId : ChannelPostId, conversationId : ConversationId) : async MessageId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this conversation");
    };
    let post = switch (channelPosts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?p) { p };
    };
    let message = {
      id = nextMessageId;
      sender = caller;
      content = {
        text = post.content.text;
        mediaUrl = post.content.mediaUrl;
        mediaType = post.content.mediaType;
      };
      timestamp = Time.now();
      readReceipts = [{ userId = caller; timestamp = Time.now() }];
    };
    let conversation = getConversationOrTrap(conversationId);
    saveConversation({ conversation with messages = conversation.messages.concat([message]); lastMessageTimestamp = Time.now() });
    nextMessageId += 1;
    message.id;
  };

  public shared ({ caller }) func deleteChannel(channelId : ChannelId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete channels");
    };
    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?ch) {
        if (ch.owner != caller) { Runtime.trap("Only the channel owner can delete it") };
        channels.remove(channelId);
        channelFollowers.remove(channelId);
        let postsToDelete = channelPosts.values().toArray().filter(func(p) { p.channelId == channelId });
        for (post in postsToDelete.vals()) {
          channelPostLikes.remove(post.id);
          let commentsToDelete = channelComments.values().toArray().filter(func(c) { c.postId == post.id });
          for (comment in commentsToDelete.vals()) {
            channelComments.remove(comment.id);
          };
          channelPosts.remove(post.id);
        };
      };
    };
  };

  public shared ({ caller }) func leaveConversation(conversationId : ConversationId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can leave conversations");
    };
    let conversation = getConversationOrTrap(conversationId);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("You are not a member of this conversation");
    };
    let newMembers = conversation.members.filter(func(m) { m != caller });
    if (newMembers.size() == 0) {
      conversations.remove(conversationId);
    } else {
      saveConversation({ conversation with members = newMembers });
    };
  };

  public query ({ caller }) func getGroupCreators() : async [(ConversationId, UserId)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let myConvIds = conversations.values().toArray()
      .filter(func(conv) { conv.members.findIndex(func(m) { m == caller }) != null })
      .map(func(conv) { conv.id });
    myConvIds.filterMap(func(id) {
      switch (groupCreators.get(id)) {
        case (null) { null };
        case (?creator) { ?(id, creator) };
      };
    });
  };

  public shared ({ caller }) func addGroupMember(conversationId : ConversationId, username : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (groupCreators.get(conversationId)) {
      case (null) { Runtime.trap("Not a group or no creator recorded") };
      case (?creator) {
        if (creator != caller) { Runtime.trap("Only the group owner can add members") };
      };
    };
    let targetId = switch (users.toArray().find(func((_, p)) { p.username == username })) {
      case (null) { Runtime.trap("User not found") };
      case (?(id, _)) { id };
    };
    if (hasBlockedCaller(targetId, caller) or hasCallerBlocked(caller, targetId)) {
      Runtime.trap("Cannot add blocked user");
    };
    let conversation = getConversationOrTrap(conversationId);
    if (conversation.members.findIndex(func(m : UserId) : Bool { m == targetId }) != null) {
      Runtime.trap("User is already a member");
    };
    saveConversation({ conversation with members = conversation.members.concat([targetId]) });
  };

  public shared ({ caller }) func removeGroupMember(conversationId : ConversationId, memberId : UserId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (groupCreators.get(conversationId)) {
      case (null) { Runtime.trap("Not a group or no creator recorded") };
      case (?creator) {
        if (creator != caller) { Runtime.trap("Only the group owner can remove members") };
        if (memberId == caller) { Runtime.trap("Owner cannot remove themselves") };
      };
    };
    let conversation = getConversationOrTrap(conversationId);
    let newMembers = conversation.members.filter(func(m) { m != memberId });
    saveConversation({ conversation with members = newMembers });
  };

  // ============================================================
  // Gold Credit Endpoints
  // ============================================================

  public query ({ caller }) func getMyGoldBalance() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (goldBalances.get(caller)) {
      case (null) { 0 };
      case (?bal) { bal };
    };
  };

  public query ({ caller }) func getMyTransactionHistory() : async [GoldTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (goldTransactions.get(caller)) {
      case (null) { [] };
      case (?lst) { lst.toArray() };
    };
  };

  // Admin-only: claim Gold into admin balance (max 9,999,999 total)
  public shared ({ caller }) func adminClaimGold(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin only");
    };
    if (adminTotalClaimed + amount > goldMaxClaim) {
      Runtime.trap("Exceeds maximum claimable Gold of 9,999,999");
    };
    adminTotalClaimed += amount;
    let current = switch (goldBalances.get(caller)) {
      case (null) { 0 };
      case (?b) { b };
    };
    goldBalances.add(caller, current + amount);
    let txId = nextGoldTxId;
    nextGoldTxId += 1;
    recordGoldTx(caller, { id = txId; txType = #claimed; amount; counterpartyUsername = null; timestamp = Time.now() });
  };

  // Transfer Gold from caller to another user by username (automatic, no approval)
  // 5% platform fee is deducted from recipient's received amount and distributed to all holders
  public shared ({ caller }) func transferGold(toUsername : Text, amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (amount == 0) { Runtime.trap("Amount must be greater than 0") };
    let callerBalance = switch (goldBalances.get(caller)) {
      case (null) { 0 };
      case (?b) { b };
    };
    if (callerBalance < amount) { Runtime.trap("Insufficient Gold balance") };
    let (recipientId, recipientProfile) = switch (findUserByUsername(toUsername)) {
      case (null) { Runtime.trap("User not found: " # toUsername) };
      case (?entry) { entry };
    };
    if (recipientId == caller) { Runtime.trap("Cannot transfer Gold to yourself") };
    let callerProfile = getUserProfileOrTrap(caller);
    // Calculate 5% platform fee from the transfer amount (taken from recipient side)
    let feeAmount : Nat = amount * 5 / 100;
    let recipientReceives : Nat = if (amount >= feeAmount) { amount - feeAmount } else { 0 };
    // Deduct from sender
    let newCallerBalance : Nat = if (callerBalance >= amount) { callerBalance - amount } else { 0 };
    goldBalances.add(caller, newCallerBalance);
    // Add to recipient (after fee)
    let recipientBalance = switch (goldBalances.get(recipientId)) {
      case (null) { 0 };
      case (?b) { b };
    };
    goldBalances.add(recipientId, recipientBalance + recipientReceives);
    let now = Time.now();
    // Record sender transaction (full amount sent)
    let sentTxId = nextGoldTxId;
    nextGoldTxId += 1;
    recordGoldTx(caller, { id = sentTxId; txType = #sent; amount; counterpartyUsername = ?recipientProfile.username; timestamp = now });
    // Record recipient transaction (amount after fee)
    let recvTxId = nextGoldTxId;
    nextGoldTxId += 1;
    recordGoldTx(recipientId, { id = recvTxId; txType = #received; amount = recipientReceives; counterpartyUsername = ?callerProfile.username; timestamp = now });
    // Notify recipient of gold gift
    addNotification(recipientId, #goldGifted { fromUsername = callerProfile.username; amount = recipientReceives });
    // Distribute fee proportionally to all gold holders (if fee > 0)
    if (feeAmount > 0) {
      // Calculate total supply currently held
      let allHolders = goldBalances.toArray();
      let totalSupply = allHolders.foldLeft(0 : Nat, func(acc, (_, bal)) { acc + bal });
      if (totalSupply > 0) {
        var distributed : Nat = 0;
        for ((holderId, holderBal) in allHolders.vals()) {
          if (holderBal > 0) {
            let share = feeAmount * holderBal / totalSupply;
            if (share > 0) {
              let currentBal = switch (goldBalances.get(holderId)) {
                case (null) { 0 };
                case (?b) { b };
              };
              goldBalances.add(holderId, currentBal + share);
              distributed += share;
              // Record fee distribution transaction
              let feeTxId = nextGoldTxId;
              nextGoldTxId += 1;
              recordGoldTx(holderId, { id = feeTxId; txType = #received; amount = share; counterpartyUsername = ?"platform fee"; timestamp = now });
            };
          };
        };
      };
    };
  };

  // Send a buy request message to admin (no balance change)
  public shared ({ caller }) func requestBuyGold(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (amount == 0) { Runtime.trap("Amount must be greater than 0") };
    let callerProfile = getUserProfileOrTrap(caller);
    // Find admin user
    let adminEntry = findUserByUsername(adminUsername);
    switch (adminEntry) {
      case (null) { Runtime.trap("Admin not found") };
      case (?(adminId, _)) {
        // Ensure conversation with admin exists
        let existing = conversations.values().toArray().find(
          func(conv) {
            switch (conv.type_) {
              case (#group(_)) { false };
              case (#direct) {
                let hasCallerMember = conv.members.findIndex(func(m) { m == caller }) != null;
                let hasAdminMember = conv.members.findIndex(func(m) { m == adminId }) != null;
                hasCallerMember and hasAdminMember;
              };
            };
          }
        );
        let convId = switch (existing) {
          case (?conv) { conv.id };
          case (null) {
            let id = nextConversationId;
            nextConversationId += 1;
            saveConversation({ id; members = [caller, adminId]; messages = []; type_ = #direct; lastMessageTimestamp = Time.now() });
            id;
          };
        };
        let msgText = "[Gold Request] @" # callerProfile.username # " wants to BUY " # amount.toText() # " Gold";
        let msg = {
          id = nextMessageId;
          sender = caller;
          content = { text = msgText; mediaUrl = null; mediaType = null };
          timestamp = Time.now();
          readReceipts = [{ userId = caller; timestamp = Time.now() }];
        };
        nextMessageId += 1;
        let conv = getConversationOrTrap(convId);
        saveConversation({ conv with messages = conv.messages.concat([msg]); lastMessageTimestamp = Time.now() });
        // Record buy request transaction
        let txId = nextGoldTxId;
        nextGoldTxId += 1;
        recordGoldTx(caller, { id = txId; txType = #buyRequest; amount; counterpartyUsername = ?adminUsername; timestamp = Time.now() });
      };
    };
  };

  // Send a sell request message to admin (no balance change)
  public shared ({ caller }) func requestSellGold(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (amount == 0) { Runtime.trap("Amount must be greater than 0") };
    let callerProfile = getUserProfileOrTrap(caller);
    let adminEntry = findUserByUsername(adminUsername);
    switch (adminEntry) {
      case (null) { Runtime.trap("Admin not found") };
      case (?(adminId, _)) {
        let existing = conversations.values().toArray().find(
          func(conv) {
            switch (conv.type_) {
              case (#group(_)) { false };
              case (#direct) {
                let hasCallerMember = conv.members.findIndex(func(m) { m == caller }) != null;
                let hasAdminMember = conv.members.findIndex(func(m) { m == adminId }) != null;
                hasCallerMember and hasAdminMember;
              };
            };
          }
        );
        let convId = switch (existing) {
          case (?conv) { conv.id };
          case (null) {
            let id = nextConversationId;
            nextConversationId += 1;
            saveConversation({ id; members = [caller, adminId]; messages = []; type_ = #direct; lastMessageTimestamp = Time.now() });
            id;
          };
        };
        let msgText = "[Gold Request] @" # callerProfile.username # " wants to SELL " # amount.toText() # " Gold";
        let msg = {
          id = nextMessageId;
          sender = caller;
          content = { text = msgText; mediaUrl = null; mediaType = null };
          timestamp = Time.now();
          readReceipts = [{ userId = caller; timestamp = Time.now() }];
        };
        nextMessageId += 1;
        let conv = getConversationOrTrap(convId);
        saveConversation({ conv with messages = conv.messages.concat([msg]); lastMessageTimestamp = Time.now() });
        let txId = nextGoldTxId;
        nextGoldTxId += 1;
        recordGoldTx(caller, { id = txId; txType = #sellRequest; amount; counterpartyUsername = ?adminUsername; timestamp = Time.now() });
      };
    };
  };

  public query ({ caller }) func getAdminTotalClaimed() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    adminTotalClaimed;
  };
  public type DealerInfo = {
    username : Text;
    balance : Nat;
    avatarUrl : ?Text;
  };

  public query ({ caller }) func getUsersWithGoldAbove(threshold : Nat) : async [DealerInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    goldBalances.toArray().filterMap(func((userId, bal)) : ?DealerInfo {
      if (bal >= threshold) {
        switch (users.get(userId)) {
          case (null) { null };
          case (?profile) { ?{ username = profile.username; balance = bal; avatarUrl = profile.avatarUrl } };
        };
      } else { null };
    });
  };

  public query ({ caller }) func getMyNotifications() : async [AppNotification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (notifications.get(caller)) {
      case (null) { [] };
      case (?lst) { lst.toArray() };
    };
  };

  public shared ({ caller }) func markNotificationsRead() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (notifications.get(caller)) {
      case (null) { () };
      case (?lst) {
        let readList = List.empty<AppNotification>();
        for (n in lst.toArray().vals()) {
          readList.add({ id = n.id; kind = n.kind; read = true; timestamp = n.timestamp });
        };
        notifications.add(caller, readList);
      };
    };
  };

  public query ({ caller }) func getMyGoldTransactions() : async [GoldTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (goldTransactions.get(caller)) {
      case (null) { [] };
      case (?lst) { lst.toArray() };
    };
  };
};
