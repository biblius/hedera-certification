import fs from 'fs'

/**
 * Attempts to return an array of accounts from the specified file.
 * Returns an empty array if the file doesn't exist. The file is generated
 * during the setup script.
 * @returns {Promise<Array<string>>}
 */
export function loadAccounts() {
  try {
    const filePath = process.env.ACCOUNTS_FILE
    if (!filePath) {
      throw new Error('Accounts file not specified')
    }
    const accs = fs.readFileSync(filePath)
    return JSON.parse(accs)?.accounts
  } catch (error) {
    return []
  }
}

/**
 * Utility for sleeping to give the network some time to process txns
 * @param {Number} n Amount of millis to sleep for
 * @returns
 */
export async function sleep(n) {
  return new Promise((resolve) => setTimeout(resolve, n))
}
