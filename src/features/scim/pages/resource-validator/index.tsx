import { useMemo, useState } from 'react'
import { Braces, ShieldCheck, Sparkles, Trash2, UserCheck, UsersRound } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/page'
import { JsonDisplay } from '@/components/common'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { Textarea } from '@/components/ui/textarea'
import {
  SCIM_ENTERPRISE_USER_SCHEMA,
  SCIM_GROUP_SCHEMA,
  SCIM_USER_SCHEMA,
  validateScimResource,
  type ScimDiagnostic,
  type ScimDiagnosticSeverity,
} from '@/features/scim/utils'

const DIAGNOSTIC_VARIANT: Record<ScimDiagnosticSeverity, 'destructive' | 'secondary' | 'outline'> =
  {
    error: 'destructive',
    warning: 'secondary',
    info: 'outline',
  }

const USER_EXAMPLE = JSON.stringify(
  {
    schemas: [SCIM_USER_SCHEMA, SCIM_ENTERPRISE_USER_SCHEMA],
    externalId: 'employee-701984',
    userName: 'bjensen@example.com',
    active: true,
    name: {
      givenName: 'Barbara',
      familyName: 'Jensen',
      formatted: 'Barbara Jensen',
    },
    displayName: 'Barbara Jensen',
    emails: [{ value: 'bjensen@example.com', type: 'work', primary: true }],
    [SCIM_ENTERPRISE_USER_SCHEMA]: {
      employeeNumber: '701984',
      department: 'Tour Operations',
      manager: { value: 'manager-26118915' },
    },
  },
  null,
  2
)

const GROUP_EXAMPLE = JSON.stringify(
  {
    schemas: [SCIM_GROUP_SCHEMA],
    displayName: 'Tour Guides',
    members: [
      { value: 'user-2819c223', display: 'Barbara Jensen' },
      { value: 'user-9025315', display: 'James Smith' },
    ],
  },
  null,
  2
)

function DiagnosticItem({ diagnostic }: { diagnostic: ScimDiagnostic }) {
  return (
    <Item>
      <ItemContent>
        <div className="flex flex-wrap items-center gap-2">
          <ItemTitle>{diagnostic.message}</ItemTitle>
          <Badge variant={DIAGNOSTIC_VARIANT[diagnostic.severity]}>{diagnostic.severity}</Badge>
        </div>
        <ItemDescription className="font-mono text-xs break-all">
          {diagnostic.path} · {diagnostic.code}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

export default function ScimResourceValidatorPage() {
  const [input, setInput] = useState('')
  const result = useMemo(() => (input.trim() ? validateScimResource(input) : null), [input])
  const counts = useMemo(
    () => ({
      error: result?.diagnostics.filter((item) => item.severity === 'error').length ?? 0,
      warning: result?.diagnostics.filter((item) => item.severity === 'warning').length ?? 0,
      info: result?.diagnostics.filter((item) => item.severity === 'info').length ?? 0,
    }),
    [result]
  )

  return (
    <PageContainer>
      <PageHeader
        title="SCIM Resource Validator"
        description="Validate SCIM 2.0 User, Group, and Enterprise User JSON with precise schema-aware diagnostics."
        icon={UserCheck}
      />

      <div className="flex flex-col gap-6" data-testid="scim-resource-validator-root">
        <Alert>
          <ShieldCheck />
          <AlertTitle>Provisioning data stays local</AlertTitle>
          <AlertDescription>
            SCIM resources often contain personal data. This validator performs no network calls and
            does not save pasted resources to browser storage.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Resource JSON</CardTitle>
            <CardDescription>
              Paste a SCIM User or Group representation. Custom extensions are checked for schema
              declaration consistency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field data-invalid={Boolean(result && !result.valid)}>
              <FieldLabel htmlFor="scim-resource-input">SCIM resource</FieldLabel>
              <Textarea
                id="scim-resource-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={`{\n  "schemas": ["${SCIM_USER_SCHEMA}"],\n  "userName": "bjensen@example.com"\n}`}
                className="min-h-80 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(result && !result.valid)}
                data-testid="scim-resource-input"
              />
              <FieldDescription>
                Structural validation covers core required fields, common types, multi-valued
                attributes, primary values, metadata, and extensions.
              </FieldDescription>
            </Field>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button onClick={() => setInput(USER_EXAMPLE)} data-testid="scim-resource-user-example">
              <Sparkles data-icon="inline-start" />
              Load User example
            </Button>
            <Button variant="outline" onClick={() => setInput(GROUP_EXAMPLE)}>
              <UsersRound data-icon="inline-start" />
              Load Group example
            </Button>
            <Button variant="ghost" onClick={() => setInput('')} disabled={!input}>
              <Trash2 data-icon="inline-start" />
              Clear
            </Button>
          </CardFooter>
        </Card>

        {result ? (
          <>
            <ItemGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Item>
                <ItemContent>
                  <ItemTitle>Result</ItemTitle>
                  <ItemDescription>
                    {result.valid ? 'No structural errors' : 'Needs attention'}
                  </ItemDescription>
                </ItemContent>
                <Badge variant={result.valid ? 'default' : 'destructive'}>
                  {result.valid ? 'Valid' : 'Invalid'}
                </Badge>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>Resource type</ItemTitle>
                  <ItemDescription>Detected from the core schema URN</ItemDescription>
                </ItemContent>
                <Badge variant="outline">{result.resourceType}</Badge>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>Errors</ItemTitle>
                  <ItemDescription>Blocking conformance issues</ItemDescription>
                </ItemContent>
                <Badge variant={counts.error ? 'destructive' : 'outline'}>{counts.error}</Badge>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>Warnings</ItemTitle>
                  <ItemDescription>Interoperability details to review</ItemDescription>
                </ItemContent>
                <Badge variant="secondary">{counts.warning}</Badge>
              </Item>
            </ItemGroup>

            <Card>
              <CardHeader>
                <CardTitle>Diagnostics</CardTitle>
                <CardDescription>
                  Paths point to the exact JSON attribute involved in each check.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ItemGroup className="grid gap-3 md:grid-cols-2">
                  {result.diagnostics.map((diagnostic) => (
                    <DiagnosticItem
                      key={`${diagnostic.code}-${diagnostic.path}-${diagnostic.message}`}
                      diagnostic={diagnostic}
                    />
                  ))}
                </ItemGroup>
              </CardContent>
            </Card>

            {result.parsed ? (
              <Card>
                <CardHeader>
                  <CardTitle>Normalized JSON</CardTitle>
                  <CardDescription>
                    Formatting only; attribute names, values, and ordering semantics are unchanged.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <JsonDisplay data={result.parsed} maxHeight="32rem" />
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Empty>
            <EmptyMedia variant="icon">
              <Braces />
            </EmptyMedia>
            <EmptyTitle>Paste a SCIM resource</EmptyTitle>
            <EmptyDescription>
              Start with a local example or paste a sanitized provisioning payload to receive
              field-level diagnostics.
            </EmptyDescription>
          </Empty>
        )}
      </div>
    </PageContainer>
  )
}
