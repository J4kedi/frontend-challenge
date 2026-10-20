import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { CartIcon, LogoutIcon, SearchIcon, UserIcon } from '@/components/icons'
import { useSession } from '@/features/auth/session'
import { useCartCount } from '@/features/cart/queries'
import { cn } from '@/shared/lib/cn'
import { focusCatalogSearch } from './focus-search'

const MARKET_PATHS = ['/nft', '/cart', '/checkout', '/orders']

/** Desktop and tablet header (Figma: "Header With Divider"). Mobile uses MobileTabBar. */
export function SiteHeader() {
  const { user, isAuthenticated } = useSession()
  const count = useCartCount()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const onMarket = MARKET_PATHS.some((p) => pathname.startsWith(p))

  return (
    <header className="hidden border-b border-border md:block">
      <div className="mx-auto flex h-header max-w-page items-center justify-between gap-6 px-6 xl:px-0">
        <Link to="/" className="text-body-sm font-bold tracking-wide text-foreground" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="self-stretch">
          <ul className="flex h-full items-stretch gap-10">
            <NavItem active={pathname === '/'}>
              <Link to="/" className="flex h-full items-center">
                Início
              </Link>
            </NavItem>
            <NavItem active={onMarket}>
              <Link to="/" hash="mercado" className="flex h-full items-center">
                Mercado
              </Link>
            </NavItem>
            <NavItem>
              <span aria-disabled="true" title="Em breve" className="flex h-full cursor-not-allowed items-center">
                Criadores
              </span>
            </NavItem>
            <NavItem>
              <span aria-disabled="true" title="Em breve" className="flex h-full cursor-not-allowed items-center">
                Aprenda
              </span>
            </NavItem>
          </ul>
        </nav>

        <div className="flex items-center gap-6">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-md text-foreground hover:text-accent"
            aria-label="Buscar NFTs"
            onClick={() => void navigate({ to: '/', hash: 'mercado' }).then(focusCatalogSearch)}
          >
            <SearchIcon className="size-[22px]" />
          </button>
          <Link
            to="/cart"
            className="relative grid size-9 place-items-center rounded-md text-foreground hover:text-accent"
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
          >
            <CartIcon className="size-[22px]" />
            {count > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0 right-0 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-micro font-bold text-ink"
              >
                {count}
              </span>
            )}
          </Link>
          {isAuthenticated && user ? (
            <Link
              to="/profile"
              className="flex h-9 items-center gap-2 rounded-sm border border-primary px-3 text-body-lg font-medium text-accent hover:bg-surface"
            >
              <UserIcon className="size-[18px]" />
              <span className="max-w-32 truncate">{user.displayName}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ redirect: pathname === '/login' ? undefined : pathname }}
              className="flex h-9 items-center gap-1 rounded-sm bg-primary px-2 text-body-lg font-medium text-ink hover:bg-accent"
            >
              <LogoutIcon className="size-5 rotate-180" />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function NavItem({ active = false, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <li
      className={cn(
        'relative text-body-lg font-medium',
        active
          ? 'text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
          : 'text-foreground [&_a]:hover:text-accent',
        !active && '[&_span[aria-disabled]]:text-foreground',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </li>
  )
}
