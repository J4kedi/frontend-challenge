import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'

/** "Início / Mercado / …" trail of the desktop frames. The last item is the current page. */
export function Breadcrumb({ items }: { items: { label: string; to?: '/' | '/cart'; hash?: string }[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="hidden text-body-sm font-bold text-foreground md:block">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 && (
              <li aria-hidden="true" className="px-0.5">
                /
              </li>
            )}
            <li>
              {item.to && index < items.length - 1 ? (
                <Link to={item.to} hash={item.hash} className="hover:text-accent">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
