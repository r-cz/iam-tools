import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/60 p-10 text-center shadow-sm',
          className
        )}
        {...props}
      />
    )
  }
)
Empty.displayName = 'Empty'

const mediaVariants = cva(
  'flex items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground',
  {
    variants: {
      variant: {
        icon: 'h-12 w-12',
        avatar: 'h-16 w-16 overflow-hidden rounded-full border-none',
        square: 'h-16 w-16 rounded-xl border-none',
      },
    },
    defaultVariants: {
      variant: 'icon',
    },
  }
)

export interface EmptyMediaProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mediaVariants> {}

export const EmptyMedia = React.forwardRef<HTMLDivElement, EmptyMediaProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(mediaVariants({ variant }), className)} {...props} />
  }
)
EmptyMedia.displayName = 'EmptyMedia'

export interface EmptyTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const EmptyTitle = React.forwardRef<HTMLHeadingElement, EmptyTitleProps>(
  ({ className, ...props }, ref) => {
    return <h3 ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
  }
)
EmptyTitle.displayName = 'EmptyTitle'

export interface EmptyDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const EmptyDescription = React.forwardRef<HTMLParagraphElement, EmptyDescriptionProps>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn('max-w-sm text-sm text-muted-foreground', className)} {...props} />
  }
)
EmptyDescription.displayName = 'EmptyDescription'

export interface EmptyContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const EmptyContent = React.forwardRef<HTMLDivElement, EmptyContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('flex flex-wrap items-center justify-center gap-2', className)} {...props} />
  }
)
EmptyContent.displayName = 'EmptyContent'

