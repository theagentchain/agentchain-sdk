# AgentChain SDK

[![npm version](https://badge.fury.io/js/agent-chain-sdk.svg)](https://badge.fury.io/js/agent-chain-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

A comprehensive TypeScript/JavaScript library for the AgentChain platform—a blockchain-powered ecosystem for creating, deploying, and managing AI agents with their own tokenized economies on the Solana blockchain.

## Features

- 🤖 **Agent Management** - Create, deploy, and manage AI agents with custom personalities
- 💰 **Token Integration** - PumpFun integration for tradeable agent tokens
- 🔗 **Solana Blockchain** - Native Solana web3.js integration
- 💬 **AI Chat** - OpenAI-powered agent conversations
- 📊 **Analytics** - Moralis integration for blockchain data
- 🗄️ **Database** - Supabase integration for data persistence
- 💸 **Payments** - SOL and SPL token payment processing
- 🛡️ **Security** - Wallet-based authentication and secure transactions

## Installation

```bash
npm install agent-chain-sdk
```

## Quick Start

### Basic Setup

```typescript
import { AgentChainSDK } from 'agent-chain-sdk';

// Create a development instance
const sdk = AgentChainSDK.createDevelopment();

// Or create a production instance
const sdk = AgentChainSDK.createProduction({
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  moralisApiKey: 'your-moralis-key',
  openaiApiKey: 'your-openai-key'
});
```

### Agent Management

```typescript
import { AgentType } from 'agent-chain-sdk';

// Create a new agent
const agent = await sdk.agents.createAgent({
  type: AgentType.TRADING_BOT,
  ownerId: 'user-wallet-address',
  metadata: {
    name: 'My Trading Bot',
    description: 'An AI-powered trading assistant',
    personality: 'Professional and analytical',
    traits: ['analytical', 'risk-averse', 'data-driven']
  },
  deploymentConfig: {
    pumpfunEnabled: true,
    chatEnabled: true,
    tradingEnabled: true
  }
});

console.log('Agent created:', agent.id);

// Deploy the agent
const deployedAgent = await sdk.agents.deployAgent(agent.id);
console.log('Agent deployed at:', deployedAgent.deployedAt);

// List user's agents
const agents = await sdk.agents.listAgents({
  ownerId: 'user-wallet-address',
  status: AgentStatus.ACTIVE
});
```

### Wallet Integration

```typescript
// Connect a Phantom wallet
const wallet = {
  publicKey: phantomWallet.publicKey,
  signTransaction: phantomWallet.signTransaction,
  signAllTransactions: phantomWallet.signAllTransactions,
  signMessage: phantomWallet.signMessage,
  connect: phantomWallet.connect,
  disconnect: phantomWallet.disconnect,
  connected: phantomWallet.connected
};

await sdk.wallet.connectWallet(wallet);

// Get wallet balance
const balance = await sdk.wallet.getConnectedWalletBalance();
console.log('Wallet balance:', balance, 'SOL');

// Send SOL
const result = await sdk.wallet.sendSOL(
  recipientPublicKey,
  0.1, // amount in SOL
  'Payment for agent deployment'
);
console.log('Transaction signature:', result.signature);
```

### Payment Processing

```typescript
import { PaymentProcessor } from 'agent-chain-sdk';

const paymentProcessor = new PaymentProcessor({
  walletService: sdk.wallet,
  platformFeePercent: 2.5
});

// Create a payment request
const paymentRequest = await paymentProcessor.createPaymentRequest(
  0.1, // 0.1 SOL
  'SOL',
  'recipient-wallet-address',
  {
    memo: 'Agent deployment fee',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  }
);

// Process the payment
const payment = await paymentProcessor.processPayment(
  paymentRequest,
  'user-id',
  { agentId: agent.id }
);

// Monitor payment status
const confirmedPayment = await paymentProcessor.verifyPayment(payment.id);
console.log('Payment status:', confirmedPayment.status);
```

## Configuration

### Environment Variables

```bash
# Solana Configuration
SOLANA_NETWORK=mainnet-beta # or testnet, devnet
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# Database Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Configuration
OPENAI_API_KEY=your-openai-api-key

# Analytics Configuration
MORALIS_API_KEY=your-moralis-api-key

# SDK Configuration
AGENTCHAIN_ENVIRONMENT=production
ENABLE_LOGGING=false
```

### SDK Configuration Object

```typescript
const config = {
  environment: 'production',
  solanaNetwork: 'mainnet-beta',
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  moralisApiKey: process.env.MORALIS_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  enableLogging: false,
  rateLimiting: {
    enabled: true,
    maxRequests: 1000,
    windowMs: 60000
  },
  cache: {
    enabled: true,
    ttl: 300000
  }
};

const sdk = new AgentChainSDK(config);
```

## API Reference

### AgentChainSDK

The main SDK class that orchestrates all services.

#### Methods

- `agents` - Access to AgentManager service
- `wallet` - Access to WalletService
- `getConfig()` - Get current configuration
- `updateConfig(updates)` - Update configuration
- `getHealth()` - Get SDK health status
- `clearCache()` - Clear all caches
- `destroy()` - Clean up resources

### AgentManager

Handles agent lifecycle management.

#### Methods

- `createAgent(options)` - Create a new agent
- `getAgent(agentId)` - Get agent by ID
- `updateAgent(agentId, updates)` - Update agent
- `deleteAgent(agentId)` - Delete agent
- `listAgents(options)` - List agents with filtering
- `deployAgent(agentId)` - Deploy agent
- `pauseAgent(agentId)` - Pause agent
- `resumeAgent(agentId)` - Resume agent
- `getAgentStats(ownerId)` - Get agent statistics

### WalletService

Handles Solana wallet operations.

#### Methods

- `connectWallet(wallet)` - Connect wallet
- `disconnectWallet()` - Disconnect wallet
- `getBalance(publicKey)` - Get SOL balance
- `sendSOL(recipient, amount, memo)` - Send SOL
- `signMessage(message)` - Sign message
- `verifySignature(message, signature, publicKey)` - Verify signature
- `getTransactionHistory(publicKey, limit)` - Get transaction history

### PaymentProcessor

Handles payment processing and verification.

#### Methods

- `createPaymentRequest(amount, currency, recipient, options)` - Create payment request
- `processPayment(paymentRequest, userId, options)` - Process payment
- `getPayment(paymentId)` - Get payment by ID
- `verifyPayment(paymentId)` - Verify payment status
- `listPayments(options)` - List payments

## Type Definitions

The SDK includes comprehensive TypeScript definitions for all interfaces:

- `Agent` - Agent data structure
- `AgentMetadata` - Agent metadata
- `PaymentRequest` - Payment request structure
- `Payment` - Payment record
- `WalletConnection` - Wallet interface
- `SDKConfig` - SDK configuration

## Error Handling

The SDK uses custom error classes for better error handling:

```typescript
import { AgentChainError, WalletError, PaymentError } from 'agent-chain-sdk';

try {
  await sdk.agents.createAgent(options);
} catch (error) {
  if (error instanceof AgentChainError) {
    console.error('Agent error:', error.code, error.message);
  } else if (error instanceof WalletError) {
    console.error('Wallet error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Examples

Check out the [examples](./examples) directory for complete implementation examples:

- [Basic Agent Creation](./examples/basic-agent.ts)
- [Wallet Integration](./examples/wallet-integration.ts)
- [Payment Processing](./examples/payment-processing.ts)
- [Full DApp Integration](./examples/full-dapp.ts)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage
```

## Building

```bash
# Build the library
npm run build

# Build and watch for changes
npm run dev
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@agentchain.io
- 💬 Discord: [AgentChain Community](https://discord.gg/agentchain)
- 📖 Documentation: [docs.agentchain.io](https://docs.agentchain.io)
- 🐛 Issues: [GitHub Issues](https://github.com/agentchain/agent-chain-sdk/issues)

## Roadmap

- [ ] SPL Token Payment Support
- [ ] Advanced Trading Bot Templates
- [ ] Mobile SDK (React Native)
- [ ] WebSocket Real-time Updates
- [ ] Multi-chain Support
- [ ] AI Agent Marketplace Integration
- [ ] Advanced Analytics Dashboard

---

Built with ❤️ by the AgentChain team 