import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { MouseEvent, ReactNode } from 'react'
import { toast } from 'sonner'
import { CartIcon, LogoutIcon, SearchIcon, UserIcon } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { promptVisitor } from '@/features/auth/login-prompt'
import { useSession } from '@/features/auth/session'
import { useCartCount } from '@/features/cart/queries'
import { scrollBehavior, useSectionInView } from '@/shared/hooks/use-section-in-view'
import { cn } from '@/shared/lib/cn'
import { focusCatalogSearch } from './focus-search'

const MARKET_PATHS = ['/nft', '/cart', '/checkout', '/orders']

/** Desktop and tablet header (Figma: "Header With Divider"). Mobile uses MobileTabBar. */
export function SiteHeader() {
  const { user, isAuthenticated, isChecking } = useSession()
  const count = useCartCount()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const onHome = pathname === '/'
  // On the home page the active item follows the section on screen (scroll-spy).
  const marketInView = useSectionInView('mercado', onHome)
  const marketActive = MARKET_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || marketInView
  const homeActive = onHome && !marketInView

  // On the home page these items scroll to their section; elsewhere they navigate there.
  const goToSection = (hash: 'mercado' | undefined) => () => {
    if (!onHome) return void navigate({ to: '/', hash })
    if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: scrollBehavior() })
    else window.scrollTo({ top: 0, behavior: scrollBehavior() })
  }
  const notInDemo = (label: string) => () =>
    toast.info(`${label} ainda não faz parte desta demonstração.`, { id: 'nav-not-in-demo' })

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-ink/95 backdrop-blur md:block">
      <div className="mx-auto flex h-header max-w-page items-center justify-between gap-6 px-6 xl:px-0">
        <Link to="/" className="text-body-sm font-bold tracking-wide text-foreground" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="self-stretch">
          <ul className="flex h-full items-stretch gap-6 lg:gap-10">
            <NavItem active={homeActive}>
              <SectionLink href="/" active={homeActive} onActivate={goToSection(undefined)}>
                Início
              </SectionLink>
            </NavItem>
            <NavItem active={marketActive}>
              <SectionLink href="/#mercado" active={marketActive} onActivate={goToSection('mercado')}>
                Mercado
              </SectionLink>
            </NavItem>
            {(['Criadores', 'Aprenda'] as const).map((label) => (
              <NavItem key={label}>
                <button
                  type="button"
                  aria-disabled="true"
                  title="Em breve"
                  onClick={notInDemo(label)}
                  className="flex h-full cursor-not-allowed items-center text-muted-foreground"
                >
                  {label}
                  <span className="sr-only"> (em breve)</span>
                </button>
              </NavItem>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4 lg:gap-6">
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
          {isChecking ? (
            // A stored session is being confirmed: neither "Entrar" nor a name yet.
            <Skeleton className="h-9 w-28" />
          ) : isAuthenticated && user ? (
            <Link
              to="/profile"
              className="flex h-9 items-center gap-2 rounded-sm border border-primary px-3 text-body-lg font-medium text-accent hover:bg-surface"
            >
              <UserIcon className="size-[18px]" />
              <span className="max-w-24 truncate lg:max-w-32">{user.displayName}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ redirect: pathname === '/login' ? undefined : pathname }}
              onClick={promptVisitor({})}
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

/**
 * Plain anchor for the home sections: the router's <Link> always marks itself
 * aria-current on "/", which would fight the scroll-spy. Modified clicks
 * (new tab, new window) keep the browser's default behavior.
 */
function SectionLink({ href, active, onActivate, children }: { href: string; active: boolean; onActivate: () => void; children: ReactNode }) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className="flex h-full items-center"
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onActivate()
      }}
    >
      {children}
    </a>
  )
}

function NavItem({ active = false, children }: { active?: boolean; children: ReactNode }) {
  return (
    <li
      className={cn(
        'relative text-body-lg font-medium',
        active
          ? 'text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
          : 'text-foreground [&_a]:hover:text-accent',
      )}
    >
      {children}
    </li>
  )
}
