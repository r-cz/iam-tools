import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Database, Info, Trash2, BookMarked, ScrollText } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PageContainer, PageHeader } from '@/components/page'
import { useDebounce } from '@/hooks'
import { useSavedSchemas } from '../../hooks/useSavedSchemas'
import { parseLdapSchema, type ParsedSchema } from '../../utils/parse-schema'

const SAMPLE_SCHEMA = `dn: cn=schema
objectClasses: ( 2.16.840.1.113730.3.2.327 NAME 'pingDirectoryPerson' DESC 'Example PingDirectory structural class' SUP inetOrgPerson STRUCTURAL MUST ( uid $ mail ) MAY ( employeeNumber $ manager $ mobile ) )
attributeTypes: ( 2.16.840.1.113730.3.1.2001 NAME 'employeeNumber' DESC 'Employee number identifier' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 2.16.840.1.113730.3.1.2405 NAME ( 'manager' 'managerDN' ) DESC 'DN for the entry\'s direct manager' SUP distinguishedName )`

function hashSchemaContent(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  const normalized = Math.abs(hash).toString(36)
  return normalized.padStart(6, '0').slice(0, 6)
}

function createSchemaName(parsed: ParsedSchema, rawText: string): string {
  const primaryObjectClass = parsed.objectClasses.find((item) => item.names.length)?.names[0]
  const primaryAttribute = parsed.attributeTypes.find((item) => item.names.length)?.names[0]
  const fingerprint = hashSchemaContent(rawText)
  const label = primaryObjectClass || primaryAttribute || 'Schema'
  return `${label} • ${fingerprint}`
}

