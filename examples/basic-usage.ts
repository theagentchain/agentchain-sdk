import { AgentChainSDK, AgentType, AgentStatus } from '../src';

/**
 * Basic AgentChain SDK Usage Example
 * 
 * This example demonstrates the core functionality of the AgentChain SDK:
 * - Creating and configuring the SDK
 * - Creating and managing agents
 * - Basic wallet operations
 * - Payment processing
 */

async function basicUsageExample() {
  console.log('🚀 Starting AgentChain SDK Basic Usage Example\n');

  // 1. Initialize the SDK
  console.log('1. Initializing SDK...');
  const sdk = AgentChainSDK.createDevelopment();
  
  // Check SDK health
  const health = await sdk.getHealth();
  console.log('SDK Health:', health.status);
  console.log('Network:', health.network.network);
  console.log('');

  // 2. Create an AI Agent
  console.log('2. Creating an AI agent...');
  const agent = await sdk.agents.createAgent({
    type: AgentType.TRADING_BOT,
    ownerId: 'example-user-wallet-address',
    metadata: {
      name: 'Alpha Trading Bot',
      description: 'An AI-powered trading bot that analyzes market trends and executes trades',
      personality: 'Analytical and risk-aware',
      traits: ['analytical', 'conservative', 'data-driven', 'patient'],
      socialLinks: {
        twitter: 'https://twitter.com/alphatradingbot',
        website: 'https://alphatrading.example.com'
      },
      tags: ['trading', 'defi', 'solana', 'ai']
    },
    deploymentConfig: {
      pumpfunEnabled: true,
      chatEnabled: true,
      tradingEnabled: true,
      initialSupply: 1000000,
      tokenSymbol: 'ALPHA'
    }
  });

  console.log('✅ Agent created successfully!');
  console.log(`   Agent ID: ${agent.id}`);
  console.log(`   Name: ${agent.metadata.name}`);
  console.log(`   Status: ${agent.status}`);
  console.log('');

  // 3. Update the agent
  console.log('3. Updating agent metadata...');
  const updatedAgent = await sdk.agents.updateAgent(agent.id, {
    metadata: {
      description: 'An advanced AI-powered trading bot with improved risk management',
      traits: [...agent.metadata.traits!, 'adaptive', 'learning']
    }
  });

  console.log('✅ Agent updated successfully!');
  console.log(`   New description: ${updatedAgent.metadata.description}`);
  console.log(`   Traits: ${updatedAgent.metadata.traits?.join(', ')}`);
  console.log('');

  // 4. Deploy the agent
  console.log('4. Deploying agent...');
  const deployedAgent = await sdk.agents.deployAgent(agent.id);
  
  console.log('✅ Agent deployed successfully!');
  console.log(`   Status: ${deployedAgent.status}`);
  console.log(`   Deployed at: ${deployedAgent.deployedAt}`);
  console.log('');

  // 5. List all agents
  console.log('5. Listing all agents...');
  const allAgents = await sdk.agents.listAgents({
    ownerId: 'example-user-wallet-address',
    limit: 10
  });

  console.log(`✅ Found ${allAgents.length} agent(s):`);
  allAgents.forEach((a, index) => {
    console.log(`   ${index + 1}. ${a.metadata.name} (${a.status})`);
  });
  console.log('');

  // 6. Get agent statistics
  console.log('6. Getting agent statistics...');
  const stats = await sdk.agents.getAgentStats('example-user-wallet-address');
  
  console.log('📊 Agent Statistics:');
  console.log(`   Total agents: ${stats.total}`);
  console.log('   By status:');
  Object.entries(stats.byStatus).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`     ${status}: ${count}`);
    }
  });
  console.log('   By type:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`     ${type}: ${count}`);
    }
  });
  console.log('');

  // 7. Demonstrate wallet functionality (simulation)
  console.log('7. Wallet functionality (simulation)...');
  console.log('   Note: In a real application, you would connect an actual wallet');
  
  // Simulate wallet operations
  try {
    // This would typically connect to a real wallet like Phantom
    console.log('   📱 Wallet connection: Ready for connection');
    console.log('   💰 Balance check: Available');
    console.log('   ✍️  Transaction signing: Ready');
    console.log('   🔐 Message signing: Available');
  } catch (error) {
    console.log('   ⚠️  Wallet operations require actual wallet connection');
  }
  console.log('');

  // 8. Cache and performance
  console.log('8. Cache and performance statistics...');
  const cacheStats = sdk.getCacheStats();
  console.log(`   Cache enabled: ${cacheStats.enabled}`);
  console.log(`   Cache size: ${cacheStats.size} items`);
  console.log('');

  // 9. Configuration validation
  console.log('9. Validating configuration...');
  const configValidation = sdk.validateConfig();
  console.log(`   Configuration valid: ${configValidation.isValid}`);
  if (configValidation.warnings.length > 0) {
    console.log('   Warnings:');
    configValidation.warnings.forEach(warning => {
      console.log(`     - ${warning}`);
    });
  }
  console.log('');

  // 10. Cleanup
  console.log('10. Cleaning up...');
  sdk.clearCache();
  console.log('    Cache cleared');
  
  // In a real application, you might want to keep the SDK instance
  // sdk.destroy(); // Uncomment to fully clean up resources
  console.log('');

  console.log('🎉 Basic usage example completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('- Connect a real Solana wallet (Phantom, Solflare, etc.)');
  console.log('- Configure production settings with API keys');
  console.log('- Implement payment processing for agent deployments');
  console.log('- Add AI chat functionality');
  console.log('- Integrate with PumpFun for token trading');
}

// Error handling wrapper
async function runExample() {
  try {
    await basicUsageExample();
  } catch (error) {
    console.error('❌ Example failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        // Don't log the entire stack in production
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample();
}

export { basicUsageExample, runExample }; 