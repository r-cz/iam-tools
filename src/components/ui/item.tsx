import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

export interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
  interactive?: boolean
}

export const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ asChild, className, interactive = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div'

    return (
      <Comp
        ref={ref as any}
        className={cn(
          'group/item relative flex items-start gap-4 rounded-xl border border-border bg-card/90 p-4 shadow-sm transition-colors',
          interactive &&
            'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        {...props}
      />
    )
  }
)
Item.displayName = 'Item'

const mediaVariants = cva(
  'flex items-center justify-center rounded-lg bg-muted text-muted-foreground',
  {
    variants: {
      variant: {
        icon: 'h-10 w-10 shrink-0',
        avatar: 'h-12 w-12 shrink-0 overflow-hidden rounded-full',
        square: 'h-14 w-14 shrink-0 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'icon',
    },
  }
)

export interface ItemMediaProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mediaVariants> {}

export const ItemMedia = React.forwardRef<HTMLDivElement, ItemMediaProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(mediaVariants({ variant }), className)} {...props} />
  }
)
ItemMedia.displayName = 'ItemMedia'

export interface ItemContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ItemContent = React.forwardRef<HTMLDivElement, ItemContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props} />
  }
)
ItemContent.displayName = 'ItemContent'

export interface ItemTitleProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const ItemTitle = React.forwardRef<HTMLParagraphElement, ItemTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <p ref={ref} className={cn('text-base font-semibold leading-tight', className)} {...props} />
    )
  }
)
ItemTitle.displayName = 'ItemTitle'

export interface ItemDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const ItemDescription = React.forwardRef<HTMLParagraphElement, ItemDescriptionProps>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  }
)
ItemDescription.displayName = 'ItemDescription'

export interface ItemGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ItemGroup = React.forwardRef<HTMLDivElement, ItemGroupProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props} />
  }
)
ItemGroup.displayName = 'ItemGroup'
