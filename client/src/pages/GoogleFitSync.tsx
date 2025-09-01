/**
 * Google Fit Sync Page for real-time health data synchronization
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Smartphone, Heart, Activity, Moon, Scale, CheckCircle, AlertCircle, Loader2, ScrollText } from 'lucide-react';
import { ImportLogsViewer } from '@/components/ImportLogsViewer';

interface GoogleFitStatus {
  connected: boolean;
  hasRefreshToken: boolean;
  lastSync: string | null;
}

interface SyncResult {
  success: boolean;
  message: string;
  recordsImported: number;
  recordsSkipped: number;
  daysChecked: number;
  syncMethod: string;
  dataTypes: {
    steps: number;
    heartRate: number;
    sleep: number;
    weight: number;
  };
}

export default function GoogleFitSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Check for OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
      toast({
        title: "Google Fit Connected!",
        description: "Successfully connected to Google Fit. You can now sync your health data.",
        variant: "default"
      });
      // Clear the URL parameters
      window.location.hash = '#/google-fit-sync';
      // Refetch status
      queryClient.invalidateQueries({ queryKey: ['/api/google-fit/status'] });
    } else if (error) {
      let errorMessage = "Failed to connect to Google Fit";
      if (error === 'access_denied') {
        errorMessage = "Access denied. Please make sure you're added as a test user in Google Cloud Console.";
      } else if (error === 'no_code') {
        errorMessage = "No authorization code received from Google.";
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
      // Clear the URL parameters
      window.location.hash = '#/google-fit-sync';
    }
  }, [toast, queryClient]);

  // Get Google Fit connection status
  const { data: status, isLoading: statusLoading } = useQuery<GoogleFitStatus>({
    queryKey: ['/api/google-fit/status'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (maxDays: number = 7) => {
      // First try to get fresh tokens by checking status
      const statusResponse = await apiRequest('GET', '/api/google-fit/status');
      const statusData = await statusResponse.json();
      
      if (!statusData.connected) {
        throw new Error('Google Fit not connected. Please reconnect your account.');
      }
      
      const response = await apiRequest('POST', '/api/google-fit/sync', { maxDays });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Google Fit Sync Complete",
        description: `${data.recordsImported} records imported, ${data.recordsSkipped} skipped`,
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/google-fit/status'] });
    },
    onError: (error: any) => {
      console.error('Google Fit sync error:', error);
      
      if (error.message.includes('needsAuth') || error.message.includes('unauthorized')) {
        toast({
          title: "Authentication Required",
          description: "Please reconnect your Google Fit account",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync Google Fit data",
          variant: "destructive"
        });
      }
    }
  });

  // Connect to Google Fit
  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Get authorization URL
      const response = await apiRequest('GET', '/api/google-fit/auth-url');
      const data = await response.json();
      
      // Open Google Fit authorization in new window
      window.open(data.authUrl, 'google-fit-auth', 'width=500,height=600');
      
      // Listen for auth completion
      const checkAuth = setInterval(async () => {
        try {
          const statusResponse = await apiRequest('GET', '/api/google-fit/status');
          const statusData = await statusResponse.json();
          if (statusData.connected) {
            clearInterval(checkAuth);
            setIsConnecting(false);
            queryClient.invalidateQueries({ queryKey: ['/api/google-fit/status'] });
            toast({
              title: "Connected Successfully",
              description: "Google Fit is now connected and ready to sync",
              variant: "default"
            });
          }
        } catch (err) {
          // Continue checking
        }
      }, 2000);

      // Stop checking after 2 minutes
      setTimeout(() => {
        clearInterval(checkAuth);
        setIsConnecting(false);
      }, 120000);
      
    } catch (error) {
      console.error('Google Fit connection error:', error);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Google Fit connection",
        variant: "destructive"
      });
    }
  };

  // Disconnect from Google Fit
  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/google-fit/disconnect'),
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Google Fit has been disconnected",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/google-fit/status'] });
    }
  });

  const getStatusColor = () => {
    if (statusLoading) return 'bg-gray-500';
    if (!status?.connected) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (statusLoading) return 'Checking...';
    if (!status?.connected) return 'Disconnected';
    return 'Connected';
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Google Fit Sync</h1>
        <p className="text-muted-foreground">
          Connect to Google Fit for real-time health data when Health Connect is unreliable
        </p>
      </div>

      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Smartphone className="h-6 w-6" />
            Connection Status
            <Badge variant="outline" className="ml-auto">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()} mr-2`} />
              {getStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!status?.connected ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Google Fit Not Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your Google Fit account to access real-time health data
                  </p>
                </div>
                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Google Fit'
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Google Fit Connected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {status.lastSync 
                      ? `Last synced: ${new Date(status.lastSync).toLocaleString()}`
                      : 'Ready to sync data'
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => syncMutation.mutate(7)}
                    disabled={syncMutation.isPending}
                    variant="default"
                  >
                    {syncMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                  <Button 
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    variant="outline"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Types Available */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Available Data Types</CardTitle>
          <CardDescription>
            Google Fit can provide real-time access to the following health metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Steps & Activity</p>
                <p className="text-xs text-muted-foreground">Daily step counts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Heart className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-sm">Heart Rate</p>
                <p className="text-xs text-muted-foreground">Daily averages</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Moon className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-sm">Sleep Data</p>
                <p className="text-xs text-muted-foreground">Duration & quality</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Scale className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">Weight</p>
                <p className="text-xs text-muted-foreground">Body measurements</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Data Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Smart Data Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Timestamp-Based Freshness</p>
                <p className="text-muted-foreground">
                  Only imports data that's newer than existing records
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Health Connect Backup</p>
                <p className="text-muted-foreground">
                  Provides reliable data when Health Connect sync fails
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Real-Time Access</p>
                <p className="text-muted-foreground">
                  Direct API access to Google's fitness platform
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowLogs(true)}
              className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
            >
              <ScrollText className="w-4 h-4 mr-2" />
              View Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {showLogs && (
        <ImportLogsViewer
          isOpen={showLogs}
          onClose={() => setShowLogs(false)}
        />
      )}
    </div>
  );
}