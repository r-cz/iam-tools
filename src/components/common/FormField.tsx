import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface FormFieldProps {
  label: string;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children?: ReactNode;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, description, error, required, className, children }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {children}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

interface FormFieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

export const FormFieldInput = forwardRef<HTMLInputElement, FormFieldInputProps>(
  ({ label, description, error, required, containerClassName, className, ...props }, ref) => {
    return (
      <FormField 
        label={label}
        description={description}
        error={error}
        required={required}
        className={containerClassName}
      >
        <Input 
          ref={ref}
          className={cn(error && 'border-destructive', className)}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
      </FormField>
    );
  }
);

FormFieldInput.displayName = 'FormFieldInput';

export const FormFieldTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
    description?: ReactNode;
    error?: string;
    required?: boolean;
    containerClassName?: string;
  }
>(({ label, description, error, required, containerClassName, className, ...props }, ref) => {
  return (
    <FormField 
      label={label}
      description={description}
      error={error}
      required={required}
      className={containerClassName}
    >
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
    </FormField>
  );
});

FormFieldTextarea.displayName = 'FormFieldTextarea';