import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import {
  avatarBody,
  connectWalletBody,
  MAX_AVATAR_BYTES,
  passwordBody,
  profileBody,
  walletFields,
  walletSlot,
} from '@/contracts/account'
import { hashPassword, verifyPassword } from '../db/password'
import { db, nextId, persist } from '../db/store'
import type { WalletRecord } from '../db/types'
import { api, authenticate, fail, now, readBody, withNetwork } from '../http'
import { scenario } from '../scenarios'
import { findNft, toUser, toWallet } from '../views'

const createWalletBody = z.intersection(z.object({ slot: walletSlot }), walletFields)

export const accountHandlers = [
  // Favorites
  http.get(
    api('/me/favorites'),
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      return HttpResponse.json({ nftIds: db().favorites[auth.user.id] ?? [] })
    }),
  ),

  http.put(
    api('/me/favorites/:nftId'),
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      if (scenario() === 'mutation-error') return fail(500, 'INTERNAL', 'Não foi possível salvar o favorito', { retryable: true })
      const nftId = String(params.nftId)
      if (!findNft(nftId)) return fail(404, 'NOT_FOUND', 'NFT não encontrado')
      const list = new Set(db().favorites[auth.user.id] ?? [])
      list.add(nftId)
      db().favorites[auth.user.id] = [...list]
      persist()
      return HttpResponse.json({ nftIds: [...list] })
    }),
  ),

  http.delete(
    api('/me/favorites/:nftId'),
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      if (scenario() === 'mutation-error') return fail(500, 'INTERNAL', 'Não foi possível remover o favorito', { retryable: true })
      const list = (db().favorites[auth.user.id] ?? []).filter((id) => id !== String(params.nftId))
      db().favorites[auth.user.id] = list
      persist()
      return HttpResponse.json({ nftIds: list })
    }),
  ),

  // Profile
  http.get(
    api('/me/profile'),
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      return HttpResponse.json(toUser(auth.user))
    }),
  ),

  http.patch(
    api('/me/profile'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const body = await readBody(request, profileBody)
      if (body.error) return body.error
      const others = db().users.filter((u) => u.id !== auth.user.id)
      const email = body.data.email.toLowerCase()
      if (others.some((u) => u.email === email)) {
        return fail(409, 'EMAIL_TAKEN', 'Este e-mail já pertence a outra conta', { fields: { email: 'E-mail já em uso' } })
      }
      if (others.some((u) => u.username === body.data.username)) {
        return fail(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso', { fields: { username: 'Nome de usuário já em uso' } })
      }
      Object.assign(auth.user, body.data, { email, updatedAt: now() })
      persist()
      return HttpResponse.json(toUser(auth.user))
    }),
  ),

  http.put(
    api('/me/avatar'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const body = await readBody(request, avatarBody)
      if (body.error) return body.error
      const bytes = Math.ceil((body.data.dataUrl.length - body.data.dataUrl.indexOf(',') - 1) * 0.75)
      if (bytes > MAX_AVATAR_BYTES) {
        return fail(422, 'VALIDATION_ERROR', 'Imagem muito grande', { fields: { avatar: 'Use uma imagem de até 1 MB' } })
      }
      auth.user.avatarUrl = body.data.dataUrl
      auth.user.updatedAt = now()
      persist()
      return HttpResponse.json(toUser(auth.user))
    }),
  ),

  http.delete(
    api('/me/avatar'),
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      auth.user.avatarUrl = null
      auth.user.updatedAt = now()
      persist()
      return HttpResponse.json(toUser(auth.user))
    }),
  ),

  http.put(
    api('/me/password'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const body = await readBody(request, passwordBody)
      if (body.error) return body.error
      const valid = await verifyPassword(body.data.currentPassword, auth.user.passwordSalt, auth.user.passwordHash)
      if (!valid) {
        return fail(422, 'VALIDATION_ERROR', 'Senha atual incorreta', { fields: { currentPassword: 'Senha atual incorreta' } })
      }
      const { salt, hash } = await hashPassword(body.data.newPassword)
      auth.user.passwordSalt = salt
      auth.user.passwordHash = hash
      auth.user.updatedAt = now()
      persist()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  // Wallets
  http.get(
    api('/me/wallets'),
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const items = db().wallets.filter((w) => w.userId === auth.user.id).map(toWallet)
      return HttpResponse.json({ items })
    }),
  ),

  http.post(
    api('/me/wallets'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const body = await readBody(request, createWalletBody)
      if (body.error) return body.error
      const { slot, ...fields } = body.data
      if (db().wallets.some((w) => w.userId === auth.user.id && w.slot === slot)) {
        return fail(409, 'WALLET_SLOT_TAKEN', 'Você já cadastrou esta carteira. Edite a existente.')
      }
      const wallet: WalletRecord = {
        id: nextId('wal'),
        userId: auth.user.id,
        slot,
        ...fields,
        network: fields.network!,
        provider: fields.provider!,
        secondaryAddress: fields.secondaryAddress || null,
        updatedAt: now(),
      }
      db().wallets.push(wallet)
      persist()
      return HttpResponse.json(toWallet(wallet), { status: 201 })
    }),
  ),

  http.patch(
    api('/me/wallets/:id'),
    withNetwork(async ({ request, params }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const wallet = db().wallets.find((w) => w.id === String(params.id))
      if (!wallet) return fail(404, 'NOT_FOUND', 'Carteira não encontrada')
      if (wallet.userId !== auth.user.id) return fail(403, 'FORBIDDEN', 'Esta carteira pertence a outra conta')
      const body = await readBody(request, walletFields)
      if (body.error) return body.error
      Object.assign(wallet, body.data, { secondaryAddress: body.data.secondaryAddress || null, updatedAt: now() })
      // Address or network changed: the previous extension connection no longer applies.
      delete db().connections[wallet.id]
      persist()
      return HttpResponse.json(toWallet(wallet))
    }),
  ),

  http.post(
    api('/me/wallets/:id/connect'),
    withNetwork(async ({ request, params }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const wallet = db().wallets.find((w) => w.id === String(params.id))
      if (!wallet) return fail(404, 'NOT_FOUND', 'Carteira não encontrada')
      if (wallet.userId !== auth.user.id) return fail(403, 'FORBIDDEN', 'Esta carteira pertence a outra conta')
      const body = await readBody(request, connectWalletBody)
      if (body.error) return body.error
      await delay(400) // the extension "asks" the collector
      if (scenario() === 'wallet-rejected') {
        return fail(403, 'WALLET_REJECTED', 'A conexão foi recusada na carteira. Aprove a solicitação para continuar.')
      }
      db().connections[wallet.id] = { walletId: wallet.id, ...body.data, status: 'connected' }
      persist()
      return HttpResponse.json(toWallet(wallet))
    }),
  ),

  http.post(
    api('/me/wallets/:id/disconnect'),
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const wallet = db().wallets.find((w) => w.id === String(params.id))
      if (!wallet) return fail(404, 'NOT_FOUND', 'Carteira não encontrada')
      if (wallet.userId !== auth.user.id) return fail(403, 'FORBIDDEN', 'Esta carteira pertence a outra conta')
      const connection = db().connections[wallet.id]
      if (connection) connection.status = 'disconnected'
      persist()
      return HttpResponse.json(toWallet(wallet))
    }),
  ),
]