export default function LdapSchemaExplorerPage() {
  const [schemaText, setSchemaText] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const { schemas, upsertSchema, removeSchema } = useSavedSchemas()
  const debouncedSchema = useDebounce(schemaText, 800)

  const parsed = useMemo(() => parseLdapSchema(schemaText), [schemaText])
  const hasInput = schemaText.trim().length > 0

  useEffect(() => {
    const trimmed = debouncedSchema.trim()
    if (!trimmed) {
      return
    }

    const snapshot = parseLdapSchema(trimmed)
    const snapshotHasDefinitions =
      snapshot.attributeTypes.length + snapshot.objectClasses.length > 0

    if (!snapshotHasDefinitions) {
      return
    }

    const name = createSchemaName(snapshot, trimmed)

    try {
      upsertSchema(name, trimmed)
    } catch (error) {
      console.warn('Failed to persist schema snapshot', error)
    }
  }, [debouncedSchema, upsertSchema])

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

  const loadSample = () => {
    setSchemaText(SAMPLE_SCHEMA)
  }

  const handleLoadSchema = (text: string, name: string) => {
    setSchemaText(text)
    toast.success('Schema loaded into editor', {
      description: name,
    })
  }

  const handleDeleteSchema = (id: string, name: string) => {
    removeSchema(id)
    toast.success('Schema deleted', { description: name })
  }

  return (
    <PageContainer>
      <PageHeader
        title="LDAP Schema Explorer"
        description="Drop output from ldapsearch -b cn=schema -LLL attributeTypes objectClasses (or vendor exports) to visualize definitions. Snapshots are auto-saved locally for reuse."
        icon={Database}
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
                <div className="flex items-center gap-1.5">
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
                        <span className="hidden sm:inline">Saved schemas</span>
                      </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0">
                      {savedSummaries.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                          No saved schemas yet. Snapshots appear here automatically.
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
                                onClick={() => {
                                  handleLoadSchema(entry.schemaText, entry.name)
                                  setLibraryOpen(false)
                                }}
                              >
                                View schema
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <InputGroupButton
                    type="button"
                    grouped={false}
                    variant="outline"
                    onClick={loadSample}
                    className="flex items-center gap-1.5"
                    aria-label="Load example schema"
                  >
                    <BookMarked size={16} />
                    <span className="hidden sm:inline">Example</span>
                  </InputGroupButton>
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
                className="font-mono"
              />
            </InputGroup>
            <p className="text-xs text-muted-foreground">
              Schema snapshots are auto-saved to your browser for reuse across LDAP tools.
            </p>
          </CardContent>
        </Card>

        {parsed.errors.length > 0 && (
          <Alert variant="destructive">
            <Info className="h-4 w-4 text-destructive" />
            <AlertTitle>We hit a few parsing issues</AlertTitle>
            <AlertDescription>
              {parsed.errors.map((message, index) => (
                <p key={index}>{message}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {hasInput ? (
          <Card>
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
              <CardDescription>
                Totals detected from the provided LDIF. Missing types usually mean the definitions
                weren&apos;t included in the input.
              </CardDescription>
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
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Object Classes</h2>
            {parsed.objectClasses.length > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {parsed.objectClasses.length} found
              </Badge>
            )}
          </div>
          {parsed.objectClasses.length === 0 ? (
            <Empty className="border-dashed">
              <EmptyMedia>
                <Database className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No object classes yet</EmptyTitle>
              <EmptyDescription>
                Paste schema with <code>objectClasses:</code> definitions to see a breakdown.
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {parsed.objectClasses.map((objectClass) => (
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
                        <Badge variant="outline">OID {objectClass.oid}</Badge>
                        {objectClass.kind && <Badge variant="secondary">{objectClass.kind}</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {objectClass.superior && objectClass.superior.length > 0 && (
                      <div>
                        <span className="font-medium">Inherits from:</span>{' '}
                        {objectClass.superior.join(', ')}
                      </div>
                    )}
                    {objectClass.must && objectClass.must.length > 0 && (
                      <div>
                        <span className="font-medium">Required attributes:</span>{' '}
                        {objectClass.must.join(', ')}
                      </div>
                    )}
                    {objectClass.may && objectClass.may.length > 0 && (
                      <div>
                        <span className="font-medium">Optional attributes:</span>{' '}
                        {objectClass.may.join(', ')}
                      </div>
                    )}
                    <details className="rounded-md border bg-muted/40 p-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Show raw definition
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {objectClass.raw}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Attribute Types</h2>
            {parsed.attributeTypes.length > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {parsed.attributeTypes.length} found
              </Badge>
            )}
          </div>
          {parsed.attributeTypes.length === 0 ? (
            <Empty className="border-dashed">
              <EmptyMedia>
                <Database className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No attribute types yet</EmptyTitle>
              <EmptyDescription>
                Paste schema with <code>attributeTypes:</code> definitions to see details.
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {parsed.attributeTypes.map((attribute) => (
                <Card key={`${attribute.oid}-${attribute.names[0] ?? 'unnamed'}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{attribute.names[0] ?? attribute.oid}</CardTitle>
                        {attribute.description && (
                          <CardDescription>{attribute.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant="outline">OID {attribute.oid}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {attribute.names.length > 1 && (
                      <div>
                        <span className="font-medium">Aliases:</span>{' '}
                        {attribute.names.slice(1).join(', ')}
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {attribute.syntax && (
                        <div>
                          <span className="font-medium">Syntax:</span> {attribute.syntax}
                        </div>
                      )}
                      {attribute.equality && (
                        <div>
                          <span className="font-medium">Equality:</span> {attribute.equality}
                        </div>
                      )}
                      {attribute.ordering && (
                        <div>
                          <span className="font-medium">Ordering:</span> {attribute.ordering}
                        </div>
                      )}
                      {attribute.substr && (
                        <div>
                          <span className="font-medium">Substring:</span> {attribute.substr}
                        </div>
                      )}
                      {attribute.usage && (
                        <div>
                          <span className="font-medium">Usage:</span> {attribute.usage}
                        </div>
                      )}
                      {attribute.superior && (
                        <div>
                          <span className="font-medium">Superior:</span> {attribute.superior}
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
                        Show raw definition
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {attribute.raw}
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
