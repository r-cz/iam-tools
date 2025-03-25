import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
      <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-700">
        <AlertTitle>Missing timestamps</AlertTitle>
        <AlertDescription>
          Cannot display token timeline. Missing required timestamps (iat and/or exp).
        </AlertDescription>
      </Alert>
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
            className={now > expiration ? '[&>[role=progressbar]]:bg-destructive' : ''}
          />

          {/* Start label - stack on mobile, side-by-side on desktop */}
          <div className="absolute left-0 top-[-3.5rem] md:top-[-2rem] text-xs font-mono text-left md:transform-none max-w-[150px] md:max-w-none break-words md:whitespace-nowrap">
            <div className="font-semibold">Issued:</div>
            <div>{formatDate(issuedAt)}</div>
          </div>
          
          {/* End label - stack on mobile, side-by-side on desktop */}
          <div className="absolute right-0 top-[-3.5rem] md:top-[-2rem] text-xs font-mono text-right md:transform-none max-w-[150px] md:max-w-none break-words md:whitespace-nowrap">
            <div className="font-semibold">{now > expiration ? 'Expired:' : 'Expires:'}</div>
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
      
      {/* JWT ID Information - Removed as redundant */}
      
      {/* Session ID Information - Removed as redundant */}
      
      {/* OAuth 2.0 Access Token Information - Removed as redundant */}
    </div>
  );
}
