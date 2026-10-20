import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(undefined),
    reason: z.enum(['expired']).optional().catch(undefined),
  }),
  component: () => <h1 className="p-8 text-heading font-bold">Entrar</h1>,
})
