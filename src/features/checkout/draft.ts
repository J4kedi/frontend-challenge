import type { CheckoutBuyer } from '@/contracts/commerce'
import type { Network } from '@/contracts/nft'
import type { WalletProvider, WalletSlot } from '@/contracts/account'

/**
 * Checkout form draft, per user, in sessionStorage: if the session expires in
 * the middle of checkout, the collector logs in again and finds the form as
 * it was. Another user never sees it (the key carries the user id).
 */
export interface CheckoutDraft {
  buyer: CheckoutBuyer
  network: Network
  provider: WalletProvider
  walletSlot: WalletSlot
}

const key = (userId: string) => `kurio:checkout-draft:${userId}`

export function readDraft(userId: string): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(key(userId))
    return raw ? (JSON.parse(raw) as CheckoutDraft) : null
  } catch {
    return null
  }
}

export function saveDraft(userId: string, draft: CheckoutDraft) {
  try {
    sessionStorage.setItem(key(userId), JSON.stringify(draft))
  } catch {
    // no storage: the draft only lives in the form
  }
}

export function clearDraft(userId: string) {
  try {
    sessionStorage.removeItem(key(userId))
  } catch {
    // nothing to clear
  }
}
