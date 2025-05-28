import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Clock, 
  Trash2, 
  History,
  Globe,
  Edit,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IssuerHistoryItem } from '@/lib/state/types';
import { useIssuerHistory } from '@/lib/state';

interface IssuerHistoryProps {
  onSelectIssuer: (issuerUrl: string) => void;
  configLoading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

// Helper function to truncate long URLs
function truncateUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // If the hostname alone is too long, truncate it
    if (hostname.length > maxLength - 5) {
      return hostname.substring(0, maxLength - 5) + '...';
    }
    
    // Otherwise, show hostname and truncate the path if needed
    const path = urlObj.pathname;
    const remainingLength = maxLength - hostname.length - 5;
    if (path.length > remainingLength) {
      return `${hostname}${path.substring(0, remainingLength)}...`;
    }
    
    return `${hostname}${path}`;
  } catch {
    // Fallback for invalid URLs
    return url.substring(0, maxLength - 3) + '...';
  }
}

/**
 * Shared component for displaying a history of recently used OIDC issuer URLs
 * Used across OIDC Explorer, OAuth Playground, and Token Inspector features
 */
export function IssuerHistory({ onSelectIssuer, configLoading = false, disabled = false, compact = false }: IssuerHistoryProps) {
  const { issuerHistory, removeIssuer, updateIssuer, clearIssuers } = useIssuerHistory();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  
  const startEditing = (id: string, currentName?: string) => {
    setEditingId(id);
    setEditName(currentName || '');
  };
  
  const saveEdit = (id: string) => {
    updateIssuer(id, { name: editName });
    setEditingId(null);
  };
  
  const cancelEdit = () => {
    setEditingId(null);
  };
  
  const handleSelectIssuer = (issuer: IssuerHistoryItem) => {
    onSelectIssuer(issuer.url);
  };
  
  if (issuerHistory.length === 0) {
    return null;
  }
  
  return (
    <div className={compact ? "" : "w-full"}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-8 w-8"
              disabled={disabled || configLoading}
              title="Recent Issuers"
            >
              {configLoading ? <Loader2 size={16} className="animate-spin" /> : <History size={16} />}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              disabled={disabled || configLoading}
            >
              {configLoading ? <Loader2 size={16} className="animate-spin" /> : <History size={16} />}
              <span>Recent Issuers</span>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[340px]">
          <DropdownMenuLabel>Issuer URL History</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {issuerHistory.map((issuer) => (
            <React.Fragment key={issuer.id}>
              {editingId === issuer.id ? (
                <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded"
                    placeholder="Issuer name"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => saveEdit(issuer.id)}
                    >
                      <Check size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={cancelEdit}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ) : (
                <DropdownMenuItem 
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => handleSelectIssuer(issuer)}
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                    <div className="font-medium text-sm flex items-center gap-1">
                      <Globe size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        {issuer.name || (() => {
                          try {
                            return new URL(issuer.url).hostname;
                          } catch {
                            return truncateUrl(issuer.url);
                          }
                        })()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate" title={issuer.url}>
                      {truncateUrl(issuer.url)}
                    </div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(issuer.lastUsedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(issuer.id, issuer.name);
                      }}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeIssuer(issuer.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </DropdownMenuItem>
              )}
            </React.Fragment>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={() => clearIssuers()}
          >
            Clear History
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}