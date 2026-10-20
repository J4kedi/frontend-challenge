import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/StatusPage'
import { FormError, FormField } from '@/components/form/FormField'
import { PasswordInput } from '@/components/form/PasswordInput'
import { applyServerErrors } from '@/components/form/server-errors'
import { ImageIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AVATAR_TYPES, MAX_AVATAR_BYTES, passwordBody, profileBody, type User } from '@/contracts/account'
import { announce } from '@/shared/a11y/announcer'
import { isApiError } from '@/shared/api/errors'
import { AccountLayout } from './AccountLayout'
import { EnsInput } from './EnsField'
import { useAvatar, useChangePassword, useProfile, useUpdateProfile } from './queries'

/** Password fields are optional: filling any of them validates the whole group. */
const profileForm = profileBody
  .extend({ currentPassword: z.string(), newPassword: z.string(), confirmPassword: z.string() })
  .superRefine((values, ctx) => {
    const { currentPassword, newPassword, confirmPassword } = values
    if (!currentPassword && !newPassword && !confirmPassword) return
    const result = passwordBody.safeParse({ currentPassword, newPassword, confirmPassword })
    if (!result.success) {
      for (const issue of result.error.issues) ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message })
    }
  })
type ProfileForm = z.infer<typeof profileForm>

const FIELDS = ['displayName', 'username', 'email', 'ensName', 'walletNickname', 'currentPassword', 'newPassword', 'confirmPassword'] as const

export function ProfilePage() {
  const profile = useProfile()
  return (
    <AccountLayout title="Perfil do colecionador">
      {profile.isPending ? (
        <div className="grid gap-6 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <ProfileEditor user={profile.data} />
      )}
    </AccountLayout>
  )
}

function ProfileEditor({ user }: { user: User }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileForm),
    defaultValues: {
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      ensName: user.ensName,
      walletNickname: user.walletNickname,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })
  const { errors } = form.formState
  const saving = updateProfile.isPending || changePassword.isPending

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword, confirmPassword, ...data }) => {
    setFormError(null)
    try {
      const saved = await updateProfile.mutateAsync(data)
      const passwordChanged = Boolean(currentPassword)
      if (passwordChanged) await changePassword.mutateAsync({ currentPassword, newPassword, confirmPassword })
      form.reset({ ...saved, currentPassword: '', newPassword: '', confirmPassword: '' })
      const message = passwordChanged ? 'Perfil e senha atualizados.' : 'Perfil atualizado.'
      toast.success(message)
      announce(message)
    } catch (error) {
      setFormError(applyServerErrors(form, error, FIELDS))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" aria-describedby={formError ? 'profile-error' : undefined}>
      <div id="profile-error">
        <FormError message={formError} />
      </div>
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(field) => <Input {...field} {...form.register('displayName')} autoComplete="name" />}
        </FormField>
        <FormField label="Nome de usuário" required error={errors.username?.message}>
          {(field) => <Input {...field} {...form.register('username')} autoComplete="username" />}
        </FormField>
        <FormField label="E-mail" required error={errors.email?.message}>
          {(field) => <Input {...field} {...form.register('email')} type="email" autoComplete="email" />}
        </FormField>
        <FormField label="Nome ENS" required error={errors.ensName?.message}>
          {(field) => <EnsInput {...field} {...form.register('ensName')} />}
        </FormField>
        <FormField label="Apelido da carteira" required error={errors.walletNickname?.message}>
          {(field) => <Input {...field} {...form.register('walletNickname')} />}
        </FormField>
        <AvatarField user={user} />
      </div>

      <fieldset className="space-y-6 md:max-w-[calc(50%-14px)]">
        <legend className="text-body-lg font-bold text-foreground">Alterar senha</legend>
        <FormField label="Senha atual" error={errors.currentPassword?.message}>
          {(field) => <PasswordInput {...field} {...form.register('currentPassword')} autoComplete="current-password" />}
        </FormField>
        <FormField label="Nova senha" error={errors.newPassword?.message} hint="Mínimo de 8 caracteres, com letra e número">
          {(field) => <PasswordInput {...field} {...form.register('newPassword')} autoComplete="new-password" />}
        </FormField>
        <FormField label="Confirmar nova senha" error={errors.confirmPassword?.message}>
          {(field) => <PasswordInput {...field} {...form.register('confirmPassword')} autoComplete="new-password" />}
        </FormField>
      </fieldset>

      <Button type="submit" className="w-33" disabled={saving} aria-busy={saving}>
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function AvatarField({ user }: { user: User }) {
  const { set, remove } = useAvatar()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return setError('Envie uma imagem PNG, JPG ou WebP.')
    if (file.size > MAX_AVATAR_BYTES) return setError('A imagem precisa ter até 1 MB.')
    const reader = new FileReader()
    reader.onload = () =>
      set.mutate(String(reader.result), {
        onSuccess: () => announce('Avatar atualizado.'),
        onError: (e) => setError(isApiError(e) ? (e.fields.avatar ?? e.message) : 'Não foi possível enviar a imagem.'),
      })
    reader.readAsDataURL(file)
  }

  const busy = set.isPending || remove.isPending
  return (
    <div className="flex flex-col gap-2">
      <span id="avatar-label" className="text-body-sm text-foreground">
        Avatar
      </span>
      <div className="flex items-center gap-6" role="group" aria-labelledby="avatar-label">
        <span className="grid size-12 place-items-center overflow-hidden rounded-full bg-surface-dark text-accent">
          {user.avatarUrl ? <img src={user.avatarUrl} alt={`Avatar de ${user.displayName}`} className="size-full object-cover" /> : <ImageIcon className="size-6" />}
        </span>
        <input ref={input} type="file" accept={AVATAR_TYPES.join(',')} className="sr-only" onChange={onFile} tabIndex={-1} aria-hidden="true" />
        <Button type="button" onClick={() => input.current?.click()} disabled={busy} aria-busy={set.isPending}>
          Alterar
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy || !user.avatarUrl}
          onClick={() => remove.mutate(undefined, { onSuccess: () => announce('Avatar removido.') })}
        >
          Remover
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-caption text-danger-text">
          {error}
        </p>
      )}
    </div>
  )
}
