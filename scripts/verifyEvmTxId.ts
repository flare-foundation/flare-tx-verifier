import { verify } from "../src"
import * as txnetwork from "../src/txnetwork"
import * as utils from "../src/utils"
import * as chain from "../src/evm/contract/chain"
import { displayVerification } from "../formatter"

async function main() {
	let input = process.argv[2].trim()
	if (!utils.isHex(input)) {
		console.log("Not a valid input")
		return
	}
	let txId = utils.toHex(input, true)
	let txHex: string | null = null
	for (let networkId of txnetwork.getNetworks()) {
		try { txHex = await chain.getRawTransaction(networkId, txId) } catch { }
		if (txHex) {
			break
		}
	}
	if (txHex) {
		console.log(`\x1b[34mTransaction hash:\x1b[0m ${txHex}`)
		let verification = await verify(txHex)
		if (verification == null) {
            console.log("Transaction verification did not succeed")
        } else {
            displayVerification(verification)
        }
	} else {
		console.log("Failed to obtain transaction hash")
	}
}

main()