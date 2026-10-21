import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import facebookLogo from '@/assets/brand/facebook.svg'
import googleLogo from '@/assets/brand/google.svg'
import { FormError, FormField } from '@/components/form/FormField'
import { PasswordInput } from '@/components/form/PasswordInput'
import { applyServerErrors } from '@/components/form/server-errors'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { loginBody, signupBody, type LoginBody, type SignupBody } from '@/contracts/account'
import { CatalogFilters } from '@/features/catalog/components/CatalogFilters'
import { CatalogResults } from '@/features/catalog/components/CatalogResults'
import { HomeHero } from '@/features/catalog/components/HomeHero'
import { nftListOptions } from '@/features/catalog/queries'
import { catalogSearch, toListQuery } from '@/features/catalog/search'
import { config, DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/shared/config'
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query'
import { loginPrompt, type LoginPromptRequest } from './login-prompt'
import { safeRedirect, useLogin, useSignup } from './session'

type Mode = 'login' | 'signup'

const COPY: Record<Mode, { title: string; mobileTitle: string; intro: string }> = {
  login: { title: 'Entrar', mobileTitle: 'Entrar', intro: 'Entre para gerenciar sua carteira, coleção e perfil de criador.' },
  signup: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    intro: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

/**
 * Login and sign-up routes. Desktop: modal over the marketplace (Figma "Desktop /
 * Login|Cadastro"); mobile: full screen (Figma "Mobile / Login|Cadastro").
 * After success the collector returns to `redirect` (internal paths only).
 */
export function AuthScreen({ mode, redirect, reason }: { mode: Mode; redirect?: string; reason?: 'expired' }) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const router = useRouter()
  const copy = COPY[mode]
  const goToRedirect = () => void router.navigate({ href: safeRedirect(redirect), replace: true })
  const body = (
    <>
      {reason === 'expired' && (
        <p role="status" className="rounded-sm border border-amber/60 bg-amber/10 px-3 py-2 text-body-sm text-foreground">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      {mode === 'login' ? <LoginForm onSuccess={goToRedirect} /> : <SignupForm onSuccess={goToRedirect} />}
      <SocialLogin />
    </>
  )

  if (desktop) {
    // Closing returns to the page the collector came from. Going to `redirect`
    // instead would bounce off a private page (/checkout) straight back here.
    const close = () => (router.history.canGoBack() ? router.history.back() : void router.navigate({ to: '/' }))
    return (
      <>
        <MarketplaceBackdrop />
        <AuthDialog mode={mode} redirect={redirect} description={copy.intro} onClose={close}>
          {body}
        </AuthDialog>
      </>
    )
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col px-7 pt-20 pb-10" aria-labelledby="auth-title">
      <p className="text-center text-display font-bold tracking-wide" aria-hidden="true">
        KURIO
      </p>
      <h1 id="auth-title" className="mt-16 text-center text-title-sm font-bold">
        {copy.mobileTitle}
      </h1>
      <div className="mt-8 space-y-4">{body}</div>
      <p className="mt-auto pt-10 text-center text-body-sm text-foreground">
        {mode === 'login' ? (
          <Link to="/signup" search={{ redirect }}>
            Novo na Kurio? <span className="text-accent underline-offset-4 hover:underline">Crie uma conta</span>
          </Link>
        ) : (
          <Link to="/login" search={{ redirect }}>
            Já tem uma conta? <span className="text-accent underline-offset-4 hover:underline">Entre</span>
          </Link>
        )}
      </p>
    </section>
  )
}

const BACKDROP_SEARCH = catalogSearch.parse({})
const noop = () => {}

/** What the Figma frame shows behind the desktop modal: the marketplace (hero, filters, first page of the catalog), inert. */
function MarketplaceBackdrop() {
  const list = useQuery(nftListOptions(toListQuery(BACKDROP_SEARCH)))
  return (
    <div inert aria-hidden="true" className="pointer-events-none select-none">
      <HomeHero />
      <div className="mx-auto mt-16 grid max-w-page grid-cols-1 gap-12 px-6 lg:grid-cols-[310px_minmax(0,1fr)] xl:px-0">
        <div className="hidden self-start rounded-lg bg-surface p-5 lg:block">
          <CatalogFilters facets={list.data?.facets} search={BACKDROP_SEARCH} onChange={noop} />
        </div>
        <CatalogResults data={list.data} isPending={list.isPending} isFetching={false} error={list.error} onRetry={noop} onClear={noop} />
      </div>
    </div>
  )
}

/**
 * Sign-in asked for from the current page (see login-prompt.ts): the same
 * modal, over the page the collector is on. Nothing navigates; on success the
 * dialog closes and the interrupted action resumes.
 */
export function LoginPrompt({ request }: { request: LoginPromptRequest }) {
  const [mode, setMode] = useState<Mode>('login')
  const href = useRouterState({ select: (s) => s.location.href })
  const [openedOn] = useState(href)
  // The prompt belongs to the page it was opened on.
  useEffect(() => {
    if (href !== openedOn) loginPrompt.close()
  }, [href, openedOn])

  const done = () => {
    loginPrompt.close()
    request.onSignedIn?.()
  }
  return (
    <AuthDialog mode={mode} onSelectMode={setMode} description={request.reason ?? COPY[mode].intro} onClose={loginPrompt.close}>
      {mode === 'login' ? <LoginForm onSuccess={done} /> : <SignupForm onSuccess={done} />}
      <SocialLogin />
    </AuthDialog>
  )
}

function AuthDialog({
  mode,
  redirect,
  onSelectMode,
  description,
  onClose,
  children,
}: {
  mode: Mode
  redirect?: string
  onSelectMode?: (mode: Mode) => void
  description: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[500px] gap-0 overflow-hidden rounded-lg border-0 border-b-10 border-b-primary bg-surface p-0 shadow-overlay"
        onOpenAutoFocus={(event) => {
          // Start on the first field (e-mail or user name), so typing right away goes into the form.
          const field = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>('form input')
          if (!field) return
          event.preventDefault()
          field.focus()
        }}
      >
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto px-6 pt-10 pb-8 sm:px-16">
          <AuthTabs mode={mode} redirect={redirect} onSelectMode={onSelectMode} />
          <DialogTitle className="sr-only">{COPY[mode].title}</DialogTitle>
          <DialogDescription className="mt-8 text-center text-body-sm text-foreground">{description}</DialogDescription>
          <div className="mt-6 space-y-4">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Routes switch tabs by URL (replace); the prompt switches in place, without leaving the page. */
function AuthTabs({ mode, redirect, onSelectMode }: { mode: Mode; redirect?: string; onSelectMode?: (mode: Mode) => void }) {
  const tab = (target: Mode) => {
    const label = COPY[target].title
    if (target === mode) {
      return (
        <span aria-current="page" className="text-title-lg text-accent">
          {label}
        </span>
      )
    }
    const className = 'text-title-lg text-foreground transition-colors hover:text-accent'
    return onSelectMode ? (
      <button type="button" className={className} onClick={() => onSelectMode(target)}>
        {label}
      </button>
    ) : (
      <Link to={target === 'login' ? '/login' : '/signup'} search={{ redirect }} replace className={className}>
        {label}
      </Link>
    )
  }
  return (
    <nav aria-label="Entrar ou criar conta" className="flex items-center justify-center gap-2">
      {tab('login')}
      <span aria-hidden="true" className="h-6 w-px bg-primary" />
      {tab('signup')}
    </nav>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<LoginBody>({ resolver: zodResolver(loginBody), defaultValues: { email: '', password: '' } })
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const { errors } = form.formState
  const demo = DEMO_ACCOUNTS[0]

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login.mutateAsync(values)
      onSuccess()
    } catch (error) {
      setFormError(applyServerErrors(form, error, ['email', 'password']))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Entrar">
      {config.mocksEnabled && (
        <p className="flex items-center justify-between gap-3 rounded-sm border border-border-soft px-3 py-2 text-caption text-muted-foreground">
          <span>
            Conta de teste: <span className="text-foreground">{demo.email}</span> · senha{' '}
            <span className="text-foreground">{DEMO_PASSWORD}</span>
          </span>
          <button
            type="button"
            className="shrink-0 font-bold text-accent hover:underline"
            onClick={() => {
              form.setValue('email', demo.email, { shouldValidate: true })
              form.setValue('password', DEMO_PASSWORD, { shouldValidate: true })
            }}
          >
            Preencher
          </button>
        </p>
      )}
      <FormError message={formError} />
      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(field) => <Input {...field} {...form.register('email')} type="email" autoComplete="email" placeholder="contato@email.com" className="h-12" />}
      </FormField>
      <FormField label="Senha" hideLabel error={errors.password?.message}>
        {(field) => <PasswordInput {...field} {...form.register('password')} autoComplete="current-password" placeholder="Senha" className="h-12" />}
      </FormField>
      <div className="text-right">
        <button
          type="button"
          className="text-body-sm text-accent hover:underline"
          onClick={() => toast.info('A recuperação de senha não faz parte desta demonstração.')}
        >
          Esqueceu a senha?
        </button>
      </div>
      <Button type="submit" size="lg" className="h-12 w-full max-md:h-15" disabled={login.isPending} aria-busy={login.isPending}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<SignupBody>({
    resolver: zodResolver(signupBody),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const signup = useSignup()
  const [formError, setFormError] = useState<string | null>(null)
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await signup.mutateAsync(values)
      toast.success('Conta criada. Bem-vindo à Kurio!')
      onSuccess()
    } catch (error) {
      setFormError(applyServerErrors(form, error, ['username', 'email', 'password', 'confirmPassword']))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Criar conta">
      <FormError message={formError} />
      <FormField label="Nome de usuário" hideLabel error={errors.username?.message} hint="3 a 20 letras minúsculas, números, ponto ou _">
        {(field) => <Input {...field} {...form.register('username')} autoComplete="username" placeholder="Nome de usuário" className="h-12" />}
      </FormField>
      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(field) => <Input {...field} {...form.register('email')} type="email" autoComplete="email" placeholder="Digite seu e-mail" className="h-12" />}
      </FormField>
      <FormField label="Senha" hideLabel error={errors.password?.message} hint="Mínimo de 8 caracteres, com letra e número">
        {(field) => <PasswordInput {...field} {...form.register('password')} autoComplete="new-password" placeholder="Senha" className="h-12" />}
      </FormField>
      <FormField label="Confirmar senha" hideLabel error={errors.confirmPassword?.message}>
        {(field) => (
          <PasswordInput {...field} {...form.register('confirmPassword')} autoComplete="new-password" placeholder="Confirmar senha" className="h-12" />
        )}
      </FormField>
      <Button type="submit" size="lg" className="h-12 w-full max-md:h-15" disabled={signup.isPending} aria-busy={signup.isPending}>
        {signup.isPending ? 'Criando…' : 'Criar conta'}
      </Button>
    </form>
  )
}

/** Social login is outside the challenge: the buttons explain that instead of pretending to work. */
function SocialLogin() {
  const unavailable = (provider: string) => () =>
    toast.info(`Entrar com ${provider} não faz parte desta demonstração. Use e-mail e senha.`)
  const button =
    'flex h-10 w-full items-center justify-center gap-2 rounded-sm border border-border text-body-sm text-foreground hover:border-primary'
  return (
    <div className="space-y-3 pt-2">
      <p className="flex items-center gap-3 text-body-sm text-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        Ou continue com
      </p>
      <button type="button" className={button} onClick={unavailable('Google')}>
        <img src={googleLogo} alt="" width={18} height={18} />
        Continuar com Google
      </button>
      <button type="button" className={button} onClick={unavailable('Facebook')}>
        <img src={facebookLogo} alt="" width={18} height={18} />
        Continuar com Facebook
      </button>
    </div>
  )
}
