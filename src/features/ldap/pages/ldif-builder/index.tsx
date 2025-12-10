import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  FileCode2,
  Upload,
  Eraser,
  ClipboardCopy,
  FileInput,
  AlertTriangle,
  XCircle,
  Download,
  Layers,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { PageContainer, PageHeader } from '@/components/page'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSavedSchemas } from '../../hooks/useSavedSchemas'
import { useSchemaSummaries } from '../../hooks/useSchemaDetails'
import { useLdifValidation } from '../../hooks/useLdifValidation'
import { useMergedSchemaDetails } from '../../hooks/useMergedSchemaDetails'
import { LDIF_TEMPLATES } from '../../data/ldif-templates'
import { BUILTIN_SCHEMAS } from '../../data/builtin-schemas'
import { parseLdif } from '../../utils/parse-ldif'
import { QuickMetrics } from '../../components/QuickMetrics'
import { ValidationResults } from '../../components/ValidationResults'

export default function LdifBuilderPage() {
  const [ldifText, setLdifText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedSchemaIds, setSelectedSchemaIds] = useState<string[]>([])
  const [selectedBuiltinIds, setSelectedBuiltinIds] = useState<string[]>([])
  const [isSchemaPopoverOpen, setIsSchemaPopoverOpen] = useState(false)
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { schemas } = useSavedSchemas()
  const schemaSummaries = useSchemaSummaries(schemas)
  const schemaDetails = useMergedSchemaDetails(schemas, selectedSchemaIds, selectedBuiltinIds)
  const ldifResult = useMemo(() => parseLdif(ldifText), [ldifText])
  const validation = useLdifValidation(ldifResult.entries, schemaDetails)

  const attributeLineCount = useMemo(() => {
    let count = 0
    ldifResult.entries.forEach((entry) => {
      Object.values(entry.attributes).forEach((attribute) => {
        count += attribute.values.length
      })
    })
    return count
  }, [ldifResult.entries])

  const selectedSchemaNames = useMemo(() => {
    const names: string[] = []
    selectedSchemaIds.forEach((id) => {
      const schema = schemas.find((s) => s.id === id)
      if (schema) names.push(schema.name)
    })
    selectedBuiltinIds.forEach((id) => {
      const builtin = BUILTIN_SCHEMAS.find((s) => s.id === id)
      if (builtin) names.push(builtin.name)
    })
    return names
  }, [selectedSchemaIds, selectedBuiltinIds, schemas])

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

  const handleSchemaToggle = (schemaId: string, isBuiltin: boolean) => {
    if (isBuiltin) {
      setSelectedBuiltinIds((prev) =>
        prev.includes(schemaId) ? prev.filter((id) => id !== schemaId) : [...prev, schemaId]
      )
    } else {
      setSelectedSchemaIds((prev) =>
        prev.includes(schemaId) ? prev.filter((id) => id !== schemaId) : [...prev, schemaId]
      )
    }
  }

  const handleClearSchemaSelection = () => {
    setSelectedSchemaIds([])
    setSelectedBuiltinIds([])
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

  const handleDownload = () => {
    if (!ldifText.trim()) return

    const blob = new Blob([ldifText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'entries.ldif'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('LDIF downloaded', { description: 'entries.ldif' })
  }

  const hasSchemaSelected = selectedSchemaIds.length > 0 || selectedBuiltinIds.length > 0

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
                <div className="flex items-center gap-1.5 flex-wrap">
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
                        aria-label="Select schemas for validation"
                      >
                        <Layers size={16} />
                        <span className="hidden sm:inline">Schemas</span>
                        {hasSchemaSelected && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                            {selectedSchemaIds.length + selectedBuiltinIds.length}
                          </Badge>
                        )}
                      </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96 p-0">
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">Schema Validation</p>
                        <p className="text-xs text-muted-foreground">
                          Select one or more schemas to merge for validation
                        </p>
                      </div>

                      {/* Built-in schemas */}
                      <div className="border-b">
                        <div className="px-3 py-2 bg-muted/30">
                          <p className="text-xs font-medium text-muted-foreground">
                            Built-in Schemas
                          </p>
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y">
                          {BUILTIN_SCHEMAS.map((schema) => (
                            <label
                              key={schema.id}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedBuiltinIds.includes(schema.id)}
                                onCheckedChange={() => handleSchemaToggle(schema.id, true)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{schema.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {schema.source}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Saved schemas */}
                      <div>
                        <div className="px-3 py-2 bg-muted/30">
                          <p className="text-xs font-medium text-muted-foreground">Saved Schemas</p>
                        </div>
                        {schemaSummaries.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">
                            No saved schemas. Create one in the Schema Explorer.
                          </div>
                        ) : (
                          <div className="max-h-40 overflow-y-auto divide-y">
                            {schemaSummaries.map(
                              ({ schema: schemaEntry, objectClassCount, attributeCount }) => (
                                <label
                                  key={schemaEntry.id}
                                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selectedSchemaIds.includes(schemaEntry.id)}
                                    onCheckedChange={() =>
                                      handleSchemaToggle(schemaEntry.id, false)
                                    }
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{schemaEntry.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {objectClassCount} OC · {attributeCount} AT
                                    </p>
                                  </div>
                                </label>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {hasSchemaSelected && (
                    <InputGroupButton
                      type="button"
                      grouped={false}
                      variant="ghost"
                      className="flex items-center gap-1.5"
                      onClick={handleClearSchemaSelection}
                      aria-label="Clear schema selection"
                    >
                      <XCircle size={16} />
                      <span className="hidden sm:inline">Clear schemas</span>
                    </InputGroupButton>
                  )}
                  <InputGroupButton
                    type="button"
                    grouped={false}
                    variant="outline"
                    onClick={handleDownload}
                    disabled={!ldifText}
                    className="flex items-center gap-1.5"
                    aria-label="Download LDIF"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Download</span>
                  </InputGroupButton>
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
              {hasSchemaSelected ? (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700">
                  Validating with {selectedSchemaNames.length} schema
                  {selectedSchemaNames.length === 1 ? '' : 's'}
                </Badge>
              ) : (
                <span className="text-muted-foreground">Select schemas to enable validation.</span>
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

        <QuickMetrics
          entryCount={ldifResult.entries.length}
          attributeValueCount={attributeLineCount}
          schemaEnabled={hasSchemaSelected}
        />

        <ValidationResults
          schemaName={hasSchemaSelected ? selectedSchemaNames.join(' + ') : null}
          validation={validation}
        />

        {/* Entry Details - replacing the redundant Entry Preview */}
        {ldifResult.entries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Parsed Entries</CardTitle>
              <CardDescription>
                {ldifResult.entries.length} entry{ldifResult.entries.length === 1 ? '' : 'ies'}{' '}
                detected with {attributeLineCount} attribute value
                {attributeLineCount === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ldifResult.entries.map((entry, index) => {
                const objectClasses = entry.attributes['objectclass']?.values ?? []
                const attrCount = Object.values(entry.attributes).reduce(
                  (sum, attr) => sum + attr.values.length,
                  0
                )

                return (
                  <details
                    key={`${entry.dn}-${index}`}
                    className="rounded-lg border bg-muted/20"
                    open={ldifResult.entries.length <= 3}
                  >
                    <summary className="cursor-pointer p-4 hover:bg-muted/40 transition">
                      <div className="inline-flex items-center gap-3">
                        <span className="font-mono text-sm font-medium">{entry.dn}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {attrCount} attr{attrCount === 1 ? '' : 's'}
                        </Badge>
                        {objectClasses.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {objectClasses[objectClasses.length - 1]}
                          </Badge>
                        )}
                      </div>
                    </summary>
                    <div className="border-t p-4 space-y-2">
                      <div className="grid gap-2 text-sm">
                        {Object.values(entry.attributes).map((attr) => (
                          <div key={attr.name} className="grid grid-cols-[160px_1fr] gap-2">
                            <span className="font-medium text-muted-foreground truncate">
                              {attr.name}
                              {attr.values.length > 1 && (
                                <span className="text-xs ml-1">({attr.values.length})</span>
                              )}
                            </span>
                            <div className="space-y-1">
                              {attr.values.map((value, i) => (
                                <code
                                  key={i}
                                  className="block text-xs bg-muted/60 rounded px-2 py-1 break-all"
                                >
                                  {value}
                                </code>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                )
              })}
            </CardContent>
          </Card>
        )}

        {ldifText.trim() && ldifResult.entries.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <Empty className="border-dashed">
                <EmptyMedia>
                  <FileCode2 className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>No valid entries found</EmptyTitle>
                <EmptyDescription>
                  Check that your LDIF has valid dn: lines and is properly formatted.
                </EmptyDescription>
              </Empty>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
