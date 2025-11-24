import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  FileCode2,
  Upload,
  Eraser,
  ClipboardCopy,
  FileInput,
  BookOpen,
  AlertTriangle,
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
import { PageContainer, PageHeader } from '@/components/page'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSavedSchemas } from '../../hooks/useSavedSchemas'
import { useSchemaDetails, useSchemaSummaries } from '../../hooks/useSchemaDetails'
import { useLdifValidation } from '../../hooks/useLdifValidation'
import { LDIF_TEMPLATES } from '../../data/ldif-templates'
import { parseLdif } from '../../utils/parse-ldif'
import { QuickMetrics } from '../../components/QuickMetrics'
import { ValidationResults } from '../../components/ValidationResults'

export default function LdifBuilderPage() {
  const [ldifText, setLdifText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
  const [isSchemaPopoverOpen, setIsSchemaPopoverOpen] = useState(false)
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { schemas } = useSavedSchemas()
  const schemaSummaries = useSchemaSummaries(schemas)
  const schemaDetails = useSchemaDetails(schemas, selectedSchemaId)
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

        <QuickMetrics
          entryCount={ldifResult.entries.length}
          attributeValueCount={attributeLineCount}
          schemaEnabled={!!schemaDetails}
        />

        <ValidationResults
          schemaName={schemaDetails?.stored.name ?? null}
          validation={validation}
        />

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
