export interface PlatformAdapter {
  /** Send a plain text message to a user */
  sendMessage(token: string, userId: string, text: string): Promise<boolean>;
  /** Send a rich/card message (flex for LINE, template for Instagram, etc.) */
  sendRichMessage(token: string, userId: string, altText: string, content: object): Promise<boolean>;
}

export type Platform = 'line' | 'instagram';
