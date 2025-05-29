import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

interface JsonDisplayProps {
  data: unknown;
  className?: string;
  containerClassName?: string;
  copyButtonClassName?: string;
  showCopyButton?: boolean;
  language?: string;
  maxHeight?: string;
}

export function JsonDisplay({ 
  data, 
  className,
  containerClassName,
  copyButtonClassName,
  showCopyButton = true,
  language = "json",
  maxHeight
}: JsonDisplayProps) {
  const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  return (
    <div className={cn("relative", containerClassName)}>
      <CodeBlock 
        code={jsonString} 
        language={language}
        className={cn(maxHeight && "overflow-auto", className)}
        style={maxHeight ? { maxHeight } : undefined}
      />
      {showCopyButton && (
        <CopyButton
          text={jsonString}
          className={cn("absolute top-2 right-2", copyButtonClassName)}
          size="sm"
          variant="outline"
        />
      )}
    </div>
  );
}