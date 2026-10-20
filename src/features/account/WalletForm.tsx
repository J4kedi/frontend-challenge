import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormError, FormField } from '@/components/form/FormField'
import { applyServerErrors } from '@/components/form/server-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  WALLET_PROVIDER_LABEL,
  WALLET_PROVIDERS,
  walletFields,
  type Wallet,
  type WalletFields,
  type WalletSlot,
} from '@/contracts/account'
import { NETWORK_LABEL, NETWORKS } from '@/contracts/nft'
import { announce } from '@/shared/a11y/announcer'
import { EnsInput } from './EnsField'
import { useSaveWallet } from './queries'

const FIELDS = ['displayName', 'nickname', 'network', 'profileName', 'address', 'secondaryAddress', 'provider', 'referralCode', 'email', 'ensName'] as const

export const walletToFields = (wallet: Wallet): WalletFields => ({
  displayName: wallet.displayName,
  nickname: wallet.nickname,
  network: wallet.network,
  profileName: wallet.profileName,
  address: wallet.address,
  secondaryAddress: wallet.secondaryAddress ?? '',
  provider: wallet.provider,
  referralCode: wallet.referralCode,
  email: wallet.email,
  ensName: wallet.ensName,
})

export const EMPTY_WALLET: WalletFields = {
  displayName: '',
  nickname: '',
  network: undefined,
  profileName: '',
  address: '',
  secondaryAddress: '',
  provider: undefined,
  referralCode: '',
  email: '',
  ensName: '',
}

const selectTrigger = 'h-10 w-full rounded-sm border-border bg-transparent px-3 text-body-sm text-foreground data-[placeholder]:text-muted-foreground aria-invalid:border-danger'

/** Wallet fields of the Figma "Carteiras" frame. Address format is validated per network. */
export function WalletForm({ slot, wallet, defaults, idPrefix }: { slot: WalletSlot; wallet?: Wallet; defaults: WalletFields; idPrefix: string }) {
  const save = useSaveWallet()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<WalletFields>({ resolver: zodResolver(walletFields), defaultValues: defaults })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await save.mutateAsync({ id: wallet?.id, slot, body: values })
      form.reset(walletToFields(saved))
      const message = slot === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.'
      toast.success(message)
      announce(message)
    } catch (error) {
      setFormError(applyServerErrors(form, error, FIELDS))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" aria-label={slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'} id={`${idPrefix}-form`}>
      <FormError message={formError} />
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(field) => <Input {...field} {...form.register('displayName')} />}
        </FormField>
        <FormField label="Apelido da carteira" required error={errors.nickname?.message}>
          {(field) => <Input {...field} {...form.register('nickname')} />}
        </FormField>
        <FormField label="Rede" required error={errors.network?.message}>
          {(field) => (
            <Controller
              control={form.control}
              name="network"
              render={({ field: control }) => (
                <Select value={control.value ?? ''} onValueChange={(v) => control.onChange(v)}>
                  <SelectTrigger {...field} className={selectTrigger} onBlur={control.onBlur}>
                    <SelectValue placeholder="Selecione uma rede" />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {NETWORK_LABEL[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
        <FormField label="Nome do perfil" required error={errors.profileName?.message}>
          {(field) => <Input {...field} {...form.register('profileName')} />}
        </FormField>
        <FormField label="Endereço da carteira" required error={errors.address?.message}>
          {(field) => <Input {...field} {...form.register('address')} placeholder="Endereço 0x da carteira" spellCheck={false} />}
        </FormField>
        <FormField label="ENS ou carteira secundária (opcional)" hideLabel error={errors.secondaryAddress?.message} className="md:self-end">
          {(field) => <Input {...field} {...form.register('secondaryAddress')} placeholder="ENS ou carteira secundária (opcional)" spellCheck={false} />}
        </FormField>
        <FormField label="Tipo de carteira" required error={errors.provider?.message}>
          {(field) => (
            <Controller
              control={form.control}
              name="provider"
              render={({ field: control }) => (
                <Select value={control.value ?? ''} onValueChange={(v) => control.onChange(v)}>
                  <SelectTrigger {...field} className={selectTrigger} onBlur={control.onBlur}>
                    <SelectValue placeholder="Selecione uma carteira" />
                  </SelectTrigger>
                  <SelectContent>
                    {WALLET_PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {WALLET_PROVIDER_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
        <FormField label="Código de indicação" required error={errors.referralCode?.message}>
          {(field) => <Input {...field} {...form.register('referralCode')} />}
        </FormField>
        <FormField label="E-mail" required error={errors.email?.message}>
          {(field) => <Input {...field} {...form.register('email')} type="email" autoComplete="email" />}
        </FormField>
        <FormField label="Nome ENS" required error={errors.ensName?.message}>
          {(field) => <EnsInput {...field} {...form.register('ensName')} />}
        </FormField>
      </div>
      <Button type="submit" disabled={save.isPending} aria-busy={save.isPending} className="px-4">
        {save.isPending ? 'Salvando…' : 'Salvar carteira'}
      </Button>
    </form>
  )
}
