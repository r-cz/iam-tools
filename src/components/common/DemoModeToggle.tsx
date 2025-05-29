import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface DemoModeToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function DemoModeToggle({
  checked,
  onCheckedChange,
  description = 'Use demo mode for testing without external services.',
  loading = false,
  loadingText = 'Loading demo mode...',
  disabled = false,
  className,
  id = 'demo-mode',
}: DemoModeToggleProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center space-x-2">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled || loading}
          aria-describedby={`${id}-description`}
        />
        <Label
          htmlFor={id}
          className={cn(
            'cursor-pointer',
            (disabled || loading) && 'cursor-not-allowed opacity-50'
          )}
        >
          Demo Mode
        </Label>
      </div>
      <p 
        id={`${id}-description`}
        className="text-sm text-muted-foreground"
      >
        {loading ? loadingText : description}
      </p>
    </div>
  );
}