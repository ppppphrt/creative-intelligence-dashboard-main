import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Meta Ads Settings Page
 * Configure and manage Meta Ads account connections
 */
export default function MetaAdsSettings() {
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch configured accounts
  const { data: accounts, isLoading } = trpc.metaSync.getConfiguredAccounts.useQuery();

  // Fetch sync status
  const { data: syncStatus } = trpc.metaSync.getSyncStatus.useQuery();

  // Sync mutation
  const syncMutation = trpc.metaSync.syncAllAccounts.useMutation({
    onSuccess: (data: any) => {
      setIsSyncing(false);
      if (data?.success) {
        toast.success(`Synced ${data.totalAdsSynced} ads from ${data.results?.length || 0} accounts`);
      } else {
        toast.error(data?.message || "Sync failed");
      }
    },
    onError: (error: any) => {
      setIsSyncing(false);
      toast.error(`Sync error: ${error?.message || "Unknown error"}`);
    },
  });

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await syncMutation.mutateAsync();
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Meta Ads Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Meta Ad Accounts and configure data synchronization
        </p>
      </div>

      {/* Connection Status */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Meta Ads MCP Connection
          </CardTitle>
          <CardDescription>Status of your Meta Ads API integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Connection Status</p>
                <p className="text-sm text-muted-foreground">Ready to connect Meta Ads MCP</p>
              </div>
              <Badge className="bg-amber-600 text-white">PENDING</Badge>
            </div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ℹ️ The dashboard is configured with 4 Meta Ad Accounts. Once you authorize the Meta Ads MCP
            connector, live data will automatically sync to the dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Configured Accounts */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Your Ad Accounts</h2>
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </CardContent>
            </Card>
          ) : (
            accounts?.map((account: any) => {
              const status = syncStatus?.find((s) => s.accountId === account.id);
              return (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        <CardDescription className="font-mono text-xs mt-1">
                          Account ID: {account.id}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Ads Synced</p>
                        <p className="text-2xl font-bold">{status?.adsSynced || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Sync</p>
                        <p className="text-sm font-medium">
                          {status?.lastSync ? new Date(status.lastSync).toLocaleString() : "Never"}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        ✓ Ready to sync. Connect Meta Ads MCP to pull live performance data.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Data Synchronization</CardTitle>
          <CardDescription>Manually trigger data sync from Meta Ads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Data will automatically sync once Meta Ads MCP is connected. Manual sync is available for testing.
            </p>
          </div>

          <Button onClick={handleSyncAll} disabled={isSyncing} size="lg" className="w-full">
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              "Sync All Accounts Now"
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Last sync: {syncStatus?.[0]?.lastSync ? new Date(syncStatus[0].lastSync).toLocaleString() : "Never"}
          </p>
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
          <CardDescription>How to connect Meta Ads MCP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <p className="font-semibold">Authorize Meta Ads MCP</p>
                <p className="text-sm text-muted-foreground">
                  Go to Settings → Connectors and authorize the Meta Ads MCP connector with your Meta account
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <p className="font-semibold">Verify Account Connection</p>
                <p className="text-sm text-muted-foreground">
                  The dashboard will automatically detect your 4 configured ad accounts
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <p className="font-semibold">Start Syncing Data</p>
                <p className="text-sm text-muted-foreground">
                  Live performance data will begin syncing automatically. You can also manually trigger sync here.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <p className="font-semibold">Tag and Analyze</p>
                <p className="text-sm text-muted-foreground">
                  Tag your ads with concepts, personas, hooks, and formats to unlock creative intelligence insights
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Accounts Reference</CardTitle>
          <CardDescription>Your Meta Ad Account IDs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            {accounts?.map((account: any) => (
              <div key={account.id} className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                <p className="font-semibold">{account.name}</p>
                <p className="text-muted-foreground">{account.id}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
