import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { toolCatalog, type ToolCatalogItem } from '@/config/tool-catalog'
import { searchToolCommands, toolCommands } from '@/lib/tool-search'
import { useToolPreferences } from '@/lib/state'
import { cn } from '@/lib/utils'

function ToolCard({
  tool,
  favorite,
  onToggleFavorite,
}: {
  tool: ToolCatalogItem
  favorite: boolean
  onToggleFavorite: () => void
}) {
  const Icon = tool.icon
  return (
    <Item className="h-full gap-0 p-0 hover:bg-muted/40">
      <Link
        to={tool.path}
        data-testid={tool.homeTestId}
        className="flex h-full min-w-0 flex-1 items-start gap-3 rounded-xl p-4 pr-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ItemMedia variant="icon" className="bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </ItemMedia>
        <ItemContent className="min-w-0 gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <ItemTitle>{tool.title}</ItemTitle>
            <ItemDescription>{tool.description}</ItemDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tool.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </ItemContent>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="mr-1 mt-2 shrink-0 text-muted-foreground"
        aria-label={`${favorite ? 'Remove' : 'Add'} ${tool.title} ${favorite ? 'from' : 'to'} favorites`}
        aria-pressed={favorite}
        onClick={onToggleFavorite}
      >
        <Star
          className={cn('size-4', favorite && 'fill-current text-foreground')}
          aria-hidden="true"
        />
      </Button>
    </Item>
  )
}

export function ToolCatalogBrowser() {
  const [query, setQuery] = useState('')
  const [sectionId, setSectionId] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { favoriteToolIds, toggleFavorite } = useToolPreferences()
  const favoriteIds = useMemo(() => new Set(favoriteToolIds), [favoriteToolIds])
  const matchingCommands = useMemo(() => searchToolCommands(query), [query])
  const hasQuery = Boolean(query.trim())
  const matchingTools = matchingCommands.filter(
    ({ tool, section }) =>
      (sectionId === 'all' || section.id === sectionId) &&
      (!favoritesOnly || favoriteIds.has(tool.id)) &&
      (hasQuery || favoritesOnly || tool.showOnHome !== false)
  )
  const sections = toolCatalog.flatMap((section) => {
    const tools = matchingTools
      .filter((command) => command.section.id === section.id)
      .map(({ tool }) => tool)
    return tools.length ? [{ ...section, tools }] : []
  })
  const hasFilters = hasQuery || sectionId !== 'all' || favoritesOnly
  const resetFilters = () => {
    setQuery('')
    setSectionId('all')
    setFavoritesOnly(false)
    inputRef.current?.focus()
  }

  return (
    <section aria-labelledby="tool-catalog-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="tool-catalog-heading" className="text-xl font-semibold">
              Explore tools
            </h2>
            <p className="text-sm text-muted-foreground">
              Find a tool by name, protocol, or workflow.
            </p>
          </div>
          <InputGroup className="w-full sm:max-w-sm">
            <InputGroupAddon
              align="inline-start"
              className="border-r-0 bg-transparent"
              aria-hidden="true"
            >
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              type="search"
              aria-label="Filter tool catalog"
              aria-controls="tool-catalog-results"
              placeholder="Try JWT, PKCE, LDAP..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputGroup>
        </div>
        <div
          role="group"
          aria-label="Filter by protocol"
          className="flex flex-wrap items-center gap-2"
        >
          {[{ id: 'all', title: 'All tools' }, ...toolCatalog].map((section) => (
            <Button
              key={section.id}
              variant={sectionId === section.id ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={sectionId === section.id}
              onClick={() => setSectionId(section.id)}
            >
              {section.title}
            </Button>
          ))}
          <Button
            variant={favoritesOnly ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((value) => !value)}
          >
            <Star className={cn('size-3.5', favoritesOnly && 'fill-current')} aria-hidden="true" />
            Favorites
          </Button>
        </div>
        <div className="flex min-h-8 items-center justify-between gap-2">
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-xs text-muted-foreground"
          >
            {matchingTools.length} tool{matchingTools.length === 1 ? '' : 's'}
            {hasFilters
              ? ' found'
              : ` · ${toolCommands.length} tools and workflows available in search`}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
              <X className="size-3.5" aria-hidden="true" /> Clear filters
            </Button>
          )}
        </div>
      </div>
      <div id="tool-catalog-results" className="flex flex-col gap-8">
        {sections.length ? (
          sections.map((section) => {
            const Icon = section.icon
            return (
              <section
                key={section.id}
                aria-labelledby={`catalog-section-${section.id}`}
                className="flex flex-col gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 id={`catalog-section-${section.id}`} className="text-lg font-semibold">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  <Badge variant="outline">{section.tools.length}</Badge>
                </div>
                <ItemGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {section.tools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      favorite={favoriteIds.has(tool.id)}
                      onToggleFavorite={() => toggleFavorite(tool.id)}
                    />
                  ))}
                </ItemGroup>
              </section>
            )
          })
        ) : (
          <Empty>
            <EmptyTitle>
              {favoritesOnly && favoriteIds.size === 0 ? 'No favorites yet' : 'No matching tools'}
            </EmptyTitle>
            <EmptyDescription>
              {favoritesOnly && favoriteIds.size === 0
                ? 'Star a tool in the catalog to find it here next time.'
                : 'Try another search or clear your filters to browse the full catalog.'}
            </EmptyDescription>
            <EmptyContent>
              <Button variant="outline" onClick={resetFilters}>
                Browse all tools
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </section>
  )
}
