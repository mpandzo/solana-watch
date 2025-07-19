import { Connection } from "@solana/web3.js";
import dotenv from 'dotenv';
import { DEFAULT_COMMITMENT } from "../constants.js";

dotenv.config();

console.log

class RpcConnection {
  static instance = null;

  constructor() {
    if (RpcConnection.instance) {
      return RpcConnection.instance;
    }

    this.connection = null;

    RpcConnection.instance = this;
  }

  getConnection() {
    if (!this.connection) {
      this.connection = new Connection(
        process.env.HTTP_RPC_URL,
        {
          wsEndpoint: process.env.WSS_RPC_URL,
          commitment: DEFAULT_COMMITMENT
        },
      )
    }
    return this.connection;
  }

  recreateConnection() {
    this.connection = new Connection(
      process.env.HTTP_RPC_URL,
      {
        wsEndpoint: process.env.WSS_RPC_URL,
        commitment: DEFAULT_COMMITMENT
      },
    )
    return this.connection;
  }

  async getBlock(slot, maxRetries = 5, delayMs = 2000) {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const block = await this.connection.getBlock(slot, {
          commitment: DEFAULT_COMMITMENT,
          maxSupportedTransactionVersion: 0,
        });

        if (block) {
          return block;
        }
      } catch (error) {
        /*
        console.log(`Block not finalized for slot ${slot}. Retrying...`);
        console.log(error);
        */
      }

      retries++;

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

const rpcConnection = new RpcConnection();

export default rpcConnection;
