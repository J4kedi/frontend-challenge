/**
 * ETH arithmetic on decimal strings, done in integer wei (BigInt) so that no
 * value ever goes through a float. Shared by the UI and the mock backend.
 */
const DECIMALS = 18
const SCALE = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export function toWei(eth: string): bigint {
  if (!ETH_PATTERN.test(eth)) throw new Error(`Invalid ETH amount: ${eth}`)
  const [whole = '0', fraction = ''] = eth.split('.')
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(DECIMALS, '0'))
}

export function fromWei(wei: bigint): string {
  if (wei < 0n) throw new Error('Negative ETH amounts are not supported')
  const whole = wei / SCALE
  const fraction = (wei % SCALE).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export const addEth = (...values: string[]) => fromWei(values.reduce((sum, v) => sum + toWei(v), 0n))

export const subtractEth = (a: string, b: string) => {
  const diff = toWei(a) - toWei(b)
  return fromWei(diff > 0n ? diff : 0n)
}

export const multiplyEth = (eth: string, quantity: number) => fromWei(toWei(eth) * BigInt(quantity))

/** Percentage with basis-point precision, rounded down to the wei. */
export const percentOfEth = (eth: string, percent: number) =>
  fromWei((toWei(eth) * BigInt(Math.round(percent * 100))) / 10_000n)

export const compareEth = (a: string, b: string) => {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

/**
 * Display format of the Figma file: dot separator and at least two decimals
 * ("1.19 ETH", "0.016 ETH", "26.846 ETH"). Extra decimals are kept up to
 * `maxDecimals`, rounding half up at the last kept digit.
 */
export function formatEth(eth: string, { maxDecimals = 4, unit = true }: { maxDecimals?: number; unit?: boolean } = {}) {
  const step = 10n ** BigInt(DECIMALS - maxDecimals)
  const rounded = ((toWei(eth) + step / 2n) / step) * step
  const [whole, fraction = ''] = fromWei(rounded).split('.')
  const text = `${whole}.${fraction.padEnd(2, '0')}`
  return unit ? `${text} ETH` : text
}
