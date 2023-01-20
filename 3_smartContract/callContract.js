import {
  Client,
  ContractFunctionParameters,
  ContractExecuteTransaction,
  PrivateKey
} from '@hashgraph/sdk'
import dotenv from 'dotenv'
import Web3 from 'web3'
import fs from 'fs'

dotenv.config()

const web3 = new Web3()

const myAccountId = process.env.ACCOUNT_ID
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY)
const contractId = process.env.CONTRACT_ID

// If we weren't able to grab it, we should throw a new error
if (myAccountId == null ||
  privateKey == null) {
  throw new Error('Environment variables myAccountId and privateKey must be present')
}

// Create our connection to the Hedera network
// The Hedera JS SDK makes this really easy!
const client = Client.forTestnet()

client.setOperator(myAccountId, privateKey)

async function main() {
  // Create the transaction to update the contract message
  const contractExecTx = new ContractExecuteTransaction()
    // Set the ID of the contract
    .setContractId(contractId)
    // Set the gas for the contract call
    .setGas(100000)
    // Set the contract function to call
    .setFunction('function1', new ContractFunctionParameters()
      .addUint16(6)
      .addUint16(7))

  // Submit the transaction to a Hedera network and store the response
  const submitExecTx = await contractExecTx.execute(client)

  console.log('SUBMITTED TX', submitExecTx)

  // Get the receipt of the transaction
  const receipt = await submitExecTx.getReceipt(client)

  console.log('RECEIPT', receipt)
  // Confirm the transaction was executed successfully
  console.log('The transaction status is ' + receipt.status.toString())

  const contractExecTx2 = new ContractExecuteTransaction()
    // Set the ID of the contract
    .setContractId(contractId)
    // Set the gas for the contract call
    .setGas(100000)
    // Set the contract function to call
    .setFunction('function2', new ContractFunctionParameters()
      .addUint16(420 /** Should be output from first call but cant find it */))

  const submitExecTx2 = await contractExecTx2.execute(client)

  const receipt2 = await submitExecTx2.getReceipt(client)

  console.log('Successfully executed second contract call with status', receipt2.status)

  // a record contains the output of the function
  // as well as events, let's get events for this transaction
  const record = await submitExecTx.getRecord(client)

  // the events from the function call are in record.contractFunctionResult.logs.data
  // let's parse the logs using web3.js
  // there may be several log entries
  record.contractFunctionResult.logs.forEach(log => {
    // convert the log.data (uint8Array) to a string
    const logStringHex = '0x'.concat(Buffer.from(log.data).toString('hex'))

    // get topics from log
    const logTopics = []
    log.topics.forEach(topic => {
      logTopics.push('0x'.concat(Buffer.from(topic).toString('hex')))
    })

    // decode the event data
    decodeEvent('DocumentSealed', logStringHex, logTopics.slice(1))
  })

  process.exit()
}

/**
* Decodes event contents using the ABI definition of the event
* @param eventName the name of the event
* @param log log data as a Hex string
* @param topics an array of event topics
*/
function decodeEvent(eventName, log, topics) {
  const abiFile = JSON.parse(fs.readFileSync('./3_smartContract/contract.json'))
  const eventAbi = abiFile.abi.find(event => (event.name === eventName && event.type === 'event'))
  const decodedLog = web3.eth.abi.decodeLog(eventAbi.inputs, log, topics)
  console.log(decodedLog)
  return decodedLog
}

main()
