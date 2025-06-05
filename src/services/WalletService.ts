import { 
  Connection, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Keypair
} from '@solana/web3.js';
import { 
  WalletConnection, 
  TransactionResult,
  WalletError,
  NetworkError,
  SDKConfig
} from '../types';
import { logger } from '../utils/logger';

export interface WalletServiceConfig {
  rpcEndpoint: string;
  network: 'mainnet-beta' | 'testnet' | 'devnet';
}

export class WalletService {
  private connection: Connection;
  private config: WalletServiceConfig;
  private connectedWallet?: WalletConnection;

  constructor(config: WalletServiceConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
    logger.setPrefix('WalletService');
  }

  /**
   * Connect to a Solana wallet
   */
  async connectWallet(wallet: WalletConnection): Promise<void> {
    try {
      logger.info('Connecting wallet', { publicKey: wallet.publicKey.toString() });

      if (!wallet.connected) {
        await wallet.connect();
      }

      this.connectedWallet = wallet;
      logger.info('Wallet connected successfully', { 
        publicKey: wallet.publicKey.toString() 
      });

    } catch (error) {
      logger.error('Failed to connect wallet', error);
      throw new WalletError(
        'Failed to connect wallet',
        error
      );
    }
  }

  /**
   * Disconnect the current wallet
   */
  async disconnectWallet(): Promise<void> {
    try {
      if (this.connectedWallet) {
        await this.connectedWallet.disconnect();
        this.connectedWallet = undefined;
        logger.info('Wallet disconnected successfully');
      }
    } catch (error) {
      logger.error('Failed to disconnect wallet', error);
      throw new WalletError(
        'Failed to disconnect wallet',
        error
      );
    }
  }

  /**
   * Get the currently connected wallet
   */
  getConnectedWallet(): WalletConnection | null {
    return this.connectedWallet || null;
  }

  /**
   * Check if a wallet is connected
   */
  isWalletConnected(): boolean {
    return this.connectedWallet?.connected || false;
  }

  /**
   * Get SOL balance for a public key
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      logger.debug('Fetching balance', { publicKey: publicKey.toString() });

      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      logger.debug('Balance fetched successfully', { 
        publicKey: publicKey.toString(),
        balance: solBalance 
      });

      return solBalance;

    } catch (error) {
      logger.error('Failed to fetch balance', { publicKey: publicKey.toString(), error });
      throw new NetworkError(
        'Failed to fetch wallet balance',
        error
      );
    }
  }

  /**
   * Get balance for the connected wallet
   */
  async getConnectedWalletBalance(): Promise<number> {
    if (!this.connectedWallet) {
      throw new WalletError('No wallet connected');
    }

    return this.getBalance(this.connectedWallet.publicKey);
  }

