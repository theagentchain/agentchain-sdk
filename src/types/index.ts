import { PublicKey, Transaction } from '@solana/web3.js';

// ===== AGENT TYPES =====

export interface AgentMetadata {
  name: string;
  description: string;
  avatar?: string;
  personality?: string;
  traits?: string[];
  socialLinks?: {
    twitter?: string;
    discord?: string;
    website?: string;
    telegram?: string;
  };
  features?: AgentFeature[];
  tags?: string[];
}

export interface AgentFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export enum AgentType {
  TRADING_BOT = 'trading_bot',
  SOCIAL_AGENT = 'social_agent',
  AUTOMATION_AGENT = 'automation_agent',
  ENTERPRISE_SOLUTION = 'enterprise_solution',
  CUSTOM = 'custom'
}

export enum AgentStatus {
  DRAFT = 'draft',
  DEPLOYED = 'deployed',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
  ERROR = 'error'
}

export interface Agent {
  id: string;
  ownerId: string;
  type: AgentType;
  status: AgentStatus;
  metadata: AgentMetadata;
  tokenAddress?: string;
  deploymentConfig?: AgentDeploymentConfig;
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;
}

export interface AgentDeploymentConfig {
  initialSupply?: number;
  tokenSymbol?: string;
  pumpfunEnabled?: boolean;
  chatEnabled?: boolean;
  tradingEnabled?: boolean;
  customEndpoints?: string[];
  webhooks?: WebhookConfig[];
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

// ===== TOKEN & PAYMENT TYPES =====

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  marketCap?: number;
  price?: number;
  volume24h?: number;
  priceChange24h?: number;
  holders?: number;
}

export interface PaymentRequest {
  amount: number;
  currency: 'SOL' | string; // SOL or SPL token address
  recipient: string;
  reference?: string;
  memo?: string;
  expiresAt?: Date;
}

export interface Payment {
  id: string;
  agentId?: string;
  userId: string;
  amount: number;
  currency: string;
  txSignature: string;
  status: PaymentStatus;
  createdAt: Date;
  confirmedAt?: Date;
  metadata?: Record<string, any>;
}

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// ===== WALLET & BLOCKCHAIN TYPES =====

export interface WalletConnection {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  connected: boolean;
}

export interface TransactionResult {
  signature: string;
  confirmed: boolean;
  slot?: number;
  blockTime?: number;
  error?: string;
}

// ===== CHAT & AI TYPES =====

export interface ChatMessage {
  id: string;
  sessionId: string;
  agentId: string;
  userId?: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  agentId: string;
  userId?: string;
  title?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface AIConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  customInstructions?: string[];
}

// ===== DATA & ANALYTICS TYPES =====

export interface MarketData {
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  volume24h: number;
  marketCap: number;
  fullyDilutedValuation?: number;
  circulatingSupply: number;
  totalSupply: number;
  lastUpdated: Date;
}

export interface PortfolioData {
  totalValue: number;
  tokens: Array<{
    address: string;
    symbol: string;
    balance: number;
    value: number;
    priceChange24h: number;
  }>;
  transactions: Transaction[];
  lastUpdated: Date;
}

// ===== USER & AUTH TYPES =====

export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  role: UserRole;
  preferences?: UserPreferences;
  createdAt: Date;
  lastLoginAt?: Date;
}

export enum UserRole {
  USER = 'user',
  DEVELOPER = 'developer',
  ADMIN = 'admin'
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  agentUpdates: boolean;
  priceAlerts: boolean;
  systemAlerts: boolean;
}

export interface PrivacySettings {
  profilePublic: boolean;
  showHoldings: boolean;
  allowAnalytics: boolean;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  userId: string;
}

// ===== MARKETPLACE TYPES =====

export interface MarketplaceListing {
  id: string;
  agentId: string;
  agent: Agent;
  price?: number;
  currency?: string;
  featured: boolean;
  rank?: number;
  stats: {
    views: number;
    interactions: number;
    rating: number;
    reviewCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceFilter {
  type?: AgentType[];
  priceRange?: [number, number];
  features?: string[];
  tags?: string[];
  sortBy?: 'price' | 'rating' | 'popularity' | 'newest';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ===== CONFIG & OPTIONS TYPES =====

export interface SDKConfig {
  environment: 'development' | 'production' | 'testnet';
  solanaNetwork: 'mainnet-beta' | 'testnet' | 'devnet';
  rpcEndpoint?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  moralisApiKey?: string;
  openaiApiKey?: string;
  enableLogging?: boolean;
  rateLimiting?: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
    rateLimit?: {
      remaining: number;
      reset: Date;
    };
  };
}

// ===== ERROR TYPES =====

export class AgentChainError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AgentChainError';
  }
}

export class WalletError extends AgentChainError {
  constructor(message: string, details?: any) {
    super(message, 'WALLET_ERROR', 400, details);
    this.name = 'WalletError';
  }
}

export class PaymentError extends AgentChainError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_ERROR', 400, details);
    this.name = 'PaymentError';
  }
}

export class AuthError extends AgentChainError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AgentChainError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details);
    this.name = 'NetworkError';
  }
} 