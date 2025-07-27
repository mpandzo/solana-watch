import { Keypair } from "@solana/web3.js";
import { MOONIT_PROGRAM_ID, PUMPFUN_PROGRAM_ID, PUMPSWAP_AMM_PROGRAM_ID, RAYDIUM_AMM_PROGRAM_ID, RAYDIUM_LAUNCHPAD_PROGRAM_ID } from "../constants.js";
import { readFile } from 'fs/promises';

const loadJson = async (jsonPath) => {
  const jsonText = await readFile(new URL(jsonPath, import.meta.url), 'utf8');
  return JSON.parse(jsonText);
}

const parseCompiledInstruction = (ix, accountKeys, message) => {
  if (!ix || !accountKeys || !message) {
    throw new Error('Invalid instruction inputs');
  }

  if (ix.programIdIndex >= accountKeys.length) {
    throw new Error('Instruction programIdIndex out of bounds');
  }

  if (!Array.isArray(ix.accountKeyIndexes)) {
    throw new Error('Missing instruction accountKeyIndexes')
  }

  if (!ix.data) {
    throw new Error('Missing instruction data');
  }

  try {
    const programId = accountKeys[ix.programIdIndex].toBase58();

    const resolvedAccounts = ix.accountKeyIndexes.map((i) => ({
      pubkey: accountKeys[i],
      isSigner: message.isAccountSigner(i),
      isWritable: message.isAccountWritable(i),
    }));

    let dataBuffer;
    if (!Buffer.isBuffer(ix.data)) {
      dataBuffer = Buffer.from(ix.data, 'base64');
    } else {
      dataBuffer = ix.data;
    }

    return {
      programId,
      resolvedAccounts,
      dataBuffer
    };
  } catch (error) {
    return null;
  }
}

const loadSupportedProgramDetails = async () => {
  return {
    [PUMPSWAP_AMM_PROGRAM_ID]: {
      parser: 'anchor',
      enabled: false,
      idl: await loadJson('../idls/pumpswap.json'),
      commands: {
        buy: 'buy',
        sell: 'sell',
        create: 'createPool'
      }
    },
    [PUMPFUN_PROGRAM_ID]: {
      parser: 'anchor',
      enabled: true,
      idl: await loadJson('../idls/pumpfun.json'),
      commands: {
        buy: 'buy',
        sell: 'sell',
        create: 'create',
      }
    },
    [MOONIT_PROGRAM_ID]: {
      parser: 'raydium',
      enabled: false,
      idl: null,
      commands: {
        buy: 'buy',
        sell: 'sell',
        create: 'initialize',
      }
    },
    [RAYDIUM_LAUNCHPAD_PROGRAM_ID]: {
      parser: 'anchor',
      enabled: false,
      idl: await loadJson('../idls/raydium_launchpad.json'),
      commands: {
        buy: ['buyExactIn', 'buyExactOut'],
        sell: ['sellExactIn', 'sellExactOut'],
        create: 'initialize',
      }
    },
    [RAYDIUM_AMM_PROGRAM_ID]: {
      parser: 'raydium',
      enabled: false,
      idl: null,
      commands: {
        buy: ['swapBaseIn', 'swapBaseOut'],
        sell: ['swapBaseIn', 'swapBaseOut'],
        create: ['initialize', 'initialize2'],
      }
    }
  }
}

const generateDummyWallet = () => {
  const dummyKeypair = Keypair.generate();
  const dummyWallet = {
    publicKey: dummyKeypair.publicKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
    payer: dummyKeypair
  }

  return dummyWallet;
}

export {
  parseCompiledInstruction,
  loadSupportedProgramDetails,
  loadJson,
  generateDummyWallet
}
