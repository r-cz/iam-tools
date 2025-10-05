import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const spinnerVariants = cva('animate-spin text-current', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

type SpinnerThickness = 'thin' | 'default' | 'thick'

const thicknessToStrokeWidth: Record<SpinnerThickness, number> = {
  thin: 1.5,
  default: 2,
  thick: 3,
}

export interface SpinnerProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, 'children'>,
    VariantProps<typeof spinnerVariants> {
  /**
   * Accessible label for screen readers. Leave undefined to mark the spinner as decorative.
   */
  label?: string
  thickness?: SpinnerThickness
}

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, thickness = 'default', label, ...props }, ref) => {
    const strokeWidth = thicknessToStrokeWidth[thickness]

    return (
      <svg
        ref={ref}
        role={label ? 'status' : undefined}
        aria-live={label ? 'polite' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        viewBox="0 0 24 24"
        className={cn(spinnerVariants({ size }), className)}
        {...props}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <path
          className="opacity-75"
          d="M21 12a9 9 0 0 1-9 9"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  }
)
Spinner.displayName = 'Spinner'

