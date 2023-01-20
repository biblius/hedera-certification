import {
  TransferTransaction,
  Client,
  TokenAssociateTransaction,
  Wallet,
  PrivateKey,
  TokenPauseTransaction,
  TokenUnpauseTransaction
} from '@hashgraph/sdk'
import dotenv from 'dotenv'
import { loadAccounts } from '../utils.js'

dotenv.config()

const tokenId = process.env.TOKEN_ID

// Initialise accounts from the accounts file generated in setup
const accounts = loadAccounts()
if (!accounts || accounts.length === 0) {
  throw new Error('Accounts must be initialised (npm run setup)')
}

const account1 = accounts[0]
const account3 = accounts[2]
const account4 = accounts[3]

// Init private keys for wallet and associate transactions
const privKey1 = PrivateKey.fromString(account1.privateKey)
const privKey3 = PrivateKey.fromString(account3.privateKey)
const privKey4 = PrivateKey.fromString(account4.privateKey)

// Init the client with Account 1
const client = Client.forTestnet()
client.setOperator(account1.id, account1.privateKey)

// Init wallets for account 3 and 4
const wallet3 = new Wallet(
  account3.id,
  privKey3
)

const wallet4 = new Wallet(
  account4.id,
  privKey4
)

/**
 * First associate Account 3 and 4 with the token generated from the previous step
 */
async function main() {
  //  Before an account that is not the treasury for a token can receive or send this specific token ID, the account
  //  must become “associated” with the token.
  const associateAcc3Tx = await new TokenAssociateTransaction()
    .setAccountId(wallet3.accountId)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(privKey3)

  const associateAcc4Tx = await new TokenAssociateTransaction()
    .setAccountId(wallet4.accountId)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(privKey4)

  // Submit the transactions
  const associateAcc3Submit = await associateAcc3Tx.execute(client)
  const associateAcc4Submit = await associateAcc4Tx.execute(client)

  // Obtain the receipt
  const associateAcc3Rx = await associateAcc3Submit.getReceipt(client)
  const associateAcc4Rx = await associateAcc4Submit.getReceipt(client)

  console.log(`- Token association with Account 3: ${associateAcc3Rx.status} \n`)
  console.log(`- Token association with Account 4: ${associateAcc4Rx.status} \n`)

  // Create the transfer transaction
  const transaction = new TransferTransaction()
    .addTokenTransfer(tokenId, client.operatorAccountId, -5050)
    .addTokenTransfer(tokenId, wallet3.accountId, 2525)
    .addTokenTransfer(tokenId, wallet4.accountId, 2525)
    .freezeWith(client)

  // Sign with the sender account (Account 1) private key
  const signTx = await transaction.sign(privKey1)

  // Submit the transaction to the network
  const txResponse = await signTx.execute(client)

  // Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client)

  // Obtain the transaction consensus status
  const transactionStatus = receipt.status

  console.log('The transaction consensus status ' + transactionStatus.toString())

  // Create a token pause transaction and sign it with account 1
  const pauseTx = await new TokenPauseTransaction({
    tokenId
  }).execute(client)

  const pauseReceipt = await pauseTx.getReceipt(client)

  console.log('Executed pause token tx with status: ', pauseReceipt.status)

  const failingTx = await new TransferTransaction()
    .addTokenTransfer(tokenId, client.operatorAccountId, -135)
    .addTokenTransfer(tokenId, wallet3.accountId, 135)
    .execute(client)

  // We are expecting this to fail so we have to wrap it in a try catch
  try {
    const failingReceipt = await failingTx.getReceipt(client)
    console.log('Attempted to execute token transfer on paused token:', failingReceipt.status)
  } catch (err) {
    console.warn('Expected error occurred:', err)
  }

  const unpauseTx = await new TokenUnpauseTransaction({
    tokenId
  }).execute(client)

  const unpauseReceipt = await unpauseTx.getReceipt(client)

  console.log('Sccessfully unpaused token with status:', unpauseReceipt.status)

  const finalTx = await new TransferTransaction()
    .addTokenTransfer(tokenId, client.operatorAccountId, -135)
    .addTokenTransfer(tokenId, wallet3.accountId, 135)
    .execute(client)
  const finalReceipt = await finalTx.getReceipt(client)

  console.log('Sccessfully transfered tokens with status:', finalReceipt.status)

  process.exit(0)
}

await main()
