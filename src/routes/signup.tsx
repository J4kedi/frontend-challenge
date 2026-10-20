import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/signup')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  component: () => <h1 className="p-8 text-heading font-bold">Criar conta</h1>,
})
