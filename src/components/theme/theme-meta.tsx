import { useEffect } from 'react'
import { useTheme } from './theme-provider'

// Define theme colors that match your application's palette
const themeColors = {
  light: '#ffffff', // White for light mode
  dark: '#0a0a0a', // Black for dark mode
}

export function ThemeMeta() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const themeColor = resolvedTheme === 'dark' ? themeColors.dark : themeColors.light

    // Update the meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor)
    }
  }, [resolvedTheme])

  // This component doesn't render anything visible
  return null
}
