import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Highlight, themes } from "prism-react-renderer";
import { useTheme } from "@/components/theme/theme-provider";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "json", className, ...props }: CodeBlockProps) {
  const { theme } = useTheme();
  
  // Determine if the current theme is dark mode
  const isDarkMode = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  }, [theme]);
  
  // Select appropriate theme based on dark/light mode
  const codeTheme = useMemo(() => {
    return isDarkMode ? themes.nightOwl : themes.github;
  }, [isDarkMode]);

  return (
    <Highlight 
      theme={codeTheme} 
      code={code} 
      language={language as any}
    >
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={cn(
            "rounded-md font-mono text-sm overflow-x-auto p-4 bg-muted",
            className
          )}
          style={{
            ...style,
            backgroundColor: "var(--muted)", // Use theme variable instead of fixed color
          }}
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
