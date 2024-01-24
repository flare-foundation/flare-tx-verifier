import { verify } from "@flarenetwork/flare-tx-verifier-lib"
import { displayVerification } from "./formatter"
import readline from "readline"
import clipboard from "clipboardy"

const CLIPBOARD_READ_SLEEP = 200

async function main() {
    if (process.argv.length < 3) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => {
            if (key.name == 'c' && key.ctrl == true) {
                process.exit(1);
            }
        })

        console.clear()
        console.log("Reading from clipboard... Press Ctrl+C to exit.")

        let text = ""

        while (true) {
            await sleep(CLIPBOARD_READ_SLEEP)
            let txHex = ""
            try { txHex = clipboard.readSync() } catch { }
            if (!txHex || txHex === text) {
                continue
            }
            let verification = await verify(txHex)
            if (verification != null) {
                console.clear()
                displayVerification(verification)
                console.log("\nPress Ctrl+C to exit.")
            }
            text = txHex
        }
    } else {
        let txHex = process.argv[2].trim().toLowerCase()
        let verification = await verify(txHex)
        if (verification == null) {
            console.log("Transaction verification did not succeed")
        } else {
            displayVerification(verification)
        }
    }
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

main()