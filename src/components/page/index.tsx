import { ReactNode } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
}

export function PageHeader({ title, description, icon: Icon }: PageHeaderProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <CardTitle>{title}</CardTitle>
        </div>
        {description && <CardDescription className="text-sm">{description}</CardDescription>}
      </CardHeader>
    </Card>
  )
}

interface PageContainerProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | 'full'
}

export function PageContainer({ children, maxWidth = '5xl' }: PageContainerProps) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full',
  }[maxWidth]

  return (
    <div className="py-4 px-6">
      <div className={`${maxWidthClass} mx-auto`}>{children}</div>
    </div>
  )
}
