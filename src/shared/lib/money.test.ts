import { describe, expect, it } from 'vitest'
import { addEth, compareEth, formatEth, fromWei, multiplyEth, percentOfEth, subtractEth, toWei } from './money'

describe('money', () => {
  it('round-trips decimal strings through wei without float error', () => {
    expect(fromWei(toWei('0.1')) ).toBe('0.1')
    expect(addEth('0.1', '0.2')).toBe('0.3')
    expect(fromWei(toWei('123.000000000000000001'))).toBe('123.000000000000000001')
  })

  it('reproduces the Figma cart totals exactly', () => {
    const subtotal = addEth(multiplyEth('1.19', 2), multiplyEth('1.39', 6), multiplyEth('1.79', 9))
    expect(subtotal).toBe('26.83')
    expect(addEth(subtotal, '0.016')).toBe('26.846')
  })

  it('computes discounts in basis points and never goes negative', () => {
    expect(percentOfEth('26.83', 10)).toBe('2.683')
    expect(subtractEth('1', '2')).toBe('0')
    expect(compareEth('1.5', '1.50')).toBe(0)
  })

  it('formats like the Figma file', () => {
    expect(formatEth('1.19')).toBe('1.19 ETH')
    expect(formatEth('2')).toBe('2.00 ETH')
    expect(formatEth('0.016')).toBe('0.016 ETH')
    expect(formatEth('1.234567', { maxDecimals: 4 })).toBe('1.2346 ETH')
    expect(formatEth('26.846', { unit: false })).toBe('26.846')
  })

  it('rejects malformed amounts', () => {
    expect(() => toWei('1,5')).toThrow()
    expect(() => toWei('-1')).toThrow()
  })
})
