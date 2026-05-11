const { Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const db = require('../utils/fileDb');

const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(rpcUrl, 'confirmed');

const treasuryWalletStr = process.env.PROTOCOL_TREASURY_WALLET;
const treasuryWallet = treasuryWalletStr ? new PublicKey(treasuryWalletStr) : null;

let treasuryKeypair = null;
if (process.env.TREASURY_SECRET_KEY) {
  try {
    const secretKeyArray = JSON.parse(process.env.TREASURY_SECRET_KEY);
    treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
  } catch (err) {
    console.error('Failed to parse TREASURY_SECRET_KEY', err);
  }
}

/**
 * Verify that a transaction signature exists, is confirmed, and transferred the expected amount to the treasury.
 */
async function verifyLockTransaction(signature, expectedSenderPubKeyStr, expectedAmountLamports) {
  try {
    const tx = await connection.getParsedTransaction(signature, 'confirmed');
    if (!tx) {
      return { success: false, error: 'Transaction not found or not confirmed' };
    }

    if (tx.meta && tx.meta.err) {
      return { success: false, error: 'Transaction failed on chain' };
    }

    // Strict verification for MVP: check system program transfer instructions
    let amountReceived = 0;
    let senderMatched = false;
    let receiverMatched = false;

    // A transaction might have multiple instructions, we look for the one transferring to the treasury
    for (const ix of tx.transaction.message.instructions) {
      if (ix.program === 'system' && ix.parsed && ix.parsed.type === 'transfer') {
        const info = ix.parsed.info;
        if (info.destination === treasuryWalletStr) {
          receiverMatched = true;
          if (info.source === expectedSenderPubKeyStr) {
            senderMatched = true;
            amountReceived += info.lamports;
          }
        }
      }
    }

    if (!receiverMatched) {
      return { success: false, error: 'Transaction did not send funds to the protocol treasury' };
    }

    if (!senderMatched) {
      return { success: false, error: 'Transaction was not sent from the connected wallet' };
    }

    if (amountReceived < expectedAmountLamports) {
       return { success: false, error: `Amount received ${amountReceived} is less than expected ${expectedAmountLamports}` };
    }

    return { success: true, amountReceived };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send SOL from treasury back to user (Refund/Release)
 */
async function sendRefund(userWalletStr, amountLamports) {
  if (!treasuryKeypair) {
    console.warn('Cannot send refund: TREASURY_SECRET_KEY not configured.');
    return { success: false, error: 'Treasury key not configured' };
  }

  try {
    const toPublicKey = new PublicKey(userWalletStr);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: amountLamports,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair]);
    return { success: true, signature };
  } catch (error) {
    console.error('Error sending refund:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  verifyLockTransaction,
  sendRefund,
  treasuryWalletStr
};
