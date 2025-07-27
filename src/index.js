import WebSocket from 'ws';
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import solanaRPC from './lib/rpc.js';
import { DEFAULT_COMMITMENT, MOONIT_PROGRAM_ID, RAYDIUM_AMM_PROGRAM_ID } from './constants.js';
import RaydiumAmmParser from './lib/parsers/raydium-amm-parser.js';
import { SolanaParser } from '@shyft-to/solana-transaction-parser';
import { loadSupportedProgramDetails, parseCompiledInstruction, generateDummyWallet } from './lib/utils.js';

const solanaParser = new SolanaParser([]);
const raydiumAmmParser = new RaydiumAmmParser();

(async () => {
  const dummyWallet = generateDummyWallet();
  const connection = solanaRPC.getConnection();
  const supportedPrograms = await loadSupportedProgramDetails();
  const anchorProvider = new AnchorProvider(connection, dummyWallet, { commitment: DEFAULT_COMMITMENT });

  solanaParser.addParser(new PublicKey(RAYDIUM_AMM_PROGRAM_ID), raydiumAmmParser.parseInstruction.bind(raydiumAmmParser));
  solanaParser.addParser(new PublicKey(MOONIT_PROGRAM_ID), raydiumAmmParser.parseInstruction.bind(raydiumAmmParser));

  let subscriptionId = connection.onSlotChange(async (slotInfo) => {
    try {
      const blockData = await solanaRPC.getBlock(slotInfo.slot);

      if (blockData && blockData.transactions) {
        for (const tx of blockData.transactions) {
          if (tx.meta?.err) {
            continue;
          }
          if (!tx.transaction || !tx.transaction.message) {
            continue;
          }

          // @ts-ignore
          const accountKeys = tx.transaction.message.accountKeys ? tx.transaction.message.accountKeys : tx.transaction.message.staticAccountKeys;

          for (const ix of tx.transaction.message.compiledInstructions) {
            const parsedInstruction = parseCompiledInstruction(ix, accountKeys, tx.transaction.message);
            if (!parsedInstruction) continue;
            const { programId, resolvedAccounts, dataBuffer } = parsedInstruction;

            const supportedProgram = supportedPrograms[programId];
            if (!supportedPrograms[programId]?.enabled) continue;

            console.log(`programId ${programId}`);

            if (supportedProgram.parser === 'anchor') {
              const program = new Program(supportedProgram.idl, anchorProvider);
              // @ts-ignore
              const decoded = program.coder.instruction.decode(dataBuffer);
              console.log(decoded);
            } else if (supportedProgram.parser === 'raydium') {
              // @ts-ignore
              const decoded = solanaParser.parseTransactionWithInnerInstructions(tx);
              console.log(decoded);
            }
          }
        }

      }
    } catch (error) {
      console.error(error);
    }
  });

  process.on("SIGINT", async () => {
    // @ts-ignore
    if (subscriptionId > -1 && connection._rpcWebSocket?.socket?._readyState === WebSocket.OPEN) {
      await connection.removeSlotChangeListener(subscriptionId);
    }
    process.exit();
  });
})();
