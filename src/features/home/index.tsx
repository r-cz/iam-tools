import { Link } from 'react-router-dom'
import { HomeIcon } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { toolCatalog, type ToolCatalogItem, type ToolCatalogSection } from '@/config/tool-catalog'
import { QuickAccess } from '@/features/home/quick-access'

const homeSections = toolCatalog.map((section) => ({
  ...section,
  tools: section.tools.filter((tool) => tool.showOnHome !== false),
}))

const totalToolCount = homeSections.reduce((count, section) => count + section.tools.length, 0)

function ToolCard({
  tool,
  exposeTestId = true,
}: {
  tool: ToolCatalogItem
  exposeTestId?: boolean
}) {
  const Icon = tool.icon

  return (
    <Item asChild interactive className="h-full p-0">
      <Link
        to={tool.path}
        className="flex h-full w-full items-start gap-4 p-4"
        data-testid={exposeTestId ? tool.homeTestId : undefined}
      >
        <ItemMedia variant="icon" className="bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </ItemMedia>
        <ItemContent className="min-w-0 gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <ItemTitle>{tool.title}</ItemTitle>
            <ItemDescription>{tool.description}</ItemDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tool.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </ItemContent>
      </Link>
    </Item>
  )
}

function SectionHeader({ section }: { section: ToolCatalogSection }) {
  const Icon = section.icon

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-normal">{section.title}</h2>
          <p className="text-sm text-muted-foreground">{section.description}</p>
        </div>
      </div>
      <Badge variant="outline" className="w-fit">
        {section.tools.length} tool{section.tools.length === 1 ? '' : 's'}
      </Badge>
    </div>
  )
}

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

        {homeSections.map((section) => (
          <section key={section.id} className="flex flex-col gap-4">
            <SectionHeader section={section} />
            <ItemGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {section.tools.map((tool) => (
                <ToolCard key={tool.path} tool={tool} />
              ))}
            </ItemGroup>
          </section>
        ))}
      </div>
    </PageContainer>
  )
}

export { HomePage }
