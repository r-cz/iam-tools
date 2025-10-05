import * as React from 'react'

import { cn } from '@/lib/utils'

type ButtonGroupOrientation = 'horizontal' | 'vertical'

const orientationClasses: Record<ButtonGroupOrientation, string> = {
  horizontal:
    'flex-row divide-x divide-border first:[&>*]:rounded-l-md last:[&>*]:rounded-r-md [&>*]:rounded-none',
  vertical:
    'flex-col divide-y divide-border first:[&>*]:rounded-t-md last:[&>*]:rounded-b-md [&>*]:rounded-none',
}

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: ButtonGroupOrientation
  attached?: boolean
}

const isSeparator = (
  child: React.ReactElement
): child is React.ReactElement<ButtonGroupSeparatorProps> =>
  (child.type as any)?.displayName === 'ButtonGroupSeparator'

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, children, orientation = 'horizontal', attached = false, ...props }, ref) => {
    const enhancedChildren = React.Children.map(children, (child, index) => {
      if (!React.isValidElement(child)) return child

      if (isSeparator(child)) {
        return React.cloneElement(child, {
          orientation,
          key: child.key ?? index,
        })
      }

      const element = child as React.ReactElement<{ className?: string }>
      const itemClassName = cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        element.props.className
      )

      return React.cloneElement(element, {
        className: itemClassName,
        key: element.key ?? index,
      })
    })

    return (
      <div
        ref={ref}
        data-orientation={orientation}
        className={cn(
          'inline-flex items-stretch overflow-hidden rounded-md border border-input bg-card text-sm shadow-sm [&>*]:focus-visible:z-10',
          orientationClasses[orientation],
          attached ? 'w-full' : 'w-auto',
          className
        )}
        {...props}
      >
        {enhancedChildren}
      </div>
    )
  }
)
ButtonGroup.displayName = 'ButtonGroup'

export interface ButtonGroupSeparatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  orientation?: ButtonGroupOrientation
}

export const ButtonGroupSeparator = React.forwardRef<HTMLSpanElement, ButtonGroupSeparatorProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={cn(
          'bg-border',
          orientation === 'horizontal' ? 'h-full w-px' : 'h-px w-full',
          className
        )}
        {...props}
      />
    )
  }
)
ButtonGroupSeparator.displayName = 'ButtonGroupSeparator'

export interface ButtonGroupTextProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const ButtonGroupText = React.forwardRef<HTMLSpanElement, ButtonGroupTextProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('px-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground', className)}
        {...props}
      />
    )
  }
)
ButtonGroupText.displayName = 'ButtonGroupText'
