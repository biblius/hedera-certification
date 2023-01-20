import { TransferTransaction, Hbar, Client, AccountAllowanceApproveTransaction, PrivateKey, TransactionId, AccountBalanceQuery } from '@hashgraph/sdk'
import dotenv from 'dotenv'
import { loadAccounts, sleep } from '../utils.js'

dotenv.config()

const accounts = loadAccounts()

const account1 = accounts[0]
const account2 = accounts[1]
const account3 = accounts[2]

const client = Client.forTestnet()
client.setOperator(account2.id, account2.privateKey)
client.setDefaultMaxTransactionFee(new Hbar(10))

async function createAllowance() {
  const tx = await new AccountAllowanceApproveTransaction()
    .approveHbarAllowance(account1.id, account2.id, new Hbar(20))
    .freezeWith(client)
    .sign(PrivateKey.fromString(account1.privateKey))

  const allowanceSubmit = await tx.execute(client)
  return allowanceSubmit.getReceipt(client)
}

async function spendAllowance() {
  const approvedSendTx = await new TransferTransaction()
    .addApprovedHbarTransfer(account1.id, new Hbar(-20))
    .addHbarTransfer(account3.id, new Hbar(20))
    .setTransactionId(TransactionId.generate(account2.id))
    .freezeWith(client)
    .sign(PrivateKey.fromString(account2.privateKey))

  const approvedSendSubmit = await approvedSendTx.execute(client)
  return approvedSendSubmit.getReceipt(client)
}

async function printBalance(accountId) {
  const balanceCheckTx = await new AccountBalanceQuery().setAccountId(accountId).execute(client)
  console.log(`- Account ${accountId}: ${balanceCheckTx.hbars.toString()}`)
}

async function main() {
  const createAllowanceReceipt = await createAllowance()
  console.log('Successfully created allowance', createAllowanceReceipt)

  await sleep(5000)

  const spentAllowanceReceipt = await spendAllowance()
  console.log('Successfully spent allowance', spentAllowanceReceipt)

  await sleep(5000)

  await printBalance(account1.id)
  await printBalance(account2.id)
  await printBalance(account3.id)
  process.exit()
}

main().catch((error) => console.log(`Error: ${error}`))
