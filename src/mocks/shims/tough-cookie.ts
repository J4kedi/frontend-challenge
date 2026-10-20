/**
 * Browser shim for `tough-cookie`, aliased in vite.config.ts.
 *
 * MSW's cookie store pulls tough-cookie (and its public-suffix list via tldts)
 * into the mock bundle only to forward Set-Cookie headers of mocked responses.
 * The simulated API never sets cookies (sessions use a bearer token), so the
 * store is replaced by this no-op: same behavior for this app, ~a third of the
 * mock chunk gone. Measured in docs/quality/lighthouse.md.
 */
export class Cookie {
  static fromJSON(): null {
    return null
  }
  toJSON() {
    return {}
  }
}

export class MemoryCookieStore {
  idx: Record<string, unknown> = {}
}

export class CookieJar {
  constructor(readonly store?: MemoryCookieStore) {}
  getCookiesSync(): Cookie[] {
    return []
  }
  async setCookie(): Promise<void> {}
}
