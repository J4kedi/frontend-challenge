import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge must know the Figma type scale (theme.css --text-*): without
 * it, `text-body-sm` looks like a text color and silently removes the real
 * color class of the same element (found by axe on the buttons).
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'micro',
        'tiny',
        'caption',
        'caption-lg',
        'body-sm',
        'body',
        'body-lg',
        'title-sm',
        'title',
        'title-lg',
        'heading',
        'heading-lg',
        'display',
        'display-lg',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
