import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { HeartIcon, ScanLineIcon } from 'lucide-react'
import { CartIcon, HomeIcon, UserIcon } from '@/components/icons'
import { useCartCount } from '@/features/cart/queries'
import { cn } from '@/shared/lib/cn'
import { focusCatalogSearch } from './focus-search'

/** Figma: the detail, cart, payment and sign-in frames have no tab bar (their own back button or bottom action instead). */
const WITHOUT_TAB_BAR = ['/cart', '/checkout', '/login', '/signup']
const hasTabBar = (pathname: string) => !WITHOUT_TAB_BAR.includes(pathname) && !pathname.startsWith('/nft/')

/** Bottom navigation of the mobile frames ("Tab Bar"). */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const count = useCartCount()
  const navigate = useNavigate()
  if (!hasTabBar(pathname)) return null
  const item = (active: boolean) =>
    cn('grid size-12 place-items-center rounded-full', active ? 'text-accent' : 'text-muted-foreground')

  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      {/* Figma "Tab Bar": a card-colored bar with rounded top corners and a curved
          cradle under the central button. The cradle is a fixed-size piece, so it keeps
          its shape at any width; the sides stretch. */}
      <div aria-hidden="true" className="absolute inset-0 flex drop-shadow-tab-bar">
        <div className="flex-1 rounded-tl-[30px] bg-surface" />
        <svg viewBox="0 0 126 95" preserveAspectRatio="none" className="-mx-px h-full w-31.5 shrink-0 text-surface">
          <path
            fill="currentColor"
            d="M0 0H6.25A14 14 0 0 1 19.95 11.1A44 44 0 0 0 106.05 11.1A14 14 0 0 1 119.75 0H126V95H0Z"
          />
        </svg>
        <div className="flex-1 rounded-tr-[30px] bg-surface" />
      </div>
      <ul className="relative mx-auto flex h-24 max-w-md items-center justify-around px-4 pb-[env(safe-area-inset-bottom)]">
        <li>
          <Link to="/" className={item(pathname === '/')} aria-label="Início">
            <HomeIcon className="size-5" />
          </Link>
        </li>
        <li>
          <Link to="/favorites" className={item(pathname === '/favorites')} aria-label="Lista de interesse">
            <HeartIcon className="size-5" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <button
            type="button"
            aria-label="Buscar NFTs"
            onClick={() => void navigate({ to: '/', hash: 'mercado' }).then(focusCatalogSearch)}
            className="grid size-16 -translate-y-11.5 place-items-center rounded-full bg-linear-to-b from-primary/40 to-primary text-foreground"
          >
            <ScanLineIcon className="size-7" aria-hidden="true" />
          </button>
        </li>
        <li>
          <Link
            to="/cart"
            className={cn(item(pathname === '/cart'), 'relative')}
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
          >
            <CartIcon className="size-5" />
            {count > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-micro font-bold text-ink"
              >
                {count}
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link to="/profile" className={item(pathname === '/profile' || pathname === '/wallets')} aria-label="Perfil">
            <UserIcon className="size-5" />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
