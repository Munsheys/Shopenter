import { Tables } from '@/lib/dynamodb';
import { ddbPut, ddbQueryAll, generateId } from './base';

export interface AffiliateCommissionDoc {
  referrerMerchantId: string;
  id: string;
  referredMerchantId: string;
  referralCode: string;
  status: 'pending' | 'converted' | 'earned' | 'reversed' | 'expired';
  createdAt: string;
  expiresAt: string;
  convertedAt?: string | null;
  earnedAt?: string | null;
  rewardAppliedAt?: string | null;
}

const T = Tables.AffiliateCommissions;

export const AffiliateCommissionRepo = {
  async create(data: Omit<AffiliateCommissionDoc, 'id' | 'createdAt'>): Promise<AffiliateCommissionDoc> {
    const doc: AffiliateCommissionDoc = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    await ddbPut({ TableName: T, Item: doc });
    return doc;
  },

  async findByReferrer(referrerMerchantId: string): Promise<AffiliateCommissionDoc[]> {
    return ddbQueryAll<AffiliateCommissionDoc>({
      TableName: T,
      KeyConditionExpression: 'referrerMerchantId = :v',
      ExpressionAttributeValues: { ':v': referrerMerchantId },
    });
  },

  async findByReferred(referredMerchantId: string): Promise<AffiliateCommissionDoc[]> {
    return ddbQueryAll<AffiliateCommissionDoc>({
      TableName: T,
      IndexName: 'referred-index',
      KeyConditionExpression: 'referredMerchantId = :v',
      ExpressionAttributeValues: { ':v': referredMerchantId },
    });
  },
};
