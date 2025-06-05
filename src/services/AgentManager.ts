import { 
  Agent, 
  AgentMetadata, 
  AgentType, 
  AgentStatus, 
  AgentDeploymentConfig,
  APIResponse,
  AgentChainError
} from '../types';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';

export interface CreateAgentOptions {
  type: AgentType;
  metadata: AgentMetadata;
  ownerId: string;
  deploymentConfig?: AgentDeploymentConfig;
}

export interface UpdateAgentOptions {
  metadata?: Partial<AgentMetadata>;
  status?: AgentStatus;
  deploymentConfig?: Partial<AgentDeploymentConfig>;
}

export interface ListAgentsOptions {
  ownerId?: string;
  type?: AgentType;
  status?: AgentStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    logger.setPrefix('AgentManager');
  }

  /**
   * Create a new agent
   */
  async createAgent(options: CreateAgentOptions): Promise<Agent> {
    try {
      logger.info('Creating new agent', { type: options.type, owner: options.ownerId });

      // Validate metadata
      this.validateAgentMetadata(options.metadata);

      const now = new Date();
      const agent: Agent = {
        id: this.generateId(),
        ownerId: options.ownerId,
        type: options.type,
        status: AgentStatus.DRAFT,
        metadata: options.metadata,
        deploymentConfig: options.deploymentConfig,
        createdAt: now,
        updatedAt: now
      };

      // Store agent
      this.agents.set(agent.id, agent);
      
      // Cache the agent
      cache.set(`agent:${agent.id}`, agent, 30 * 60 * 1000); // 30 minutes

      logger.info('Agent created successfully', { agentId: agent.id });
      return agent;

    } catch (error) {
      logger.error('Failed to create agent', error);
      throw new AgentChainError(
        'Failed to create agent',
        'AGENT_CREATION_FAILED',
        500,
        error
      );
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    try {
      logger.debug('Fetching agent', { agentId });

      // Try cache first
      const cached = cache.get<Agent>(`agent:${agentId}`);
      if (cached) {
        logger.debug('Agent found in cache', { agentId });
        return cached;
      }

      // Fallback to in-memory store (in production, this would be database)
      const agent = this.agents.get(agentId) || null;
      
      if (agent) {
        // Cache the result
        cache.set(`agent:${agentId}`, agent, 30 * 60 * 1000);
      }

      return agent;

    } catch (error) {
      logger.error('Failed to fetch agent', { agentId, error });
      throw new AgentChainError(
        'Failed to fetch agent',
        'AGENT_FETCH_FAILED',
        500,
        error
      );
    }
  }

  /**
   * Update an existing agent
   */
  async updateAgent(agentId: string, options: UpdateAgentOptions): Promise<Agent> {
    try {
      logger.info('Updating agent', { agentId, options });

      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new AgentChainError(
          'Agent not found',
          'AGENT_NOT_FOUND',
          404
        );
      }

      // Validate metadata if provided
      if (options.metadata) {
        this.validateAgentMetadata({ ...agent.metadata, ...options.metadata });
      }

      // Update agent
      const updatedAgent: Agent = {
        ...agent,
        metadata: options.metadata ? { ...agent.metadata, ...options.metadata } : agent.metadata,
        status: options.status || agent.status,
        deploymentConfig: options.deploymentConfig 
          ? { ...agent.deploymentConfig, ...options.deploymentConfig }
          : agent.deploymentConfig,
        updatedAt: new Date()
      };

      // Store updated agent
      this.agents.set(agentId, updatedAgent);
      
      // Update cache
      cache.set(`agent:${agentId}`, updatedAgent, 30 * 60 * 1000);

      logger.info('Agent updated successfully', { agentId });
      return updatedAgent;

    } catch (error) {
      logger.error('Failed to update agent', { agentId, error });
      if (error instanceof AgentChainError) {
        throw error;
      }
      throw new AgentChainError(
        'Failed to update agent',
        'AGENT_UPDATE_FAILED',
        500,
        error
      );
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    try {
      logger.info('Deleting agent', { agentId });

      const agent = await this.getAgent(agentId);
      if (!agent) {
        return false;
      }

      // Remove from store
      this.agents.delete(agentId);
      
      // Remove from cache
      cache.delete(`agent:${agentId}`);

      logger.info('Agent deleted successfully', { agentId });
      return true;

    } catch (error) {
      logger.error('Failed to delete agent', { agentId, error });
      throw new AgentChainError(
        'Failed to delete agent',
        'AGENT_DELETE_FAILED',
        500,
        error
      );
    }
  }

  /**
   * List agents with filtering and pagination
   */
  async listAgents(options: ListAgentsOptions = {}): Promise<Agent[]> {
    try {
      logger.debug('Listing agents', options);

      const {
        ownerId,
        type,
        status,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      let agents = Array.from(this.agents.values());

      // Apply filters
      if (ownerId) {
        agents = agents.filter(agent => agent.ownerId === ownerId);
      }
      if (type) {
        agents = agents.filter(agent => agent.type === type);
      }
      if (status) {
        agents = agents.filter(agent => agent.status === status);
      }

      // Sort
      agents.sort((a, b) => {
        const aValue = a[sortBy] as Date;
        const bValue = b[sortBy] as Date;
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      // Apply pagination
      const paginatedAgents = agents.slice(offset, offset + limit);

      logger.debug('Agents listed successfully', { 
        total: agents.length, 
        returned: paginatedAgents.length 
      });

      return paginatedAgents;

    } catch (error) {
      logger.error('Failed to list agents', error);
      throw new AgentChainError(
        'Failed to list agents',
        'AGENT_LIST_FAILED',
        500,
        error
      );
    }
  }

  /**
   * Deploy an agent (change status to deployed)
   */
  async deployAgent(agentId: string): Promise<Agent> {
    try {
      logger.info('Deploying agent', { agentId });

      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new AgentChainError(
          'Agent not found',
          'AGENT_NOT_FOUND',
          404
        );
      }

      if (agent.status !== AgentStatus.DRAFT) {
        throw new AgentChainError(
          'Only draft agents can be deployed',
          'INVALID_AGENT_STATUS',
          400
        );
      }

      // Update agent status
      const deployedAgent = await this.updateAgent(agentId, {
        status: AgentStatus.DEPLOYED
      });

      // Set deployment timestamp
      deployedAgent.deployedAt = new Date();
      this.agents.set(agentId, deployedAgent);
      cache.set(`agent:${agentId}`, deployedAgent, 30 * 60 * 1000);

      logger.info('Agent deployed successfully', { agentId });
      return deployedAgent;

    } catch (error) {
      logger.error('Failed to deploy agent', { agentId, error });
      if (error instanceof AgentChainError) {
        throw error;
      }
      throw new AgentChainError(
        'Failed to deploy agent',
        'AGENT_DEPLOYMENT_FAILED',
        500,
        error
      );
    }
  }

  /**
   * Pause an active agent
   */
  async pauseAgent(agentId: string): Promise<Agent> {
    return this.updateAgent(agentId, { status: AgentStatus.PAUSED });
  }

  /**
   * Resume a paused agent
   */
  async resumeAgent(agentId: string): Promise<Agent> {
    return this.updateAgent(agentId, { status: AgentStatus.ACTIVE });
  }

  /**
   * Archive an agent
   */
  async archiveAgent(agentId: string): Promise<Agent> {
    return this.updateAgent(agentId, { status: AgentStatus.ARCHIVED });
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(ownerId?: string): Promise<{
    total: number;
    byStatus: Record<AgentStatus, number>;
    byType: Record<AgentType, number>;
  }> {
    try {
      const agents = await this.listAgents({ ownerId });

      const stats = {
        total: agents.length,
        byStatus: {} as Record<AgentStatus, number>,
        byType: {} as Record<AgentType, number>
      };

      // Initialize counters
      Object.values(AgentStatus).forEach(status => {
        stats.byStatus[status] = 0;
      });
      Object.values(AgentType).forEach(type => {
        stats.byType[type] = 0;
      });

      // Count agents
      agents.forEach(agent => {
        stats.byStatus[agent.status]++;
        stats.byType[agent.type]++;
      });

      return stats;

    } catch (error) {
      logger.error('Failed to get agent stats', error);
      throw new AgentChainError(
        'Failed to get agent stats',
        'AGENT_STATS_FAILED',
        500,
        error
      );
    }
  }

  /**
   * Validate agent metadata
   */
  private validateAgentMetadata(metadata: AgentMetadata): void {
    if (!metadata.name || metadata.name.trim().length === 0) {
      throw new AgentChainError(
        'Agent name is required',
        'INVALID_AGENT_NAME',
        400
      );
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
      throw new AgentChainError(
        'Agent description is required',
        'INVALID_AGENT_DESCRIPTION',
        400
      );
    }

    if (metadata.name.length > 100) {
      throw new AgentChainError(
        'Agent name cannot exceed 100 characters',
        'AGENT_NAME_TOO_LONG',
        400
      );
    }

    if (metadata.description.length > 1000) {
      throw new AgentChainError(
        'Agent description cannot exceed 1000 characters',
        'AGENT_DESCRIPTION_TOO_LONG',
        400
      );
    }
  }

  /**
   * Generate a unique ID for agents
   */
  private generateId(): string {
    return 'agent_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
} 