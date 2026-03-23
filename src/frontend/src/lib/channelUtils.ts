export function markChannelAsViewed(channelId: string): void {
  localStorage.setItem(`channelLastViewed_${channelId}`, Date.now().toString());
}

export function getChannelLastViewed(channelId: string): number {
  const val = localStorage.getItem(`channelLastViewed_${channelId}`);
  return val ? Number.parseInt(val, 10) : 0;
}
