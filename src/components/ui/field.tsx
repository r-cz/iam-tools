import * as React from 'react'

import { cn } from '@/lib/utils'

type FieldOrientation = 'vertical' | 'horizontal' | 'responsive'

interface FieldContextValue {
  orientation: FieldOrientation
}

const FieldContext = React.createContext<FieldContextValue | null>(null)

const useFieldContext = () => React.useContext(FieldContext)

const fieldClasses: Record<FieldOrientation, string> = {
  vertical: 'flex flex-col gap-2',
  horizontal:
    'grid gap-4 sm:grid-cols-[220px,1fr] sm:items-center sm:gap-6 [&_[data-field-label]]:sm:text-right',
  responsive:
    'grid gap-2 sm:grid-cols-[220px,1fr] sm:items-start sm:gap-6 [&_[data-field-label]]:sm:pt-1',
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: FieldOrientation
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => {
    return (
      <FieldContext.Provider value={{ orientation }}>
        <div
          ref={ref}
          data-orientation={orientation}
          className={cn('w-full', fieldClasses[orientation], className)}
          {...props}
        />
      </FieldContext.Provider>
    )
  }
)
Field.displayName = 'Field'

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, ...props }, ref) => {
    const context = useFieldContext()
    const orientation = context?.orientation ?? 'vertical'

    return (
      <label
        ref={ref}
        data-field-label
        className={cn(
          'text-sm font-medium text-foreground',
          orientation === 'vertical' ? '' : 'leading-none',
          className
        )}
        {...props}
      />
    )
  }
)
FieldLabel.displayName = 'FieldLabel'

export interface FieldDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FieldDescription = React.forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  }
)
FieldDescription.displayName = 'FieldDescription'

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, ...props }, ref) => {
    return (
      <p ref={ref} className={cn('text-sm text-destructive', className)} role="alert" {...props} />
    )
  }
)
FieldError.displayName = 'FieldError'

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('grid gap-6', className)} {...props} />
  }
)
FieldGroup.displayName = 'FieldGroup'

export interface FieldSetProps extends React.HTMLAttributes<HTMLFieldSetElement> {}

export const FieldSet = React.forwardRef<HTMLFieldSetElement, FieldSetProps>(
  ({ className, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        className={cn('space-y-4 rounded-lg border border-border p-4', className)}
        {...props}
      />
    )
  }
)
FieldSet.displayName = 'FieldSet'

export interface FieldLegendProps extends React.HTMLAttributes<HTMLLegendElement> {}

export const FieldLegend = React.forwardRef<HTMLLegendElement, FieldLegendProps>(
  ({ className, ...props }, ref) => {
    return <legend ref={ref} className={cn('text-sm font-medium', className)} {...props} />
  }
)
FieldLegend.displayName = 'FieldLegend'
