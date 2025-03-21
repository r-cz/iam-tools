import { Link } from 'react-router-dom';
import { PageContainer, PageHeader } from '@/components/page';
import { HomeIcon } from 'lucide-react';

export default function HomePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Welcome to IAM Tools"
        description="A collection of specialized tools for Identity and Access Management (IAM) development and debugging."
        icon={HomeIcon}
      />
      
      <div className="grid auto-rows-min gap-4 md:grid-cols-1 mb-6">
        <Link to="/token-inspector" className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted/70 transition-colors">
          <h3 className="text-xl font-medium">Token Inspector</h3>
        </Link>
      </div>
    </PageContainer>
  );
}
