export function toHex(value: string, prefix: boolean): string {
    if (!isHex(value)) {
        throw new Error("Not a hex value")
    }
    value = value.toLowerCase()
    if (prefix && !value.startsWith("0x")) {
        return `0x${value}`
    }
    if (!prefix && value.startsWith("0x")) {
        return value.slice(2)
    }
    return value
}

export function isHex(value: string): boolean {
    return /^(0x)?[A-F0-9]+$/i.test(value)
}

export function isZeroHex(value: string): boolean {
    return /^(0x)?(0+)?$/.test(value)
}