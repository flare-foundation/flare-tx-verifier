export const FLARE = 14
export const SONGBIRD = 19
export const COSTON2 = 114
export const COSTON = 16

export function getNetworks(): Array<number> {
    return [
        FLARE,
        SONGBIRD,
        COSTON2,
        COSTON
    ]
}

export function isKnownNetwork(network: number): boolean {
    return getNetworks().includes(network)
}

export function getDescription(network: number): string {
    switch (network) {
        case FLARE: {
            return "Flare Mainnet"
        }
        case SONGBIRD: {
            return "Songbird Canary-Network"
        }
        case COSTON2: {
            return "Flare Testnet Coston2"
        }
        case COSTON: {
            return "Flare Testnet Coston"
        }
        default: {
            return network.toString()
        }
    }
}

export function getHRP(network: number): string {
    switch (network) {
        case FLARE: {
            return "flare"
        }
        case SONGBIRD: {
            return "sgb"
        }
        case COSTON2: {
            return "costwo"
        }
        case COSTON: {
            return "cost"
        }
        default: {
            return ""
        }
    }
}