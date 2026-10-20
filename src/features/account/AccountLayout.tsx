import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ActivityIcon, CartIcon, DangerIcon, DownloadIcon, LocationIcon, LogoutIcon, UserIcon } from '@/components/icons'
import { useLogout } from '@/features/auth/session'
import { cn } from '@/shared/lib/cn'

type Item =
  | { label: string; icon: ReactNode; to: '/profile' | '/wallets' | '/favorites' }
  | { label: string; icon: ReactNode; to?: undefined }

const ITEMS: Item[] = [
  { label: 'Dados do perfil', icon: <UserIcon className="size-[18px]" />, to: '/profile' },
  { label: 'Carteiras', icon: <LocationIcon className="size-[18px]" />, to: '/wallets' },
  { label: 'Atividade', icon: <CartIcon className="size-[18px]" /> },
  { label: 'Lista de interesse', icon: <HeartIcon className="size-[18px]" aria-hidden="true" />, to: '/favorites' },
  { label: 'Ofertas', icon: <ActivityIcon className="size-[18px]" /> },
  { label: 'Arquivos baixados', icon: <DownloadIcon className="size-[18px]" /> },
  { label: 'Suporte', icon: <DangerIcon className="size-[18px]" /> },
]

/** "Meu perfil" sidebar of the Figma profile and wallet frames. Out-of-scope sections are visibly unavailable. */
export function AccountLayout({ title, hideTitle = false, children }: { title: string; hideTitle?: boolean; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const logout = useLogout()
  const navigate = useNavigate()

  const row = 'flex h-11 shrink-0 items-center gap-3 border-l-4 px-4 text-body-sm whitespace-nowrap'
  return (
    <div className="mx-auto grid max-w-page gap-8 px-4 pt-8 md:grid-cols-[220px_minmax(0,1fr)] md:px-6 lg:grid-cols-[310px_minmax(0,1fr)] xl:px-0">
      <nav aria-label="Meu perfil" className="h-fit rounded-sm bg-surface py-2 md:py-4">
        <p className="px-4 pb-2 text-title-sm font-bold text-foreground max-md:sr-only">Meu perfil</p>
        <ul className="max-md:flex max-md:overflow-x-auto">
          {ITEMS.map((item) => (
            <li key={item.label}>
              {item.to ? (
                <Link
                  to={item.to}
                  aria-current={pathname === item.to ? 'page' : undefined}
                  className={cn(row, pathname === item.to ? 'border-primary text-accent' : 'border-transparent text-muted-foreground hover:text-accent')}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <span aria-disabled="true" title="Em breve" className={cn(row, 'cursor-not-allowed border-transparent text-muted-foreground/70 max-md:hidden')}>
                  {item.icon}
                  {item.label}
                  <span className="sr-only">(em breve)</span>
                </span>
              )}
            </li>
          ))}
          <li className="md:mt-1 md:border-t md:border-border">
            <button
              type="button"
              onClick={() => logout.mutate(undefined, { onSettled: () => void navigate({ to: '/' }) })}
              className={cn(row, 'w-full border-transparent font-bold text-accent hover:text-foreground')}
              aria-busy={logout.isPending || undefined}
            >
              <LogoutIcon className="size-[18px]" />
              Sair
            </button>
          </li>
        </ul>
      </nav>
      <section aria-labelledby="account-title" className="min-w-0">
        <h1 id="account-title" className={cn('text-body-lg font-bold text-foreground', hideTitle && 'sr-only')}>
          {title}
        </h1>
        <div className={hideTitle ? undefined : 'mt-6'}>{children}</div>
      </section>
    </div>
  )
}
