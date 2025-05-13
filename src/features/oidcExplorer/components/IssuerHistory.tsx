import React from 'react';
import { useIssuerHistory } from '../../../lib/state';
import { formatDistanceToNow } from 'date-fns';
import { 
  Clock, 
  Trash2, 
  History,
  Globe,
  Edit,
  Check
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { IssuerHistoryItem } from '../../../lib/state/types';

interface IssuerHistoryProps {
  onSelectIssuer: (issuerUrl: string) => void;
}

/**
 * Displays a history of recently used OIDC issuer URLs
 */
export function IssuerHistory({ onSelectIssuer }: IssuerHistoryProps) {
  const { issuerHistory, removeIssuer, updateIssuer, clearIssuers } = useIssuerHistory();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  
  // Start editing an issuer name
  const startEditing = (id: string, currentName?: string) => {
    setEditingId(id);
    setEditName(currentName || '');
  };
  
  // Save the edited name
  const saveEdit = (id: string) => {
    updateIssuer(id, { name: editName });
    setEditingId(null);
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
  };
  
  // Handle issuer selection
  const handleSelectIssuer = (issuer: IssuerHistoryItem) => {
    onSelectIssuer(issuer.url);
  };
  
  // If there are no issuers in history
  if (issuerHistory.length === 0) {
    return null;
  }
  
  return (
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1 w-full sm:w-auto"
          >
            <History size={16} />
            <span>Recent Issuers</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[300px]">
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
                  <div className="flex flex-col gap-0.5 max-w-[220px]">
                    <div className="font-medium text-sm flex items-center gap-1">
                      <Globe size={14} />
                      {issuer.name || (() => {
                        try {
                          return new URL(issuer.url).hostname;
                        } catch {
                          return issuer.url;
                        }
                      })()}
                    </div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(issuer.lastUsedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-1">
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