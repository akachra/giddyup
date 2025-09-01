import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Moon, 
  Download, 
  Upload, 
  Database, 
  Smartphone, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  X,
  Trash2,
  AlertTriangle,
  Activity,
  Lock,
  Unlock,
  Calendar,
  Heart,
  Save,
  Plus,
  ArrowLeft,
  Home
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ManualHeartRateData {
  id: string;
  userId: string;
  date: string;
  restingHR?: number | null;
  minHR?: number | null;
  avgHRSleeping?: number | null;
  maxHR?: number | null;
  avgHRAwake?: number | null;
  hrv?: number | null;
  calories?: number | null;
  createdAt: string;
  updatedAt: string;
}

function ManualHeartRateSection() {
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [showMoreDates, setShowMoreDates] = useState(false);
  const [heartRateData, setHeartRateData] = useState({
    restingHR: '',
    minHR: '',
    avgHRSleeping: '',
    maxHR: '',
    avgHRAwake: '',
    hrv: '',
    calories: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get recent dates for the table
  const getRecentDates = (daysToShow: number = 30) => {
    const dates = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Load manual heart rate data
  const { data: manualHRData } = useQuery({
    queryKey: ['/api/manual-heart-rate'],
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    cacheTime: 0,
  });

  // Get heart rate data for a specific date with improved date matching
  const getHeartRateForDate = (date: string) => {
    if (!manualHRData || !Array.isArray(manualHRData)) return null;
    
    return (manualHRData as ManualHeartRateData[]).find(item => {
      if (!item.date) return false;
      
      // Try multiple date comparison methods to handle timezone issues
      const itemDateString = item.date.split('T')[0];
      const targetDate = date;
      
      // Direct string comparison
      if (itemDateString === targetDate) return true;
      
      // Parse both dates and compare as Date objects
      const itemDate = new Date(itemDateString + 'T00:00:00');
      const compareDate = new Date(targetDate + 'T00:00:00');
      
      return itemDate.getTime() === compareDate.getTime();
    });
  };

  // Save heart rate data mutation
  const saveHeartRateMutation = useMutation({
    mutationFn: async ({ date, data }: { date: string, data: typeof heartRateData }) => {
      const payload = {
        date,
        restingHR: data.restingHR ? parseInt(data.restingHR) : null,
        minHR: data.minHR ? parseInt(data.minHR) : null,
        avgHRSleeping: data.avgHRSleeping ? parseInt(data.avgHRSleeping) : null,
        maxHR: data.maxHR ? parseInt(data.maxHR) : null,
        avgHRAwake: data.avgHRAwake ? parseInt(data.avgHRAwake) : null,
        hrv: data.hrv ? parseFloat(data.hrv) : null,
        calories: data.calories ? parseInt(data.calories) : null
      };
      
      const response = await apiRequest('POST', '/api/manual-heart-rate', payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Heart Rate Data Saved",
        description: "Manual heart rate data has been saved successfully.",
      });
      setEditingDate(null);
      setHeartRateData({
        restingHR: '',
        minHR: '',
        avgHRSleeping: '',
        maxHR: '',
        avgHRAwake: '',
        hrv: '',
        calories: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manual-heart-rate'] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Start editing a date
  const handleEditDate = (date: string) => {
    const existingData = getHeartRateForDate(date);
    if (existingData) {
      setHeartRateData({
        restingHR: existingData.restingHR?.toString() || '',
        minHR: existingData.minHR?.toString() || '',
        avgHRSleeping: existingData.avgHRSleeping?.toString() || '',
        maxHR: existingData.maxHR?.toString() || '',
        avgHRAwake: existingData.avgHRAwake?.toString() || '',
        hrv: existingData.hrv?.toString() || '',
        calories: existingData.calories?.toString() || ''
      });
    } else {
      setHeartRateData({
        restingHR: '',
        minHR: '',
        avgHRSleeping: '',
        maxHR: '',
        avgHRAwake: '',
        hrv: '',
        calories: ''
      });
    }
    setEditingDate(date);
  };

  // Save current editing data
  const handleSave = () => {
    if (!editingDate) return;
    saveHeartRateMutation.mutate({ date: editingDate, data: heartRateData });
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingDate(null);
    setHeartRateData({
      restingHR: '',
      minHR: '',
      avgHRSleeping: '',
      maxHR: '',
      avgHRAwake: '',
      hrv: '',
      calories: ''
    });
  };

  const recentDates = getRecentDates(30); // Always show 30 days

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Manual Heart Rate Data
        </CardTitle>
        <CardDescription>
          Input heart rate data when automatic tracking is insufficient
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            Click on a date to add or edit heart rate measurements for that day.
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Date</TableHead>
                <TableHead className="text-gray-300 text-center">Resting HR</TableHead>
                <TableHead className="text-gray-300 text-center">Min HR</TableHead>
                <TableHead className="text-gray-300 text-center">Avg Sleep</TableHead>
                <TableHead className="text-gray-300 text-center">Max HR</TableHead>
                <TableHead className="text-gray-300 text-center">Avg Awake</TableHead>
                <TableHead className="text-gray-300 text-center">HRV (RMSSD)</TableHead>
                <TableHead className="text-gray-300 text-center">Calories</TableHead>
                <TableHead className="text-gray-300 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDates.map(date => {
                const existingData = getHeartRateForDate(date);
                const isEditing = editingDate === date;
                
                return (
                  <TableRow key={date} className="border-gray-700">
                    <TableCell className="font-medium text-gray-300">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </TableCell>
                    
                    {isEditing ? (
                      <>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="bpm"
                            value={heartRateData.restingHR}
                            onChange={(e) => setHeartRateData(prev => ({ ...prev, restingHR: e.target.value }))}
                            className="w-16 h-8 text-center bg-gray-800 border-gray-600"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="bpm"
                            value={heartRateData.minHR}
                            onChange={(e) => setHeartRateData(prev => ({ ...prev, minHR: e.target.value }))}
                            className="w-16 h-8 text-center bg-gray-800 border-gray-600"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="bpm"
                            value={heartRateData.avgHRSleeping}
                            onChange={(e) => setHeartRateData(prev => ({ ...prev, avgHRSleeping: e.target.value }))}
                            className="w-16 h-8 text-center bg-gray-800 border-gray-600"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="bpm"
                            value={heartRateData.maxHR}
                            onChange={(e) => setHeartRateData(prev => ({ ...prev, maxHR: e.target.value }))}
                            className="w-16 h-8 text-center bg-gray-800 border-gray-600"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="bpm"
                            value={heartRateData.avgHRAwake}
                            onChange={(e) => setHeartRateData(prev => ({ ...prev, avgHRAwake: e.target.value }))}
                            className="w-16 h-8 text-center bg-gray-800 border-gray-600"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="ms"
                            value={heartRateData.hrv}
                            onChange={(e) => setHeartRateData(prev => ({ ...prev, hrv: e.target.value }))}
                            className="w-16 h-8 text-center bg-gray-800 border-gray-600"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="kcal"
                            value={heartRateData.calories}
                            onChange={(e) => setHeartRateData(prev => ({ ...prev, calories: e.target.value }))}
                            className="w-20 h-8 text-center bg-gray-800 border-gray-600"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              onClick={handleSave}
                              disabled={saveHeartRateMutation.isPending}
                              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                            >
                              {saveHeartRateMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={handleCancel}
                              className="h-6 w-6 p-0 border-gray-600 hover:bg-gray-700"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-center text-gray-300">
                          {existingData?.restingHR || '-'}
                        </TableCell>
                        <TableCell className="text-center text-gray-300">
                          {existingData?.minHR || '-'}
                        </TableCell>
                        <TableCell className="text-center text-gray-300">
                          {existingData?.avgHRSleeping || '-'}
                        </TableCell>
                        <TableCell className="text-center text-gray-300">
                          {existingData?.maxHR || '-'}
                        </TableCell>
                        <TableCell className="text-center text-gray-300">
                          {existingData?.avgHRAwake || '-'}
                        </TableCell>
                        <TableCell className="text-center text-gray-300">
                          {existingData?.hrv || '-'}
                        </TableCell>
                        <TableCell className="text-center text-gray-300">
                          {existingData?.calories || '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditDate(date)}
                            className="h-6 w-6 p-0 border-gray-600 hover:bg-gray-700"
                          >
                            {existingData ? (
                              <SettingsIcon className="h-3 w-3" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMoreDates(!showMoreDates)}
              className="border-gray-600 hover:bg-gray-700 text-gray-300"
            >
              {showMoreDates ? 'Show Less' : 'View More Dates'}
              {showMoreDates ? ' (7 days)' : ' (30 days)'}
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <div><strong>Resting HR:</strong> Lowest heart rate during rest periods</div>
            <div><strong>Min HR:</strong> Absolute minimum recorded heart rate</div>
            <div><strong>Avg Sleep:</strong> Average heart rate while sleeping</div>
            <div><strong>Max HR:</strong> Maximum heart rate during activities</div>
            <div><strong>Avg Awake:</strong> Average heart rate while awake but resting</div>
            <div><strong>HRV (RMSSD):</strong> Heart Rate Variability (RMSSD) in milliseconds</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Settings() {
  const [autoSync, setAutoSync] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState("daily");
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; recordsImported: number; syncMethod: string } | null>(null);
  const [wipeResult, setWipeResult] = useState<{ success: boolean; message: string; recordsDeleted: number } | null>(null);
  const [dataLockDate, setDataLockDate] = useState<string>("");
  const [dataLockEnabled, setDataLockEnabled] = useState(false);
  const [protectedRecordsCount, setProtectedRecordsCount] = useState<number>(0);
  
  // Wipe database options
  const [preserveManualHeartRate, setPreserveManualHeartRate] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load data lock status
  const { data: dataLockStatus } = useQuery({
    queryKey: ['/api/data-lock/status'],
    retry: false,
  });

  // Update state when data lock status loads
  useEffect(() => {
    if (dataLockStatus) {
      setDataLockEnabled((dataLockStatus as any).enabled || false);
      setDataLockDate((dataLockStatus as any).lockDate ? (dataLockStatus as any).lockDate.split('T')[0] : "");
      setProtectedRecordsCount((dataLockStatus as any).protectedRecordsCount || 0);
    }
  }, [dataLockStatus]);

  // Direct sync mutation
  const directSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/health-connect/sync', { maxDays: 7, forceDirect: true });
      return await response.json();
    },
    onSuccess: (data) => {
      setSyncResult(data);
      toast({
        title: "Direct Sync Complete",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/health-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/health-data-points'] });
    },
    onError: (error) => {
      setSyncResult({ success: false, message: error.message, recordsImported: 0, syncMethod: 'error' });
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Backup sync mutation (Google Drive backup files)
  const backupSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/google-drive/sync', { maxDays: 7 });
      return response.json();
    },
    onSuccess: (data) => {
      setSyncResult(data);
      toast({
        title: "Backup Sync Complete",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/health-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/health-data-points'] });
    },
    onError: (error) => {
      setSyncResult({ success: false, message: error.message, recordsImported: 0, syncMethod: 'error' });
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Data lock mutations
  const dataLockMutation = useMutation({
    mutationFn: async (lockDate: string) => {
      const response = await apiRequest('POST', '/api/data-lock/set', { lockDate });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setDataLockEnabled(true);
        setProtectedRecordsCount(data.protectedRecordsCount || 0);
        queryClient.invalidateQueries({ queryKey: ['/api/data-lock/status'] });
        toast({
          title: "Data Lock Enabled",
          description: `Protected ${data.protectedRecordsCount || 0} health records from accidental overwrites`,
          variant: "default"
        });
      } else {
        toast({
          title: "Failed to Set Data Lock",
          description: data.message,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Data Lock Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const dataUnlockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/data-lock/unlock', {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setDataLockEnabled(false);
        setDataLockDate("");
        setProtectedRecordsCount(0);
        queryClient.invalidateQueries({ queryKey: ['/api/data-lock/status'] });
        toast({
          title: "Data Lock Removed",
          description: "All historical data is now available for updates",
          variant: "default"
        });
      } else {
        toast({
          title: "Failed to Remove Data Lock",
          description: data.message,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Data Unlock Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Database wipe mutation
  const wipeDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/database/wipe-all', {
        preserveManualHeartRate
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setWipeResult(data);
      toast({
        title: data.success ? "Database Wiped" : "Wipe Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      if (data.success) {
        // Invalidate all queries to clear cached data
        queryClient.clear();
      }
    },
    onError: (error) => {
      setWipeResult({ success: false, message: error.message, recordsDeleted: 0 });
      toast({
        title: "Database Wipe Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleWipeDatabase = () => {
    wipeDataMutation.mutate();
  };

  const handleDirectSync = () => {
    setSyncResult(null);
    directSyncMutation.mutate();
  };

  const handleBackupSync = () => {
    setSyncResult(null);
    backupSyncMutation.mutate();
  };

  const handleSetDataLock = () => {
    if (dataLockDate) {
      dataLockMutation.mutate(dataLockDate);
    }
  };

  const handleRemoveDataLock = () => {
    dataUnlockMutation.mutate();
  };

  const isDirectSyncLoading = directSyncMutation.isPending;
  const isBackupSyncLoading = backupSyncMutation.isPending;

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-blue-400" />
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="hover:bg-gray-800">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>



        {/* Data Sources */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              <CardTitle>Data Sources</CardTitle>
            </div>
            <CardDescription>
              Connect and manage your health data sources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0F0F0F] p-4 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium">Health Connect</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Direct Android integration for real-time health data
                </div>
                <div className="text-xs text-green-400">● Connected</div>
              </div>
              
              <div className="bg-[#0F0F0F] p-4 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">Google Drive</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Backup files and exported health data
                </div>
                <div className="text-xs text-blue-400">● Configured</div>
              </div>

              <div className="bg-[#0F0F0F] p-4 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium">Google Fit</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Real-time Google Fit API integration
                </div>
                <Link href="/google-fit-sync">
                  <Button size="sm" className="w-full text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Configure
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-400" />
              <CardTitle>Sync Settings</CardTitle>
            </div>
            <CardDescription>
              Configure how and when your health data syncs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Automatic Sync</Label>
                <div className="text-sm text-gray-400">
                  Automatically sync health data from connected sources
                </div>
              </div>
              <Switch
                checked={autoSync}
                onCheckedChange={setAutoSync}
              />
            </div>

            <Separator className="bg-gray-800" />

            <div className="space-y-2">
              <Label className="text-base">Sync Frequency</Label>
              <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                <SelectTrigger className="w-full bg-[#2A2A2A] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Every Hour</SelectItem>
                  <SelectItem value="daily">Daily at 6 AM</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-[#0F0F0F] p-4 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium">Health Connect</span>
                </div>
                <div className="text-xs text-gray-400">
                  Direct Android integration for real-time health data
                </div>
                <div className="text-xs text-green-400 mt-1">● Connected</div>
              </div>
              
              <div className="bg-[#0F0F0F] p-4 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">Google Drive</span>
                </div>
                <div className="text-xs text-gray-400">
                  Backup files and exported health data
                </div>
                <div className="text-xs text-blue-400 mt-1">● Configured</div>
              </div>
            </div>

            <Separator className="bg-gray-800 mt-6" />

            {/* Manual Sync Section */}
            <div className="space-y-4">
              <Label className="text-base">Manual Sync</Label>
              
              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-400">
                  <strong>Direct Sync:</strong> Fetches the latest data directly from Health Connect APIs (recommended)
                </div>
                <div className="text-sm text-gray-400">
                  <strong>Backup Sync:</strong> Uses uploaded backup files from Google Drive as fallback
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleDirectSync}
                  disabled={isDirectSyncLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isDirectSyncLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing from API...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Health Connect (Direct)
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleBackupSync}
                  disabled={isBackupSyncLoading}
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  {isBackupSyncLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing from backup...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Sync from Google Drive
                    </>
                  )}
                </Button>
              </div>
              
              <div className="text-xs text-gray-400">
                <div className="mb-1"><strong>Direct Sync:</strong> Fetches the latest data directly from Health Connect APIs (recommended)</div>
                <div><strong>Backup Sync:</strong> Uses uploaded backup files from Google Drive as fallback</div>
              </div>

              {syncResult && (
                <div className={`p-3 rounded-lg text-sm ${syncResult.success ? 'bg-green-900/20 border border-green-800 text-green-400' : 'bg-red-900/20 border border-red-800 text-red-400'}`}>
                  <div className="flex items-center gap-2">
                    {syncResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    <span className="font-medium">{syncResult.message}</span>
                  </div>
                  {syncResult.success && syncResult.recordsImported > 0 && (
                    <div className="mt-1 text-xs">
                      Imported {syncResult.recordsImported} records via {syncResult.syncMethod} sync
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-purple-400" />
              <CardTitle>App Preferences</CardTitle>
            </div>
            <CardDescription>
              Customize your app experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Dark Mode</Label>
                <div className="text-sm text-gray-400">
                  Use dark theme for better visibility
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>

            <Separator className="bg-gray-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Push Notifications</Label>
                <div className="text-sm text-gray-400">
                  Get alerts for low recovery and daily check-ins
                </div>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Lock Protection */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-yellow-400" />
              <CardTitle>Data Lock Protection</CardTitle>
            </div>
            <CardDescription>
              Protect historical health data from accidental overwrites during imports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-[#0F0F0F] p-4 rounded-lg border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium">How Data Lock Works</span>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>• Prevents historical data from being overwritten during imports</div>
                <div>• Locks data up to a specific date you choose</div>
                <div>• New data after the lock date can still be imported normally</div>
                <div>• Useful after manually correcting historical health records</div>
              </div>
            </div>

            {dataLockEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">Data Lock Active</span>
                </div>
                
                <div className="bg-green-900/20 border border-green-800 p-3 rounded-lg">
                  <div className="text-sm text-green-400">
                    <div>Protected {protectedRecordsCount} health records</div>
                    <div className="text-xs text-green-300 mt-1">
                      Data up to {dataLockDate ? new Date(dataLockDate).toLocaleDateString() : 'selected date'} is protected from overwrites
                    </div>
                  </div>
                </div>

                {/* Extend Lock Section */}
                <div className="space-y-3 p-3 bg-[#0F0F0F] rounded-lg border border-gray-800">
                  <div className="text-sm font-medium text-gray-300">Extend Lock Date</div>
                  <div className="text-xs text-gray-400 mb-2">
                    Choose a later date to protect more historical data
                  </div>
                  <Input
                    type="date"
                    value={dataLockDate}
                    onChange={(e) => setDataLockDate(e.target.value)}
                    className="bg-[#2A2A2A] border-gray-700 text-white"
                    min={dataLockDate}  // Can't go backwards
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <Button
                    onClick={handleSetDataLock}
                    disabled={!dataLockDate || dataLockMutation.isPending || dataLockDate <= (dataLockStatus as any)?.lockDate?.split('T')[0]}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {dataLockMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extending Lock...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Extend Lock Date
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  onClick={handleRemoveDataLock}
                  disabled={dataUnlockMutation.isPending}
                  variant="outline"
                  className="w-full border-red-600 text-red-400 hover:bg-red-900/20"
                >
                  {dataUnlockMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing Lock...
                    </>
                  ) : (
                    <>
                      <Unlock className="mr-2 h-4 w-4" />
                      Remove Data Lock Completely
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base">Lock Date</Label>
                  <div className="text-sm text-gray-400 mb-2">
                    Choose a date to protect all data up to that point
                  </div>
                  <Input
                    type="date"
                    value={dataLockDate}
                    onChange={(e) => setDataLockDate(e.target.value)}
                    className="bg-[#2A2A2A] border-gray-700 text-white"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <Button
                  onClick={handleSetDataLock}
                  disabled={!dataLockDate || dataLockMutation.isPending}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-black"
                >
                  {dataLockMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting Lock...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Set Data Lock
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-400" />
              <CardTitle>Privacy & Security</CardTitle>
            </div>
            <CardDescription>
              Your health data stays private and secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#0F0F0F] p-4 rounded-lg border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Local Storage</span>
              </div>
              <div className="text-xs text-gray-400">
                All your health data is stored locally in your secure database. No data leaves your device without your permission.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="border-gray-700">
                Export Data
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="bg-red-600 hover:bg-red-700 border-red-600"
                    disabled={wipeDataMutation.isPending}
                  >
                    {wipeDataMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Wiping Database...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Wipe All Data
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1A1A1A] border-gray-800">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <AlertDialogTitle className="text-red-500">Permanent Data Deletion</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-400">
                      This will permanently delete ALL data from your database, including:
                      <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                        <li>All health metrics and historical data</li>
                        <li>Sleep, heart rate, and activity records</li>
                        <li>AI conversations and coaching insights</li>
                        <li>User settings and preferences</li>
                        <li>Granular time-blocked data points</li>
                        <li>Manual heart rate entries (unless preserved below)</li>
                      </ul>
                      
                      {/* Preservation Option */}
                      <div className="mt-4 p-3 bg-gray-900/50 border border-gray-700 rounded">
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id="preserve-heart-rate"
                            checked={preserveManualHeartRate}
                            onChange={(e) => setPreserveManualHeartRate(e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                          />
                          <label 
                            htmlFor="preserve-heart-rate"
                            className="text-sm text-gray-300 cursor-pointer"
                          >
                            Keep my manually entered heart rate data
                          </label>
                        </div>
                        <p className="ml-6 text-xs text-gray-500 mt-1">
                          Your manual heart rate entries will be preserved during the wipe
                        </p>
                      </div>
                      
                      <div className="mt-3 p-2 bg-red-950/50 border border-red-800 rounded text-red-400 text-sm">
                        <strong>WARNING:</strong> This action cannot be undone. You will need to re-import all your health data.
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleWipeDatabase}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes, Wipe All Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {wipeResult && (
              <div className={`p-3 rounded-lg text-sm ${wipeResult.success ? 'bg-green-900/20 border border-green-800 text-green-400' : 'bg-red-900/20 border border-red-800 text-red-400'}`}>
                <div className="flex items-center gap-2">
                  {wipeResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span className="font-medium">{wipeResult.message}</span>
                </div>
                {wipeResult.success && wipeResult.recordsDeleted > 0 && (
                  <div className="mt-1 text-xs">
                    Permanently deleted {wipeResult.recordsDeleted} records from the database
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4 space-y-3">
              <Link href="/import-historical">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Import Historical Health Data
                </Button>
              </Link>
              
              <Link href="/mi-fitness-extractor">
                <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                  <span className="flex items-center justify-center gap-2">
                    Mi Fitness Data Extractor
                    <span className="px-2 py-0.5 text-xs bg-white/20 rounded">New</span>
                  </span>
                </Button>
              </Link>
              
              <Link href="/google-fit-sync">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  <span className="flex items-center justify-center gap-2">
                    <Activity className="h-4 w-4" />
                    Google Fit Sync
                    <span className="px-2 py-0.5 text-xs bg-white/20 rounded">Real-time</span>
                  </span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Manual Heart Rate Data Input */}
        <ManualHeartRateSection />

        {/* About */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle>About GiddyUp</CardTitle>
            <CardDescription>
              Privacy-first health and performance tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-400">
              <div>Version: 2.0.0</div>
              <div>Last Updated: January 2025</div>
              <div>Data Sources: Health Connect, Google Drive, Manual Import</div>
              <div>AI Coaching: OpenAI GPT-3.5-turbo</div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}