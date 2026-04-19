// Public API mixin for pinned messages and pinned channel posts.
//
// Injected state (passed by main.mo):
//   conversations : Map<ConversationId, Conversation>
//   channels      : Map<ChannelId, Channel>
//   groupCreators : Map<ConversationId, UserId>
//
// All function bodies are stubs — develop mode will implement them.
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  public type UserId = Principal.Principal;
  public type ConversationId = Nat;
  public type MessageId = Nat;
  public type ChannelId = Nat;
  public type ChannelPostId = Nat;

  // ── Mixin definition (injected at actor composition time) ──

  // NOTE: This mixin does not use the `mixin` keyword because main.mo is a
  // monolithic actor. The four public functions below are meant to be added
  // directly to main.mo during the develop phase.
  //
  // Stub signatures — each body traps with "not implemented":

  /// Pin a message in a conversation or group.
  /// - DMs: any member may pin.
  /// - Groups: only the group owner may pin.
  public func pinMessage_stub(
    caller : UserId,
    conversationId : ConversationId,
    messageId : MessageId,
  ) : async { #ok; #err : Text } {
    Runtime.trap("not implemented");
  };

  /// Remove the pinned message from a conversation.
  /// Any conversation member may unpin.
  public func unpinMessage_stub(
    caller : UserId,
    conversationId : ConversationId,
  ) : async { #ok; #err : Text } {
    Runtime.trap("not implemented");
  };

  /// Pin a post in a channel.
  /// Only the channel owner may pin.
  public func pinChannelPost_stub(
    caller : UserId,
    channelId : ChannelId,
    postId : ChannelPostId,
  ) : async { #ok; #err : Text } {
    Runtime.trap("not implemented");
  };

  /// Remove the pinned post from a channel.
  /// Only the channel owner may unpin.
  public func unpinChannelPost_stub(
    caller : UserId,
    channelId : ChannelId,
  ) : async { #ok; #err : Text } {
    Runtime.trap("not implemented");
  };
};
