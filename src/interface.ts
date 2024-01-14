export interface TxVerification {
    network: string,
    type: string,
    description: string,
    recipients: Array<string>,
    values: Array<string>,    
    fee?: string,
    contractName?: string,
    contractMethod?: string,
    contractData?: string,
    isFlareNetworkContract?: boolean,
    parameters?: Array<TxVerificationParameter>,
    warnings: Array<string>,
    messageToSign: string
}

export interface TxVerificationParameter {
    name: string,
    value: string
}