import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Database, Download, Scale, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImportLogsViewer } from '@/components/ImportLogsViewer';

interface ImportResult {
  success: boolean;
  message: string;
  filesProcessed?: number;
  recordsImported?: number;
  dateRange?: {
    earliest: string;
    latest: string;
  };
  error?: string;
}

export default function HistoricalImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const { toast } = useToast();

  const startHistoricalImport = async () => {
    try {
      setIsImporting(true);
      setProgress(10);
      setImportResult(null);

      toast({
        title: "Starting Health Data Import",
        description: "Connecting to Google Drive and downloading Health Connect backup file...",
      });

      const response = await fetch('/api/health-connect/import-historical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setProgress(90);

      const result: ImportResult = await response.json();
      setImportResult(result);

      if (result.success) {
        setProgress(100);
        toast({
          title: "Import Complete!",
          description: `Successfully imported ${result.recordsImported} health records from your backup file`,
        });
      } else {
        toast({
          title: "Import Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        message: 'Import failed',
        error: error instanceof Error ? error.message : 'Network error'
      });
      toast({
        title: "Import Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const startIncrementalImport = async () => {
    try {
      setIsImporting(true);
      setProgress(10);

      toast({
        title: "Starting Data Sync",
        description: "Checking if Health Connect backup file has been updated...",
      });

      const response = await fetch('/api/health-connect/import-incremental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setProgress(90);

      const result: ImportResult = await response.json();
      setImportResult(result);

      if (result.success) {
        setProgress(100);
        if (result.recordsImported && result.recordsImported > 0) {
          toast({
            title: "Data Synced",
            description: `Updated with ${result.recordsImported} records from your latest backup`,
          });
        } else {
          toast({
            title: "No Updates Found",
            description: "Your Health Connect backup file hasn't changed since last sync",
          });
        }
      } else {
        toast({
          title: "Data Sync Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Incremental import error:', error);
      toast({
        title: "Import Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const startRenphoImport = async () => {
    try {
      setIsImporting(true);
      setProgress(10);
      setImportResult(null);

      toast({
        title: "Starting RENPHO Import",
        description: "Searching for RENPHO Health data in Google Drive...",
      });

      const response = await fetch('/api/health-connect/import-renpho', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setProgress(90);

      const result: ImportResult = await response.json();
      setImportResult(result);

      if (result.success) {
        setProgress(100);
        toast({
          title: "RENPHO Import Complete!",
          description: `Successfully imported ${result.recordsImported} body composition records from ${result.filesProcessed} files`,
        });
      } else {
        toast({
          title: "RENPHO Import Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('RENPHO import error:', error);
      setImportResult({
        success: false,
        message: 'RENPHO import failed',
        error: error instanceof Error ? error.message : 'Network error'
      });
      toast({
        title: "RENPHO Import Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Health Data Import</h1>
          <p className="text-gray-400">
            Import your cumulative Health Connect backup file from Google Drive to sync your complete health history
          </p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Complete Health Data Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">
              This will import your cumulative Health Connect backup file from Google Drive containing all your health data.
              Run this to get your complete health history in the app.
            </p>
            
            <Button 
              onClick={startHistoricalImport} 
              disabled={isImporting}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isImporting ? 'Importing...' : 'Import All Health Data'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Incremental Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">
              Check if your Health Connect backup file has been updated since your last import. Use this to sync any new data.
            </p>
            
            <Button 
              onClick={startIncrementalImport} 
              disabled={isImporting}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {isImporting ? 'Checking...' : 'Sync Updated Data'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              RENPHO Health Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">
              Import body composition data from your uploaded RENPHO Health file. This includes weight, body fat percentage, muscle mass, and other body metrics from your smart scale.
            </p>
            
            <Button 
              onClick={startRenphoImport} 
              disabled={isImporting}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isImporting ? 'Importing...' : 'Import RENPHO Data'}
            </Button>
          </CardContent>
        </Card>

        {isImporting && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Import Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {importResult && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              {importResult.success ? (
                <Alert className="border-green-800 bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-200">
                    <div className="space-y-2">
                      <p className="font-medium">{importResult.message}</p>
                      {importResult.filesProcessed && (
                        <p>Files processed: {importResult.filesProcessed}</p>
                      )}
                      {importResult.recordsImported && (
                        <p>Records imported: {importResult.recordsImported}</p>
                      )}
                      {importResult.dateRange && (
                        <p>
                          Date range: {importResult.dateRange.earliest} to {importResult.dateRange.latest}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-800 bg-red-900/20">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-200">
                    <div className="space-y-2">
                      <p className="font-medium">{importResult.message}</p>
                      {importResult.error && (
                        <p className="text-sm text-gray-400">Error: {importResult.error}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* View Logs Section */}
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setShowLogs(true)}
            className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
          >
            <ScrollText className="w-4 h-4 mr-2" />
            View Logs
          </Button>
        </div>

        <div className="text-center pt-8">
          <p className="text-sm text-gray-500">
            After the initial import, use sync to check for updated health data from your devices
          </p>
        </div>
      </div>
      
      {showLogs && (
        <ImportLogsViewer
          isOpen={showLogs}
          onClose={() => setShowLogs(false)}
        />
      )}
    </div>
  );
}