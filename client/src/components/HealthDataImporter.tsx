import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, Smartphone, Cloud, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportStatus {
  healthConnect: 'available' | 'unavailable' | 'syncing' | 'error';
  googleDrive: 'enabled' | 'disabled' | 'syncing' | 'error';
  manualImport: 'ready' | 'uploading' | 'processing' | 'error';
}

export function HealthDataImporter() {
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    healthConnect: 'available',
    googleDrive: 'enabled',
    manualImport: 'ready'
  });
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleHealthConnectSync = async () => {
    setImportStatus(prev => ({ ...prev, healthConnect: 'syncing' }));
    
    try {
      const response = await fetch('/api/health-connect/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 })
      });

      if (response.ok) {
        setImportStatus(prev => ({ ...prev, healthConnect: 'available' }));
        setLastSync(new Date());
        toast({
          title: "Health Connect Sync Complete",
          description: "Successfully imported 7 days of health data",
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      setImportStatus(prev => ({ ...prev, healthConnect: 'error' }));
      toast({
        title: "Health Connect Sync Failed",
        description: "Could not sync health data. Check your permissions.",
        variant: "destructive"
      });
    }
  };

  const handleGoogleDriveSync = async () => {
    setImportStatus(prev => ({ ...prev, googleDrive: 'syncing' }));
    
    try {
      const response = await fetch('/api/google-drive/sync', {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setImportStatus(prev => ({ ...prev, googleDrive: 'enabled' }));
        setLastSync(new Date());
        toast({
          title: "Google Drive Sync Complete",
          description: `Processed ${result.filesProcessed} health files`,
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      setImportStatus(prev => ({ ...prev, googleDrive: 'error' }));
      toast({
        title: "Google Drive Sync Failed",
        description: "Could not sync from Google Drive. Check your credentials.",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus(prev => ({ ...prev, manualImport: 'uploading' }));

    try {
      const formData = new FormData();
      formData.append('healthFile', file);

      const response = await fetch('/api/health-connect/import', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setImportStatus(prev => ({ ...prev, manualImport: 'ready' }));
        setLastSync(new Date());
        toast({
          title: "File Import Complete",
          description: `Successfully imported ${result.recordsImported} health records`,
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      setImportStatus(prev => ({ ...prev, manualImport: 'error' }));
      toast({
        title: "File Import Failed",
        description: "Could not process the uploaded file. Check the format.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'syncing':
      case 'uploading':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Import Your Health Data</h2>
        <p className="text-gray-400">
          Sync your real health data from multiple sources to get personalized insights
        </p>
        {lastSync && (
          <p className="text-sm text-gray-500 mt-2">
            Last sync: {lastSync.toLocaleString()}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Health Connect */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-400" />
              {getStatusIcon(importStatus.healthConnect)}
            </div>
            <CardTitle className="text-white">Health Connect</CardTitle>
            <CardDescription>
              Sync directly from Android Health Connect for real-time data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleHealthConnectSync}
              disabled={importStatus.healthConnect === 'syncing'}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {importStatus.healthConnect === 'syncing' ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Sync Health Connect
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Imports sleep, heart rate, steps, and recovery data from the last 7 days
            </p>
          </CardContent>
        </Card>

        {/* Google Drive */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-400" />
              {getStatusIcon(importStatus.googleDrive)}
            </div>
            <CardTitle className="text-white">Google Drive Backup</CardTitle>
            <CardDescription>
              Import health files backed up to your Google Drive
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGoogleDriveSync}
              disabled={importStatus.googleDrive === 'syncing'}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {importStatus.googleDrive === 'syncing' ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud className="mr-2 h-4 w-4" />
                  Sync Google Drive
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Processes Health Connect backups, Whoop exports, and fitness CSVs
            </p>
          </CardContent>
        </Card>

        {/* Manual Upload */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              {getStatusIcon(importStatus.manualImport)}
            </div>
            <CardTitle className="text-white">Manual Upload</CardTitle>
            <CardDescription>
              Upload Health Connect exports (.zip or .db files)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="block">
              <input
                type="file"
                accept=".zip,.db,application/zip,application/x-zip,application/x-zip-compressed,application/x-sqlite3"
                onChange={handleFileUpload}
                className="hidden"
                disabled={importStatus.manualImport === 'uploading'}
              />
              <Button 
                asChild
                disabled={importStatus.manualImport === 'uploading'}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <span>
                  {importStatus.manualImport === 'uploading' ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Choose File
                    </>
                  )}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Supports Health Connect exports (.zip or .db files)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-4">
        <h3 className="text-white font-medium mb-2">Supported Data Sources</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-400">
          <div>• Health Connect</div>
          <div>• Whoop</div>
          <div>• Fitbit</div>
          <div>• Apple Health</div>
          <div>• Garmin</div>
          <div>• Samsung Health</div>
          <div>• Mi Fit</div>
          <div>• Custom CSV/JSON</div>
        </div>
      </div>
    </div>
  );
}