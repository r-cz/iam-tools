import {
  allTools,
  toolCatalog,
  type ToolCatalogItem,
  type ToolCatalogSection,
} from '@/config/tool-catalog'

export interface ToolCommand {
  tool: ToolCatalogItem
  section: Pick<ToolCatalogSection, 'id' | 'title' | 'navigationTitle'>
}

const sectionByToolId = new Map<string, ToolCommand['section']>()

function indexSectionTools(section: ToolCommand['section'], tools: ToolCatalogItem[]): void {
  for (const tool of tools) {
    sectionByToolId.set(tool.id, section)
    if (tool.children) indexSectionTools(section, tool.children)
  }
}

for (const { id, title, navigationTitle, tools } of toolCatalog) {
  indexSectionTools({ id, title, navigationTitle }, tools)
}

export const toolCommands: ToolCommand[] = allTools.flatMap((tool) => {
  const section = sectionByToolId.get(tool.id)
  return section ? [{ tool, section }] : []
})

export const toolCommandById = new Map(toolCommands.map((command) => [command.tool.id, command]))

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function commandSearchText(command: ToolCommand): string {
  return normalizeSearchText(
    [
      command.tool.title,
      command.tool.navigationTitle,
      command.tool.routeTitle,
      command.tool.id,
      command.tool.path,
      command.tool.description,
      ...command.tool.tags,
      command.section.title,
      command.section.navigationTitle,
    ].join(' ')
  )
}

// The catalog is static. Normalize it once instead of repeating the work for each keystroke.
const searchIndex = toolCommands.map((command) => ({
  command,
  searchText: commandSearchText(command),
  title: normalizeSearchText(command.tool.title),
  tags: command.tool.tags.map(normalizeSearchText),
  section: normalizeSearchText(command.section.title),
}))

export function searchToolCommands(query: string): ToolCommand[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return toolCommands

  const terms = normalizedQuery.split(/\s+/)

  return searchIndex
    .flatMap(({ command, searchText, title, tags, section }) => {
      if (!terms.every((term) => searchText.includes(term))) return []

      let score = 0

      if (title === normalizedQuery) score += 100
      if (title.startsWith(normalizedQuery)) score += 50
      if (title.includes(normalizedQuery)) score += 30
      if (tags.some((tag) => tag.includes(normalizedQuery))) score += 15
      if (section.includes(normalizedQuery)) score += 10

      return [{ command, score }]
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.command.tool.title.localeCompare(right.command.tool.title)
    )
    .map(({ command }) => command)
}
