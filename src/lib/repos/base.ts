import { ulid } from 'ulid';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  type GetCommandInput,
  type PutCommandInput,
  type UpdateCommandInput,
  type DeleteCommandInput,
  type QueryCommandInput,
  type ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { getDdbClient } from '@/lib/dynamodb';

/** Chronologically-sortable ID — replaces Mongo ObjectId as the default primary/sort key. */
export function generateId(): string {
  return ulid();
}

export async function ddbGet<T = any>(input: GetCommandInput): Promise<T | null> {
  const res = await getDdbClient().send(new GetCommand(input));
  return (res.Item as T) ?? null;
}

export async function ddbPut(input: PutCommandInput) {
  return getDdbClient().send(new PutCommand(input));
}

export async function ddbUpdate<T = any>(input: UpdateCommandInput): Promise<T> {
  const res = await getDdbClient().send(new UpdateCommand({ ReturnValues: 'ALL_NEW', ...input }));
  return res.Attributes as T;
}

export async function ddbDelete(input: DeleteCommandInput) {
  return getDdbClient().send(new DeleteCommand(input));
}

export async function ddbQuery<T = any>(input: QueryCommandInput): Promise<{ items: T[]; lastKey?: Record<string, any> }> {
  const res = await getDdbClient().send(new QueryCommand(input));
  return { items: (res.Items as T[]) ?? [], lastKey: res.LastEvaluatedKey };
}

export async function ddbQueryAll<T = any>(input: QueryCommandInput): Promise<T[]> {
  const items: T[] = [];
  let ExclusiveStartKey: Record<string, any> | undefined;
  do {
    const res = await getDdbClient().send(new QueryCommand({ ...input, ExclusiveStartKey }));
    items.push(...((res.Items as T[]) ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

export async function ddbScan<T = any>(input: ScanCommandInput): Promise<{ items: T[]; lastKey?: Record<string, any> }> {
  const res = await getDdbClient().send(new ScanCommand(input));
  return { items: (res.Items as T[]) ?? [], lastKey: res.LastEvaluatedKey };
}

/** Builds a DynamoDB UpdateExpression/attribute maps from a partial object — skips undefined values. */
export function buildUpdateExpression(fields: Record<string, unknown>) {
  const sets: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const nameKey = `#${key}`;
    const valueKey = `:${key}`;
    sets.push(`${nameKey} = ${valueKey}`);
    names[nameKey] = key;
    values[valueKey] = value;
  }

  return {
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}

/** Opaque pagination cursor — base64 of the DynamoDB LastEvaluatedKey, since page numbers don't exist in DynamoDB. */
export function encodeCursor(lastKey?: Record<string, any>): string | null {
  if (!lastKey) return null;
  return Buffer.from(JSON.stringify(lastKey)).toString('base64');
}

export function decodeCursor(cursor?: string | null): Record<string, any> | undefined {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch {
    return undefined;
  }
}
