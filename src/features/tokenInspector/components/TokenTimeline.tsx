import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface TokenTimelineProps {
  payload: any;
}

export function TokenTimeline({ payload }: TokenTimelineProps) {
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  
  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Extract relevant timestamps
  const issuedAt = payload.iat ? payload.iat * 1000 : null;
  const expiration = payload.exp ? payload.exp * 1000 : null;
  const authTime = payload.auth_time ? payload.auth_time * 1000 : null;
  // Not before timestamp (not used currently but could be in future extensions)
  // const notBefore = payload.nbf ? payload.nbf * 1000 : null;
  
  // Current time in ms
  const now = currentTime * 1000;
  
  // If we don't have both iat and exp, we can't create a useful timeline
  if (!issuedAt || !expiration) {
    return (
      <div className="bg-amber-500/10 text-amber-700 p-3 rounded-md">
        <p>
          Cannot display token timeline. Missing required timestamps (iat and/or exp).
        </p>
      </div>
    );
  }
  
  // Calculate the total token lifetime
  const totalLifetime = expiration - issuedAt;
  
  // Calculate elapsed time
  const elapsed = Math.max(0, now - issuedAt);
  
  // Calculate percentage elapsed
  const percentElapsed = Math.min(100, (elapsed / totalLifetime) * 100);
  
  // Format time difference as human-readable
  const formatTimeDiff = (from: number, to: number) => {
    const diffSecs = Math.floor((to - from) / 1000);
    
    if (diffSecs < 0) {
      return `${Math.abs(diffSecs)}s ago`;
    }
    
    if (diffSecs < 60) {
      return `${diffSecs}s`;
    } else if (diffSecs < 3600) {
      return `${Math.floor(diffSecs / 60)}m ${diffSecs % 60}s`;
    } else if (diffSecs < 86400) {
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      return `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(diffSecs / 86400);
      const hours = Math.floor((diffSecs % 86400) / 3600);
      return `${days}d ${hours}h`;
    }
  };
  
  // Format date more concisely for mobile
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <div className="space-y-6">
      <div className="relative pt-16 md:pt-12 pb-8 md:pb-4">
        {/* Timeline bar */}
        <div className="relative">
          <Progress 
            value={percentElapsed} 
            className={`${now > expiration ? 'bg-red-500' : ''}`}
          />

          {/* Start label - stack on mobile, side-by-side on desktop */}
          <div className="absolute left-0 top-[-3.5rem] md:top-[-2rem] text-xs font-mono text-left md:transform-none max-w-[150px] md:max-w-none break-words md:whitespace-nowrap">
            <div className="font-semibold">Issued:</div>
            <div>{formatDate(issuedAt)}</div>
          </div>
          
          {/* End label - stack on mobile, side-by-side on desktop */}
          <div className="absolute right-0 top-[-3.5rem] md:top-[-2rem] text-xs font-mono text-right md:transform-none max-w-[150px] md:max-w-none break-words md:whitespace-nowrap">
            <div className="font-semibold">Expires:</div>
            <div>{formatDate(expiration)}</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-3">
            <h4 className="text-sm font-medium">Token Age</h4>
            <p className="text-2xl font-bold">
              {formatTimeDiff(issuedAt, now)}
            </p>
            <p className="text-xs text-muted-foreground truncate" title={new Date(issuedAt).toLocaleString()}>
              {formatDate(issuedAt)}
            </p>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-3">
            <h4 className="text-sm font-medium">Remaining Lifetime</h4>
            <p className={`text-2xl font-bold ${now > expiration ? 'text-destructive' : ''}`}>
              {now > expiration 
                ? 'Expired' 
                : formatTimeDiff(now, expiration)}
            </p>
            <p className="text-xs text-muted-foreground truncate" title={new Date(expiration).toLocaleString()}>
              {formatDate(expiration)}
            </p>
          </div>
        </div>
        
        {authTime && (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-3">
              <h4 className="text-sm font-medium">Authentication Time</h4>
              <p className="text-lg font-bold">
                {formatTimeDiff(authTime, now)} ago
              </p>
              <p className="text-xs text-muted-foreground truncate" title={new Date(authTime).toLocaleString()}>
                {formatDate(authTime)}
              </p>
            </div>
          </div>
        )}
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-3">
            <h4 className="text-sm font-medium">Total Lifetime</h4>
            <p className="text-lg font-bold">
              {formatTimeDiff(issuedAt, expiration)}
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.round(totalLifetime / 1000)} seconds
            </p>
          </div>
        </div>
      </div>
      
      {/* JWT ID Information */}
      {payload.jti && (
        <div className="bg-blue-500/10 text-blue-700 p-3 rounded-md">
          <p className="text-sm font-medium mb-1">
            JWT ID: <span className="font-mono break-all">{payload.jti}</span>
          </p>
          <p className="text-xs">
            This token has a unique identifier. JWT IDs are particularly important for OAuth access tokens.
          </p>
        </div>
      )}
      
      {/* Session ID Information */}
      {payload.sid && (
        <div className="bg-blue-500/10 text-blue-700 p-3 rounded-md">
          <p className="text-sm font-medium mb-1">
            Session ID: <span className="font-mono break-all">{payload.sid}</span>
          </p>
          <p className="text-xs">
            This token is associated with a specific authentication session.
          </p>
        </div>
      )}
      
      {/* OAuth 2.0 Access Token Information */}
      {(payload.scope || payload.scp || payload.client_id) && !payload.nonce && !payload.at_hash && (
        <div className="bg-blue-500/10 text-blue-700 p-3 rounded-md">
          <p className="text-sm font-medium mb-1">OAuth 2.0 Access Token</p>
          <p className="text-xs">
            This token contains typical OAuth 2.0 access token claims. It can be used to access protected resources.
          </p>
        </div>
      )}
    </div>
  );
}
