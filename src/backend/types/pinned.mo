// Domain-specific types for the "pinned" feature.
// Adds optional pinned references to Conversation and Channel.
import Common "common";

module {
  public type UserId = Common.UserId;
  public type ConversationId = Common.ConversationId;
  public type MessageId = Common.MessageId;
  public type ChannelId = Common.ChannelId;
  public type ChannelPostId = Common.ChannelPostId;

  // Augmented Conversation — adds pinnedMessageId.
  // NOTE: In main.mo the Conversation type must gain this field.
  public type ConversationPinField = {
    pinnedMessageId : ?MessageId;
  };

  // Augmented Channel — adds pinnedPostId.
  // NOTE: In main.mo the Channel type must gain this field.
  public type ChannelPinField = {
    pinnedPostId : ?ChannelPostId;
  };

  // Result type used by pin/unpin operations.
  public type PinResult = { #ok; #err : Text };
};
