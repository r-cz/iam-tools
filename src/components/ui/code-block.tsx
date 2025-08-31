import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Highlight, themes } from 'prism-react-renderer' // Import types
import { useTheme } from '@/components/theme/theme-provider'

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  code: string
  language?: string
}

export function CodeBlock({ code, language = 'json', className, ...props }: CodeBlockProps) {
  const { theme } = useTheme()

  const isDarkMode = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }, [theme])

  const codeTheme = useMemo(() => {
    return isDarkMode ? themes.nightOwl : themes.github
  }, [isDarkMode])

  return (
    <Highlight theme={codeTheme} code={code} language={language as any}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={cn('rounded-md font-mono text-sm overflow-x-auto p-4 bg-muted', className)}
          style={{
            ...style,
            backgroundColor: 'var(--muted)',
          }}
          {...props}
        >
          {tokens.map((line, i) => {
            const lineProps = getLineProps({ line, key: i })
            // --- FIX: Destructure and Assert Type ---
            const { key: lineKey, ...restLineProps } = lineProps
            return (
              <div key={(lineKey as React.Key) ?? i} {...restLineProps}>
                {/* --- END OF FIX --- */}
                {line.map((token, key) => {
                  const tokenProps = getTokenProps({ token, key })
                  // --- FIX: Destructure and Assert Type ---
                  const { key: tokenKey, ...restTokenProps } = tokenProps
                  return <span key={(tokenKey as React.Key) ?? key} {...restTokenProps} />
                  // --- END OF FIX ---
                })}
              </div>
            )
          })}
        </pre>
      )}
    </Highlight>
  )
}
