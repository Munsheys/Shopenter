import * as line from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_ACCESS_TOKEN!;
const channelSecret = process.env.LINE_CHANNEL_SECRET!;

export const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken
});

export const middleware = line.middleware({
  channelSecret
});
