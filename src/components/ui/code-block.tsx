import React from "react";
import { cn } from "@/lib/utils";
import { Highlight, themes } from "prism-react-renderer";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "json", className, ...props }: CodeBlockProps) {
  return (
    <Highlight 
      theme={themes.nightOwl} 
      code={code} 
      language={language as any}
    >
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={cn(
            "rounded-md font-mono text-sm overflow-x-auto p-4 bg-muted",
            className
          )}
          style={style}
          {...props}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, key: i })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
