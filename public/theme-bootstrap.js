;(function () {
  var storedTheme = null
  try {
    storedTheme = window.localStorage.getItem('iam-tools-theme')
  } catch {
    // Storage may be unavailable; system preference remains a safe default.
  }

  var isDark =
    storedTheme === 'dark' ||
    (storedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.classList.toggle('dark-mode', isDark)
  document.documentElement.classList.toggle('light', !isDark)
})()
