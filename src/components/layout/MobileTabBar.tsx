import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { HeartIcon, ScanLineIcon } from 'lucide-react'
import { CartIcon, HomeIcon, UserIcon } from '@/components/icons'
import { useCartCount } from '@/features/cart/queries'
import { cn } from '@/shared/lib/cn'
import { focusCatalogSearch } from './focus-search'

/** Bottom navigation of the mobile frames ("Tab Bar"). */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const count = useCartCount()
  const navigate = useNavigate()
  const item = (active: boolean) =>
    cn('grid size-12 place-items-center rounded-full', active ? 'text-primary' : 'text-muted-foreground')

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-18 max-w-md items-center justify-around px-4 pb-[env(safe-area-inset-bottom)]">
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
            className="-mt-8 grid size-16 place-items-center rounded-full bg-primary text-ink shadow-raised"
          >
            <ScanLineIcon className="size-6" aria-hidden="true" />
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
