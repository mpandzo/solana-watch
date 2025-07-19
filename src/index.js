import rpcConnection from "./lib/rpc.js";
import WebSocket from 'ws';

(async () => {
  const connection = rpcConnection.getConnection();

  let subscriptionId = connection.onSlotChange(async (slotInfo) => {
    try {
      console.log(`Obtained ${slotInfo.slot}`);
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
