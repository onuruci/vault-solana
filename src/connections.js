import Wallet from "@project-serum/sol-wallet-adapter";
import {
  Connection,
  SystemProgram,
  Transaction,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { deserialize, serialize } from "borsh";

import { Vault } from "./Vault";
import { WithdrawRequest } from "./Withdrawal";

const cluster = "https://api.devnet.solana.com";
const connection = new Connection(cluster, "confirmed");
const wallet = new Wallet("https://solflare.com/access-wallet");
const programId = new PublicKey("67CENuySfdUZwbGuc32PU761g5KVktkQC1oUgsXWrZcg");


/*
  Builds the transaction from instructions.
  Generates a new transaction object, add instructions
  Sets fee payer and recentblockhash
  Returns the Transaction object
*/
export async function setPayerAndBlockhashTransaction(instructions) {
  const transaction = new Transaction();
  instructions.forEach((element) => {
    transaction.add(element);
  });
  transaction.feePayer = wallet.publicKey;
  let hash = await connection.getRecentBlockhash();
  transaction.recentBlockhash = hash.blockhash;
  return transaction;
}

/*
  Gets a transaction object as input.
  Calls wallet to sign the transaction.
  Serializes the signed transaction and sends it to blockchain
*/
export async function signAndSendTransaction(transaction) {
  try {
    console.log("start signAndSendTransaction");
    let signedTransaction = await wallet.signTransaction(transaction);
    console.log("signed transaction");
    let signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    );
    return signature;
  } catch (err) {
    throw err;
  }
}

/*
  Simple function to connect wallet if not connected.
  This function is called in user called functions,
  If user is not connected with wallet, it pops up wallet connection.
*/
async function checkWallet() {
  if (!wallet.connected) {
    await wallet.connect();
  }
}


/* 
  Function to generate a new vault.
  Generates a new PDA, enters required information
*/
export async function createCampaign(name) {
  await checkWallet();
  const SEED = "abcdef" + Math.random().toString();
  let newAccount = await PublicKey.createWithSeed(
    wallet.publicKey,
    SEED,
    programId
  );

  let newVault = new Vault({
    name: name,
    description: "description",
    image_link: "image_link",
    admin: wallet.publicKey.toBuffer(),
    amount_donated: 0,
  });

  console.log(newVault);

  let data = serialize(Vault.schema, newVault);
  let data_to_send = new Uint8Array([0, ...data]);

  const lamports = await connection.getMinimumBalanceForRentExemption(
    data.length
  );

  const createProgramAccount = SystemProgram.createAccountWithSeed({
    fromPubkey: wallet.publicKey,
    basePubkey: wallet.publicKey,
    seed: SEED,
    newAccountPubkey: newAccount,
    lamports: lamports,
    space: data.length,
    programId: programId,
  });

  const instructionTOOurProgram = new TransactionInstruction({
    keys: [
      { pubkey: newAccount, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
    ],
    programId: programId,
    data: data_to_send,
  });

  const transaction_to_send = await setPayerAndBlockhashTransaction([
    createProgramAccount,
    instructionTOOurProgram,
  ]);

  const signature = await signAndSendTransaction(transaction_to_send);
  const result = await connection.confirmTransaction(signature);
  console.log("end sendMessage", result);
}

export const getVaults = async (setVaults) => {
  let accounts = await connection.getProgramAccounts(programId);
  let vaults = [];

  accounts.forEach((e) => {
    try {
      let vaultData = deserialize(Vault.schema, Vault, e.account.data);
      vaults.push({
        pubId: e.pubkey,
        admin: vaultData.admin,
        name: vaultData.name,
        amount: vaultData.amount,
      });
    } catch (err) {
      console.log(err);
    }
  });
  console.log(accounts);
  setVaults([...vaults]);
};

export const addLamports = async (address) => {
  await checkWallet();
  const SEED = "Hello" + Math.random().toString();
  let newAccount = await PublicKey.createWithSeed(
    wallet.publicKey,
    SEED,
    programId
  );

  const createDonationControlAccount = SystemProgram.createAccountWithSeed({
    fromPubkey: wallet.publicKey,
    basePubkey: wallet.publicKey,
    seed: SEED,
    newAccountPubkey: newAccount,
    lamports: 100000000,
    space: 10,
    programId: programId,
  });

  // const sendLamportsToPDA = SystemProgram.transfer({
  //   fromPubkey: wallet.publicKey,
  //   toPubkey: newAccount,
  //   lamports: 1000000,
  //   programId: programId,
  // });

  const instructionTOOurProgram = new TransactionInstruction({
    keys: [
      { pubkey: address, isSigner: false, isWritable: true },
      { pubkey: newAccount, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true },
    ],
    programId: programId,
    data: new Uint8Array([2, 2, 3, 4]),
  });

  const transaction_to_send = await setPayerAndBlockhashTransaction([
    createDonationControlAccount,
    instructionTOOurProgram,
  ]);

  const signature = await signAndSendTransaction(transaction_to_send);
  console.log("Signed");
  const result = await connection.confirmTransaction(signature);
  console.log("end sendMessage", result);
};

export const withdrawFunds = async (address) => {
  await checkWallet();

  let withdrawRequest = new WithdrawRequest({ amount: 1000000 });
  let data = serialize(WithdrawRequest.schema, withdrawRequest);
  let data_to_send = new Uint8Array([1, ...data]);

  const instructionTOOurProgram = new TransactionInstruction({
    keys: [
      { pubkey: address, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true },
    ],
    programId: programId,
    data: data_to_send,
  });

  const transaction_to_send = await setPayerAndBlockhashTransaction([
    instructionTOOurProgram,
  ]);

  const signature = await signAndSendTransaction(transaction_to_send);
  const result = await connection.confirmTransaction(signature);
};
