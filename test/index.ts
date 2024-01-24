import { verify } from "@flarenetwork/flare-tx-verifier-lib"
import fs from "fs"

const TESTS_PATH = "./test/tests.json"

async function main() {
    let tests = JSON.parse(fs.readFileSync(TESTS_PATH, "utf-8"))
    let passed = 0;
    for (let i = 0; i < tests.length; i++) {
        let test = tests[i]
        let txVerification = await verify(test.txHex)        
        let success = JSON.stringify(txVerification) === JSON.stringify(test.txVerification)
        passed += Number(success)
        console.log(`\nTest ${i+1}/${tests.length}: ${success ? "\x1b[32mpassed\x1b[0m" : "\x1b[31mfailed\x1b[0m"}`)
        console.log(` \x1b[34mTransaction hex:\x1b[0m ${test.txHex}`)
        if (success) {
            console.log(` \x1b[34mTransaction verification:\x1b[0m ${JSON.stringify(test.txVerification, undefined, "  ")}`)
        } else {
            console.log(` \x1b[34mTransaction verification should be:\x1b[0m ${JSON.stringify(test.txVerification, undefined, "  ")}`)
            console.log(` \x1b[34mTransaction verification is:\x1b[0m ${JSON.stringify(txVerification, undefined, "  ")}`)
        }
    }
    console.log(`\nTest summary: ${passed} passed, ${tests.length - passed} failed`)
}

main()