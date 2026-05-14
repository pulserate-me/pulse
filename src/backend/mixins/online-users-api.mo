import Time "mo:core/Time";
import Map "mo:core/Map";
import Types "../types/online-users";
import OnlineUsersLib "../lib/online-users";

mixin (users : Map.Map<Types.UserId, { username : Text; displayName : Text; lastSeen : Types.Timestamp; bio : ?Text; avatarUrl : ?Text }>) {
  /// Returns all online users (active within 5 min), excluding the caller,
  /// sorted by most recently active first.
  public query ({ caller }) func getOnlineUsers() : async [Types.OnlineUser] {
    OnlineUsersLib.getOnlineUsers(caller, users.toArray(), Time.now());
  };
};
