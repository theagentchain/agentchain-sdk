import { SDKConfig, AgentChainError } from './types';
import { AgentManager } from './services/AgentManager';
import { WalletService, WalletServiceConfig } from './services/WalletService';
import { logger, LogLevel } from './utils/logger';
import { cache } from './utils/cache';

export interface AgentChainSDKOptions extends Partial<SDKConfig> {
  // Additional SDK-specific options can be added here
}

/**
 * Main AgentChain SDK class
 * 
 * This is the primary interface for interacting with the AgentChain ecosystem.
 * It provides a unified API for agent management, wallet operations, payments,
 * and all other platform features.
 */
export class AgentChainSDK {
  private config: SDKConfig;
  private _agentManager?: AgentManager;
  private _walletService?: WalletService;
  
  constructor(options: AgentChainSDKOptions = {}) {
    // Set default configuration
    this.config = {
      environment: 'development',
      solanaNetwork: 'devnet',
      rpcEndpoint: 'https://api.devnet.solana.com',
      enableLogging: true,
      rateLimiting: {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000 // 1 minute
      },
      cache: {
        enabled: true,
        ttl: 300000 // 5 minutes
      },
      ...options
    };

    this.initialize();
  }

  /**
   * Initialize the SDK
   */
  private initialize(): void {
    // Configure logger
    if (this.config.enableLogging) {
      logger.setLevel(LogLevel.INFO);
      logger.setPrefix('AgentChainSDK');
    } else {
      logger.setLevel(LogLevel.NONE);
    }

    logger.info('AgentChain SDK initialized', {
      environment: this.config.environment,
      network: this.config.solanaNetwork
    });
  }

  /**
   * Get the Agent Manager service
   */
  get agents(): AgentManager {
    if (!this._agentManager) {
      this._agentManager = new AgentManager();
    }
    return this._agentManager;
  }

  /**
   * Get the Wallet Service
   */
  get wallet(): WalletService {
    if (!this._walletService) {
      const walletConfig: WalletServiceConfig = {
        rpcEndpoint: this.config.rpcEndpoint || 'https://api.devnet.solana.com',
        network: this.config.solanaNetwork || 'devnet'
      };
      this._walletService = new WalletService(walletConfig);
    }
    return this._walletService;
  }

  /**
   * Get current SDK configuration
   */
  getConfig(): SDKConfig {
    return { ...this.config };
  }

  /**
   * Update SDK configuration
   */
  updateConfig(updates: Partial<SDKConfig>): void {
    const oldConfig = this.config;
    this.config = { ...this.config, ...updates };

    logger.info('SDK configuration updated', {
      oldEnvironment: oldConfig.environment,
      newEnvironment: this.config.environment
    });

    // Reinitialize services if necessary
    if (updates.rpcEndpoint || updates.solanaNetwork) {
      this._walletService = undefined; // Force recreation with new config
    }

    // Update logger level if logging setting changed
    if (updates.enableLogging !== undefined) {
      if (this.config.enableLogging) {
        logger.setLevel(LogLevel.INFO);
      } else {
        logger.setLevel(LogLevel.NONE);
      }
    }
  }

  /**
   * Get SDK version
   */
  getVersion(): string {
    return '1.0.0';
  }

  /**
   * Get SDK health status
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      wallet: 'connected' | 'disconnected' | 'error';
      network: 'connected' | 'error';
      cache: 'enabled' | 'disabled';
    };
    network: {
      endpoint: string;
      network: string;
    };
    timestamp: Date;
  }> {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      services: {
        wallet: 'disconnected' as 'connected' | 'disconnected' | 'error',
        network: 'connected' as 'connected' | 'error',
        cache: this.config.cache?.enabled ? 'enabled' as const : 'disabled' as const
      },
      network: {
        endpoint: this.config.rpcEndpoint || 'https://api.devnet.solana.com',
        network: this.config.solanaNetwork || 'devnet'
      },
      timestamp: new Date()
    };

    try {
      // Check wallet status
      if (this._walletService?.isWalletConnected()) {
        health.services.wallet = 'connected';
      }

      // Check network connectivity
      if (this._walletService) {
        await this._walletService.getNetworkInfo();
        health.services.network = 'connected';
      }

    } catch (error) {
      logger.warn('Health check encountered errors', error);
      health.status = 'degraded';
      health.services.network = 'error';
    }

    return health;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    cache.clear();
    logger.info('SDK cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    enabled: boolean;
  } {
    return {
      size: cache.size(),
      enabled: this.config.cache?.enabled || false
    };
  }

  /**
   * Validate SDK configuration
   */
  validateConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required configurations
    if (!this.config.environment) {
      errors.push('Environment is required');
    }

    if (!this.config.solanaNetwork) {
      errors.push('Solana network is required');
    }

    if (!this.config.rpcEndpoint) {
      errors.push('RPC endpoint is required');
    }

    // Validate optional configurations
    if (this.config.environment === 'production') {
      if (!this.config.supabaseUrl || !this.config.supabaseKey) {
        warnings.push('Supabase configuration missing for production environment');
      }
      if (!this.config.moralisApiKey) {
        warnings.push('Moralis API key missing for production environment');
      }
      if (!this.config.openaiApiKey) {
        warnings.push('OpenAI API key missing for production environment');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Destroy the SDK instance and clean up resources
   */
  destroy(): void {
    logger.info('Destroying SDK instance');

    // Disconnect wallet if connected
    if (this._walletService?.isWalletConnected()) {
      this._walletService.disconnectWallet().catch(error => {
        logger.warn('Error disconnecting wallet during cleanup', error);
      });
    }

    // Clear cache
    cache.destroy();

    // Reset services
    this._agentManager = undefined;
    this._walletService = undefined;

    logger.info('SDK instance destroyed');
  }

  /**
   * Create a new SDK instance with the given configuration
   */
  static create(options: AgentChainSDKOptions = {}): AgentChainSDK {
    return new AgentChainSDK(options);
  }

  /**
   * Create a production-ready SDK instance
   */
  static createProduction(config: {
    rpcEndpoint: string;
    supabaseUrl: string;
    supabaseKey: string;
    moralisApiKey: string;
    openaiApiKey: string;
  }): AgentChainSDK {
    return new AgentChainSDK({
      environment: 'production',
      solanaNetwork: 'mainnet-beta',
      ...config,
      enableLogging: false, // Disable verbose logging in production
      rateLimiting: {
        enabled: true,
        maxRequests: 1000,
        windowMs: 60000
      }
    });
  }

  /**
   * Create a development SDK instance with sensible defaults
   */
  static createDevelopment(): AgentChainSDK {
    return new AgentChainSDK({
      environment: 'development',
      solanaNetwork: 'devnet',
      rpcEndpoint: 'https://api.devnet.solana.com',
      enableLogging: true,
      rateLimiting: {
        enabled: false,
        maxRequests: 1000,
        windowMs: 60000
      }
    });
  }
} 