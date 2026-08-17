import * as React from 'react'
import { ArrowDown, ArrowUp, CornerDownLeft, Search, Star, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import {
  searchToolCommands,
  toolCommandById,
  toolCommands,
  type ToolCommand,
} from '@/lib/tool-search'
import { useToolPreferences } from '@/lib/state'

interface CommandCenterContextValue {
  isOpen: boolean
  openCommandCenter: () => void
  closeCommandCenter: () => void
}

interface CommandGroup {
  id: string
  label: string
  commands: ToolCommand[]
}

const CommandCenterContext = React.createContext<CommandCenterContextValue | undefined>(undefined)

function commandGroups(
  query: string,
  favoriteToolIds: string[],
  recentToolIds: string[]
): CommandGroup[] {
  if (query.trim()) {
    return [
      {
        id: 'search-results',
        label: 'Search results',
        commands: searchToolCommands(query),
      },
    ]
  }

  const includedToolIds = new Set<string>()
  const uniqueCommands = (toolIds: string[]) =>
    toolIds.flatMap((toolId) => {
      const command = toolCommandById.get(toolId)
      if (!command || includedToolIds.has(toolId)) return []

      includedToolIds.add(toolId)
      return [command]
    })

  const favorites = uniqueCommands(favoriteToolIds)
  const recent = uniqueCommands(recentToolIds)
  const remaining = uniqueCommands(toolCommands.map(({ tool }) => tool.id))

  return [
    favorites.length ? { id: 'favorites', label: 'Favorites', commands: favorites } : undefined,
    recent.length ? { id: 'recently-used', label: 'Recently used', commands: recent } : undefined,
    remaining.length ? { id: 'all-tools', label: 'All tools', commands: remaining } : undefined,
  ].filter((group): group is CommandGroup => Boolean(group))
}

function CommandOption({
  command,
  active,
  favorite,
  index,
  onOpen,
  onSelect,
  onToggleFavorite,
}: {
  command: ToolCommand
  active: boolean
  favorite: boolean
  index: number
  onOpen: () => void
  onSelect: () => void
  onToggleFavorite: () => void
}) {
  const Icon = command.tool.icon
  const optionId = `command-tool-${command.tool.id}`

  return (
    <div
      id={optionId}
      role="row"
      aria-selected={active}
      className={cn(
        'flex min-w-0 items-center rounded-lg border border-transparent outline-none transition-colors',
        active && 'border-border bg-accent'
      )}
      onMouseEnter={onSelect}
      data-command-index={index}
    >
      <div role="gridcell" className="min-w-0 flex-1">
        <button
          type="button"
          tabIndex={-1}
          className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left outline-none"
          onClick={onOpen}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon width={18} height={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{command.tool.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {command.tool.description}
            </span>
          </span>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
            {command.section.title}
          </span>
        </button>
      </div>
      <div role="gridcell" className="shrink-0 pr-2">
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={
            favorite
              ? `Remove ${command.tool.title} from favorites`
              : `Add ${command.tool.title} to favorites`
          }
          aria-pressed={favorite}
          onClick={onToggleFavorite}
        >
          <Star
            width={17}
            height={17}
            className={cn(favorite && 'fill-current text-foreground')}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  )
}

function ShortcutHint({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Kbd size="sm" className="normal-case tracking-normal" aria-hidden="true">
        <Icon width={12} height={12} />
      </Kbd>
      <span>{children}</span>
    </span>
  )
}

function CommandCenterDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: React.ComponentProps<typeof DialogContent>['onCloseAutoFocus']
}) {
  const navigate = useNavigate()
  const { favoriteToolIds, recentTools, isFavorite, toggleFavorite } = useToolPreferences()
  const [query, setQuery] = React.useState('')
  const [selectedToolId, setSelectedToolId] = React.useState<string | null>(null)

  const groups = React.useMemo(
    () =>
      commandGroups(
        query,
        favoriteToolIds,
        recentTools.map(({ id }) => id)
      ),
    [favoriteToolIds, query, recentTools]
  )
  const visibleCommands = React.useMemo(() => groups.flatMap((group) => group.commands), [groups])
  const selectedIndex = visibleCommands.findIndex(({ tool }) => tool.id === selectedToolId)
  const activeIndex = visibleCommands.length === 0 ? -1 : Math.max(0, selectedIndex)
  const activeCommand = activeIndex >= 0 ? visibleCommands[activeIndex] : undefined

  const openTool = React.useCallback(
    (command: ToolCommand) => {
      onOpenChange(false)
      navigate(command.tool.path)
    },
    [navigate, onOpenChange]
  )

  const toggleCommandFavorite = (command: ToolCommand) => {
    const toolId = command.tool.id
    const nextFavoriteToolIds = isFavorite(toolId)
      ? favoriteToolIds.filter((favoriteToolId) => favoriteToolId !== toolId)
      : [...favoriteToolIds, toolId]
    const nextVisibleCommands = commandGroups(
      query,
      nextFavoriteToolIds,
      recentTools.map(({ id }) => id)
    ).flatMap((group) => group.commands)
    const nextActiveIndex = nextVisibleCommands.findIndex(({ tool }) => tool.id === toolId)

    setSelectedToolId(nextVisibleCommands[Math.max(0, nextActiveIndex)]?.tool.id ?? null)
    toggleFavorite(toolId)
  }

  const toggleActiveFavorite = () => {
    if (!activeCommand) return
    toggleCommandFavorite(activeCommand)
  }

  const selectIndex = (nextIndex: number) => {
    const nextCommand = visibleCommands[nextIndex]
    if (!nextCommand) return
    setSelectedToolId(nextCommand.tool.id)

    window.requestAnimationFrame(() => {
      document
        .getElementById(`command-tool-${nextCommand.tool.id}`)
        ?.scrollIntoView({ block: 'nearest' })
    })
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectIndex(activeIndex >= visibleCommands.length - 1 ? 0 : activeIndex + 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectIndex(activeIndex <= 0 ? visibleCommands.length - 1 : activeIndex - 1)
      return
    }

    if (event.key === 'Enter' && event.shiftKey && activeCommand) {
      event.preventDefault()
      toggleCommandFavorite(activeCommand)
      return
    }

    if (event.key === 'Enter' && activeCommand) {
      event.preventDefault()
      openTool(activeCommand)
    }
  }

  let optionIndex = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-xl"
        data-testid="command-center"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Tool command center</DialogTitle>
          <DialogDescription>
            Search IAM tools and workflows, open a tool, or update favorites.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b p-4">
          <InputGroup size="lg">
            <InputGroupAddon
              align="inline-start"
              className="border-r-0 bg-transparent pr-0"
              aria-hidden="true"
            >
              <Search width={18} height={18} />
            </InputGroupAddon>
            <InputGroupInput
              autoFocus
              role="combobox"
              aria-label="Search tools and workflows"
              aria-expanded={open}
              aria-haspopup="grid"
              aria-controls="tool-command-list"
              aria-autocomplete="list"
              aria-activedescendant={
                activeCommand ? `command-tool-${activeCommand.tool.id}` : undefined
              }
              placeholder="Search tools and workflows..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSelectedToolId(null)
              }}
              onKeyDown={handleSearchKeyDown}
            />
            <InputGroupAddon
              align="inline-end"
              className="border-l-0 bg-transparent pl-0"
              aria-hidden="true"
            >
              <Kbd size="sm" className="normal-case tracking-normal">
                Esc
              </Kbd>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div
          id="tool-command-list"
          role={visibleCommands.length ? 'grid' : undefined}
          aria-label={visibleCommands.length ? 'Tools' : undefined}
          className="max-h-[min(26rem,calc(100vh-12rem))] overflow-y-auto p-2"
        >
          {visibleCommands.length === 0 ? (
            <Empty className="m-2 border-0 bg-transparent py-10 shadow-none">
              <EmptyMedia>
                <Search width={20} height={20} aria-hidden="true" />
              </EmptyMedia>
              <div className="flex flex-col gap-1">
                <EmptyTitle role="status" aria-live="polite">
                  No tools found
                </EmptyTitle>
                <EmptyDescription>
                  Try a tool name, protocol, tag, or catalog section.
                </EmptyDescription>
              </div>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setSelectedToolId(null)
                  }}
                >
                  Browse all tools
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            groups.map((group) => (
              <section
                key={group.id}
                role="rowgroup"
                aria-label={group.label}
                className="flex flex-col gap-1 py-1"
              >
                <h3
                  aria-hidden="true"
                  className="px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {group.label}
                </h3>
                {group.commands.map((command) => {
                  optionIndex += 1
                  const currentIndex = optionIndex

                  return (
                    <CommandOption
                      key={command.tool.id}
                      command={command}
                      active={currentIndex === activeIndex}
                      favorite={isFavorite(command.tool.id)}
                      index={currentIndex}
                      onSelect={() => setSelectedToolId(command.tool.id)}
                      onOpen={() => openTool(command)}
                      onToggleFavorite={() => toggleCommandFavorite(command)}
                    />
                  )
                })}
              </section>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span className="contents" aria-hidden="true">
            <span className="inline-flex items-center gap-1">
              <Kbd size="sm" className="normal-case tracking-normal">
                <ArrowUp width={12} height={12} />
              </Kbd>
              <ShortcutHint icon={ArrowDown}>Navigate</ShortcutHint>
            </span>
            <ShortcutHint icon={CornerDownLeft}>Open</ShortcutHint>
          </span>
          {activeCommand ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto gap-2 px-2"
              aria-label={
                isFavorite(activeCommand.tool.id)
                  ? `Remove ${activeCommand.tool.title} from favorites`
                  : `Add ${activeCommand.tool.title} to favorites`
              }
              aria-pressed={isFavorite(activeCommand.tool.id)}
              onClick={toggleActiveFavorite}
            >
              <Star
                width={14}
                height={14}
                className={cn(isFavorite(activeCommand.tool.id) && 'fill-current')}
                aria-hidden="true"
              />
              {isFavorite(activeCommand.tool.id) ? 'Favorited' : 'Favorite'}
              <span className="inline-flex items-center gap-1" aria-hidden="true">
                <Kbd size="sm" className="normal-case tracking-normal">
                  Shift
                </Kbd>
                <Kbd size="sm" className="normal-case tracking-normal">
                  <CornerDownLeft width={12} height={12} />
                </Kbd>
              </span>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CommandCenterProvider({ children }: { children: React.ReactNode }) {
  const [commandCenterState, setCommandCenterState] = React.useState({
    isOpen: false,
    sessionId: 0,
  })
  const restoreFocusRef = React.useRef<HTMLElement | null>(null)

  const rememberFocusedElement = React.useCallback(() => {
    const activeElement = document.activeElement
    if (activeElement && activeElement !== document.body && 'focus' in activeElement) {
      restoreFocusRef.current = activeElement as HTMLElement
    }
  }, [])

  const setCommandCenterOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) rememberFocusedElement()

      setCommandCenterState((currentState) => {
        if (currentState.isOpen === nextOpen) return currentState

        return {
          isOpen: nextOpen,
          sessionId: nextOpen ? currentState.sessionId + 1 : currentState.sessionId,
        }
      })
    },
    [rememberFocusedElement]
  )

  const openCommandCenter = React.useCallback(() => {
    setCommandCenterOpen(true)
  }, [setCommandCenterOpen])

  const closeCommandCenter = React.useCallback(() => {
    setCommandCenterOpen(false)
  }, [setCommandCenterOpen])

  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.isComposing ||
        event.key.toLocaleLowerCase() !== 'k' ||
        (!event.metaKey && !event.ctrlKey)
      ) {
        return
      }

      event.preventDefault()
      setCommandCenterOpen(!commandCenterState.isOpen)
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [commandCenterState.isOpen, setCommandCenterOpen])

  const contextValue = React.useMemo<CommandCenterContextValue>(
    () => ({
      isOpen: commandCenterState.isOpen,
      openCommandCenter,
      closeCommandCenter,
    }),
    [closeCommandCenter, commandCenterState.isOpen, openCommandCenter]
  )

  return (
    <CommandCenterContext.Provider value={contextValue}>
      {children}
      <CommandCenterDialog
        key={commandCenterState.sessionId}
        open={commandCenterState.isOpen}
        onOpenChange={setCommandCenterOpen}
        onCloseAutoFocus={(event) => {
          const restoreTarget = restoreFocusRef.current
          restoreFocusRef.current = null
          if (!restoreTarget?.isConnected) return

          event.preventDefault()
          restoreTarget.focus()
        }}
      />
    </CommandCenterContext.Provider>
  )
}

export function useCommandCenter(): CommandCenterContextValue {
  const context = React.useContext(CommandCenterContext)

  if (!context) {
    throw new Error('useCommandCenter must be used within CommandCenterProvider')
  }

  return context
}

export function CommandCenterTrigger({ className }: { className?: string }) {
  const { openCommandCenter } = useCommandCenter()
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/i.test(`${navigator.platform} ${navigator.userAgent}`)

  return (
    <Button
      variant="outline"
      className={cn('h-10 justify-start gap-2 text-muted-foreground', className)}
      aria-label="Search tools"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={openCommandCenter}
    >
      <Search data-icon="inline-start" width={17} height={17} aria-hidden="true" />
      <span className="hidden flex-1 text-left font-normal sm:block">Search tools</span>
      <Kbd
        size="sm"
        className="hidden normal-case tracking-normal sm:inline-flex"
        aria-hidden="true"
      >
        {isMac ? '⌘ K' : 'Ctrl K'}
      </Kbd>
    </Button>
  )
}
