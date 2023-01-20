import {
  TokenCreateTransaction,
  Client,
  TokenType,
  TokenInfoQuery,
  AccountBalanceQuery,
  PrivateKey,
  TokenSupplyType,
  PublicKey
} from '@hashgraph/sdk'
import dotenv from 'dotenv'
import { loadAccounts } from '../utils.js'

dotenv.config()

// Initialise account 1 and 2 from the accounts file generated in setup
const accs = loadAccounts()
if (!accs || accs.length === 0) {
  throw new Error('Accounts must be initialised (npm run setup)')
}

const account1 = accs[0]
const account2 = accs[1]

// Create our connection to the Hedera network
const client = Client.forTestnet()
client.setOperator(account1.id, account1.privateKey)

async function main() {
  // Create the transaction and freeze for manual signing

  const transaction = new TokenCreateTransaction()
    .setTokenName('Cthulhu Worship Token')
    .setTokenSymbol('CTH')
    .setTokenType(TokenType.FungibleCommon)
    .setTreasuryAccountId(account1.id)
    .setDecimals(2)
    .setInitialSupply(35050)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(50000)
    .setAdminKey(PublicKey.fromString(account1.publicKey))
    .setPauseKey(PublicKey.fromString(account1.publicKey))
    .setSupplyKey(PublicKey.fromString(account2.publicKey))
    .freezeWith(client)

  // Sign the transaction with the client, who is set as admin and treasury account
  const signTx = await transaction.sign(PrivateKey.fromString(account1.privateKey))

  // Submit to a Hedera network
  const txResponse = await signTx.execute(client)

  // Get the receipt of the transaction
  const receipt = await txResponse.getReceipt(client)

  // Get the token ID from the receipt
  const tokenId = receipt.tokenId

  console.log('The new token ID is ' + tokenId)

  // Sign with the client operator private key, submit the query to the network and get the token supply

  const name = await queryTokenFunction('name', tokenId)
  const symbol = await queryTokenFunction('symbol', tokenId)
  const tokenSupply = await queryTokenFunction('totalSupply', tokenId)
  console.log('The total supply of the ' + name + ' token is ' + tokenSupply + ' of ' + symbol)

  // Create the query
  const balanceQuery = new AccountBalanceQuery()
    .setAccountId(account1.id)

  // Sign with the client operator private key and submit to a Hedera network
  const tokenBalance = await balanceQuery.execute(client)

  console.log('The user\'s balance is ' + tokenBalance.tokens.get(tokenId))

  process.exit()
}

async function queryTokenFunction(parameter, tokenId) {
  // Create the query
  const query = new TokenInfoQuery()
    .setTokenId(tokenId)

  console.log('Retrieveing the ' + parameter)
  const body = await query.execute(client)

  // Sign with the client operator private key, submit the query to the network and get the token supply
  switch (parameter) {
    case 'name': return body.name
    case 'symbol': return body.symbol
    case 'totalSupply': return body.totalSupply
    default:
  }
}

main()
