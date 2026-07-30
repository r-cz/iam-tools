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
    .trim()
}

function commandSearchText(command: ToolCommand): string {
  return normalizeSearchText(
    [
      command.tool.title,
      command.tool.description,
      ...command.tool.tags,
      command.section.title,
      command.section.navigationTitle,
    ].join(' ')
  )
}

export function searchToolCommands(query: string): ToolCommand[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return toolCommands

  const terms = normalizedQuery.split(/\s+/)

  return toolCommands
    .flatMap((command) => {
      const searchText = commandSearchText(command)
      if (!terms.every((term) => searchText.includes(term))) return []

      const title = normalizeSearchText(command.tool.title)
      const tags = command.tool.tags.map(normalizeSearchText)
      const section = normalizeSearchText(command.section.title)
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
