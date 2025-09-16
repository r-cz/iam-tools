export function formatXml(xml: string): string {
  try {
    // Normalize spacing
    const reg = /(>)(<)(\/*)/g
    const formatted = xml.replace(reg, '$1\n$2$3')
    let pad = 0
    return formatted
      .split(/\n/)
      .map((line) => {
        if (!line.trim()) return ''
        if (line.match(/^<\//)) {
          pad = Math.max(pad - 1, 0)
        }
        const indent = '  '.repeat(pad)
        if (line.match(/^<[^!?]+[^\/>]*>$/) && !line.includes('</')) {
          pad += 1
        } else if (line.match(/^<[^!?]+.*\/>$/)) {
          // self-closing, no pad change
        } else if (line.match(/^<\w[^>]*[^\/]>(.*)<\/\w/)) {
          // open and close on same line
        }
        return indent + line
      })
      .join('\n')
  } catch {
    return xml
  }
}
