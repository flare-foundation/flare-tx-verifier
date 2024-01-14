import { TxVerification, TxVerificationParameter } from "./src/interface"
import * as txtype from "./src/txtype"
import { ethers } from "ethers"

export function displayVerification(verification: TxVerification) {
    let property: keyof typeof verification
    for (property in verification) {
        if (property === "type" || verification[property] === undefined) {
            continue
        }
        let value = ""
        if (property === "values") {
            value = JSON.stringify((verification[property] as Array<string>).map(v => weiToFlr(v)))
        } else if (property === "fee") {
            value = weiToFlr(verification[property] as string)
        } else if (property === "parameters") {
            let items = verification[property] as Array<TxVerificationParameter>
            for (let item of items) {
                if (item.value !== undefined) {
                    let param = ""
                    if ([txtype.ADD_DELEGATOR_P, txtype.ADD_VALIDATOR_P].includes(verification.type) && ["startTime", "endTime"].includes(item.name)) {
                        param = new Date(parseInt(item.value) * 1e3).toLocaleString()
                    } else {
                        param = JSON.stringify(item.value, undefined, "  ")
                    }
                    value = `${value}\n  \x1b[34m${item.name}:\x1b[0m ${param}`
                }
            }
        } else {
            value = JSON.stringify(verification[property], undefined, "  ")
        }
        if (value) {
            console.log(`\x1b[34m${property}:\x1b[0m ${value}`);
        }
    }
}

function weiToFlr(wei: string): string {
    let flr = ethers.formatEther(wei)
    let parts = flr.split(".")
    return `${parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${parts.length > 1 && parts[1] ? "." + parts[1] : ""} FLR`
}