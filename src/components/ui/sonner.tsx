import { Toaster as Sonner, type ToasterProps } from 'sonner'

// Single dark theme, so no theme provider: colors come straight from the tokens.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'border border-border-soft bg-surface-raised font-sans text-body-sm text-foreground shadow-raised',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-surface text-foreground',
          error: 'border-danger',
          success: 'border-success',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
