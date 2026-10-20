import { Link } from '@tanstack/react-router'
import { DangerIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/shared/api/errors'

export function NotFoundPage({ title = 'Página não encontrada', message }: { title?: string; message?: string }) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center" aria-labelledby="not-found-title">
      <p className="text-display font-bold text-primary" aria-hidden="true">
        404
      </p>
      <h1 id="not-found-title" className="mt-4 text-heading font-bold">
        {title}
      </h1>
      <p className="mt-3 text-body text-muted-foreground">
        {message ?? 'O endereço que você abriu não existe ou foi removido.'}
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}

/** Inline error with a retry action. Used by every data-dependent block. */
export function ErrorState({ error, onRetry, title = 'Não foi possível carregar' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const message = isApiError(error) ? error.message : 'Algo deu errado. Tente novamente.'
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-border-soft bg-surface px-6 py-10 text-center">
      <DangerIcon className="size-7 text-coral" />
      <p className="text-title-sm font-bold">{title}</p>
      <p className="max-w-md text-body-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function RouteErrorPage({ error, reset }: { error: unknown; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <ErrorState error={error} onRetry={reset} title="Esta página encontrou um erro" />
    </div>
  )
}
