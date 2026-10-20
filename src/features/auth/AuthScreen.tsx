import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
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
import { PromoCards } from '@/features/catalog/components/HomeEditorial'
import { HomeHero } from '@/features/catalog/components/HomeHero'
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query'
import { cn } from '@/shared/lib/cn'
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
 * Login and sign-up. Desktop: modal over the marketplace (Figma "Desktop /
 * Login|Cadastro"); mobile: full screen (Figma "Mobile / Login|Cadastro").
 * After success the collector returns to `redirect` (internal paths only).
 */
export function AuthScreen({ mode, redirect, reason }: { mode: Mode; redirect?: string; reason?: 'expired' }) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const router = useRouter()
  const copy = COPY[mode]
  const body = (
    <>
      {reason === 'expired' && (
        <p role="status" className="rounded-sm border border-amber/60 bg-amber/10 px-3 py-2 text-body-sm text-foreground">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      {mode === 'login' ? <LoginForm redirect={redirect} /> : <SignupForm redirect={redirect} />}
      <SocialLogin />
    </>
  )

  if (desktop) {
    return (
      <>
        <div inert aria-hidden="true" className="pointer-events-none select-none">
          <HomeHero />
          <PromoCards />
        </div>
        <Dialog open onOpenChange={(open) => !open && void router.navigate({ href: safeRedirect(redirect) === router.state.location.href ? '/' : safeRedirect(redirect) })}>
          <DialogContent className="max-w-[500px] gap-0 overflow-hidden rounded-lg border-0 border-b-10 border-b-primary bg-surface p-0 shadow-overlay">
            <div className="px-16 pt-10 pb-8">
              <AuthTabs mode={mode} redirect={redirect} />
              <DialogTitle className="sr-only">{copy.title}</DialogTitle>
              <DialogDescription className="mt-8 text-center text-body-sm text-foreground">{copy.intro}</DialogDescription>
              <div className="mt-6 space-y-4">{body}</div>
            </div>
          </DialogContent>
        </Dialog>
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

function AuthTabs({ mode, redirect }: { mode: Mode; redirect?: string }) {
  const tab = (active: boolean) => cn('text-title-lg transition-colors', active ? 'text-accent' : 'text-foreground hover:text-accent')
  return (
    <nav aria-label="Entrar ou criar conta" className="flex items-center justify-center gap-2">
      <Link to="/login" search={{ redirect }} replace className={tab(mode === 'login')} aria-current={mode === 'login' ? 'page' : undefined}>
        Entrar
      </Link>
      <span aria-hidden="true" className="h-6 w-px bg-primary" />
      <Link to="/signup" search={{ redirect }} replace className={tab(mode === 'signup')} aria-current={mode === 'signup' ? 'page' : undefined}>
        Criar conta
      </Link>
    </nav>
  )
}

function LoginForm({ redirect }: { redirect?: string }) {
  const form = useForm<LoginBody>({ resolver: zodResolver(loginBody), defaultValues: { email: '', password: '' } })
  const login = useLogin()
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login.mutateAsync(values)
      void router.navigate({ href: safeRedirect(redirect), replace: true })
    } catch (error) {
      setFormError(applyServerErrors(form, error, ['email', 'password']))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Entrar">
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

function SignupForm({ redirect }: { redirect?: string }) {
  const form = useForm<SignupBody>({
    resolver: zodResolver(signupBody),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const signup = useSignup()
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await signup.mutateAsync(values)
      toast.success('Conta criada. Bem-vindo à Kurio!')
      void router.navigate({ href: safeRedirect(redirect), replace: true })
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
