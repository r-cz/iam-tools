import React from "react";
import { cn } from "@/lib/utils";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language, className, ...props }: CodeBlockProps) {
  return (
    <pre
      className={cn(
        "rounded-md font-mono text-sm overflow-x-auto p-4 bg-muted",
        className
      )}
      {...props}
    >
      <code className={language ? `language-${language}` : undefined}>
        {code}
      </code>
    </pre>
  );
}
