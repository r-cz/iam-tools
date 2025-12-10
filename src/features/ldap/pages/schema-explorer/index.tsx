import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Database,
  Info,
  Trash2,
  ScrollText,
  Upload,
  Download,
  Search,
  ChevronRight,
  Library,
  Save,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageContainer, PageHeader } from '@/components/page'
import { useSavedSchemas } from '../../hooks/useSavedSchemas'
import { parseLdapSchema, type ParsedObjectClass } from '../../utils/parse-schema'
import { BUILTIN_SCHEMAS, getCombinedSchema } from '../../data/builtin-schemas'

function highlightSchemaLine(line: string): React.ReactNode {
  // Syntax highlighting for schema definitions
  const trimmed = line.trim()

  if (trimmed.startsWith('#')) {
    return <span className="text-muted-foreground italic">{line}</span>
  }

  if (trimmed.startsWith('objectClasses:') || trimmed.startsWith('attributeTypes:')) {
    const parts = line.split(
      /(\(|\)|NAME|DESC|SUP|MUST|MAY|EQUALITY|SYNTAX|SUBSTR|ORDERING|STRUCTURAL|AUXILIARY|ABSTRACT|SINGLE-VALUE|COLLECTIVE|NO-USER-MODIFICATION|USAGE)/g
    )
    return (
      <>
        {parts.map((part, i) => {
          if (['objectClasses:', 'attributeTypes:'].some((k) => part.includes(k))) {
            return (
              <span key={i} className="text-blue-400 font-semibold">
                {part}
              </span>
            )
          }
          if (
            [
              'NAME',
              'DESC',
              'SUP',
              'MUST',
              'MAY',
              'EQUALITY',
              'SYNTAX',
              'SUBSTR',
              'ORDERING',
              'USAGE',
            ].includes(part)
          ) {
            return (
              <span key={i} className="text-amber-400 font-medium">
                {part}
              </span>
            )
          }
          if (
            [
              'STRUCTURAL',
              'AUXILIARY',
              'ABSTRACT',
              'SINGLE-VALUE',
              'COLLECTIVE',
              'NO-USER-MODIFICATION',
            ].includes(part)
          ) {
            return (
              <span key={i} className="text-emerald-400 font-medium">
                {part}
              </span>
            )
          }
          if (part === '(' || part === ')') {
            return (
              <span key={i} className="text-purple-400">
                {part}
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </>
    )
  }

  return line
}

function buildInheritanceChain(
  objectClass: ParsedObjectClass,
  allClasses: ParsedObjectClass[],
  visited = new Set<string>()
): string[] {
  const chain: string[] = []
  const name = objectClass.names[0]?.toLowerCase()

  if (!name || visited.has(name)) return chain
  visited.add(name)

  if (objectClass.superior && objectClass.superior.length > 0) {
    for (const sup of objectClass.superior) {
      chain.push(sup)
      const parent = allClasses.find((oc) =>
        oc.names.some((n) => n.toLowerCase() === sup.toLowerCase())
      )
      if (parent) {
        chain.push(...buildInheritanceChain(parent, allClasses, visited))
      }
    }
  }

  return chain
}

export default function LdapSchemaExplorerPage() {
  const [schemaText, setSchemaText] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [builtinOpen, setBuiltinOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { schemas, upsertSchema, removeSchema } = useSavedSchemas()

  const parsed = useMemo(() => parseLdapSchema(schemaText), [schemaText])
  const hasInput = schemaText.trim().length > 0

  // Filter object classes and attributes based on search
  const filteredObjectClasses = useMemo(() => {
    if (!searchQuery.trim()) return parsed.objectClasses
    const query = searchQuery.toLowerCase()
    return parsed.objectClasses.filter(
      (oc) =>
        oc.names.some((n) => n.toLowerCase().includes(query)) ||
        oc.description?.toLowerCase().includes(query) ||
        oc.oid.includes(query)
    )
  }, [parsed.objectClasses, searchQuery])

  const filteredAttributeTypes = useMemo(() => {
    if (!searchQuery.trim()) return parsed.attributeTypes
    const query = searchQuery.toLowerCase()
    return parsed.attributeTypes.filter(
      (at) =>
        at.names.some((n) => n.toLowerCase().includes(query)) ||
        at.description?.toLowerCase().includes(query) ||
        at.oid.includes(query)
    )
  }, [parsed.attributeTypes, searchQuery])

  // Auto-save is now manual to allow custom naming
  const savedSummaries = useMemo(
    () =>
      schemas.map((entry) => {
        const summary = parseLdapSchema(entry.schemaText)
        return {
          entry,
          counts: {
            objectClasses: summary.objectClasses.length,
            attributeTypes: summary.attributeTypes.length,
            errors: summary.errors.length,
          },
        }
      }),
    [schemas]
  )

  const handleLoadBuiltinSchema = (schemaId: string) => {
    const schema = BUILTIN_SCHEMAS.find((s) => s.id === schemaId)
    if (schema) {
      setSchemaText(schema.schemaText)
      setBuiltinOpen(false)
      toast.success('Built-in schema loaded', { description: schema.name })
    }
  }

  const handleLoadCombinedSchema = () => {
    const combined = getCombinedSchema(true, true)
    setSchemaText(combined)
    setBuiltinOpen(false)
    toast.success('Combined schema loaded', { description: 'Core LDAP + AD + PingDirectory' })
  }

  const handleLoadSchema = (text: string, name: string) => {
    setSchemaText(text)
    setLibraryOpen(false)
    toast.success('Schema loaded into editor', { description: name })
  }

  const handleDeleteSchema = (id: string, name: string) => {
    removeSchema(id)
    toast.success('Schema deleted', { description: name })
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      setSchemaText(text)
      toast.success('Schema file loaded', { description: file.name })
    } catch (error) {
      toast.error('Failed to read file', {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      event.target.value = ''
    }
  }

  const handleDownload = () => {
    if (!schemaText.trim()) return

    const blob = new Blob([schemaText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schema.ldif'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Schema downloaded', { description: 'schema.ldif' })
  }

  const handleSaveSchema = () => {
    const trimmed = schemaText.trim()
    if (!trimmed) {
      toast.error('No schema to save')
      return
    }

    const snapshot = parseLdapSchema(trimmed)
    const snapshotHasDefinitions =
      snapshot.attributeTypes.length + snapshot.objectClasses.length > 0

    if (!snapshotHasDefinitions) {
      toast.error('No valid schema definitions found')
      return
    }

    // Generate default name if not provided
    const primaryObjectClass = snapshot.objectClasses.find((item) => item.names.length)?.names[0]
    const primaryAttribute = snapshot.attributeTypes.find((item) => item.names.length)?.names[0]
    const defaultName = primaryObjectClass || primaryAttribute || 'Custom Schema'

    setCustomName(defaultName)
    setSaveDialogOpen(true)
  }

  const handleConfirmSave = () => {
    const name = customName.trim() || 'Custom Schema'
    try {
      const result = upsertSchema(name, schemaText.trim())
      setSaveDialogOpen(false)
      setCustomName('')
      toast.success(result.status === 'created' ? 'Schema saved' : 'Schema updated', {
        description: name,
      })
    } catch (error) {
      toast.error('Failed to save schema', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="LDAP Schema Explorer"
        description="Visualize LDAP schema definitions from ldapsearch output or vendor exports. Save schemas locally for validation in the LDIF Builder."
        icon={Database}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".schema,.ldif,.txt,.ldf,text/plain"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="space-y-10">
        <Card>
          <CardContent className="space-y-3">
            <InputGroup className="flex-wrap border-0 bg-transparent shadow-none">
              <InputGroupAddon
                align="block-start"
                className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent border-0 py-1.5"
              >
                <span className="text-sm font-medium text-foreground">Schema definitions</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <InputGroupButton
                    type="button"
                    grouped={false}
                    variant="outline"
                    onClick={handleUploadClick}
                    className="flex items-center gap-1.5"
                    aria-label="Upload schema file"
                  >
                    <Upload size={16} />
                    <span className="hidden sm:inline">Upload</span>
                  </InputGroupButton>
                  <InputGroupButton
                    type="button"
                    grouped={false}
                    variant="outline"
                    onClick={handleDownload}
                    disabled={!hasInput}
                    className="flex items-center gap-1.5"
                    aria-label="Download schema"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Download</span>
                  </InputGroupButton>
                  <Popover open={builtinOpen} onOpenChange={setBuiltinOpen}>
                    <PopoverTrigger asChild>
                      <InputGroupButton
                        type="button"
                        variant="outline"
                        grouped={false}
                        className="flex items-center gap-1.5"
                        aria-label="Built-in schemas"
                      >
                        <Library size={16} />
                        <span className="hidden sm:inline">Built-in</span>
                      </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96 p-0">
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">Built-in Schema Library</p>
                        <p className="text-xs text-muted-foreground">
                          Standard RFC schemas and vendor extensions
                        </p>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y">
                        {BUILTIN_SCHEMAS.map((schema) => (
                          <button
                            key={schema.id}
                            type="button"
                            className="w-full px-4 py-3 text-left hover:bg-muted/40 transition"
                            onClick={() => handleLoadBuiltinSchema(schema.id)}
                          >
                            <p className="text-sm font-medium">{schema.name}</p>
                            <p className="text-xs text-muted-foreground">{schema.description}</p>
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              {schema.source}
                            </Badge>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-muted/40 transition bg-primary/5"
                          onClick={handleLoadCombinedSchema}
                        >
                          <p className="text-sm font-medium text-primary">Load All Combined</p>
                          <p className="text-xs text-muted-foreground">
                            Core LDAP + Active Directory + PingDirectory schemas merged
                          </p>
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover open={libraryOpen} onOpenChange={setLibraryOpen}>
                    <PopoverTrigger asChild>
                      <InputGroupButton
                        type="button"
                        variant="outline"
                        grouped={false}
                        className="flex items-center gap-1.5"
                        aria-label="Saved schemas"
                      >
                        <ScrollText size={16} />
                        <span className="hidden sm:inline">Saved</span>
                        {schemas.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                            {schemas.length}
                          </Badge>
                        )}
                      </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0">
                      {savedSummaries.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                          No saved schemas yet. Use the Save button to save the current schema.
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto p-3 space-y-3">
                          {savedSummaries.map(({ entry, counts }) => (
                            <div key={entry.id} className="rounded-md border bg-card p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium">{entry.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(entry.updatedAt).toLocaleString()}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteSchema(entry.id, entry.name)}
                                  aria-label={`Delete schema ${entry.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <Badge variant="outline">
                                  {counts.objectClasses} object classes
                                </Badge>
                                <Badge variant="outline">{counts.attributeTypes} attributes</Badge>
                                {counts.errors > 0 && (
                                  <Badge variant="destructive">
                                    {counts.errors} warning{counts.errors === 1 ? '' : 's'}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                className="w-full"
                                onClick={() => handleLoadSchema(entry.schemaText, entry.name)}
                              >
                                Load schema
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <InputGroupButton
                      type="button"
                      grouped={false}
                      variant="outline"
                      onClick={handleSaveSchema}
                      disabled={!hasInput}
                      className="flex items-center gap-1.5"
                      aria-label="Save schema"
                    >
                      <Save size={16} />
                      <span className="hidden sm:inline">Save</span>
                    </InputGroupButton>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Schema</DialogTitle>
                        <DialogDescription>
                          Give your schema a name to save it for use in the LDIF Builder.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="schema-name">Schema Name</Label>
                        <Input
                          id="schema-name"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g., Production AD Schema"
                          className="mt-2"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleConfirmSave}>Save Schema</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <InputGroupButton
                    type="button"
                    grouped={false}
                    variant="ghost"
                    className="flex items-center gap-1.5 border border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setSchemaText('')}
                    aria-label="Clear schema input"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Clear</span>
                  </InputGroupButton>
                </div>
              </InputGroupAddon>
              <InputGroupTextarea
                value={schemaText}
                onChange={(event) => setSchemaText(event.target.value)}
                placeholder={"attributeTypes: ( 1.3.6.1.4.1... NAME 'attribute' ... )"}
                className="font-mono text-sm"
                rows={10}
              />
            </InputGroup>
            <p className="text-xs text-muted-foreground">
              Upload schema files, use built-in RFC schemas, or paste definitions directly. Saved
              schemas are available in the LDIF Builder for validation.
            </p>
          </CardContent>
        </Card>

        {parsed.errors.length > 0 && (
          <Alert variant="destructive">
            <Info className="h-4 w-4 text-destructive" />
            <AlertTitle>Parsing issues found</AlertTitle>
            <AlertDescription>
              {parsed.errors.map((message, index) => (
                <p key={index}>{message}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {hasInput && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Quick Summary</CardTitle>
                <CardDescription>Overview of parsed schema definitions.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/40 p-4 text-center">
                    <dt className="text-sm text-muted-foreground">Object classes</dt>
                    <dd className="text-2xl font-semibold">{parsed.objectClasses.length}</dd>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4 text-center">
                    <dt className="text-sm text-muted-foreground">Attribute types</dt>
                    <dd className="text-2xl font-semibold">{parsed.attributeTypes.length}</dd>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4 text-center">
                    <dt className="text-sm text-muted-foreground">Parse warnings</dt>
                    <dd className="text-2xl font-semibold">{parsed.errors.length}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search object classes and attributes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Object Classes</h2>
            {filteredObjectClasses.length > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {filteredObjectClasses.length} found
                {searchQuery && filteredObjectClasses.length !== parsed.objectClasses.length && (
                  <span className="ml-1 text-muted-foreground">
                    (of {parsed.objectClasses.length})
                  </span>
                )}
              </Badge>
            )}
          </div>
          {filteredObjectClasses.length === 0 ? (
            <Empty className="border-dashed">
              <EmptyMedia>
                <Database className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {searchQuery ? 'No matching object classes' : 'No object classes yet'}
              </EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? 'Try a different search term.'
                  : 'Paste schema with objectClasses: definitions to see a breakdown.'}
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredObjectClasses.map((objectClass) => {
                const inheritanceChain = buildInheritanceChain(objectClass, parsed.objectClasses)
                return (
                  <Card key={`${objectClass.oid}-${objectClass.names[0] ?? 'unnamed'}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle>{objectClass.names[0] ?? objectClass.oid}</CardTitle>
                          {objectClass.description && (
                            <CardDescription>{objectClass.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {objectClass.oid}
                          </Badge>
                          {objectClass.kind && (
                            <Badge variant="secondary">{objectClass.kind}</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {/* Inheritance chain visualization */}
                      {inheritanceChain.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap text-xs">
                          <span className="font-medium text-muted-foreground">Inherits:</span>
                          <span className="text-primary font-medium">{objectClass.names[0]}</span>
                          {inheritanceChain.map((sup, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{sup}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {objectClass.must && objectClass.must.length > 0 && (
                        <div>
                          <span className="font-medium">Required:</span>{' '}
                          <span className="text-muted-foreground">
                            {objectClass.must.join(', ')}
                          </span>
                        </div>
                      )}
                      {objectClass.may && objectClass.may.length > 0 && (
                        <div>
                          <span className="font-medium">Optional:</span>{' '}
                          <span className="text-muted-foreground">
                            {objectClass.may.join(', ')}
                          </span>
                        </div>
                      )}
                      <details className="rounded-md border bg-muted/40 p-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          Raw definition
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                          {objectClass.raw.split('\n').map((line, i) => (
                            <div key={i}>{highlightSchemaLine(line)}</div>
                          ))}
                        </pre>
                      </details>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Attribute Types</h2>
            {filteredAttributeTypes.length > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {filteredAttributeTypes.length} found
                {searchQuery && filteredAttributeTypes.length !== parsed.attributeTypes.length && (
                  <span className="ml-1 text-muted-foreground">
                    (of {parsed.attributeTypes.length})
                  </span>
                )}
              </Badge>
            )}
          </div>
          {filteredAttributeTypes.length === 0 ? (
            <Empty className="border-dashed">
              <EmptyMedia>
                <Database className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {searchQuery ? 'No matching attribute types' : 'No attribute types yet'}
              </EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? 'Try a different search term.'
                  : 'Paste schema with attributeTypes: definitions to see details.'}
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredAttributeTypes.map((attribute) => (
                <Card key={`${attribute.oid}-${attribute.names[0] ?? 'unnamed'}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{attribute.names[0] ?? attribute.oid}</CardTitle>
                        {attribute.description && (
                          <CardDescription>{attribute.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {attribute.oid}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {attribute.names.length > 1 && (
                      <div>
                        <span className="font-medium">Aliases:</span>{' '}
                        <span className="text-muted-foreground">
                          {attribute.names.slice(1).join(', ')}
                        </span>
                      </div>
                    )}
                    {attribute.superior && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="font-medium text-muted-foreground">Inherits:</span>
                        <span className="text-primary font-medium">{attribute.names[0]}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{attribute.superior}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                      {attribute.syntax && (
                        <div>
                          <span className="font-medium">Syntax:</span>{' '}
                          <span className="text-muted-foreground font-mono">
                            {attribute.syntax}
                          </span>
                        </div>
                      )}
                      {attribute.equality && (
                        <div>
                          <span className="font-medium">Equality:</span>{' '}
                          <span className="text-muted-foreground">{attribute.equality}</span>
                        </div>
                      )}
                      {attribute.ordering && (
                        <div>
                          <span className="font-medium">Ordering:</span>{' '}
                          <span className="text-muted-foreground">{attribute.ordering}</span>
                        </div>
                      )}
                      {attribute.substr && (
                        <div>
                          <span className="font-medium">Substring:</span>{' '}
                          <span className="text-muted-foreground">{attribute.substr}</span>
                        </div>
                      )}
                      {attribute.usage && (
                        <div>
                          <span className="font-medium">Usage:</span>{' '}
                          <span className="text-muted-foreground">{attribute.usage}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attribute.singleValue && <Badge variant="secondary">Single-valued</Badge>}
                      {attribute.collective && <Badge variant="secondary">Collective</Badge>}
                      {attribute.noUserModification && (
                        <Badge variant="secondary">No user modification</Badge>
                      )}
                    </div>
                    <details className="rounded-md border bg-muted/40 p-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Raw definition
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                        {attribute.raw.split('\n').map((line, i) => (
                          <div key={i}>{highlightSchemaLine(line)}</div>
                        ))}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  )
}
