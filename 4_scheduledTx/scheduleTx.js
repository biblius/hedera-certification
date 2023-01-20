import { Hbar, TransferTransaction, Client, ScheduleCreateTransaction, PrivateKey, Transaction } from '@hashgraph/sdk'
import { loadAccounts, sleep } from '../utils.js'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const serializedTx = await createScheduled()

  await sleep(5000)

  const receipt = await processScheduled(serializedTx)
  console.log('Successfully created and executed scheduled transaction with status', receipt.status)

  process.exit(0)
}

async function createScheduled() {
  // Load accounts and setup client
  const accounts = loadAccounts()
  const account1 = accounts[0]
  const account2 = accounts[1]

  const client = Client.forName('testnet')
  client.setOperator(account1.id, account1.privateKey)

  // Create a child transaction to nest in the scheduled
  const trx = new TransferTransaction()
    .addHbarTransfer(account1.id, new Hbar(-10))
    .addHbarTransfer(account2.id, new Hbar(10))

  const scheduleTransaction = new ScheduleCreateTransaction()
    .setScheduledTransaction(trx)
    .setScheduleMemo('Use with caution my dude')
    .setAdminKey(PrivateKey.fromString(account1.privateKey))
    .freezeWith(client)

  const serialized = Buffer.from(scheduleTransaction.toBytes()).toString('hex')

  console.log('Serialized transaction:', serialized)

  return serialized
}

async function processScheduled(serializedTx) {
  const accounts = loadAccounts()
  const account1 = accounts[0]
  const client = Client.forName('testnet')
  client.setOperator(account1.id, account1.privateKey)

  // Deserialize the transaction
  const txn = Transaction.fromBytes(Buffer.from(serializedTx, 'hex'))

  console.log('Deserialized Transaction', txn)

  await txn.sign(PrivateKey.fromString(account1.privateKey))

  const executed = await txn.execute(client)

  return executed.getReceipt(client)
}

await main()
