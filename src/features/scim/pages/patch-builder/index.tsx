import { useMemo, useState } from 'react'
import { Braces, ListPlus, Plus, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/page'
import { JsonDisplay } from '@/components/common'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  SCIM_PATCH_OP_SCHEMA,
  buildScimPatch,
  validateScimPatch,
  type ScimDiagnosticSeverity,
  type ScimPatchOperationInput,
  type ScimPatchOperationName,
} from '@/features/scim/utils'

interface DraftOperation {
  id: string
  op: ScimPatchOperationName
  path: string
  value: string
}

const RAW_PATCH_EXAMPLE = JSON.stringify(
  {
    schemas: [SCIM_PATCH_OP_SCHEMA],
    Operations: [
      { op: 'replace', path: 'active', value: false },
      { op: 'add', path: 'roles', value: [{ value: 'billing-viewer' }] },
      { op: 'remove', path: 'emails[type eq "home"]' },
    ],
  },
  null,
  2
)

const SEVERITY_VARIANT: Record<ScimDiagnosticSeverity, 'destructive' | 'secondary' | 'outline'> = {
  error: 'destructive',
  warning: 'secondary',
  info: 'outline',
}

function createDraft(op: ScimPatchOperationName = 'replace'): DraftOperation {
  return {
    id: crypto.randomUUID(),
    op,
    path: op === 'replace' ? 'active' : '',
    value: op === 'remove' ? '' : 'true',
  }
}

function toOperationInputs(drafts: DraftOperation[]): ScimPatchOperationInput[] {
  return drafts.map((draft, index) => {
    const path = draft.path.trim()
    if (draft.op === 'remove') {
      if (!path) throw new Error(`Operation ${index + 1}: remove requires a path.`)
      return { op: 'remove', path }
    }

    if (!draft.value.trim()) {
      throw new Error(`Operation ${index + 1}: ${draft.op} requires a JSON value.`)
    }

    let value: unknown
    try {
      value = JSON.parse(draft.value)
    } catch {
      throw new Error(
        `Operation ${index + 1}: value must be valid JSON. Wrap string values in quotes.`
      )
    }

    return {
      op: draft.op,
      ...(path ? { path } : {}),
      value,
    }
  })
}

