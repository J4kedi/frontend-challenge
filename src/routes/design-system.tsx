import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/design-system')({
  component: () => <h1 className="p-8 text-heading font-bold">Design system</h1>,
})
