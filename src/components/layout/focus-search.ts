/** Moves focus to the catalog search box after navigating to the home market section. */
export function focusCatalogSearch() {
  requestAnimationFrame(() => {
    const input = document.getElementById('catalog-search') as HTMLInputElement | null
    input?.scrollIntoView({ block: 'center' })
    input?.focus()
  })
}
