import { PrivateKey, AccountCreateTransaction, Hbar, TransferTransaction, Client } from '@hashgraph/sdk'
import dotenv from 'dotenv'
import fs from 'fs'
import { loadAccounts } from '../utils.js'

dotenv.config()

const fileName = 'accounts.json'

/**
 * Creates an account and returns it's ID and keys
 * @param {Client} client Hedera Client object
 *
 * @typedef {Object} accountData
 * @property {string} id Account ID (0.0.xxx)
 * @property {string} privateKey Private key
 * @property {string} publicKey Public key
 * @returns {Promise<mintedNfts>}
 */
export async function createAccount(client) {
  const newAccountPrivateKey = PrivateKey.generateED25519()
  const newAccountPublicKey = newAccountPrivateKey.publicKey

  // Create a new account
  const newAccount = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(150)
    .execute(client)

  // Get the new account ID
  const getReceipt = await newAccount.getReceipt(client)
  const newAccountId = getReceipt.accountId

  const id = `${newAccountId.shard.low}.${newAccountId.realm.low}.${newAccountId.num.low}`
  const account = {
    id,
    privateKey: newAccountPrivateKey.toStringRaw(),
    publicKey: newAccountPublicKey.toStringRaw()
  }

  try {
    const data = fs.readFileSync(fileName)
    const accData = JSON.parse(data)
    accData.accounts.push(account)
    fs.writeFileSync(fileName, JSON.stringify(accData, null, 2))
  } catch (error) {
    const accData = {
      accounts: [account]
    }
    fs.writeFileSync(fileName, JSON.stringify(accData, null, 2))
  }

  return account
}

/**
 *
 * @typedef {Object} transactionDetails
 * @property {string} from Account ID of the sender
 * @property {string} privateKey Private key of the sender
 * @property {string} to Account ID of the recipient
 * @property {number} amount Amount of HBAR to transfer
 *
 * @param {transactionDetails} transactionDetails
 * @returns
 */
export async function transferFunds({ from, privateKey, to, amount }) {
  const client = Client.forName('testnet')
  client.setOperator(from, privateKey)

  // Create a transaction to transfer hbars
  const transaction = new TransferTransaction()
    .addHbarTransfer(from, new Hbar(-amount))
    .addHbarTransfer(to, new Hbar(amount))

  // Submit the transaction to a Hedera network
  const txResponse = await transaction.execute(client)

  // Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client)

  // Get the transaction consensus status
  const transactionStatus = receipt.status.toString()

  console.log('The transaction consensus status is ' + transactionStatus)

  return receipt.status
}

async function main() {
  const accountId = process.env.ACCOUNT_ID
  const privateKey = process.env.PRIVATE_KEY

  if (!accountId || !privateKey) {
    throw new Error('Account ID or Private Key missing!')
  }

  const client = Client.forName('testnet')
  client.setOperator(accountId, privateKey)

  // get the list of existing accounts
  const accountList = loadAccounts()

  if (!accountList.length) {
    for (let index = 0; index < 5; index++) {
      accountList.push(await createAccount(client))
    }
  }

  process.exit(0)
}

dotenv.config()

await main()
