export interface PlayRequest {
  query: string;
  requestedById: string;
  guildId: string;
  voiceChannelId: string | null;
  voiceAdapterCreator: unknown;
}
