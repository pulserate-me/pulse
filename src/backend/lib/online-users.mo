import Array "mo:core/Array";
import Int "mo:core/Int";
import Types "../types/online-users";

module {
  let onlineThresholdNs : Int = 300_000_000_000; // 300 seconds in nanoseconds

  /// Returns users active within the last 300 seconds (5 min),
  /// excluding `callerUserId`, sorted by most recently active first.
  public func getOnlineUsers(
    callerUserId : Types.UserId,
    allUsers : [(Types.UserId, { username : Text; displayName : Text; lastSeen : Types.Timestamp; bio : ?Text; avatarUrl : ?Text })],
    now : Types.Timestamp,
  ) : [Types.OnlineUser] {
    let online = allUsers.filterMap(func((uid, profile)) : ?Types.OnlineUser {
      if (uid == callerUserId) { return null };
      if (now - profile.lastSeen > onlineThresholdNs) { return null };
      ?{
        userId = uid;
        username = profile.username;
        displayName = profile.displayName;
        avatarUrl = profile.avatarUrl;
        lastSeen = profile.lastSeen;
      };
    });
    // Sort by most recently active first (descending lastSeen)
    online.sort(func(a : Types.OnlineUser, b : Types.OnlineUser) : { #less; #equal; #greater } {
      Int.compare(b.lastSeen, a.lastSeen);
    });
  };
};
