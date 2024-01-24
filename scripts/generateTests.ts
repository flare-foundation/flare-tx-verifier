import { verify } from "@flarenetwork/flare-tx-verifier-lib"
import fs from "fs"

const TXS_PATH = "test/txs.json"
const TESTS_PATH = "test/tests.json"

async function main() {
    let tests = Array<any>()
    let testTxs = JSON.parse(fs.readFileSync(TXS_PATH, "utf-8"))
    for (let i = 0; i < testTxs.length; i++) {
        let txVerification = await verify(testTxs[i])
        tests.push({
            txHex: testTxs[i],
            txVerification
        })
    }
    fs.writeFileSync(TESTS_PATH, JSON.stringify(tests, undefined, "  "))
}

main()