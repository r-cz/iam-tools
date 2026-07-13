import { useMemo, useState } from 'react'
import { Braces, ListFilter, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/page'
import { CopyButton, JsonDisplay } from '@/components/common'
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  encodeLdapFilterForUrl,
  escapeLdapFilterValue,
  explainLdapFilter,
  formatLdapFilter,
  validateLdapFilter,
} from '@/features/ldap-filter/utils'

const FILTER_EXAMPLE =
  '(&\n  (objectClass=person)\n  (|(mail=*@example.com)(uid=jdoe))\n  (!(accountStatus=disabled))\n)'

export default function LdapFilterStudioPage() {
  const [filter, setFilter] = useState('')
  const [assertionValue, setAssertionValue] = useState('alice*)(|(uid=*))')

  const validation = useMemo(() => (filter.trim() ? validateLdapFilter(filter) : null), [filter])
  const outputs = useMemo(() => {
    if (!validation?.valid) return null
    return {
      compact: formatLdapFilter(validation.ast),
      pretty: formatLdapFilter(validation.ast, true),
      explanation: explainLdapFilter(validation.ast),
      encoded: encodeLdapFilterForUrl(validation.ast),
    }
  }, [validation])
  const escapedValue = useMemo(() => escapeLdapFilterValue(assertionValue), [assertionValue])

  return (
    <PageContainer>
      <PageHeader
        title="LDAP Filter Studio"
        description="Parse, format, explain, URL-encode, and safely escape RFC 4515 LDAP search filters."
        icon={ListFilter}
      />

      <div className="flex flex-col gap-6" data-testid="ldap-filter-studio-root">
        <Alert>
          <ShieldCheck />
          <AlertTitle>Local syntax analysis</AlertTitle>
          <AlertDescription>
            Filters and assertion values stay in this tab. Actual matching can still vary with a
            directory server&apos;s schema and matching rules.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Filter expression</CardTitle>
            <CardDescription>
              Enter one complete LDAP filter, including its outer parentheses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field data-invalid={Boolean(validation && !validation.valid)}>
              <FieldLabel htmlFor="ldap-filter-input">RFC 4515 filter</FieldLabel>
              <Textarea
                id="ldap-filter-input"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="(&(objectClass=person)(mail=*@example.com))"
                className="min-h-48 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(validation && !validation.valid)}
                data-testid="ldap-filter-input"
              />
              <FieldDescription>
                Supports AND, OR, NOT, equality, presence, substring, ordering, and approximate
                filters. Extensible-match syntax is intentionally called out as unsupported.
              </FieldDescription>
              {validation && !validation.valid ? (
                <FieldError>
                  Line {validation.diagnostics[0].line}, column {validation.diagnostics[0].column}:{' '}
                  {validation.diagnostics[0].message}
                </FieldError>
              ) : null}
            </Field>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button onClick={() => setFilter(FILTER_EXAMPLE)} data-testid="ldap-filter-example">
              <Sparkles data-icon="inline-start" />
              Load example
            </Button>
            <Button variant="ghost" onClick={() => setFilter('')} disabled={!filter}>
              <Trash2 data-icon="inline-start" />
              Clear
            </Button>
          </CardFooter>
        </Card>

        {validation?.valid && outputs ? (
          <>
            <ItemGroup className="grid gap-3 sm:grid-cols-3">
              <Item>
                <ItemContent>
                  <ItemTitle>Syntax</ItemTitle>
                  <ItemDescription>Complete filter parsed successfully</ItemDescription>
                </ItemContent>
                <Badge>Valid</Badge>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>Root operation</ItemTitle>
                  <ItemDescription>Top-level AST node</ItemDescription>
                </ItemContent>
                <Badge variant="outline">{validation.ast.type}</Badge>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>URL encoding</ItemTitle>
                  <ItemDescription>{outputs.encoded.length} characters</ItemDescription>
                </ItemContent>
                <CopyButton text={outputs.encoded} showText={false} />
              </Item>
            </ItemGroup>

            <Card>
              <CardHeader>
                <CardTitle>Filter output</CardTitle>
                <CardDescription>
                  Switch between a formatted filter, plain-language reading, and the parsed tree.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="formatted">
                  <TabsList className="grid w-full grid-cols-3 sm:w-fit">
                    <TabsTrigger value="formatted">Formatted</TabsTrigger>
                    <TabsTrigger value="explanation">Explanation</TabsTrigger>
                    <TabsTrigger value="ast">AST</TabsTrigger>
                  </TabsList>
                  <TabsContent value="formatted" className="flex flex-col gap-4 pt-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <CopyButton text={outputs.pretty} copiedText="Filter copied" />
                    </div>
                    <JsonDisplay data={outputs.pretty} language="text" showCopyButton={false} />
                    <Field>
                      <FieldLabel htmlFor="ldap-filter-url-encoded">URL-encoded value</FieldLabel>
                      <Textarea
                        id="ldap-filter-url-encoded"
                        value={outputs.encoded}
                        readOnly
                        className="min-h-24 font-mono text-xs"
                      />
                      <FieldDescription>
                        Use as the value of an LDAP URL&apos;s <code>filter</code> component or a
                        percent-encoded query parameter.
                      </FieldDescription>
                    </Field>
                  </TabsContent>
                  <TabsContent value="explanation" className="pt-3">
                    <JsonDisplay data={outputs.explanation} language="text" maxHeight="28rem" />
                  </TabsContent>
                  <TabsContent value="ast" className="pt-3">
                    <JsonDisplay data={validation.ast} maxHeight="28rem" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        ) : filter.trim() ? null : (
          <Empty>
            <EmptyMedia variant="icon">
              <Braces />
            </EmptyMedia>
            <EmptyTitle>Enter an LDAP filter</EmptyTitle>
            <EmptyDescription>
              Load the nested example to see formatting, a human-readable explanation, an AST, and
              strict URL encoding.
            </EmptyDescription>
          </Empty>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Assertion-value escaper</CardTitle>
            <CardDescription>
              Escape untrusted input before inserting it as a value in a programmatically built
              filter. This prevents parentheses, asterisks, backslashes, and NUL bytes from changing
              filter structure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-5 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ldap-assertion-value">Untrusted assertion value</FieldLabel>
                <Input
                  id="ldap-assertion-value"
                  value={assertionValue}
                  onChange={(event) => setAssertionValue(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  data-testid="ldap-filter-escape-input"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ldap-escaped-value">Escaped value</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="ldap-escaped-value"
                    value={escapedValue}
                    readOnly
                    className="font-mono text-xs"
                    data-testid="ldap-filter-escaped-output"
                  />
                  <InputGroupAddon align="inline-end" className="p-0">
                    <CopyButton
                      text={escapedValue}
                      showText={false}
                      variant="ghost"
                      className="rounded-none border-0 shadow-none"
                    />
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
