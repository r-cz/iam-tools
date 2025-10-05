import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { decodeSamlResponse, type DecodedSamlResponse } from '../utils/saml-decoder'
import { ResponseDisplay } from './ResponseDisplay'
import { AssertionDisplay } from './AssertionDisplay'
import { SignatureDisplay } from './SignatureDisplay'
import {
  AlertCircle,
  Search,
  Shield,
  FileKey,
  CheckCircle,
  TestTubeDiagonal,
  RotateCcw,
} from 'lucide-react'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'

export function SamlResponseDecoder() {
  const [input, setInput] = useState('')
  const [decodedResponse, setDecodedResponse] = useState<DecodedSamlResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('response')

  const handleDecode = () => {
    try {
      setError(null)
      const decoded = decodeSamlResponse(input.trim())
      setDecodedResponse(decoded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decode SAML response')
      setDecodedResponse(null)
    }
  }

  const handleClear = () => {
    setInput('')
    setDecodedResponse(null)
    setError(null)
    setActiveTab('response')
  }

  const handleExample = () => {
    // A simple example SAML Response (base64 encoded)
    const exampleResponse =
      'PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wiIHhtbG5zOnNhbWw9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIElEPSJfOGU4ZGM1ZjY5YTk4Y2M0YzFmZjM0MjdlNWNlMzQ2MDZmZDY3MmY5MWU2IiBWZXJzaW9uPSIyLjAiIElzc3VlSW5zdGFudD0iMjAyNC0wMS0xNVQxMDozMDowMFoiIERlc3RpbmF0aW9uPSJodHRwczovL2V4YW1wbGUuY29tL3NhbWwvYWNzIiBJblJlc3BvbnNlVG89Il9hYmNkZWYxMjM0NTYiPjxzYW1sOklzc3Vlcj5odHRwczovL2lkcC5leGFtcGxlLmNvbTwvc2FtbDpJc3N1ZXI+PHNhbWxwOlN0YXR1cz48c2FtbHA6U3RhdHVzQ29kZSBWYWx1ZT0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnN0YXR1czpTdWNjZXNzIi8+PC9zYW1scDpTdGF0dXM+PHNhbWw6QXNzZXJ0aW9uIHhtbG5zOnNhbWw9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIElEPSJfZDcxYTNhOGU5ZmNjNDVjOWQ5MjQ4ZGY5NGZhNGI4NTFhNTcxMjA2OGY4IiBWZXJzaW9uPSIyLjAiIElzc3VlSW5zdGFudD0iMjAyNC0wMS0xNVQxMDozMDowMFoiPjxzYW1sOklzc3Vlcj5odHRwczovL2lkcC5leGFtcGxlLmNvbTwvc2FtbDpJc3N1ZXI+PHNhbWw6U3ViamVjdD48c2FtbDpOYW1lSUQgU1BOYW1lUXVhbGlmaWVyPSJodHRwczovL2V4YW1wbGUuY29tIiBGb3JtYXQ9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpuYW1laWQtZm9ybWF0OnRyYW5zaWVudCI+X2NlM2QyOTQ4YjRjZjIwMTQ2ZGVlMGEwZTNlNjgwNmRmYmM5NGNmYWRkZjc8L3NhbWw6TmFtZUlEPjxzYW1sOlN1YmplY3RDb25maXJtYXRpb24gTWV0aG9kPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6Y206YmVhcmVyIj48c2FtbDpTdWJqZWN0Q29uZmlybWF0aW9uRGF0YSBOb3RPbk9yQWZ0ZXI9IjIwMjQtMDEtMTVUMTA6MzU6MDBaIiBSZWNpcGllbnQ9Imh0dHBzOi8vZXhhbXBsZS5jb20vc2FtbC9hY3MiIEluUmVzcG9uc2VUbz0iX2FiY2RlZjEyMzQ1NiIvPjwvc2FtbDpTdWJqZWN0Q29uZmlybWF0aW9uPjwvc2FtbDpTdWJqZWN0PjxzYW1sOkNvbmRpdGlvbnMgTm90QmVmb3JlPSIyMDI0LTAxLTE1VDEwOjI1OjAwWiIgTm90T25PckFmdGVyPSIyMDI0LTAxLTE1VDEwOjM1OjAwWiI+PHNhbWw6QXVkaWVuY2VSZXN0cmljdGlvbj48c2FtbDpBdWRpZW5jZT5odHRwczovL2V4YW1wbGUuY29tPC9zYW1sOkF1ZGllbmNlPjwvc2FtbDpBdWRpZW5jZVJlc3RyaWN0aW9uPjwvc2FtbDpDb25kaXRpb25zPjxzYW1sOkF1dGhuU3RhdGVtZW50IEF1dGhuSW5zdGFudD0iMjAyNC0wMS0xNVQxMDoyOTowMFoiIFNlc3Npb25JbmRleD0iXzQ5ZjUyYjJkNTI5YjRhODNiMGY4YjI5NmIxNzIwYjM2Ij48c2FtbDpBdXRobkNvbnRleHQ+PHNhbWw6QXV0aG5Db250ZXh0Q2xhc3NSZWY+dXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFjOmNsYXNzZXM6UGFzc3dvcmQ8L3NhbWw6QXV0aG5Db250ZXh0Q2xhc3NSZWY+PC9zYW1sOkF1dGhuQ29udGV4dD48L3NhbWw6QXV0aG5TdGF0ZW1lbnQ+PHNhbWw6QXR0cmlidXRlU3RhdGVtZW50PjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJlbWFpbCIgTmFtZUZvcm1hdD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmF0dHJuYW1lLWZvcm1hdDpiYXNpYyI+PHNhbWw6QXR0cmlidXRlVmFsdWU+am9obi5kb2VAZXhhbXBsZS5jb208L3NhbWw6QXR0cmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1dGUgTmFtZT0iZmlyc3ROYW1lIiBOYW1lRm9ybWF0PSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXR0cm5hbWUtZm9ybWF0OmJhc2ljIj48c2FtbDpBdHRyaWJ1dGVWYWx1ZT5Kb2huPC9zYW1sOkF0dHJpYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+PHNhbWw6QXR0cmlidXRlIE5hbWU9Imxhc3ROYW1lIiBOYW1lRm9ybWF0PSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXR0cm5hbWUtZm9ybWF0OmJhc2ljIj48c2FtbDpBdHRyaWJ1dGVWYWx1ZT5Eb2U8L3NhbWw6QXR0cmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48L3NhbWw6QXR0cmlidXRlU3RhdGVtZW50Pjwvc2FtbDpBc3NlcnRpb24+PC9zYW1scDpSZXNwb25zZT4='
    setInput(exampleResponse)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Card */}
      <Card className="lg:col-span-1">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-3">
            <InputGroup className="flex-wrap">
              <InputGroupAddon
                align="block-start"
                className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent"
              >
                <span className="text-sm font-medium text-foreground">SAML Response (Base64)</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExample}
                    className="flex items-center gap-1.5"
                  >
                    <TestTubeDiagonal size={16} />
                    <span>Example</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="flex items-center gap-1.5 text-destructive hover:text-destructive"
                  >
                    <RotateCcw size={16} />
                    <span>Clear</span>
                  </Button>
                </div>
              </InputGroupAddon>
              <Textarea
                id="saml-input"
                data-slot="input-group-control"
                placeholder="Paste your base64-encoded SAML Response here..."
                value={input}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                className="min-h-[200px] resize-y rounded-none border-0 font-mono text-sm focus-visible:ring-0"
              />
            </InputGroup>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleDecode}
                disabled={!input.trim()}
                className="w-full sm:w-auto flex items-center gap-1.5"
              >
                <Search size={16} />
                <span>Decode Response</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decoded Response Card */}
      {decodedResponse && (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Decoded SAML Response</span>
              <div className="flex gap-2">
                {decodedResponse.status === 'Success' ? (
                  <Badge variant="outline" className="bg-green-500/20 text-green-700">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Success
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/20 text-red-700">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {decodedResponse.status}
                  </Badge>
                )}
                {decodedResponse.hasSignature && (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
                    <Shield className="mr-1 h-3 w-3" />
                    Signed
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="assertion">Assertion</TabsTrigger>
                <TabsTrigger value="signature">Signature</TabsTrigger>
              </TabsList>

              <TabsContent value="response" className="mt-4">
                <ResponseDisplay response={decodedResponse} />
              </TabsContent>

              <TabsContent value="assertion" className="mt-4">
                <AssertionDisplay response={decodedResponse} />
              </TabsContent>

              <TabsContent value="signature" className="mt-4">
                <SignatureDisplay response={decodedResponse} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Placeholder when no response is decoded */}
      {!decodedResponse && !error && (
        <Card className="lg:col-span-1">
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileKey className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Paste a SAML Response and click "Decode Response" to analyze it.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