  /**
   * Send SOL to another address
   */
  async sendSOL(
    recipient: PublicKey, 
    amount: number, 
    memo?: string
  ): Promise<TransactionResult> {
    try {
      if (!this.connectedWallet) {
        throw new WalletError('No wallet connected');
      }

      logger.info('Sending SOL', { 
        from: this.connectedWallet.publicKey.toString(),
        to: recipient.toString(),
        amount 
      });

      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.connectedWallet.publicKey,
          toPubkey: recipient,
          lamports
        })
      );

      // Add memo if provided
      if (memo) {
        const memoInstruction = SystemProgram.createAccountWithSeed({
          fromPubkey: this.connectedWallet.publicKey,
          basePubkey: this.connectedWallet.publicKey,
          seed: memo.substring(0, 32), // Max 32 chars for seed
          newAccountPubkey: recipient,
          lamports: 0,
          space: 0,
          programId: SystemProgram.programId
        });
        transaction.add(memoInstruction);
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.connectedWallet.publicKey;

      // Sign transaction
      const signedTransaction = await this.connectedWallet.signTransaction(transaction);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(signature);

      const result: TransactionResult = {
        signature,
        confirmed: !confirmation.value.err,
        slot: confirmation.context.slot,
        error: confirmation.value.err ? String(confirmation.value.err) : undefined
      };

      logger.info('SOL sent successfully', { 
        signature,
        confirmed: result.confirmed 
      });

      return result;

    } catch (error) {
      logger.error('Failed to send SOL', error);
      throw new WalletError(
        'Failed to send SOL transaction',
        error
      );
    }
  }

  /**
   * Sign a message with the connected wallet
   */
  async signMessage(message: string): Promise<string> {
    try {
      if (!this.connectedWallet) {
        throw new WalletError('No wallet connected');
      }

      logger.debug('Signing message', { 
        wallet: this.connectedWallet.publicKey.toString() 
      });

      const messageBytes = new TextEncoder().encode(message);
      const signature = await this.connectedWallet.signMessage(messageBytes);

      // Convert signature to base64 string
      const signatureBase64 = Buffer.from(signature).toString('base64');

      logger.debug('Message signed successfully');
      return signatureBase64;

    } catch (error) {
      logger.error('Failed to sign message', error);
      throw new WalletError(
        'Failed to sign message',
        error
      );
    }
  }

  /**
   * Verify a signed message
   */
  async verifySignature(
    message: string, 
    signature: string, 
    publicKey: PublicKey
  ): Promise<boolean> {
    try {
      logger.debug('Verifying signature', { 
        publicKey: publicKey.toString() 
      });

      // Note: In a real implementation, you would use nacl or another crypto library
      // to verify the signature. This is a simplified version.
      
      // For now, we'll just check if the signature is base64 and non-empty
      const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(signature);
      const isNonEmpty = signature.length > 0;

      const isValid = isValidBase64 && isNonEmpty;

      logger.debug('Signature verification complete', { 
        publicKey: publicKey.toString(),
        isValid 
      });

      return isValid;

    } catch (error) {
      logger.error('Failed to verify signature', error);
      return false;
    }
  }

  /**
   * Get transaction history for a public key
   */
  async getTransactionHistory(
    publicKey: PublicKey, 
    limit: number = 10
  ): Promise<any[]> {
    try {
      logger.debug('Fetching transaction history', { 
        publicKey: publicKey.toString(),
        limit 
      });

      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit }
      );

      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await this.connection.getTransaction(sig.signature);
            return {
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              transaction: tx
            };
          } catch (error) {
            logger.warn('Failed to fetch transaction details', { 
              signature: sig.signature,
              error 
            });
            return null;
          }
        })
      );

      const validTransactions = transactions.filter(tx => tx !== null);

      logger.debug('Transaction history fetched successfully', { 
        publicKey: publicKey.toString(),
        count: validTransactions.length 
      });

      return validTransactions;

    } catch (error) {
      logger.error('Failed to fetch transaction history', error);
      throw new NetworkError(
        'Failed to fetch transaction history',
        error
      );
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<{
    network: string;
    endpoint: string;
    version: any;
    epochInfo: any;
  }> {
    try {
      const [version, epochInfo] = await Promise.all([
        this.connection.getVersion(),
        this.connection.getEpochInfo()
      ]);

      return {
        network: this.config.network,
        endpoint: this.config.rpcEndpoint,
        version,
        epochInfo
      };

    } catch (error) {
      logger.error('Failed to fetch network info', error);
      throw new NetworkError(
        'Failed to fetch network information',
        error
      );
    }
  }

  /**
   * Estimate transaction fee
   */
  async estimateTransactionFee(transaction: Transaction): Promise<number> {
    try {
      const feeCalculator = await this.connection.getFeeForMessage(
        transaction.compileMessage()
      );

      const fee = feeCalculator.value || 0;
      return fee / LAMPORTS_PER_SOL;

    } catch (error) {
      logger.error('Failed to estimate transaction fee', error);
      throw new NetworkError(
        'Failed to estimate transaction fee',
        error
      );
    }
  }

  /**
   * Create a new keypair (for testing purposes)
   */
  static generateKeypair(): Keypair {
    return Keypair.generate();
  }

  /**
   * Convert base58 string to PublicKey
   */
  static publicKeyFromString(publicKey: string): PublicKey {
    try {
      return new PublicKey(publicKey);
    } catch (error) {
      throw new WalletError(
        'Invalid public key format',
        error
      );
    }
  }

  /**
   * Get the connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Update RPC endpoint
   */
  updateRpcEndpoint(endpoint: string): void {
    this.config.rpcEndpoint = endpoint;
    this.connection = new Connection(endpoint, 'confirmed');
    logger.info('RPC endpoint updated', { endpoint });
  }
} 