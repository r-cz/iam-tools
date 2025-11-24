import { AlertTriangle, BookMarked, ListChecks, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ValidationSummary } from '../hooks/useLdifValidation'

interface ValidationResultsProps {
  schemaName: string | null
  validation: ValidationSummary
}

export function ValidationResults({ schemaName, validation }: ValidationResultsProps) {
  if (!schemaName) {
    return (
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
    )
  }

  const hasNoIssues =
    validation.unknownAttributes.length === 0 &&
    validation.unknownObjectClasses.length === 0 &&
    validation.missingRequired.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" /> Schema validation results
        </CardTitle>
        <CardDescription>
          Checking against <span className="font-medium">{schemaName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasNoIssues ? (
          <Alert variant="default" className="border-emerald-200 bg-emerald-50/60">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <AlertTitle>No issues detected</AlertTitle>
            <AlertDescription>
              Every attribute and object class in the LDIF matches definitions from the selected
              schema.
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
                  These attribute names are missing from the selected schema snapshot. Double-check
                  for typos or update the schema.
                </p>
                <div className="flex flex-wrap gap-2">
                  {validation.unknownAttributes.map((name) => (
                    <Badge key={name} variant="destructive" className="bg-amber-100 text-amber-800">
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
                    <Badge key={name} variant="destructive" className="bg-amber-100 text-amber-800">
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
  )
}
