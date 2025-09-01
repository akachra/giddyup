import React, { useState } from 'react';
import { Upload, Database, FileText, CheckCircle, AlertCircle, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportLogsViewer } from './ImportLogsViewer';

interface ImportResult {
  success: boolean;
  message: string;
  recordsImported: number;
  error?: string;
}

export const HealthConnectImporter: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a zip file or database file
    const isZipFile = file.name.endsWith('.zip');
    const isDbFile = file.name.endsWith('.db');
    
    if (!isZipFile && !isDbFile) {
      setResult({
        success: false,
        message: 'Please upload a Health Connect export (.zip or .db file)',
        recordsImported: 0,
        error: 'Invalid file type'
      });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('healthFile', file);

      const response = await fetch('/api/health-connect/import', {
        method: 'POST',
        body: formData
      });

      const importResult = await response.json();
      setResult(importResult);

      // Clear the input
      event.target.value = '';
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to upload health data',
        recordsImported: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white font-work">
          <Database className="w-5 h-5 text-blue-400" />
          Health Connect Data Import
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-gray-400 text-sm space-y-2">
          <p>Upload your Health Connect export (.zip or .db file) to import your health data:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Sleep sessions and quality metrics</li>
            <li>Heart rate and HRV data</li>
            <li>Daily steps and activity</li>
            <li>Weight and body composition</li>
            <li>Blood pressure readings</li>
            <li>Exercise and workout sessions</li>
          </ul>
        </div>

        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".zip,.db,application/zip,application/x-zip,application/x-zip-compressed,application/x-sqlite3"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="health-file-input"
          />
          
          <label
            htmlFor="health-file-input"
            className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              uploading
                ? 'bg-gray-600 border-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 border-blue-500 hover:border-blue-400'
            }`}
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Importing...' : 'Choose Health Connect File (.zip or .db)'}
          </label>
          
          <p className="text-gray-500 text-xs mt-2">
            Maximum file size: 50MB
          </p>
        </div>

        {result && (
          <Alert className={`${
            result.success 
              ? 'border-green-500 bg-green-500/10' 
              : 'border-red-500 bg-red-500/10'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                {result.success ? (
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                )}
                <AlertDescription className={`${
                  result.success ? 'text-green-300' : 'text-red-300'
                }`}>
                  <div>
                    <p className="font-medium">{result.message}</p>
                    {result.success && result.recordsImported > 0 && (
                      <p className="text-sm mt-1">
                        {result.recordsImported} health records imported successfully
                      </p>
                    )}
                    {result.error && !result.success && (
                      <p className="text-sm mt-1 opacity-80">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-medium text-sm">How to Export from Health Connect</span>
          </div>
          <ol className="text-gray-400 text-xs space-y-1 list-decimal list-inside">
            <li>Open Health Connect app on your Android device</li>
            <li>Go to Settings → Data export & privacy</li>
            <li>Select "Export data"</li>
            <li>Choose the data types you want to export</li>
            <li>Select export format and time range</li>
            <li>Download the exported zip file</li>
            <li>Upload the zip file here to import your data</li>
          </ol>
        </div>

        <div className="flex justify-end">
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

      {showLogs && (
        <ImportLogsViewer
          isOpen={showLogs}
          onClose={() => setShowLogs(false)}
        />
      )}
    </Card>
  );
};