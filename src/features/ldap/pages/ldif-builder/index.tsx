import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  FileCode2,
  Upload,
  Eraser,
  ClipboardCopy,
  FileInput,
  BookMarked,
  AlertTriangle,
  ShieldCheck,
  ListChecks,
  BookOpen,
  XCircle,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageContainer, PageHeader } from '@/components/page'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSavedSchemas } from '../../hooks/useSavedSchemas'
import { LDIF_TEMPLATES } from '../../data/ldif-templates'
import { parseLdapSchema, type ParsedObjectClass } from '../../utils/parse-schema'
import { parseLdif } from '../../utils/parse-ldif'

interface ValidationSummary {
  unknownAttributes: string[]
  unknownObjectClasses: string[]
  missingRequired: Array<{ dn: string; objectClass: string; attributes: string[] }>
}

export default function LdifBuilderPage() {
  const [ldifText, setLdifText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
  const [isSchemaPopoverOpen, setIsSchemaPopoverOpen] = useState(false)
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { schemas } = useSavedSchemas()

  const schemaSummaries = useMemo(
    () =>
      schemas.map((schema) => {
        const parsed = parseLdapSchema(schema.schemaText)
        return {
          schema,
          parsed,
          objectClassCount: parsed.objectClasses.length,
          attributeCount: parsed.attributeTypes.length,
        }
      }),
    [schemas]
  )

  const schemaDetails = useMemo(() => {
    if (!selectedSchemaId) {
      return null
    }
    const summary = schemaSummaries.find((item) => item.schema.id === selectedSchemaId)
    const stored = summary?.schema
    if (!stored) {
      return null
    }

    const parsed = summary.parsed
    const attributeMap = new Map<string, { canonical: string; aliases: string[] }>()
    parsed.attributeTypes.forEach((attribute) => {
      const canonical = attribute.names[0] ?? attribute.oid
      const aliasSet = new Set<string>()

      if (attribute.oid) {
        aliasSet.add(attribute.oid.toLowerCase())
      }

      attribute.names.forEach((name) => {
        if (name) {
          aliasSet.add(name.toLowerCase())
        }
      })

      if (canonical) {
        aliasSet.add(canonical.toLowerCase())
      }

      const entry = {
        canonical,
        aliases: Array.from(aliasSet),
      }

      aliasSet.forEach((alias) => {
        attributeMap.set(alias, entry)
      })
    })

    const objectClassEntries: Array<[string, ParsedObjectClass]> = parsed.objectClasses.flatMap(
      (objectClass) => {
        const keys = [objectClass.oid, ...objectClass.names]
        return keys
          .filter((key): key is string => Boolean(key))
          .map((key) => [key.toLowerCase(), objectClass] as [string, ParsedObjectClass])
      }
    )

    const objectClassMap = new Map<string, ParsedObjectClass>(objectClassEntries)

    return {
      stored,
      parsed,
      attributeMap,
      objectClassMap,
    }
  }, [schemaSummaries, selectedSchemaId])

  const ldifResult = useMemo(() => parseLdif(ldifText), [ldifText])

  const validation = useMemo<ValidationSummary>(() => {
    if (!schemaDetails) {
      return { unknownAttributes: [], unknownObjectClasses: [], missingRequired: [] }
    }

    const unknownAttributes = new Set<string>()
    const unknownObjectClasses = new Set<string>()
    const missingRequired: ValidationSummary['missingRequired'] = []

    const builtInAttributes = new Set(['dn', 'changetype', 'control'])

    ldifResult.entries.forEach((entry) => {
      const entryAttributeKeys = new Set(
        Object.keys(entry.attributes).map((key) => key.toLowerCase())
      )
      const objectClassValues = entry.attributes['objectclass']?.values ?? []

      objectClassValues.forEach((value) => {
        const lookupKey = value.toLowerCase()
        const schemaObjectClass = schemaDetails.objectClassMap.get(lookupKey)

        if (!schemaObjectClass) {
          unknownObjectClasses.add(value)
          return
        }

        if (schemaObjectClass.must && schemaObjectClass.must.length > 0) {
          const missing = schemaObjectClass.must.filter((requiredAttribute: string) => {
            const requiredKey = requiredAttribute.toLowerCase()

            if (entryAttributeKeys.has(requiredKey)) {
              return false
            }

            const attributeMeta = schemaDetails.attributeMap.get(requiredKey)
            if (!attributeMeta) {
              return true
            }

            return !attributeMeta.aliases.some((alias) => entryAttributeKeys.has(alias))
          })

          if (missing.length > 0) {
            missingRequired.push({
              dn: entry.dn,
              objectClass: schemaObjectClass.names[0] ?? schemaObjectClass.oid,
              attributes: missing,
            })
          }
        }
      })

      Object.entries(entry.attributes).forEach(([key, attribute]) => {
        if (key === 'objectclass' || builtInAttributes.has(key)) {
          return
        }

        if (!schemaDetails.attributeMap.has(key)) {
          unknownAttributes.add(attribute.name)
        }
      })
    })

    return {
      unknownAttributes: Array.from(unknownAttributes).sort(),
      unknownObjectClasses: Array.from(unknownObjectClasses).sort(),
      missingRequired,
    }
  }, [ldifResult.entries, schemaDetails])

  const attributeLineCount = useMemo(() => {
    let count = 0
    ldifResult.entries.forEach((entry) => {
      Object.values(entry.attributes).forEach((attribute) => {
        count += attribute.values.length
      })
    })
    return count
  }, [ldifResult.entries])

  const handleTemplateInsert = (templateId: string) => {
    const template = LDIF_TEMPLATES.find((item) => item.id === templateId)
    if (!template) {
      return
    }
    setSelectedTemplate(template.id)
    setLdifText(template.sample)
    setIsTemplateOpen(false)
    toast.success('Template inserted', { description: template.name })
  }

  const handleSchemaSelect = (schemaId: string) => {
    const chosen = schemaSummaries.find((item) => item.schema.id === schemaId)
    setSelectedSchemaId(schemaId)
    setIsSchemaPopoverOpen(false)
    if (chosen) {
      toast.success('Schema selected', { description: chosen.schema.name })
    }
  }

  const handleClearSchemaSelection = () => {
    setSelectedSchemaId(null)
    toast.info('Schema validation disabled')
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      setLdifText(text)
      setSelectedTemplate(null)
      toast.success('LDIF file loaded', { description: file.name })
    } catch (error) {
      toast.error('Failed to read file', {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      event.target.value = ''
    }
  }

  const handleClear = () => {
    setLdifText('')
    setSelectedTemplate(null)
    toast.info('Cleared LDIF input')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ldifText)
      toast.success('Copied LDIF to clipboard')
    } catch (error) {
      toast.error('Copy failed', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="LDIF Builder & Viewer"
        description="Generate, inspect, and validate LDIF against saved directory schema snapshots."
        icon={FileCode2}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".ldif,.txt,.ldf,text/plain"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="space-y-10">
        <Card>
          <CardHeader>
            <CardTitle>LDIF Source</CardTitle>
            <CardDescription>
              Entries stay local and feed the validation tools below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InputGroup className="flex-wrap border-0 bg-transparent shadow-none">
              <InputGroupAddon
                align="block-start"
                className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent border-0 py-1.5"
              >
                <span className="text-sm font-medium text-foreground">LDIF entries</span>
                <div className="flex items-center gap-1.5">
                  <InputGroupButton
                    type="button"
                    grouped={false}
                    variant="outline"
                    onClick={handleUploadClick}
                    className="flex items-center gap-1.5"
                    aria-label="Upload LDIF file"
                  >
                    <Upload size={16} />
                    <span className="hidden sm:inline">Upload</span>
                  </InputGroupButton>
                  <Popover open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
                    <PopoverTrigger asChild>
                      <InputGroupButton
                        type="button"
                        grouped={false}
                        variant="outline"
                        className="flex items-center gap-1.5"
                        aria-label="Insert template"
                      >
                        <FileInput size={16} />
                        <span className="hidden sm:inline">Templates</span>
                      </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96 p-0">
                      <div className="max-h-80 overflow-y-auto divide-y">
                        {LDIF_TEMPLATES.map((template) => (
                          <button
                            type="button"
                            key={template.id}
                            className="w-full space-y-2 px-4 py-3 text-left transition hover:bg-muted/40 focus:outline-none"
                            onClick={() => handleTemplateInsert(template.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {template.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {template.description}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                {template.flavor}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {template.highlights.map((item) => (
                                <Badge key={item} variant="outline" className="text-[10px]">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover open={isSchemaPopoverOpen} onOpenChange={setIsSchemaPopoverOpen}>
                    <PopoverTrigger asChild>
                      <InputGroupButton
                        type="button"
                        grouped={false}
                        variant="outline"
                        className="flex items-center gap-1.5"
                        aria-label="Select schema for validation"
                      >
                        <BookOpen size={16} />
                        <span className="hidden sm:inline">Schemas</span>
                      </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96 p-0">
                      {schemaSummaries.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                          Save a schema in the explorer to enable validation here.
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto divide-y">
                          {schemaSummaries.map(
                            ({ schema: schemaEntry, objectClassCount, attributeCount }) => (
                              <button
                                type="button"
                                key={schemaEntry.id}
                                className="w-full space-y-1 px-4 py-3 text-left transition hover:bg-muted/40 focus:outline-none"
                                onClick={() => handleSchemaSelect(schemaEntry.id)}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {schemaEntry.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(schemaEntry.updatedAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {objectClassCount} OC · {attributeCount} AT
                                  </Badge>
                                </div>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {schemaDetails && (
                    <InputGroupButton
                      type="button"
                      grouped={false}
                      variant="ghost"
                      className="flex items-center gap-1.5"
                      onClick={handleClearSchemaSelection}
                      aria-label="Clear schema selection"
                    >
                      <XCircle size={16} />
                      <span className="hidden sm:inline">Clear schema</span>
                    </InputGroupButton>
                  )}
                  <InputGroupButton
                    type="button"
                    grouped={false}
                    variant="outline"
                    onClick={handleCopy}
                    disabled={!ldifText}
                    className="flex items-center gap-1.5"
                    aria-label="Copy LDIF"
                  >
                    <ClipboardCopy size={16} />
                    <span className="hidden sm:inline">Copy</span>
                  </InputGroupButton>
                  <InputGroupButton
                    type="button"
                    grouped={false}
                    variant="ghost"
                    className="flex items-center gap-1.5 border border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleClear}
                    aria-label="Clear LDIF"
                  >
                    <Eraser size={16} />
                    <span className="hidden sm:inline">Clear</span>
                  </InputGroupButton>
                </div>
              </InputGroupAddon>
              <InputGroupTextarea
                value={ldifText}
                onChange={(event) => setLdifText(event.target.value)}
                placeholder="dn: uid=jdoe,ou=people,dc=example,dc=com"
                className="font-mono min-h-[260px]"
              />
            </InputGroup>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Import from files, use templates, or paste LDIF directly. Nothing is sent over the
                network.
              </span>
              {selectedTemplate && (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  Based on template ·{' '}
                  {LDIF_TEMPLATES.find((template) => template.id === selectedTemplate)?.name ??
                    'Custom'}
                </Badge>
              )}
              {schemaDetails ? (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700">
                  Validating with {schemaDetails.stored.name}
                </Badge>
              ) : (
                <span className="text-muted-foreground">
                  Select a schema to enable required attribute checks.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {ldifResult.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Issues while parsing LDIF</AlertTitle>
            <AlertDescription>
              {ldifResult.errors.map((message, index) => (
                <p key={index}>{message}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick Metrics</CardTitle>
            <CardDescription>Summary of LDIF entries currently loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/40 p-4 text-center">
                <dt className="text-sm text-muted-foreground">Entries</dt>
                <dd className="text-2xl font-semibold">{ldifResult.entries.length}</dd>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4 text-center">
                <dt className="text-sm text-muted-foreground">Attribute values</dt>
                <dd className="text-2xl font-semibold">{attributeLineCount}</dd>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4 text-center">
                <dt className="text-sm text-muted-foreground">Schema checks enabled</dt>
                <dd className="text-2xl font-semibold">{schemaDetails ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {schemaDetails ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" /> Schema validation results
              </CardTitle>
              <CardDescription>
                Checking against <span className="font-medium">{schemaDetails.stored.name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {validation.unknownAttributes.length === 0 &&
              validation.unknownObjectClasses.length === 0 &&
              validation.missingRequired.length === 0 ? (
                <Alert variant="default" className="border-emerald-200 bg-emerald-50/60">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <AlertTitle>No issues detected</AlertTitle>
                  <AlertDescription>
                    Every attribute and object class in the LDIF matches definitions from the
                    selected schema.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {validation.unknownAttributes.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-600">
                        <AlertTriangle className="h-5 w-5" /> Unknown attributes
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        These attribute names are missing from the selected schema snapshot.
                        Double-check for typos or update the schema.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {validation.unknownAttributes.map((name) => (
                          <Badge
                            key={name}
                            variant="destructive"
                            className="bg-amber-100 text-amber-800"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {validation.unknownObjectClasses.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-600">
                        <AlertTriangle className="h-5 w-5" /> Unknown object classes
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Object classes below were not found in the saved schema definitions.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {validation.unknownObjectClasses.map((name) => (
                          <Badge
                            key={name}
                            variant="destructive"
                            className="bg-amber-100 text-amber-800"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {validation.missingRequired.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-600">
                        <ListChecks className="h-5 w-5" /> Missing required attributes
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Each listed entry/object class combination is missing mandatory attributes.
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Entry DN</TableHead>
                            <TableHead>Object class</TableHead>
                            <TableHead>Missing attributes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validation.missingRequired.map((item, index) => (
                            <TableRow key={`${item.dn}-${item.objectClass}-${index}`}>
                              <TableCell className="font-mono text-xs">{item.dn}</TableCell>
                              <TableCell>{item.objectClass}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  {item.attributes.map((attr) => (
                                    <Badge key={attr} variant="outline">
                                      {attr}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookMarked className="h-5 w-5" /> Schema validation disabled
              </CardTitle>
              <CardDescription>
                Choose a saved schema to unlock attribute validation and required attribute checks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Saved schemas can be created from the LDAP Schema Explorer. They are stored locally
                within your browser profile.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Entry Preview</CardTitle>
            <CardDescription>LDIF as it will be exported (line folding preserved).</CardDescription>
          </CardHeader>
          <CardContent>
            {ldifText.trim() ? (
              <pre className="rounded-md bg-muted/60 p-4 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {ldifText}
              </pre>
            ) : (
              <Empty className="border-dashed">
                <EmptyMedia>
                  <FileCode2 className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>No LDIF yet</EmptyTitle>
                <EmptyDescription>
                  Pick a template, upload an LDIF file, or paste content to get started.
                </EmptyDescription>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
