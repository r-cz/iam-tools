import { useEffect } from "react";
import { useTheme } from "./theme-provider";

// Define theme colors that match your application's palette
const themeColors = {
  light: "#ffffff", // White for light mode
  dark: "#0a0a0a",  // Black for dark mode
  initial: "#1a1a1a" // Initial neutral color (matches manifest)
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
    
    // Also update manifest link if needed for PWA
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink && manifestLink.getAttribute("href") === "/manifest.json") {
      // We already updated the manifest.json and manifest.webmanifest files
      // This ensures any dynamic manifest changes are consistent
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
