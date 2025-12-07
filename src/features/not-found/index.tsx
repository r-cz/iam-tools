import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/page'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
  EmptyContent,
} from '@/components/ui/empty'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <PageContainer>
      <Empty className="py-16">
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <FileQuestion className="h-6 w-6" />
        </EmptyMedia>
        <EmptyTitle>Page Not Found</EmptyTitle>
        <EmptyDescription>
          The page you're looking for doesn't exist or has been moved.
        </EmptyDescription>
        <EmptyContent>
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </PageContainer>
  )
}
