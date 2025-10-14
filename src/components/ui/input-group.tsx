import * as React from 'react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type InputGroupSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<InputGroupSize, string> = {
  sm: 'min-h-9 [&_input]:h-9 [&_input]:text-sm',
  md: 'min-h-10 [&_input]:h-10',
  lg: 'min-h-11 [&_input]:h-11 [&_input]:text-base',
}

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: InputGroupSize
}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, children, size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="input-group"
        className={cn(
          'group/input-group flex w-full items-stretch overflow-hidden rounded-md border border-input bg-card shadow-sm transition-colors',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
InputGroup.displayName = 'InputGroup'

export interface InputGroupInputProps extends React.ComponentProps<typeof Input> {}

export const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cn(
          'h-full rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
          'disabled:bg-muted/40 disabled:text-muted-foreground',
          className
        )}
        {...props}
      />
    )
  }
)
InputGroupInput.displayName = 'InputGroupInput'

type InputGroupAddonAlign = 'inline-start' | 'inline-end' | 'block-start' | 'block-end'

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: InputGroupAddonAlign
}

export const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = 'inline-end', ...props }, ref) => {
    const alignmentClasses: Record<InputGroupAddonAlign, string> = {
      'inline-start': 'border-r border-border',
      'inline-end': 'border-l border-border',
      'block-start': 'w-full border-b border-border',
      'block-end': 'w-full border-t border-border',
    }

    const paddingClasses = align.startsWith('block') ? 'px-3 py-2' : 'px-2'
    const backgroundClasses = align.startsWith('block') ? 'bg-muted/30' : 'bg-muted/50'

    return (
      <div
        ref={ref}
        data-align={align}
        className={cn(
          'flex items-center gap-1 text-muted-foreground',
          backgroundClasses,
          alignmentClasses[align],
          paddingClasses,
          className
        )}
        {...props}
      />
    )
  }
)
InputGroupAddon.displayName = 'InputGroupAddon'

export interface InputGroupButtonProps extends ButtonProps {
  grouped?: boolean
}

export const InputGroupButton = React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(
  ({ className, size = 'sm', variant = 'ghost', grouped = true, ...props }, ref) => {
    const isIcon = typeof size === 'string' && size.toString().startsWith('icon')

    return (
      <Button
        ref={ref}
        size={size}
        variant={variant}
        className={cn(
          'h-9 px-3 text-xs font-medium transition-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none',
          grouped ? 'border-0 rounded-none first:rounded-l-md last:rounded-r-md' : 'rounded-md',
          isIcon ? 'h-9 w-9 px-0' : 'h-9',
          className
        )}
        {...props}
      />
    )
  }
)
InputGroupButton.displayName = 'InputGroupButton'

export interface InputGroupTextProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const InputGroupText = React.forwardRef<HTMLSpanElement, InputGroupTextProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('text-xs font-medium text-muted-foreground', className)}
        {...props}
      />
    )
  }
)
InputGroupText.displayName = 'InputGroupText'

export interface InputGroupTextareaProps extends React.ComponentProps<typeof Textarea> {}

export const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        data-slot="input-group-control"
        className={cn(
          'min-h-[120px] rounded-none border-0 bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
          'disabled:bg-muted/40 disabled:text-muted-foreground',
          className
        )}
        {...props}
      />
    )
  }
)
InputGroupTextarea.displayName = 'InputGroupTextarea'
