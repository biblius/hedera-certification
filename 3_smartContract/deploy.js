import {
  Client,
  FileCreateTransaction,
  ContractCreateTransaction,
  PrivateKey
} from '@hashgraph/sdk'
import dotenv from 'dotenv'
import { loadAccounts } from '../utils.js'
import fs from 'fs'

dotenv.config()

const accounts = loadAccounts()
const account1 = accounts[0]

const accountId = account1.id
const privateKey = PrivateKey.fromString(account1.privateKey)

// If we weren't able to grab it, we should throw a new error
if (accountId == null ||
  privateKey == null) {
  throw new Error('Variables accountId and privateKey must be present and initialised to valid values')
}

// Connect to the network
const client = Client.forTestnet()
client.setOperator(accountId, privateKey)

async function main() {
  const compiled = JSON.parse(fs.readFileSync('./3_smartContract/contract.json'))
  const bytecode = compiled.bytecode

  // Create a file on Hedera and store the hex-encoded bytecode
  const fileCreateTx = new FileCreateTransaction()
    // Set the bytecode of the contract
    .setContents(bytecode)

  // Submit the file to the Hedera test network signing with the transaction fee payer key specified with the client
  const submitTx = await fileCreateTx.execute(client)

  // Get the receipt of the file create transaction
  const fileReceipt = await submitTx.getReceipt(client)

  // Get the file ID from the receipt
  const bytecodeFileId = fileReceipt.fileId

  // Log the file ID
  console.log('The smart contract byte code file ID is ' + bytecodeFileId)

  // Instantiate the contract instance
  const contractTx = new ContractCreateTransaction()
    // Set the file ID of the Hedera file storing the bytecode
    .setBytecodeFileId(bytecodeFileId)
    // Set the gas to instantiate the contract
    .setGas(100000)

  // Submit the transaction to the Hedera test network
  const contractResponse = await contractTx.execute(client)

  // Get the receipt of the file create transaction
  const contractReceipt = await contractResponse.getReceipt(client)

  // Get the smart contract ID
  const newContractId = contractReceipt.contractId

  // Log the smart contract ID
  console.log('The smart contract ID is ' + newContractId)

  process.exit(0)
}

main()
