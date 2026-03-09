import type { Timestamp } from 'firebase/firestore';

// Enums / Union Types
export type GameGenre = 'action' | 'puzzle' | 'strategy' | 'rpg' | 'casual' | 'sports';
export type GameStatus = 'draft' | 'active' | 'archived';
export type SubscriptionTier = 'free' | 'pro' | 'elite';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired';
export type PaymentType = 'subscription' | 'iap' | 'credit';
export type NotificationType = 'system' | 'achievement' | 'social' | 'promo' | 'billing';
export type WorkflowTrigger = 'schedule' | 'event' | 'manual';
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'alltime';

// Game catalog
export interface GameForgeGame {
  id: string;
  title: string;
  description: string;
  genre: GameGenre;
  status: GameStatus;
  platforms: string[];
  thumbnailUrl?: string;
  pricing: {
    type: 'free' | 'paid' | 'freemium';
    price?: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Player profile
export interface GameForgePlayer {
  id: string;
  uid: string;
  displayName: string;
  avatar?: string;
  level: number;
  xp: number;
  achievements: string[];
  lastActive: Timestamp;
  subscriptionTier: SubscriptionTier;
  totalGamesPlayed: number;
  totalPlaytime: number; // minutes
  createdAt: Timestamp;
}

// Play session
export interface GameForgeSession {
  id: string;
  playerId: string;
  gameId: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  score: number;
  duration: number; // seconds
  metadata?: Record<string, unknown>;
}

// Leaderboard entry
export interface LeaderboardEntry {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
  period: LeaderboardPeriod;
  updatedAt: Timestamp;
}

// Subscription
export interface GameForgeSubscription {
  id: string;
  playerId: string;
  tier: SubscriptionTier;
  stripeSubId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelledAt?: Timestamp;
  createdAt: Timestamp;
}

// Payment
export interface GameForgePayment {
  id: string;
  playerId: string;
  amount: number;
  currency: string;
  stripePaymentId: string;
  type: PaymentType;
  description?: string;
  createdAt: Timestamp;
}

// Notification
export interface GameForgeNotification {
  id: string;
  playerId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Timestamp;
}

// Analytics snapshot
export interface GameForgeAnalytics {
  id: string;
  gameId?: string; // null = platform-wide
  period: string; // e.g. '2026-03-07'
  dau: number;
  mau: number;
  revenue: number;
  retention: number; // percentage
  avgSessionDuration: number; // seconds
  newPlayers: number;
  updatedAt: Timestamp;
}

// AI Recommendation
export interface AIRecommendation {
  id: string;
  playerId: string;
  type: 'game' | 'challenge' | 'content';
  items: Array<{ id: string; title: string; score: number; reason: string }>;
  model: string;
  generatedAt: Timestamp;
  accepted?: boolean;
}

// Workflow
export interface GameForgeWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  triggerConfig?: Record<string, unknown>; // cron expression, event name, etc.
  actions: WorkflowAction[];
  enabled: boolean;
  lastRun?: Timestamp;
  createdAt: Timestamp;
}

export interface WorkflowAction {
  type: 'notification' | 'analytics' | 'reward' | 'webhook';
  config: Record<string, unknown>;
}

// Workflow execution
export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  result?: Record<string, unknown>;
  error?: string;
}

// Short aliases used by the service layer
export type Game = GameForgeGame;
export type Player = GameForgePlayer;
export type GameSession = GameForgeSession;
export type Subscription = GameForgeSubscription;
export type Payment = GameForgePayment;
export type Notification = GameForgeNotification;
export type AnalyticsSnapshot = GameForgeAnalytics;
export type Workflow = GameForgeWorkflow;
