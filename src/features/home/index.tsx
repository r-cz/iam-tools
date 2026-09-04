import { HomeIcon } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/page'
import { toolCatalog } from '@/config/tool-catalog'
import { QuickAccess } from '@/features/home/quick-access'
import { ToolCatalogBrowser } from '@/features/home/tool-catalog-browser'

const totalToolCount = toolCatalog.reduce(
  (count, section) => count + section.tools.filter((tool) => tool.showOnHome !== false).length,
  0
)

export default function HomePage() {
  return (
    <PageContainer>
      <PageHeader
        title="IAM Tools"
        description="A focused workbench for Identity and Access Management development, debugging, and protocol inspection."
        icon={HomeIcon}
      />
      <div className="flex flex-col gap-8">
        <QuickAccess totalToolCount={totalToolCount} />
        <ToolCatalogBrowser />
      </div>
    </PageContainer>
  )
}

export { HomePage }
