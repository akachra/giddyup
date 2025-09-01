import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Key, Upload, Shield, Zap, Clock, Info } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function MiFitnessExtractor() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('gdpr');
  const [extractionStatus, setExtractionStatus] = useState<any>(null);
  const { toast } = useToast();

  // GDPR Export state
  const [gdprEmail, setGdprEmail] = useState('');
  const [gdprStatus, setGdprStatus] = useState('');

  // API Authentication state  
  const [apiEmail, setApiEmail] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Data extraction state
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Handle GDPR export request
  const handleGdprExport = async () => {
    if (!gdprEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/mi-fitness/gdpr-export', { email: gdprEmail });
      const data = await response.json();
      
      setGdprStatus(data.message);
      toast({
        title: data.success ? "Export Requested" : "Request Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle API authentication
  const handleApiAuthentication = async () => {
    if (!apiEmail || !apiPassword) {
      toast({
        title: "Credentials Required",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/mi-fitness/authenticate', { 
        email: apiEmail, 
        password: apiPassword 
      });
      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        toast({
          title: "Authentication Successful",
          description: "You can now extract data from Mi Fitness API",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle data extraction
  const handleDataExtraction = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate with Mi Fitness API first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/mi-fitness/extract-data', { 
        startDate, 
        endDate 
      });
      const data = await response.json();
      
      setExtractionStatus(data);
      toast({
        title: "Data Extraction Complete",
        description: `Successfully imported ${data.summary?.healthMetrics || 0} health metrics and ${data.summary?.activities || 0} activities`,
      });
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get manual instructions
  const handleGetInstructions = async () => {
    try {
      const response = await apiRequest('GET', '/api/mi-fitness/manual-instructions');
      const data = await response.json();
      
      // Create a downloadable text file with instructions
      const blob = new Blob([data.instructions], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mi-fitness-extraction-instructions.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Instructions Downloaded",
        description: "Check your downloads folder for the extraction guide",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--giddyup-bg)] text-[var(--giddyup-text)]">
      {/* Header */}
      <div className="bg-[var(--giddyup-card-bg)] border-b border-[var(--giddyup-secondary)]/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-[var(--giddyup-accent)]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Mi Fitness Data Extractor</h1>
          <Badge variant="secondary">Beta</Badge>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Overview Card */}
        <Card className="mb-6 bg-[var(--giddyup-card-bg)] border-[var(--giddyup-secondary)]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[var(--giddyup-accent)]" />
              Extract Richer Data from Mi Fitness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--giddyup-text-muted)] mb-4">
              Your Mi Fitness app contains much more detailed health data than what's exported through Health Connect. 
              Use these methods to extract comprehensive data including minute-level heart rate, detailed sleep phases, 
              workout GPS tracks, and advanced body composition metrics.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--giddyup-secondary)]/10">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm">Official GDPR Export</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--giddyup-secondary)]/10">
                <Key className="w-4 h-4 text-blue-500" />
                <span className="text-sm">API Authentication</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--giddyup-secondary)]/10">
                <Upload className="w-4 h-4 text-purple-500" />
                <span className="text-sm">Manual Methods</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Extraction Methods Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-[var(--giddyup-card-bg)]">
            <TabsTrigger value="gdpr">GDPR Export</TabsTrigger>
            <TabsTrigger value="api">API Access</TabsTrigger>
            <TabsTrigger value="extract">Extract Data</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          {/* GDPR Export Tab */}
          <TabsContent value="gdpr" className="space-y-4">
            <Card className="bg-[var(--giddyup-card-bg)] border-[var(--giddyup-secondary)]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Official GDPR Data Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gdpr-email">Email Address</Label>
                  <Input
                    id="gdpr-email"
                    type="email"
                    placeholder="Enter your Xiaomi account email"
                    value={gdprEmail}
                    onChange={(e) => setGdprEmail(e.target.value)}
                    className="bg-[var(--giddyup-bg)] border-[var(--giddyup-secondary)]/30"
                  />
                </div>
                
                <Button 
                  onClick={handleGdprExport}
                  disabled={isLoading || !gdprEmail}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Requesting Export...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Request GDPR Export
                    </>
                  )}
                </Button>

                {gdprStatus && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>{gdprStatus}</AlertDescription>
                  </Alert>
                )}

                <div className="text-sm text-[var(--giddyup-text-muted)] space-y-2">
                  <p><strong>What you'll get:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Complete activity history with minute-level data</li>
                    <li>Detailed sleep phases (deep, light, REM, awake)</li>
                    <li>Heart rate data with timestamps</li>
                    <li>Workout sessions with GPS tracks</li>
                    <li>Body composition measurements</li>
                  </ul>
                  <p className="mt-3"><strong>Timeline:</strong> Data arrives via email within 5-30 minutes as a ZIP file.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Access Tab */}
          <TabsContent value="api" className="space-y-4">
            <Card className="bg-[var(--giddyup-card-bg)] border-[var(--giddyup-secondary)]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-500" />
                  Mi Fitness API Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-email">Email Address</Label>
                  <Input
                    id="api-email"
                    type="email"
                    placeholder="Enter your Mi Fitness account email"
                    value={apiEmail}
                    onChange={(e) => setApiEmail(e.target.value)}
                    className="bg-[var(--giddyup-bg)] border-[var(--giddyup-secondary)]/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-password">Password</Label>
                  <Input
                    id="api-password"
                    type="password"
                    placeholder="Enter your Mi Fitness account password"
                    value={apiPassword}
                    onChange={(e) => setApiPassword(e.target.value)}
                    className="bg-[var(--giddyup-bg)] border-[var(--giddyup-secondary)]/30"
                  />
                </div>
                
                <Button 
                  onClick={handleApiAuthentication}
                  disabled={isLoading || !apiEmail || !apiPassword}
                  className="w-full"
                  variant={isAuthenticated ? "outline" : "default"}
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : isAuthenticated ? (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      ✓ Authenticated
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Authenticate with Mi Fitness
                    </>
                  )}
                </Button>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Your credentials are used only to authenticate with Xiaomi's servers. 
                    They are not stored and are only used for this session.
                  </AlertDescription>
                </Alert>

                <div className="text-sm text-[var(--giddyup-text-muted)]">
                  <p><strong>Real-time data access:</strong> Once authenticated, you can extract data 
                  programmatically and get the latest information from your Mi Fitness account.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Extract Data Tab */}
          <TabsContent value="extract" className="space-y-4">
            <Card className="bg-[var(--giddyup-card-bg)] border-[var(--giddyup-secondary)]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-[var(--giddyup-accent)]" />
                  Extract Mi Fitness Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-[var(--giddyup-bg)] border-[var(--giddyup-secondary)]/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-[var(--giddyup-bg)] border-[var(--giddyup-secondary)]/30"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleDataExtraction}
                  disabled={isLoading || !isAuthenticated}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Extracting Data...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Extract & Import Data
                    </>
                  )}
                </Button>

                {!isAuthenticated && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Please authenticate with Mi Fitness API first in the "API Access" tab.
                    </AlertDescription>
                  </Alert>
                )}

                {extractionStatus && (
                  <div className="p-4 rounded-lg bg-[var(--giddyup-secondary)]/10">
                    <h4 className="font-medium mb-2">Extraction Results:</h4>
                    <div className="text-sm space-y-1">
                      <p>• Health Metrics: {extractionStatus.summary?.healthMetrics || 0}</p>
                      <p>• Activities: {extractionStatus.summary?.activities || 0}</p>
                      <p>• Date Range: {extractionStatus.dateRange?.start} to {extractionStatus.dateRange?.end}</p>
                      {extractionStatus.summary?.errors?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-red-400">Errors encountered:</p>
                          <ul className="list-disc list-inside ml-2">
                            {extractionStatus.summary.errors.map((error: string, index: number) => (
                              <li key={index} className="text-xs">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Methods Tab */}
          <TabsContent value="manual" className="space-y-4">
            <Card className="bg-[var(--giddyup-card-bg)] border-[var(--giddyup-secondary)]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-purple-500" />
                  Manual Extraction Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleGetInstructions}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Detailed Instructions
                </Button>

                <div className="space-y-4 text-sm text-[var(--giddyup-text-muted)]">
                  <div>
                    <h4 className="font-medium text-[var(--giddyup-text)] mb-2">For Android Users:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Root access: Extract tokens from app data directory</li>
                      <li>ADB backup: Use Android Debug Bridge to backup app data</li>
                      <li>HTTP proxy: Capture API requests using Fiddler or HTTP Toolkit</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-[var(--giddyup-text)] mb-2">For iOS Users:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>HTTP proxy tools to intercept Mi Fitness app requests</li>
                      <li>Extract authentication tokens from API calls</li>
                      <li>Jailbreak required for direct keychain access</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-[var(--giddyup-text)] mb-2">Alternative Solutions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Gadgetbridge: Open-source fitness tracker app</li>
                      <li>Community scripts: GitHub repositories with extraction tools</li>
                      <li>Web Bluetooth: Direct device communication (limited devices)</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Manual methods require technical knowledge and may void warranties. 
                    We recommend starting with the GDPR export method for most users.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}