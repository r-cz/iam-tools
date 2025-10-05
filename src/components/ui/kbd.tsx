import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'

import { cn } from '@/lib/utils'

type KbdSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<KbdSize, string> = {
  sm: 'h-5 min-w-[1.5rem] px-1.5 text-[10px]',
  md: 'h-6 min-w-[1.75rem] px-2 text-[11px]',
  lg: 'h-7 min-w-[2rem] px-2.5 text-xs',
}

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
  size?: KbdSize
}

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ asChild, className, size = 'md', ...props }, ref) => {
    const Comp = asChild ? Slot : 'kbd'

    return (
      <Comp
        ref={ref as any}
        className={cn(
          'inline-flex items-center justify-center rounded-[0.4rem] border border-border bg-muted/60 font-medium uppercase tracking-[0.12em] text-muted-foreground shadow-sm',
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)
Kbd.displayName = 'Kbd'

export interface KbdGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: KbdSize
}

export const KbdGroup = React.forwardRef<HTMLDivElement, KbdGroupProps>(
  ({ className, children, size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-border bg-card/70 p-1 text-muted-foreground shadow-sm',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child
          return React.cloneElement(child as React.ReactElement<KbdProps>, {
            size,
          })
        })}
      </div>
    )
  }
)
KbdGroup.displayName = 'KbdGroup'

