import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface QuickMetricsProps {
  entryCount: number
  attributeValueCount: number
  schemaEnabled: boolean
}

export function QuickMetrics({
  entryCount,
  attributeValueCount,
  schemaEnabled,
}: QuickMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Metrics</CardTitle>
        <CardDescription>Summary of LDIF entries currently loaded.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <dt className="text-sm text-muted-foreground">Entries</dt>
            <dd className="text-2xl font-semibold">{entryCount}</dd>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <dt className="text-sm text-muted-foreground">Attribute values</dt>
            <dd className="text-2xl font-semibold">{attributeValueCount}</dd>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <dt className="text-sm text-muted-foreground">Schema checks enabled</dt>
            <dd className="text-2xl font-semibold">{schemaEnabled ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
