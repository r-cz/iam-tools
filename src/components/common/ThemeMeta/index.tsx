import { useEffect } from "react";
import { useTheme } from "@/components/theme-provider";

// Define theme colors that match your application's palette
const themeColors = {
  light: "#ffffff", // White for light mode
  dark: "#000000"   // Black for dark mode
};

export function ThemeMeta() {
  const { theme } = useTheme();

  useEffect(() => {
    // Get the current system preference
    const isDarkMode = 
      theme === "dark" || 
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    // Select the appropriate color
    const themeColor = isDarkMode ? themeColors.dark : themeColors.light;
    
    // Update the meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", themeColor);
    }

    // Listen for system preference changes if theme is set to "system"
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const handleChange = (e: MediaQueryListEvent) => {
        const systemThemeColor = e.matches ? themeColors.dark : themeColors.light;
        metaThemeColor?.setAttribute("content", systemThemeColor);
      };
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  // This component doesn't render anything visible
  return null;
}
