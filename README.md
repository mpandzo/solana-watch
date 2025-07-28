# Solana Watch

Solana Watch lets you observe and parse Solana transactions from PumpFun, PumpSwap, MoonIt, Raydium and Raydium Launchpad in real time.

## Prerequisites

- Node v20.18.1 or newer is required to run this code.
- Create a `.env` file in the root directory with your HTTP and WSS RPC urls set as follows:

```
HTTP_RPC_URL=
WSS_RPC_URL=
```

## Installation

```
yarn install
```

## How to run

```
node src/index.js
```

## Background

We can listen to changes from a Solana RPC node in real time by subscribing to the RPC PubSub Websocket. Several subscription methods are available as documented in the [official docs](https://solana.com/docs/rpc/websocket). I found that for the purpose of this task, the best and most widely supported method, as far as RPC node providers are concerned, is the `onSlotChange` method.

The `onSlotChange` method notifies the subscriber whenever a new slot is available. A single slot can be associated with at most one block, and each individual block can contain zero or more transactions.

### Solana transactions

A Solana transaction contains one or more instructions. Each instruction specifies which program (on-chain executable) to run, what action to perform, and which accounts are affected. The program defines the rules and logic for interpreting the instruction and accessing or modifying those accounts. Accounts, on the other hand, are data storage units on the blockchain that have an owner (usually the program) and can store balances or other information.

Once we have a slot id, we can check whether the slot is associated with a block by calling the RPC HTTP `getBlock` method which returns the block, if any, and all of its transactions. Each transaction contains instructions in serialized form where each instruction typically looks like the following:

```
{
  programIdIndex: 11,
  accountKeyIndexes: [ 0, 8 ],
  data: <Buffer 02 00 00 00 40 42 0f 00 00 00 00 00>
}
```

Instruction data - which is stored in raw binary form on the node - is sent in Base64-encoded form because JSON does not nativelly support binary form. We use the solana/web3.js library which automatically decodes the Base64-encoded data into Buffer when it parses the response.

### Parsing

Instruction data is stored on the node in binary form to conserve space. For example, a PublicKey like `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` takes up 32 bytes and an integer like `1` takes up 1 byte when serialized. This is a lot more compact than storing the same data in plain JSON. However, in order to correctly deserialize this binary data, we must know:
- the type of the variables
- the order in which they were serialized
- whether any custom encoding schemas were used

To parse instruction data we can make use of [IDLs](https://solana.com/developers/courses/onchain-development/intro-to-anchor-frontend). An IDL (Interface Description Language) specifies a program's public interface by defining the program's specific account structures, instructions and error codes. For many programs you can view the program idl on solscan e.g.
[https://solscan.io/account/pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA#anchorProgramIdl](https://solscan.io/account/pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA#anchorProgramIdl).

If a program is written with Anchor, we can use the corresponding IDL and the `@coral-xyz/anchor` library to decode the instructions. If not, or if decoding with the anchor library fails, we have to resort to writing our own decoder to achieve the same.

Anchor works out of the box in the case of PumpFun, PumpSwap and Raydium Launchpad, while we had to use a custom parser to deserialize instructions from Raydium and MoonIt.

## References

- https://solana.com/docs/rpc/websocket
- https://solana.com/developers/courses/onchain-development/intro-to-anchor-frontend
- https://www.anchor-lang.com/
- https://solscan.io/account/pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA#anchorProgramIdl

## Acknowledgments

The custom RaydiumAmmParser was borrowed from [valiantrao](https://github.com/valiantrao/solana-tx-parser/tree/6c7f6afca0e10773e13eb9789ac6e309e1aaf461).
