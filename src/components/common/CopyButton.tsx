import { Button, ButtonProps } from "@/components/ui/button";
import { useClipboard } from "@/hooks/use-clipboard";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  text: string;
  onCopy?: () => void;
  className?: string;
  iconSize?: string;
  showText?: boolean;
  copiedText?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

export function CopyButton({ 
  text, 
  onCopy,
  className,
  iconSize = "h-4 w-4",
  showText = true,
  copiedText = "Copied",
  variant = "outline",
  size = "sm",
  ...props 
}: CopyButtonProps) {
  const { copy, copied } = useClipboard();

  const handleCopy = () => {
    copy(text);
    onCopy?.();
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("transition-all", className)}
      {...props}
    >
      {copied ? (
        <>
          <Check className={cn(iconSize, showText && "mr-1")} />
          {showText && copiedText}
        </>
      ) : (
        <>
          <Copy className={cn(iconSize, showText && "mr-1")} />
          {showText && "Copy"}
        </>
      )}
    </Button>
  );
}