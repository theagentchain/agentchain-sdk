import { AgentChainSDK } from '../AgentChainSDK';

describe('AgentChainSDK', () => {
  let sdk: AgentChainSDK;

  beforeEach(() => {
    sdk = AgentChainSDK.createDevelopment();
  });

  afterEach(() => {
    if (sdk) {
      sdk.destroy();
    }
  });

  describe('Initialization', () => {
    it('should create a development instance', () => {
      expect(sdk).toBeInstanceOf(AgentChainSDK);
      expect(sdk.getVersion()).toBe('1.0.0');
    });

    it('should have correct default configuration', () => {
      const config = sdk.getConfig();
      expect(config.environment).toBe('development');
      expect(config.solanaNetwork).toBe('devnet');
      expect(config.enableLogging).toBe(true);
    });

    it('should validate configuration', () => {
      const validation = sdk.validateConfig();
      expect(validation.isValid).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('Services', () => {
    it('should provide access to agent manager', () => {
      expect(sdk.agents).toBeDefined();
      expect(typeof sdk.agents.createAgent).toBe('function');
    });

    it('should provide access to wallet service', () => {
      expect(sdk.wallet).toBeDefined();
      expect(typeof sdk.wallet.connectWallet).toBe('function');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await sdk.getHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('network');
      expect(health).toHaveProperty('timestamp');
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = sdk.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('enabled');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.enabled).toBe('boolean');
    });

    it('should clear cache', () => {
      expect(() => sdk.clearCache()).not.toThrow();
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const originalConfig = sdk.getConfig();
      sdk.updateConfig({ enableLogging: false });
      const updatedConfig = sdk.getConfig();
      
      expect(updatedConfig.enableLogging).toBe(false);
      expect(updatedConfig.environment).toBe(originalConfig.environment);
    });
  });

  describe('Static Factory Methods', () => {
    it('should create production instance', () => {
      const prodSdk = AgentChainSDK.createProduction({
        rpcEndpoint: 'https://api.mainnet-beta.solana.com',
        supabaseUrl: 'test-url',
        supabaseKey: 'test-key',
        moralisApiKey: 'test-key',
        openaiApiKey: 'test-key'
      });

      const config = prodSdk.getConfig();
      expect(config.environment).toBe('production');
      expect(config.solanaNetwork).toBe('mainnet-beta');
      expect(config.enableLogging).toBe(false);

      prodSdk.destroy();
    });

    it('should create custom instance', () => {
      const customSdk = AgentChainSDK.create({
        environment: 'testnet',
        enableLogging: false
      });

      const config = customSdk.getConfig();
      expect(config.environment).toBe('testnet');
      expect(config.enableLogging).toBe(false);

      customSdk.destroy();
    });
  });
}); 