export default function ScimPatchBuilderPage() {
  const [drafts, setDrafts] = useState<DraftOperation[]>(() => [createDraft()])
  const [rawInput, setRawInput] = useState('')

  const buildState = useMemo(() => {
    try {
      const result = buildScimPatch(toOperationInputs(drafts))
      return { result, error: null }
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Unable to build this PATCH document.',
      }
    }
  }, [drafts])

  const validation = useMemo(
    () => (rawInput.trim() ? validateScimPatch(rawInput) : null),
    [rawInput]
  )

  const updateDraft = (id: string, updates: Partial<DraftOperation>) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              ...updates,
              ...(updates.op === 'remove' ? { value: '' } : {}),
            }
          : draft
      )
    )
  }

  const removeDraft = (id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id))
  }

  return (
    <PageContainer>
      <PageHeader
        title="SCIM PATCH Builder"
        description="Compose canonical RFC 7644 add, remove, and replace operations, or validate an existing PatchOp document."
        icon={ListPlus}
      />

      <div className="flex flex-col gap-6" data-testid="scim-patch-builder-root">
        <Alert>
          <ShieldCheck />
          <AlertTitle>Build safely before sending</AlertTitle>
          <AlertDescription>
            This tool creates and validates JSON only. It does not call a SCIM endpoint or retain
            provisioning data.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="builder">
          <TabsList className="grid w-full grid-cols-2 sm:w-fit">
            <TabsTrigger value="builder">Visual builder</TabsTrigger>
            <TabsTrigger value="validator">Raw validator</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Operations</CardTitle>
                <CardDescription>
                  Paths use SCIM attribute-path syntax. Add and replace values must be valid JSON.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {drafts.map((draft, index) => (
                  <Card key={draft.id} className="gap-4 py-4">
                    <CardHeader>
                      <CardTitle>Operation {index + 1}</CardTitle>
                      <CardDescription>{draft.op.toUpperCase()}</CardDescription>
                      <CardAction>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove operation ${index + 1}`}
                          onClick={() => removeDraft(draft.id)}
                          disabled={drafts.length === 1}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor={`${draft.id}-op`}>Operation</FieldLabel>
                          <Select
                            value={draft.op}
                            onValueChange={(value) =>
                              updateDraft(draft.id, { op: value as ScimPatchOperationName })
                            }
                          >
                            <SelectTrigger id={`${draft.id}-op`} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="add">add</SelectItem>
                                <SelectItem value="remove">remove</SelectItem>
                                <SelectItem value="replace">replace</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor={`${draft.id}-path`}>
                            Path {draft.op === 'remove' ? '(required)' : '(optional)'}
                          </FieldLabel>
                          <Input
                            id={`${draft.id}-path`}
                            value={draft.path}
                            onChange={(event) =>
                              updateDraft(draft.id, { path: event.target.value })
                            }
                            placeholder={'emails[type eq "work"].value'}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </Field>

                        {draft.op === 'remove' ? null : (
                          <Field>
                            <FieldLabel htmlFor={`${draft.id}-value`}>JSON value</FieldLabel>
                            <Textarea
                              id={`${draft.id}-value`}
                              value={draft.value}
                              onChange={(event) =>
                                updateDraft(draft.id, { value: event.target.value })
                              }
                              placeholder={'[{ "value": "billing-viewer" }]'}
                              className="min-h-24 font-mono text-xs"
                              spellCheck={false}
                            />
                            <FieldDescription>
                              Use <code>&quot;text&quot;</code> for a string, or enter an object,
                              array, number, boolean, or null.
                            </FieldDescription>
                          </Field>
                        )}
                      </FieldGroup>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => setDrafts((current) => [...current, createDraft('add')])}
                >
                  <Plus data-icon="inline-start" />
                  Add operation
                </Button>
              </CardFooter>
            </Card>

            {buildState.result ? (
              <Card>
                <CardHeader>
                  <CardTitle>Canonical PatchOp document</CardTitle>
                  <CardDescription>
                    Ready to use as an <code>application/scim+json</code> PATCH body.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <JsonDisplay data={buildState.result.document} maxHeight="32rem" />
                </CardContent>
              </Card>
            ) : (
              <Alert variant="destructive">
                <Braces />
                <AlertTitle>Cannot build the document yet</AlertTitle>
                <AlertDescription>{buildState.error}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="validator" className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Existing PatchOp JSON</CardTitle>
                <CardDescription>
                  Validate schema declarations, operation semantics, required fields, and paths.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field data-invalid={Boolean(validation && !validation.valid)}>
                  <FieldLabel htmlFor="scim-patch-raw-input">PATCH document</FieldLabel>
                  <Textarea
                    id="scim-patch-raw-input"
                    value={rawInput}
                    onChange={(event) => setRawInput(event.target.value)}
                    placeholder={RAW_PATCH_EXAMPLE}
                    className="min-h-80 font-mono text-xs"
                    spellCheck={false}
                    aria-invalid={Boolean(validation && !validation.valid)}
                    data-testid="scim-patch-raw-input"
                  />
                  {validation && !validation.valid ? (
                    <FieldError>Fix the blocking diagnostics below.</FieldError>
                  ) : null}
                </Field>
              </CardContent>
              <CardFooter className="flex-wrap gap-2">
                <Button
                  onClick={() => setRawInput(RAW_PATCH_EXAMPLE)}
                  data-testid="scim-patch-example"
                >
                  <Sparkles data-icon="inline-start" />
                  Load example
                </Button>
                <Button variant="ghost" onClick={() => setRawInput('')} disabled={!rawInput}>
                  <Trash2 data-icon="inline-start" />
                  Clear
                </Button>
              </CardFooter>
            </Card>

            {validation ? (
              <>
                <Item>
                  <ItemContent>
                    <ItemTitle>{validation.valid ? 'Valid PatchOp' : 'Invalid PatchOp'}</ItemTitle>
                    <ItemDescription>
                      Parsed {validation.operations.length} canonical operation
                      {validation.operations.length === 1 ? '' : 's'}.
                    </ItemDescription>
                  </ItemContent>
                  <Badge variant={validation.valid ? 'default' : 'destructive'}>
                    {validation.valid ? 'Valid' : 'Invalid'}
                  </Badge>
                </Item>

                <ItemGroup className="grid gap-3 md:grid-cols-2">
                  {validation.diagnostics.map((diagnostic) => (
                    <Item key={`${diagnostic.code}-${diagnostic.path}-${diagnostic.message}`}>
                      <ItemContent>
                        <div className="flex flex-wrap items-center gap-2">
                          <ItemTitle>{diagnostic.message}</ItemTitle>
                          <Badge variant={SEVERITY_VARIANT[diagnostic.severity]}>
                            {diagnostic.severity}
                          </Badge>
                        </div>
                        <ItemDescription className="font-mono text-xs break-all">
                          {diagnostic.path} · {diagnostic.code}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  ))}
                </ItemGroup>
              </>
            ) : (
              <Empty>
                <EmptyMedia variant="icon">
                  <Braces />
                </EmptyMedia>
                <EmptyTitle>Paste a PatchOp document</EmptyTitle>
                <EmptyDescription>
                  Use the example to see a combined replace, add, and filtered remove request.
                </EmptyDescription>
              </Empty>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  )
}
