import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Platform } from '../types';

// DynamoDB Client Configuration
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Document Client for easier JSON operations
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
  },
});

// Table Names
export const TABLES = {
  USERS: 'samvaad_users',
  CONTENT: 'samvaad_content',
  ENGAGEMENT_SCORES: 'samvaad_engagement_scores',
  PUBLISHING_HISTORY: 'samvaad_publishing_history',
  SCHEDULED_POSTS: 'samvaad_scheduled_posts',
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface User {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    defaultPlatform?: Platform;
    language?: string;
    timezone?: string;
  };
}

export interface Content {
  contentId: string;
  userId: string;
  prompt: string;
  platform: Platform;
  variants: ContentVariant[];
  selectedVariantId?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'published';
  createdAt: string;
  updatedAt: string;
  metadata?: {
    culturalContext?: string;
    targetAudience?: string;
    hashtags?: string[];
  };
}

export interface ContentVariant {
  variantId: string;
  content: string;
  hashtags: string[];
  engagementScore?: number;
  isSelected?: boolean;
}

export interface EngagementScore {
  scoreId: string;
  contentId: string;
  userId: string;
  platform: Platform;
  score: number;
  confidence: number;
  factors: {
    timing: number;
    hashtags: number;
    contentQuality: number;
    culturalRelevance: number;
  };
  recommendations: string[];
  createdAt: string;
}

export interface PublishingHistory {
  historyId: string;
  contentId: string;
  userId: string;
  platform: Platform;
  publishedAt: string;
  status: 'success' | 'failed' | 'scheduled';
  metrics?: {
    reach?: number;
    impressions?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  errorMessage?: string;
}

export interface ScheduledPost {
  scheduleId: string;
  contentId: string;
  userId: string;
  platform: Platform;
  scheduledFor: string;
  timezone: string;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// TABLE CREATION (For Initial Setup)
// =============================================================================

const tableDefinitions = {
  [TABLES.USERS]: {
    TableName: TABLES.USERS,
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' as const }],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'email', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' as const }],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  [TABLES.CONTENT]: {
    TableName: TABLES.CONTENT,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' as const },
      { AttributeName: 'contentId', KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'contentId', AttributeType: 'S' as const },
      { AttributeName: 'status', AttributeType: 'S' as const },
      { AttributeName: 'createdAt', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'status-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' as const },
          { AttributeName: 'status', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'createdAt-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' as const },
          { AttributeName: 'createdAt', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  [TABLES.ENGAGEMENT_SCORES]: {
    TableName: TABLES.ENGAGEMENT_SCORES,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' as const },
      { AttributeName: 'scoreId', KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'scoreId', AttributeType: 'S' as const },
      { AttributeName: 'contentId', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'contentId-index',
        KeySchema: [{ AttributeName: 'contentId', KeyType: 'HASH' as const }],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  [TABLES.PUBLISHING_HISTORY]: {
    TableName: TABLES.PUBLISHING_HISTORY,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' as const },
      { AttributeName: 'historyId', KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'historyId', AttributeType: 'S' as const },
      { AttributeName: 'publishedAt', AttributeType: 'S' as const },
      { AttributeName: 'platform', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'publishedAt-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' as const },
          { AttributeName: 'publishedAt', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'platform-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' as const },
          { AttributeName: 'platform', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  [TABLES.SCHEDULED_POSTS]: {
    TableName: TABLES.SCHEDULED_POSTS,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' as const },
      { AttributeName: 'scheduleId', KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'scheduleId', AttributeType: 'S' as const },
      { AttributeName: 'scheduledFor', AttributeType: 'S' as const },
      { AttributeName: 'status', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'scheduledFor-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' as const },
          { AttributeName: 'scheduledFor', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'status-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' as const },
          { AttributeName: 'status', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
};

export async function initializeTables(): Promise<void> {
  for (const [tableName, definition] of Object.entries(tableDefinitions)) {
    try {
      await client.send(new DescribeTableCommand({ TableName: tableName }));
      console.log(`Table ${tableName} already exists`);
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        console.log(`Creating table ${tableName}...`);
        await client.send(new CreateTableCommand(definition));
        console.log(`Table ${tableName} created successfully`);
      } else {
        throw error;
      }
    }
  }
}

// =============================================================================
// USER OPERATIONS
// =============================================================================

export async function createUser(user: User): Promise<User> {
  await docClient.send(
    new PutCommand({
      TableName: TABLES.USERS,
      Item: user,
    })
  );
  return user;
}

export async function getUser(userId: string): Promise<User | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.USERS,
      Key: { userId },
    })
  );
  return (result.Item as User) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    })
  );
  return result.Items?.[0] as User || null;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'userId' && value !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  if (updateExpressions.length === 0) return null;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes as User;
}

// =============================================================================
// CONTENT OPERATIONS
// =============================================================================

export async function createContent(content: Content): Promise<Content> {
  await docClient.send(
    new PutCommand({
      TableName: TABLES.CONTENT,
      Item: content,
    })
  );
  return content;
}

export async function getContent(userId: string, contentId: string): Promise<Content | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.CONTENT,
      Key: { userId, contentId },
    })
  );
  return (result.Item as Content) || null;
}

