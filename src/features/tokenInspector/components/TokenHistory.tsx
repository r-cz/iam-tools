import { TokenHistoryDropdown } from '@/components/common/TokenHistoryDropdown'

interface TokenHistoryProps {
  onSelectToken: (token: string) => void
  compact?: boolean
  buttonVariant?: 'default' | 'input-group'
  label?: string
}

export function TokenHistory(props: TokenHistoryProps) {
  return <TokenHistoryDropdown {...props} align="start" />
}
