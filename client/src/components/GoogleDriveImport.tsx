import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Cloud, Download, RefreshCw, CheckCircle, AlertCircle, Calendar, Upload, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HealthConnectFile {
  id: string;
  name: string;
  modifiedTime: string;
  size: string;
}

interface ImportResult {
  message: string;
  imported: number;
  data?: any[];
}

export function GoogleDriveImport() {
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for new files
  const { data: fileCheck, isLoading: checkingFiles, refetch: checkFiles } = useQuery({
    queryKey: ["/api/health-connect/check"],
    enabled: false, // Manual trigger only
  });

  // Auto Import from Google Drive mutation
  const autoImportMutation = useMutation({
    mutationFn: async (): Promise<ImportResult> => {
      const response = await fetch("/api/health-connect/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to import health data from Google Drive");
      }
      
      return response.json();
    },
    onSuccess: (data: ImportResult) => {
      toast({
        title: "Auto Import Successful",
        description: `${data.message} from Google Drive`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/health-metrics"] });
      setLastChecked(new Date());
    },
    onError: (error: any) => {
      toast({
        title: "Auto Import Failed",
        description: error.message || "Failed to import health data from Google Drive",
        variant: "destructive",
      });
    },
  });

  // Manual file upload mutation
  const manualImportMutation = useMutation({
    mutationFn: async (fileContent: string): Promise<ImportResult> => {
      const response = await fetch("/api/health-connect/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: fileContent }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to import selected file");
      }
      
      return response.json();
    },
    onSuccess: (data: ImportResult) => {
      toast({
        title: "File Import Successful", 
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/health-metrics"] });
    },
    onError: (error: any) => {
      toast({
        title: "File Import Failed",
        description: error.message || "Failed to import selected file",
        variant: "destructive",
      });
    },
  });

  const handleCheckForFiles = async () => {
    const result = await checkFiles();
    setLastChecked(new Date());
    
    const data = result.data as { newFiles: number; files: HealthConnectFile[] } | undefined;
    
    if (data?.newFiles && data.newFiles > 0) {
      toast({
        title: "New Files Found",
        description: `Found ${data.newFiles} new Health Connect files on Google Drive`,
      });
      // Automatically import the new files
      autoImportMutation.mutate();
    } else {
      toast({
        title: "No New Files",
        description: "No new Health Connect files found on Google Drive",
      });
    }
  };

  const handleManualImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      manualImportMutation.mutate(content);
    } catch (error) {
      toast({
        title: "File Read Error",
        description: "Failed to read the selected file",
        variant: "destructive",
      });
    }
    
    // Reset the input
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <Cloud className="h-6 w-6 text-[var(--giddyup-accent)]" />
            <CardTitle className="text-white font-work font-bold">Google Drive Integration</CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Check Google Drive automatically or manually select any file to import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400">Google Drive Integration Active</span>
            </div>
            <Badge variant="secondary" className="bg-green-400/10 text-green-400 border-green-400/20">
              Ready
            </Badge>
          </div>
          
          <div className="text-sm text-gray-400 space-y-1">
            <p>• <strong className="text-white">Check Google Drive:</strong> Automatically scan and import new files</p>
            <p>• <strong className="text-white">Select File:</strong> Manually choose any file from your device or downloads</p>
          </div>
          
          <Separator className="bg-[var(--giddyup-secondary)]/20" />
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleCheckForFiles}
              disabled={checkingFiles || autoImportMutation.isPending}
              variant="outline"
              className="border-[var(--giddyup-secondary)]/20 text-white hover:bg-[var(--giddyup-secondary)]/10"
            >
              {checkingFiles || autoImportMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 mr-2" />
              )}
              Check Google Drive
            </Button>
            
            <Button
              onClick={handleManualImport}
              disabled={manualImportMutation.isPending}
              className="bg-[var(--giddyup-accent)] hover:bg-[var(--giddyup-accent)]/80 text-black"
            >
              {manualImportMutation.isPending ? (
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Select File to Import
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {lastChecked && (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>Last checked: {lastChecked.toLocaleString()}</span>
            </div>
          )}
          
          {(fileCheck as { newFiles?: number; files?: HealthConnectFile[] })?.newFiles && (fileCheck as { newFiles?: number; files?: HealthConnectFile[] }).newFiles! > 0 && (
            <div className="mt-4 p-3 bg-[var(--giddyup-accent)]/10 border border-[var(--giddyup-accent)]/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-[var(--giddyup-accent)]" />
                <span className="text-sm text-[var(--giddyup-accent)] font-medium">
                  {(fileCheck as { newFiles?: number }).newFiles} new Health Connect files available
                </span>
              </div>
              {(fileCheck as { files?: HealthConnectFile[] })?.files?.slice(0, 3).map((file: HealthConnectFile) => (
                <div key={file.id} className="mt-2 text-xs text-gray-300">
                  • {file.name} ({new Date(file.modifiedTime).toLocaleDateString()})
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-white font-work font-bold text-lg">Import History</CardTitle>
          <CardDescription className="text-gray-400">
            Recent Health Connect data imports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--giddyup-secondary)]/10 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">Today's Import</p>
                <p className="text-gray-400 text-xs">Automatic daily sync</p>
              </div>
              <Badge variant="secondary" className="bg-green-400/10 text-green-400 border-green-400/20">
                Completed
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-[var(--giddyup-secondary)]/5 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">Yesterday</p>
                <p className="text-gray-400 text-xs">142 health records imported</p>
              </div>
              <Badge variant="secondary" className="bg-green-400/10 text-green-400 border-green-400/20">
                Completed
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}