import { useState, useEffect } from 'react';
import { oidcConfigCache } from '@/lib/cache/oidc-config-cache';
import { warmOidcCache } from '@/lib/cache/popular-oidc-configs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, RefreshCw, Database, Clock } from 'lucide-react';

export function CacheManager() {
  const [stats, setStats] = useState({
    memoryEntries: 0,
    storageEntries: 0,
    oldestEntry: null as number | null,
    newestEntry: null as number | null,
  });

  // Update stats on component mount and after actions
  const updateStats = () => {
    setStats(oidcConfigCache.getStats());
  };

  useEffect(() => {
    updateStats();
  }, []);

  const handleClearCache = () => {
    oidcConfigCache.clear();
    updateStats();
    toast.success('Cache cleared', {
      description: 'All cached OIDC configurations have been removed',
    });
  };

  const handleWarmCache = async () => {
    try {
      await warmOidcCache(oidcConfigCache);
      updateStats();
      toast.success('Cache warmed', {
        description: 'Popular OIDC configurations have been pre-loaded',
      });
    } catch (error) {
      toast.error('Failed to warm cache', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };


  const formatAge = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    const age = Date.now() - timestamp;
    const hours = Math.floor(age / (1000 * 60 * 60));
    const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Management</CardTitle>
        <CardDescription>
          Manage cached OIDC configurations for improved performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Memory Cache</span>
            </div>
            <div className="text-2xl font-bold">{stats.memoryEntries}</div>
            <p className="text-xs text-muted-foreground">Active entries</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Storage Cache</span>
            </div>
            <div className="text-2xl font-bold">{stats.storageEntries}</div>
            <p className="text-xs text-muted-foreground">Persisted entries</p>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Oldest Entry</span>
            </div>
            <Badge variant="secondary">{formatAge(stats.oldestEntry)}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Newest Entry</span>
            </div>
            <Badge variant="secondary">{formatAge(stats.newestEntry)}</Badge>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleWarmCache}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Warm Cache
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearCache}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}