export async function getUserContent(
  userId: string,
  options?: {
    status?: string;
    limit?: number;
    startKey?: Record<string, unknown>;
  }
): Promise<{ items: Content[]; lastKey?: Record<string, unknown> }> {
  const params: {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, unknown>;
    Limit?: number;
    ExclusiveStartKey?: Record<string, unknown>;
    ScanIndexForward: boolean;
    IndexName?: string;
    FilterExpression?: string;
  } = {
    TableName: TABLES.CONTENT,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false, // Newest first
  };

  if (options?.status) {
    params.IndexName = 'status-index';
    params.KeyConditionExpression = 'userId = :userId AND #status = :status';
    params.ExpressionAttributeValues[':status'] = options.status;
  }

  if (options?.limit) {
    params.Limit = options.limit;
  }

  if (options?.startKey) {
    params.ExclusiveStartKey = options.startKey;
  }

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: (result.Items as Content[]) || [],
    lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

export async function updateContent(
  userId: string,
  contentId: string,
  updates: Partial<Content>
): Promise<Content | null> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'userId' && key !== 'contentId' && value !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  if (updateExpressions.length === 0) return null;

  // Always update the updatedAt timestamp
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLES.CONTENT,
      Key: { userId, contentId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes as Content;
}

export async function deleteContent(userId: string, contentId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLES.CONTENT,
      Key: { userId, contentId },
    })
  );
}

// =============================================================================
// ENGAGEMENT SCORE OPERATIONS
// =============================================================================

export async function createEngagementScore(score: EngagementScore): Promise<EngagementScore> {
  await docClient.send(
    new PutCommand({
      TableName: TABLES.ENGAGEMENT_SCORES,
      Item: score,
    })
  );
  return score;
}

export async function getEngagementScore(userId: string, scoreId: string): Promise<EngagementScore | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.ENGAGEMENT_SCORES,
      Key: { userId, scoreId },
    })
  );
  return (result.Item as EngagementScore) || null;
}

export async function getEngagementScoresByContent(contentId: string): Promise<EngagementScore[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.ENGAGEMENT_SCORES,
      IndexName: 'contentId-index',
      KeyConditionExpression: 'contentId = :contentId',
      ExpressionAttributeValues: { ':contentId': contentId },
    })
  );
  return (result.Items as EngagementScore[]) || [];
}

export async function getUserEngagementScores(
  userId: string,
  options?: { limit?: number; startKey?: Record<string, unknown> }
): Promise<{ items: EngagementScore[]; lastKey?: Record<string, unknown> }> {
  const params: {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, unknown>;
    Limit?: number;
    ExclusiveStartKey?: Record<string, unknown>;
    ScanIndexForward: boolean;
  } = {
    TableName: TABLES.ENGAGEMENT_SCORES,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false,
  };

  if (options?.limit) params.Limit = options.limit;
  if (options?.startKey) params.ExclusiveStartKey = options.startKey;

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: (result.Items as EngagementScore[]) || [],
    lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

// =============================================================================
// PUBLISHING HISTORY OPERATIONS
// =============================================================================

export async function createPublishingHistory(history: PublishingHistory): Promise<PublishingHistory> {
  await docClient.send(
    new PutCommand({
      TableName: TABLES.PUBLISHING_HISTORY,
      Item: history,
    })
  );
  return history;
}

export async function getPublishingHistory(
  userId: string,
  historyId: string
): Promise<PublishingHistory | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.PUBLISHING_HISTORY,
      Key: { userId, historyId },
    })
  );
  return (result.Item as PublishingHistory) || null;
}

export async function getUserPublishingHistory(
  userId: string,
  options?: {
    platform?: Platform;
    limit?: number;
    startKey?: Record<string, unknown>;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ items: PublishingHistory[]; lastKey?: Record<string, unknown> }> {
  let params: {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, unknown>;
    ExpressionAttributeNames?: Record<string, string>;
    FilterExpression?: string;
    Limit?: number;
    ExclusiveStartKey?: Record<string, unknown>;
    ScanIndexForward: boolean;
    IndexName?: string;
  } = {
    TableName: TABLES.PUBLISHING_HISTORY,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false,
  };

  if (options?.platform) {
    params.IndexName = 'platform-index';
    params.KeyConditionExpression = 'userId = :userId AND platform = :platform';
    params.ExpressionAttributeValues[':platform'] = options.platform;
  }

  if (options?.startDate || options?.endDate) {
    params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
    params.ExpressionAttributeNames['#publishedAt'] = 'publishedAt';
    
    const filters: string[] = [];
    if (options.startDate) {
      filters.push('#publishedAt >= :startDate');
      params.ExpressionAttributeValues[':startDate'] = options.startDate;
    }
    if (options.endDate) {
      filters.push('#publishedAt <= :endDate');
      params.ExpressionAttributeValues[':endDate'] = options.endDate;
    }
    params.FilterExpression = filters.join(' AND ');
  }

  if (options?.limit) params.Limit = options.limit;
  if (options?.startKey) params.ExclusiveStartKey = options.startKey;

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: (result.Items as PublishingHistory[]) || [],
    lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

export async function updatePublishingHistory(
  userId: string,
  historyId: string,
  updates: Partial<PublishingHistory>
): Promise<PublishingHistory | null> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'userId' && key !== 'historyId' && value !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  if (updateExpressions.length === 0) return null;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLES.PUBLISHING_HISTORY,
      Key: { userId, historyId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes as PublishingHistory;
}

// =============================================================================
// SCHEDULED POSTS OPERATIONS
// =============================================================================

export async function createScheduledPost(post: ScheduledPost): Promise<ScheduledPost> {
  await docClient.send(
    new PutCommand({
      TableName: TABLES.SCHEDULED_POSTS,
      Item: post,
    })
  );
  return post;
}

export async function getScheduledPost(userId: string, scheduleId: string): Promise<ScheduledPost | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.SCHEDULED_POSTS,
      Key: { userId, scheduleId },
    })
  );
  return (result.Item as ScheduledPost) || null;
}

