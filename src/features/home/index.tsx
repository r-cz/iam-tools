import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Link to="/token-inspector" className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted/70 transition-colors">
          <h3 className="text-xl font-medium">Token Inspector</h3>
        </Link>
        <Link to="/mermaid-editor" className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted/70 transition-colors">
          <h3 className="text-xl font-medium">Mermaid Editor</h3>
        </Link>
        <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
          <h3 className="text-xl font-medium">JWKS Tool</h3>
        </div>
      </div>
      <div className="min-h-[50vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6">
        <h2 className="text-2xl font-semibold mb-4">Welcome to IAM Tools</h2>
        <p className="mb-4">A collection of useful tools for identity and access management.</p>
        <p>Select a tool from the sidebar or one of the cards above to get started.</p>
      </div>
    </div>
  );
}
