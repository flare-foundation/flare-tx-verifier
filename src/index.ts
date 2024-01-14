import { TxVerification } from "./interface"
import { verify as verifyEvm } from "./evm"
import { verify as verifyAvax } from "./avax"

export async function verify(txHex: string): Promise<TxVerification | null> {
    let verification: TxVerification | null
    
    verification= await verifyEvm(txHex)
    if (verification != null) {
        return verification
    }

    verification = await verifyAvax(txHex)
    if (verification != null) {
        return verification
    }

    return null
}