export async function getUserScheduledPosts(
  userId: string,
  options?: {
    status?: string;
    limit?: number;
    startKey?: Record<string, unknown>;
    fromDate?: string;
    toDate?: string;
  }
): Promise<{ items: ScheduledPost[]; lastKey?: Record<string, unknown> }> {
  let params: {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, unknown>;
    ExpressionAttributeNames?: Record<string, string>;
    FilterExpression?: string;
    Limit?: number;
    ExclusiveStartKey?: Record<string, unknown>;
    ScanIndexForward: boolean;
    IndexName?: string;
  } = {
    TableName: TABLES.SCHEDULED_POSTS,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: true, // Chronological order for scheduled posts
  };

  if (options?.status) {
    params.IndexName = 'status-index';
    params.KeyConditionExpression = 'userId = :userId AND #status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues[':status'] = options.status;
  }

  if (options?.fromDate || options?.toDate) {
    params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
    params.ExpressionAttributeNames['#scheduledFor'] = 'scheduledFor';
    
    const filters: string[] = [];
    if (options.fromDate) {
      filters.push('#scheduledFor >= :fromDate');
      params.ExpressionAttributeValues[':fromDate'] = options.fromDate;
    }
    if (options.toDate) {
      filters.push('#scheduledFor <= :toDate');
      params.ExpressionAttributeValues[':toDate'] = options.toDate;
    }
    params.FilterExpression = filters.join(' AND ');
  }

  if (options?.limit) params.Limit = options.limit;
  if (options?.startKey) params.ExclusiveStartKey = options.startKey;

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: (result.Items as ScheduledPost[]) || [],
    lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

export async function updateScheduledPost(
  userId: string,
  scheduleId: string,
  updates: Partial<ScheduledPost>
): Promise<ScheduledPost | null> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'userId' && key !== 'scheduleId' && value !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  if (updateExpressions.length === 0) return null;

  // Always update the updatedAt timestamp
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLES.SCHEDULED_POSTS,
      Key: { userId, scheduleId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes as ScheduledPost;
}

export async function deleteScheduledPost(userId: string, scheduleId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLES.SCHEDULED_POSTS,
      Key: { userId, scheduleId },
    })
  );
}

// =============================================================================
// ANALYTICS QUERIES
// =============================================================================

export async function getAnalyticsData(
  userId: string,
  options?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<{
  totalContent: number;
  contentByStatus: Record<string, number>;
  contentByPlatform: Record<Platform, number>;
  avgEngagement: number;
  publishingHistory: PublishingHistory[];
  engagementScores: EngagementScore[];
}> {
  // Get all content
  const contentResult = await getUserContent(userId, { limit: 1000 });
  const content = contentResult.items;

  // Get publishing history
  const historyResult = await getUserPublishingHistory(userId, {
    limit: 100,
    startDate: options?.startDate,
    endDate: options?.endDate,
  });

  // Get engagement scores
  const scoresResult = await getUserEngagementScores(userId, { limit: 100 });

  // Calculate statistics
  const contentByStatus: Record<string, number> = {};
  const contentByPlatform: Record<string, number> = {};
  
  content.forEach((item) => {
    contentByStatus[item.status] = (contentByStatus[item.status] || 0) + 1;
    contentByPlatform[item.platform] = (contentByPlatform[item.platform] || 0) + 1;
  });

  const avgEngagement = scoresResult.items.length > 0
    ? scoresResult.items.reduce((sum, s) => sum + s.score, 0) / scoresResult.items.length
    : 0;

  return {
    totalContent: content.length,
    contentByStatus,
    contentByPlatform: contentByPlatform as Record<Platform, number>,
    avgEngagement: Math.round(avgEngagement),
    publishingHistory: historyResult.items,
    engagementScores: scoresResult.items,
  };
}

// Generate unique IDs
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
}

export { docClient, client };
