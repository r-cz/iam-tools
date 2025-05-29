import React from 'react';
import { useTokenHistory } from '../../../lib/state';
import { formatDistanceToNow } from 'date-fns';
import { 
  Clock, 
  Trash2, 
  History,
  Key,
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
import { TokenHistoryItem } from '../../../lib/state/types';
import { decodeJwtPayload } from '@/lib/jwt/decode-token';

interface TokenHistoryProps {
  onSelectToken: (token: string) => void;
}

/**
 * Truncates a JWT token for display purposes
 * @param token The token to truncate
 * @returns Truncated token with first few and last few characters (eyJhGci...sdcfw)
 */
function truncateToken(token: string): string {
  if (!token) return '';
  
  if (token.length <= 12) return token;
  
  const firstPart = token.substring(0, 6);
  const lastPart = token.substring(token.length - 5);
  
  return `${firstPart}...${lastPart}`;
}


/**
 * Displays a history of recently used JWT tokens
 */
export function TokenHistory({ onSelectToken }: TokenHistoryProps) {
  const { tokenHistory, removeToken, updateToken, clearTokens } = useTokenHistory();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  
  // Start editing a token name
  const startEditing = (id: string, currentName?: string) => {
    setEditingId(id);
    setEditName(currentName || '');
  };
  
  // Save the edited name
  const saveEdit = (id: string) => {
    updateToken(id, { name: editName });
    setEditingId(null);
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
  };
  
  // Handle token selection
  const handleSelectToken = (token: TokenHistoryItem) => {
    onSelectToken(token.token);
  };
  
  // If there are no tokens in history
  if (tokenHistory.length === 0) {
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
            <span>Recent Tokens</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[300px]">
          <DropdownMenuLabel>Token History</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tokenHistory.map((token) => (
            <React.Fragment key={token.id}>
              {editingId === token.id ? (
                <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded"
                    placeholder="Token name"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => saveEdit(token.id)}
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
                  onClick={() => handleSelectToken(token)}
                >
                  <div className="flex flex-col gap-0.5 max-w-[220px]">
                    <div className="font-medium text-sm flex items-center gap-1">
                      <Key size={14} />
                      {token.name || truncateToken(token.token)}
                    </div>
                    {token.name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {truncateToken(token.token)}
                      </div>
                    )}
                    {(() => {
                      // First try to use stored values for better performance
                      const subject = token.subject;
                      const issuer = token.issuer;
                      
                      // If stored values aren't available, try to decode the token
                      if (!subject && !issuer) {
                        const decodedPayload = decodeJwtPayload(token.token);
                        if (decodedPayload) {
                          return (
                            <>
                              {decodedPayload.sub && (
                                <div className="text-xs text-muted-foreground truncate">
                                  Subject: {typeof decodedPayload.sub === 'string' && decodedPayload.sub.length > 20 
                                    ? `${decodedPayload.sub.substring(0, 18)}...` 
                                    : decodedPayload.sub}
                                </div>
                              )}
                              {decodedPayload.iss && (
                                <div className="text-xs text-muted-foreground truncate">
                                  Issuer: {
                                    (() => {
                                      try {
                                        const url = new URL(decodedPayload.iss);
                                        return url.hostname;
                                      } catch {
                                        return decodedPayload.iss;
                                      }
                                    })()
                                  }
                                </div>
                              )}
                            </>
                          );
                        }
                        return null;
                      }
                      
                      // Use stored values
                      return (
                        <>
                          {subject && (
                            <div className="text-xs text-muted-foreground truncate">
                              Subject: {typeof subject === 'string' && subject.length > 20 
                                ? `${subject.substring(0, 18)}...` 
                                : subject}
                            </div>
                          )}
                          {issuer && (
                            <div className="text-xs text-muted-foreground truncate">
                              Issuer: {
                                (() => {
                                  try {
                                    const url = new URL(issuer);
                                    return url.hostname;
                                  } catch {
                                    return issuer;
                                  }
                                })()
                              }
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div className="text-muted-foreground text-xs flex items-center gap-1">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(token.lastUsedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(token.id, token.name);
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
                        removeToken(token.id);
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
            onClick={() => clearTokens()}
          >
            Clear History
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}