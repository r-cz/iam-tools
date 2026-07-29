import * as React from 'react'
import { Clock3, Search, ShieldCheck, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useCommandCenter } from '@/components/command-center'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { getToolById, type ToolCatalogItem } from '@/config/tool-catalog'
import { useToolPreferences } from '@/lib/state'

const MAX_QUICK_ACCESS_ITEMS = 3
const RECENT_TIME_REFRESH_MS = 60_000

function useMinuteClock(): number {
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, RECENT_TIME_REFRESH_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  return now
}

export function formatRecentToolTime(visitedAt: number, now = Date.now()): string {
  const elapsedSeconds = Math.max(0, Math.floor((now - visitedAt) / 1000))
  if (elapsedSeconds < 60) return 'Just now'

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}h ago`

  const elapsedDays = Math.floor(elapsedHours / 24)
  return `${elapsedDays}d ago`
}

function QuickAccessEmpty({
  type,
  onBrowse,
}: {
  type: 'favorites' | 'recent'
  onBrowse: () => void
}) {
  const isFavorites = type === 'favorites'

  return (
    <Empty className="rounded-lg p-5 shadow-none">
      <EmptyMedia>
        {isFavorites ? (
          <Star width={18} height={18} aria-hidden="true" />
        ) : (
          <Clock3 width={18} height={18} aria-hidden="true" />
        )}
      </EmptyMedia>
      <div className="flex flex-col gap-1">
        <EmptyTitle className="text-base">
          {isFavorites ? 'No favorites yet' : 'No recent tools yet'}
        </EmptyTitle>
        <EmptyDescription>
          {isFavorites
            ? 'Star tools in the command center to keep them close.'
            : 'Open a catalog tool and it will appear here for a quick return.'}
        </EmptyDescription>
      </div>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onBrowse}>
          <Search data-icon="inline-start" width={15} height={15} aria-hidden="true" />
          {isFavorites ? 'Browse tools' : 'Find a tool'}
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function FavoriteToolRow({
  tool,
  onToggleFavorite,
}: {
  tool: ToolCatalogItem
  onToggleFavorite: () => void
}) {
  const Icon = tool.icon

  return (
    <Item className="items-center gap-0 overflow-hidden p-0">
      <Link
        to={tool.path}
        className="flex min-w-0 flex-1 items-center gap-3 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ItemMedia variant="icon">
          <Icon width={18} height={18} aria-hidden="true" />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle className="truncate text-sm">{tool.title}</ItemTitle>
          <ItemDescription className="truncate">{tool.description}</ItemDescription>
        </ItemContent>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="mr-2 shrink-0"
        aria-label={`Remove ${tool.title} from favorites`}
        aria-pressed="true"
        onClick={onToggleFavorite}
      >
        <Star width={17} height={17} className="fill-current" aria-hidden="true" />
      </Button>
    </Item>
  )
}

function RecentToolRow({
  tool,
  visitedAt,
  now,
}: {
  tool: ToolCatalogItem
  visitedAt: number
  now: number
}) {
  const Icon = tool.icon

  return (
    <Item asChild interactive className="p-0">
      <Link to={tool.path} className="flex min-w-0 items-center gap-3 p-3">
        <ItemMedia variant="icon">
          <Icon width={18} height={18} aria-hidden="true" />
        </ItemMedia>
        <ItemContent className="min-w-0 flex-1">
          <ItemTitle className="truncate text-sm">{tool.title}</ItemTitle>
          <ItemDescription className="truncate">{tool.description}</ItemDescription>
        </ItemContent>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatRecentToolTime(visitedAt, now)}
        </span>
      </Link>
    </Item>
  )
}

export function QuickAccess({ totalToolCount }: { totalToolCount: number }) {
  const { openCommandCenter } = useCommandCenter()
  const { favoriteToolIds, recentTools, toggleFavorite, clearRecentTools } = useToolPreferences()
  const now = useMinuteClock()

  const favoriteTools = favoriteToolIds
    .map((toolId) => getToolById(toolId))
    .filter((tool): tool is ToolCatalogItem => Boolean(tool))
    .slice(0, MAX_QUICK_ACCESS_ITEMS)
  const recentToolRecords = recentTools
    .flatMap((record) => {
      const tool = getToolById(record.id)
      return tool ? [{ ...record, tool }] : []
    })
    .slice(0, MAX_QUICK_ACCESS_ITEMS)

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="gap-3 px-5 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-xl">Quick access</CardTitle>
          <CardDescription>
            Your favorites and recently used tools for faster access.
          </CardDescription>
        </div>
        <div className="flex items-start gap-2 text-sm sm:justify-self-end">
          <ShieldCheck
            width={18}
            height={18}
            className="mt-0.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">
              {totalToolCount} local-first tool{totalToolCount === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-muted-foreground">Sensitive inputs stay in this tab.</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 px-5 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b p-4">
            <div className="flex items-center gap-2">
              <Star width={18} height={18} aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <CardTitle>Favorites</CardTitle>
                <CardDescription>Pin tools you use most.</CardDescription>
              </div>
            </div>
            <CardAction>
              <Button variant="outline" size="sm" onClick={openCommandCenter}>
                Manage
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-3">
            {favoriteTools.length ? (
              favoriteTools.map((tool) => (
                <FavoriteToolRow
                  key={tool.id}
                  tool={tool}
                  onToggleFavorite={() => toggleFavorite(tool.id)}
                />
              ))
            ) : (
              <QuickAccessEmpty type="favorites" onBrowse={openCommandCenter} />
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b p-4">
            <div className="flex items-center gap-2">
              <Clock3 width={18} height={18} aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <CardTitle>Recent</CardTitle>
                <CardDescription>Continue where you left off.</CardDescription>
              </div>
            </div>
            {recentToolRecords.length ? (
              <CardAction>
                <Button variant="outline" size="sm" onClick={clearRecentTools}>
                  Clear
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-3">
            {recentToolRecords.length ? (
              recentToolRecords.map(({ id, visitedAt, tool }) => (
                <RecentToolRow key={id} tool={tool} visitedAt={visitedAt} now={now} />
              ))
            ) : (
              <QuickAccessEmpty type="recent" onBrowse={openCommandCenter} />
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
