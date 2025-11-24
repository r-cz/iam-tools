import { Badge } from '@/components/ui/badge'
import type { TokenType, DecodedToken } from '@/types'

interface TokenStatusBadgesProps {
  decodedToken: DecodedToken | null
  tokenType: TokenType
  isDemoToken: boolean
  jwks: any
}

export function SignatureStatusBadge({ decodedToken, jwks }: TokenStatusBadgesProps) {
  if (!decodedToken) return null

  // If JWKS are loaded, show valid/invalid status
  if (jwks) {
    if (decodedToken.signature.valid) {
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-700 hover:bg-green-500/20">
          Signature Valid
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-700 hover:bg-red-500/20">
          Signature Invalid
        </Badge>
      )
    }
  }

  // If JWKS are not loaded, show "Not Verified"
  return (
    <Badge variant="outline" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">
      Signature Not Verified
    </Badge>
  )
}

export function TokenTypeBadge({ decodedToken, tokenType }: TokenStatusBadgesProps) {
  if (!decodedToken) return null

  switch (tokenType) {
    case 'id_token':
      return (
        <Badge variant="outline" className="bg-blue-500/20 text-blue-700 hover:bg-blue-500/20">
          OIDC ID Token
        </Badge>
      )
    case 'access_token': {
      const typ = decodedToken.header?.typ
      if (typ === 'at+jwt' || typ === 'application/at+jwt') {
        return (
          <Badge
            variant="outline"
            className="bg-purple-500/20 text-purple-700 hover:bg-purple-500/20"
          >
            OAuth JWT Access Token (RFC9068)
          </Badge>
        )
      }

      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-700 hover:bg-green-500/20">
          OAuth Access Token
        </Badge>
      )
    }
    default:
      return (
        <Badge variant="outline" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">
          Unknown Token Type
        </Badge>
      )
  }
}

export function DemoTokenBadge({ isDemoToken }: { isDemoToken: boolean }) {
  if (!isDemoToken) return null

  return (
    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/10">
      Demo Token
    </Badge>
  )
}
