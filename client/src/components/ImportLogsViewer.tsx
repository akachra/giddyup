import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ImportLog {
  id: string;
  timestamp: string;
  type: 'health-connect' | 'google-fit' | 'google-drive' | 'renpho';
  operation: 'import' | 'sync';
  status: 'success' | 'error' | 'partial';
  recordsImported: number;
  recordsSkipped: number;
  recordsErrors: number;
  message: string;
  details: string[];
  error?: string;
}

interface ImportLogsViewerProps {
  trigger?: React.ReactNode;
  lastImportType?: string;
  className?: string;
}

export function ImportLogsViewer({ trigger, lastImportType, className }: ImportLogsViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch import logs
  const { data: logs, isLoading, refetch } = useQuery<ImportLog[]>({
    queryKey: ['/api/import-logs'],
    enabled: isOpen
  });

  const handleDownloadLogs = () => {
    if (!logs) return;
    
    const logData = logs.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp).toLocaleString()
    }));
    
    const dataStr = JSON.stringify(logData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'partial': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'health-connect': return 'Health Connect';
      case 'google-fit': return 'Google Fit';
      case 'google-drive': return 'Google Drive';
      case 'renpho': return 'RENPHO';
      default: return type;
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className={className}>
      <FileText className="w-4 h-4 mr-2" />
      View Logs
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 border-gray-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Import & Sync Logs</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadLogs}
                disabled={!logs || logs.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[500px] w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Loading logs...</span>
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No import logs found</p>
              <p className="text-sm">Logs will appear here after you perform imports or syncs</p>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${getStatusColor(log.status)}`}>
                        {log.status.toUpperCase()}
                      </span>
                      <span className="text-white font-medium">
                        {getTypeDisplayName(log.type)} {log.operation}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-gray-300 mb-2">{log.message}</p>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-400">Imported: </span>
                      <span className="text-green-400 font-medium">{log.recordsImported}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Skipped: </span>
                      <span className="text-yellow-400 font-medium">{log.recordsSkipped}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Errors: </span>
                      <span className="text-red-400 font-medium">{log.recordsErrors}</span>
                    </div>
                  </div>

                  {log.error && (
                    <div className="bg-red-900/20 border border-red-800 rounded p-2 mb-3">
                      <p className="text-red-300 text-sm font-medium">Error:</p>
                      <p className="text-red-400 text-sm">{log.error}</p>
                    </div>
                  )}

                  {log.details && log.details.length > 0 && (
                    <div className="bg-gray-900 rounded p-3">
                      <p className="text-gray-400 text-sm font-medium mb-2">Details:</p>
                      <div className="space-y-1">
                        {log.details.map((detail, index) => (
                          <p key={index} className="text-gray-300 text-xs font-mono">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}