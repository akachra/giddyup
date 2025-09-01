import { googleDriveService } from './googleDrive';
import { storage } from './storage';
import type { InsertHealthMetrics } from '@shared/schema';
import { metricsCalculator, type MetricInputs } from './metricsCalculator';
import { ComprehensiveFieldMapper } from './comprehensiveFieldMapper';
import { dataFreshnessService, type HealthMetricsFieldMetadata } from './dataFreshnessService';
import { type DataSource } from './dataPriorityService';
import { detectWeightUnit, convertWeightToKilograms, formatWeightInPounds } from '@shared/weightUtils';
import { isToday } from './timezoneUtils';
import { ImportLogger, ImportLogManager } from './importLogger';
import sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export class RenphoImporter {
  private tempDir = '/tmp/renpho_imports';
  private logger: ImportLogger;

  constructor() {
    this.ensureTempDir();
    this.logger = new ImportLogger('RENPHO');
  }

  private async ensureTempDir() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Find and import RENPHO Health data from Google Drive
   */
  async importRenphoData(): Promise<{
    success: boolean;
    filesProcessed: number;
    recordsImported: number;
    dateRange?: { earliest: string; latest: string };
    error?: string;
  }> {
    // Reset logger for new import session
    this.logger = new ImportLogger('RENPHO');
    
    try {
      this.logger.logInfo('Starting RENPHO data import from Google Drive...');
      console.log('Searching for RENPHO Health data in Google Drive...');

      // Search for RENPHO files specifically
      const renphoFiles = await this.findRenphoFiles();
      
      if (renphoFiles.length === 0) {
        const errorMsg = 'No RENPHO Health files found in Google Drive';
        this.logger.logError('file_search', 'N/A', errorMsg);
        await this.logger.saveToDB();
        return {
          success: false,
          filesProcessed: 0,
          recordsImported: 0,
          error: errorMsg
        };
      }

      this.logger.logInfo(`Found ${renphoFiles.length} RENPHO files in Google Drive`);
      console.log(`Found ${renphoFiles.length} RENPHO files:`);
      renphoFiles.forEach((file: any, index: number) => {
        console.log(`  ${index + 1}. ${file.name} - Modified: ${file.modifiedTime} - Size: ${Math.round((file.size || 0) / 1024)}KB`);
      });

      let totalRecordsImported = 0;
      let filesProcessed = 0;
      const processedDates: Date[] = [];

      // Process only the most recent RENPHO file to avoid duplicates
      const mostRecentFile = renphoFiles[0];
      if (mostRecentFile) {
        try {
          this.logger.logInfo(`Processing RENPHO file: ${mostRecentFile.name}`);
          console.log(`🎯 Processing MOST RECENT RENPHO file: ${mostRecentFile.name} (Modified: ${mostRecentFile.modifiedTime})`);
          
          const fileContent = await googleDriveService.downloadFile(mostRecentFile.id);
          const records = await this.processRenphoFile(fileContent, mostRecentFile);
          
          totalRecordsImported += records;
          filesProcessed++;
          processedDates.push(new Date(mostRecentFile.modifiedTime || mostRecentFile.createdTime));
          
          this.logger.logInfo(`Successfully imported ${records} records from ${mostRecentFile.name}`);
          console.log(`Successfully imported ${records} records from ${mostRecentFile.name}`);
        } catch (fileError) {
          this.logger.logError('file_processing', mostRecentFile.name, `Error processing RENPHO file: ${fileError.message}`, fileError);
          console.error(`Error processing RENPHO file ${mostRecentFile.name}:`, fileError);
        }
      }

      // Calculate date range
      let dateRange = undefined;
      if (processedDates.length > 0) {
        const earliest = new Date(Math.min(...processedDates.map(d => d.getTime())));
        const latest = new Date(Math.max(...processedDates.map(d => d.getTime())));
        dateRange = {
          earliest: earliest.toISOString().split('T')[0],
          latest: latest.toISOString().split('T')[0]
        };
      }

      // Save comprehensive logs and print summary
      await this.logger.saveToDB();
      this.logger.printSummary();
      ImportLogManager.addLog(this.logger.getSummary());

      return {
        success: true,
        filesProcessed,
        recordsImported: totalRecordsImported,
        dateRange
      };

    } catch (error) {
      this.logger.logError('general', 'N/A', `RENPHO import failed: ${error.message}`, error);
      await this.logger.saveToDB();
      this.logger.printSummary();
      
      console.error('RENPHO import failed:', error);
      return {
        success: false,
        filesProcessed: 0,
        recordsImported: 0,
        error: error instanceof Error ? error.message : 'Unknown error during RENPHO import'
      };
    }
  }

  /**
   * Find RENPHO files in Google Drive
   */
  private async findRenphoFiles(): Promise<any[]> {
    try {
      // Search for files containing "RENPHO" or "renpho" in the name
      const { drive } = googleDriveService as any;
      if (!drive) {
        throw new Error('Google Drive service not initialized');
      }

      const response = await drive.files.list({
        q: `(name contains 'RENPHO' or name contains 'renpho' or name contains 'Renpho') and trashed = false`,
        fields: 'files(id, name, createdTime, modifiedTime, size, mimeType)',
        orderBy: 'modifiedTime desc',
        pageSize: 20
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error searching for RENPHO files:', error);
      return [];
    }
  }

  /**
   * Process RENPHO file based on its format
   */
  async processRenphoFile(content: Buffer, file: any): Promise<number> {
    const fileName = file.name.toLowerCase();
    console.log(`Processing RENPHO file: ${file.name} (${file.mimeType || 'no mime type'})`);
    console.log(`File size: ${content.length} bytes`);
    
    // Log first 200 characters for debugging
    const contentPreview = content.toString('utf8', 0, 200);
    console.log('File content preview:', contentPreview.replace(/\n/g, '\\n').substring(0, 100));
    
    // Always treat RENPHO files as CSV when called from Google Drive sync
    if (file.mimeType === 'text/csv' || fileName.includes('renpho') || fileName.includes('RENPHO')) {
      console.log('Processing RENPHO file as CSV format (forced)');
      return await this.processRenphoCSV(content);
    }
    
    // Check by file extension for other cases
    if (fileName.includes('.db') || file.mimeType === 'application/x-sqlite3') {
      console.log('Detected SQLite database format');
      return await this.processRenphoDatabase(content);
    } else if (fileName.includes('.csv') || file.mimeType === 'text/csv') {
      console.log('Detected CSV format');
      return await this.processRenphoCSV(content);
    } else if (fileName.includes('.json') || file.mimeType === 'application/json') {
      console.log('Detected JSON format');
      return await this.processRenphoJSON(content);
    } else {
      // Enhanced auto-detection
      console.log('No clear extension found, trying auto-detection...');
      
      // Check for SQLite database
      const hexStart = content.toString('hex', 0, 16);
      console.log('File hex signature:', hexStart);
      
      if (contentPreview.includes('SQLite') || hexStart.startsWith('53514c697465')) {
        console.log('Auto-detected SQLite database');
        return await this.processRenphoDatabase(content);
      }
      
      // Check for CSV (look for common CSV patterns)
      if ((contentPreview.includes(',') && contentPreview.includes('\n')) ||
          contentPreview.includes('Date,') ||
          contentPreview.includes('Time,') ||
          contentPreview.includes('Weight,') ||
          contentPreview.includes('BMI,')) {
        console.log('Auto-detected CSV format');
        return await this.processRenphoCSV(content);
      }
      
      // Check for JSON
      const trimmedContent = contentPreview.trim();
      if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
        console.log('Auto-detected JSON format');
        return await this.processRenphoJSON(content);
      }
      
      // Check for XML (some RENPHO exports might be XML)
      if (trimmedContent.startsWith('<?xml') || trimmedContent.startsWith('<')) {
        console.log('Detected XML format - attempting to parse as structured data');
        return await this.processRenphoXML(content);
      }
      
      // Check if it's a plain text file with structured data
      if (contentPreview.includes('weight') || 
          contentPreview.includes('Weight') ||
          contentPreview.includes('BMI') ||
          contentPreview.includes('body fat') ||
          contentPreview.includes('muscle')) {
        console.log('Detected structured text format - attempting text parsing');
        return await this.processRenphoText(content);
      }
      
      console.log(`Unable to determine RENPHO file format for: ${fileName}`);
      console.log('File might be encrypted, compressed, or in an unsupported format');
      return 0;
    }
  }

  /**
   * Process RENPHO SQLite database
   */
  private async processRenphoDatabase(dbBuffer: Buffer): Promise<number> {
    const tempDbPath = path.join(this.tempDir, `renpho_import_${Date.now()}.db`);
    
    return new Promise((resolve, reject) => {
      try {
        // Write database buffer to temp file
        fs.writeFileSync(tempDbPath, dbBuffer);
        
        const db = new sqlite3.Database(tempDbPath, (err) => {
          if (err) {
            reject(err);
            return;
          }
        });

        // Query available tables
        db.all("SELECT name FROM sqlite_master WHERE type='table'", async (err, tables: any[]) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          console.log('RENPHO Database tables:', tables.map((t: any) => t.name));
          
          try {
            let totalRecords = 0;
            
            // Process different RENPHO data types
            for (const table of tables) {
              const tableName = table.name;
              
              if (tableName.toLowerCase().includes('weight') || 
                  tableName.toLowerCase().includes('body') ||
                  tableName.toLowerCase().includes('composition')) {
                totalRecords += await this.importRenphoWeightData(db, tableName);
              }
            }
            
            db.close((closeErr) => {
              if (closeErr) console.error('Error closing RENPHO database:', closeErr);
              // Cleanup temp file
              try {
                if (fs.existsSync(tempDbPath)) {
                  fs.unlinkSync(tempDbPath);
                }
              } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr);
              }
              resolve(totalRecords);
            });
          } catch (importError) {
            db.close();
            reject(importError);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Import weight and body composition data from RENPHO database
   */
  private async importRenphoWeightData(db: sqlite3.Database, tableName: string): Promise<number> {
    return new Promise((resolve) => {
      // Try common RENPHO column patterns
      const query = `SELECT * FROM ${tableName} ORDER BY datetime DESC, date DESC, time DESC LIMIT 365`;

      db.all(query, async (err, rows: any[]) => {
        if (err || !rows || rows.length === 0) {
          console.log(`No data found in table ${tableName}:`, err?.message);
          resolve(0);
          return;
        }

        console.log(`Processing ${rows.length} records from table ${tableName}`);
        console.log('Sample record:', rows[0]);

        let imported = 0;
        for (const row of rows) {
          try {
            const healthMetric = this.convertRenphoRecord(row);
            if (healthMetric) {
              await this.mergeHealthMetric(healthMetric);
              imported++;
            }
          } catch (error) {
            console.error('Error importing RENPHO record:', error);
          }
        }

        console.log(`Imported ${imported} records from RENPHO table ${tableName}`);
        resolve(imported);
      });
    });
  }

  /**
   * Process RENPHO CSV file
   */
  private async processRenphoCSV(content: Buffer): Promise<number> {
    try {
      // Handle BOM (Byte Order Mark) if present
      let csvData = content.toString('utf8');
      if (csvData.charCodeAt(0) === 0xFEFF) {
        csvData = csvData.slice(1); // Remove BOM
      }
      
      const lines = csvData.split('\n').filter(line => line.trim());
      console.log(`CSV has ${lines.length} total lines (including header)`);
      
      if (lines.length < 2) {
        console.log('CSV file has no data rows - only headers found');
        return 0;
      }

      // Parse headers with better handling of quotes and special characters
      const headerLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM if still present
      const headers = this.parseCSVLine(headerLine);
      console.log('RENPHO CSV headers:', headers);
      
      // Show a sample data line for debugging
      if (lines.length > 1) {
        console.log('Sample data line:', lines[1].substring(0, 100));
      }

      let imported = 0;
      let processed = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        processed++;
        
        try {
          const values = this.parseCSVLine(line);
          const record: any = {};
          
          headers.forEach((header, index) => {
            const value = values[index]?.trim();
            // Only include meaningful values (not empty, null, or zero for numeric fields)
            if (value && value !== '' && value !== '0' && value !== '0.0') {
              record[header] = value;
            }
          });
          
          // Debug log for first few rows to track August data
          if (i <= 5) {
            console.log(`🔍 Row ${i} RAW: ${line.substring(0, 150)}`);
            console.log(`🔍 Row ${i} PARSED: ${Object.keys(record).length} fields - Date field: ${record.Date || record.date || 'NO DATE'}`);
          }
          
          console.log(`Row ${i}: Processing record with ${Object.keys(record).length} fields`);
          if (Object.keys(record).length > 0) {
            console.log('Sample record data:', JSON.stringify(record).substring(0, 200));
          }
          
          const healthMetric = this.convertRenphoRecord(record);
          if (healthMetric) {
            const result = await this.mergeHealthMetric(healthMetric);
            imported++;
            
            // Don't log here - logging happens in mergeHealthMetric where actual import decisions are made
            
            console.log(`Successfully imported record ${imported}`);
          } else {
            this.logger.logSkipped('body_composition', 'unknown', 'parsing_error');
            console.log(`Row ${i}: convertRenphoRecord returned null`);
          }
        } catch (rowError) {
          this.logger.logError('body_composition', 'unknown', `Error processing row ${i}: ${rowError.message}`);
          console.error(`Error processing row ${i}:`, rowError);
        }
      }

      this.logger.logInfo(`RENPHO CSV processing complete: ${processed} rows processed, ${imported} records imported`);
      console.log(`RENPHO CSV processing complete: ${processed} rows processed, ${imported} records imported`);
      return imported;
    } catch (error) {
      console.error('Error processing RENPHO CSV:', error);
      return 0;
    }
  }
  
  /**
   * Parse a CSV line handling quotes and commas properly
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  /**
   * Process RENPHO JSON file
   */
  private async processRenphoJSON(content: Buffer): Promise<number> {
    try {
      const jsonData = JSON.parse(content.toString());
      const records = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      let imported = 0;
      for (const record of records) {
        const healthMetric = this.convertRenphoRecord(record);
        if (healthMetric) {
          await this.mergeHealthMetric(healthMetric);
          imported++;
        }
      }

      console.log(`Imported ${imported} records from RENPHO JSON`);
      return imported;
    } catch (error) {
      console.error('Error processing RENPHO JSON:', error);
      return 0;
    }
  }

  /**
   * Convert RENPHO record to health metrics format
   */
  private convertRenphoRecord(record: any): InsertHealthMetrics | null {
    try {
      // Handle different date field patterns from RENPHO
      let date: Date;
      if (record.datetime) {
        date = new Date(record.datetime);
      } else if (record.date) {
        date = new Date(record.date);
      } else if (record.time) {
        date = new Date(record.time);
      } else if (record.Date) {
        date = new Date(record.Date);
      } else if (record.DateTime) {
        date = new Date(record.DateTime);
      } else {
        console.warn('No date field found in RENPHO record');
        return null;
      }

      // Extract body composition data using RENPHO field mappings
      const weight = this.extractNumericValue(record, [
        'weight', 'Weight', 'weight_kg', 'WeightKg', 'body_weight', 'Weight(lb)'
      ]);

      const bodyFat = this.extractNumericValue(record, [
        'body_fat', 'bodyfat', 'BodyFat', 'fat_percentage', 'body_fat_percentage', 'Body Fat(%)'
      ]);

      const muscleMass = this.extractNumericValue(record, [
        'muscle', 'muscle_mass', 'MuscleMass', 'lean_mass', 'muscle_kg', 'Muscle Mass(lb)'
      ]);

      const bmi = this.extractNumericValue(record, [
        'bmi', 'BMI', 'body_mass_index'
      ]);

      const visceralFat = this.extractNumericValue(record, [
        'visceral_fat', 'VisceralFat', 'visceral', 'Visceral Fat'
      ]);

      const waterPercentage = this.extractNumericValue(record, [
        'water', 'water_percentage', 'body_water', 'WaterPercentage', 'Body Water(%)'
      ]);

      const boneMass = this.extractNumericValue(record, [
        'bone', 'bone_mass', 'BoneMass', 'bone_kg', 'Bone Mass(lb)'
      ]);

      const proteinPercentage = this.extractNumericValue(record, [
        'protein', 'protein_percentage', 'ProteinPercentage', 'protein_percent', 'Protein(%)'
      ]);

      const subcutaneousFat = this.extractNumericValue(record, [
        'subcutaneous_fat', 'SubcutaneousFat', 'subcutaneous', 'sfat', 'Subcutaneous Fat(%)'
      ]);

      // Extract RENPHO-specific fields missing from original mapping
      const metabolicAge = this.extractNumericValue(record, [
        'metabolic_age', 'MetabolicAge', 'Metabolic Age'
      ]);

      const bmr = this.extractNumericValue(record, [
        'bmr', 'BMR', 'basal_metabolic_rate', 'BasalMetabolicRate', 'BMR(kcal)'
      ]);

      const leanBodyMass = this.extractNumericValue(record, [
        'lean_mass', 'lean_body_mass', 'LeanBodyMass', 'ffm', 'fat_free_mass'
      ]);

      const bodyScore = this.extractNumericValue(record, [
        'score', 'body_score', 'BodyScore', 'rating', 'body_rating'
      ]);

      // Extract body type (text field)
      const bodyType = record.body_type || record.BodyType || record.type || record.Type;

      // Calculate additional metrics if we have weight data
      const inputs: MetricInputs = {
        weight,
        bodyFatPercentage: bodyFat,
        muscleMass,
        bmi,
        visceralFat: visceralFat,
        age: 35 // Should come from user profile
      };

      const calculatedMetrics = metricsCalculator.calculateAllMetrics(inputs);

      // Create health metrics record
      const healthMetric: InsertHealthMetrics = {
        date,
        userId: 'default-user',
        weight,
        bodyFatPercentage: bodyFat,
        muscleMass,
        bmi: bmi, // Only use imported BMI, no calculation
        visceralFat,
        waterPercentage,
        boneMass,
        proteinPercentage,
        subcutaneousFat,
        leanBodyMass,
        bodyScore: bodyScore ? Math.round(bodyScore) : undefined,
        bodyType,
        metabolicAge: metabolicAge || calculatedMetrics.metabolicAge, // Use RENPHO metabolic age first, fallback to calculated
        bmr: bmr
      };

      // Only return if we have at least weight data and date is not today
      if (weight && weight > 0) {
        // Never import data for today's date only - allow yesterday and earlier
        // Use EST timezone to match the rest of the application
        const dataDate = new Date(date);
        
        if (isToday(dataDate)) {
          console.log(`Skipping RENPHO record for today's date (EST): ${dataDate.toISOString().split('T')[0]}`);
          return null;
        }
        
        // Debug log for August dates to track what happens to them
        if (dataDate.getMonth() === 7 && dataDate.getFullYear() === 2025) { // August 2025
          console.log(`🔍 RENPHO August 2025 date found: ${dataDate.toISOString().split('T')[0]} - proceeding to data lock check`);
        }
        
        return healthMetric;
      }

      return null;
    } catch (error) {
      console.error('Error converting RENPHO record:', error);
      return null;
    }
  }

  /**
   * Extract numeric value from record using multiple possible field names
   */
  private extractNumericValue(record: any, fieldNames: string[]): number | undefined {
    for (const fieldName of fieldNames) {
      const value = record[fieldName];
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
          return numValue;
        }
      }
    }
    return undefined;
  }

  /**
   * Process RENPHO XML file (some exports might be in XML format)
   */
  private async processRenphoXML(content: Buffer): Promise<number> {
    try {
      const xmlData = content.toString();
      console.log('Processing RENPHO XML data...');
      
      // Simple XML parsing - look for weight-related data
      const weightMatches = xmlData.match(/<weight[^>]*>([^<]+)<\/weight>/gi);
      const bmiMatches = xmlData.match(/<bmi[^>]*>([^<]+)<\/bmi>/gi);
      const fatMatches = xmlData.match(/<(body_?fat|fat_percentage)[^>]*>([^<]+)<\/(body_?fat|fat_percentage)>/gi);
      
      if (weightMatches || bmiMatches || fatMatches) {
        console.log('Found health data in XML format');
        // Convert XML data to a record format for processing
        const record: any = {};
        
        if (weightMatches) {
          const weight = parseFloat(weightMatches[0].replace(/<[^>]+>/g, ''));
          if (!isNaN(weight)) record.weight = weight;
        }
        
        const healthMetric = this.convertRenphoRecord(record);
        if (healthMetric) {
          await this.mergeHealthMetric(healthMetric);
          return 1;
        }
      }
      
      console.log('No recognizable health data found in XML');
      return 0;
    } catch (error) {
      console.error('Error processing RENPHO XML:', error);
      return 0;
    }
  }

  /**
   * Process RENPHO text file (structured text format)
   */
  private async processRenphoText(content: Buffer): Promise<number> {
    try {
      const textData = content.toString();
      console.log('Processing RENPHO text data...');
      
      const lines = textData.split('\n').filter(line => line.trim());
      let imported = 0;
      
      // Look for key-value pairs or structured data
      for (const line of lines) {
        const record: any = {};
        
        // Try to extract weight data from various text formats
        const weightMatch = line.match(/weight[:\s]+(\d+\.?\d*)\s*(kg|lbs?)?/i);
        const bmiMatch = line.match(/bmi[:\s]+(\d+\.?\d*)/i);
        const fatMatch = line.match(/(body\s*fat|fat)[:\s]+(\d+\.?\d*)\s*%?/i);
        const dateMatch = line.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})/);
        
        if (weightMatch) record.weight = parseFloat(weightMatch[1]);
        if (bmiMatch) record.bmi = parseFloat(bmiMatch[1]);
        if (fatMatch) record.bodyFat = parseFloat(fatMatch[2]);
        if (dateMatch) record.date = dateMatch[1];
        
        // If we found any health data, try to import it
        if (Object.keys(record).length > 0) {
          const healthMetric = this.convertRenphoRecord(record);
          if (healthMetric) {
            await this.mergeHealthMetric(healthMetric);
            imported++;
          }
        }
      }
      
      console.log(`Imported ${imported} records from RENPHO text format`);
      return imported;
    } catch (error) {
      console.error('Error processing RENPHO text:', error);
      return 0;
    }
  }

  /**
   * Merge RENPHO health metric with existing data using data freshness logic
   */
  private async mergeHealthMetric(newMetric: InsertHealthMetrics): Promise<void> {
    try {
      const dateKey = newMetric.date.toISOString().split('T')[0];
      
      // Check each meaningful field for freshness before importing
      const fieldsToCheck = ['weight', 'bmi', 'bodyFat', 'muscleMass', 'basalMetabolicRate'];
      let anyFieldUpdated = false;
      
      // Get existing record for this date  
      const existing = await storage.getHealthMetricsForDate(newMetric.userId, newMetric.date);
      const existingFieldMetadata = (existing?.fieldMetadata as HealthMetricsFieldMetadata) || {};
      const newFieldMetadata = { ...existingFieldMetadata };
      
      for (const fieldName of fieldsToCheck) {
        const newValue = (newMetric as any)[fieldName];
        
        if (newValue !== undefined && newValue !== null) {
          // Check field-level data freshness with priority system
          const decision = await dataFreshnessService.shouldOverwriteFieldWithPriority(
            newMetric.userId,
            fieldName,
            newMetric.date,
            newValue,
            'renpho' as DataSource,
            newMetric.date // RENPHO measurement timestamp
          );
          
          if (decision.shouldOverwrite) {
            console.log(`✓ RENPHO ${fieldName}: ${newValue} - ${decision.reason}`);
            newFieldMetadata[fieldName] = dataFreshnessService.createFieldMetadata(newMetric.date, 'renpho');
            anyFieldUpdated = true;
          } else {
            console.log(`⏭ RENPHO ${fieldName}: ${newValue} - ${decision.reason}`);
            // Remove this field from the new metric so it doesn't overwrite
            delete (newMetric as any)[fieldName];
          }
        }
      }
      
      if (anyFieldUpdated) {
        // Add field metadata to the metric
        newMetric.fieldMetadata = newFieldMetadata;
        
        // Create detailed import log showing what metrics were imported
        const importedMetrics = [];
        if (newMetric.weight) importedMetrics.push(`Weight: ${newMetric.weight}${newMetric.weight > 50 ? 'kg' : 'lbs'}`);
        if (newMetric.bmi) importedMetrics.push(`BMI: ${newMetric.bmi}`);
        if (newMetric.bodyFatPercentage) importedMetrics.push(`Body Fat: ${newMetric.bodyFatPercentage}%`);
        if (newMetric.muscleMass) importedMetrics.push(`Muscle: ${newMetric.muscleMass}${newMetric.muscleMass > 50 ? 'kg' : 'lbs'}`);
        if (newMetric.visceralFat) importedMetrics.push(`Visceral Fat: ${newMetric.visceralFat}`);
        if (newMetric.waterPercentage) importedMetrics.push(`Water: ${newMetric.waterPercentage}%`);
        if (newMetric.metabolicAge) importedMetrics.push(`Metabolic Age: ${newMetric.metabolicAge}`);
        if (newMetric.bmr) importedMetrics.push(`BMR: ${newMetric.bmr} kcal`);
        
        const metricsDescription = importedMetrics.length > 0 ? importedMetrics.join(', ') : 'Basic metrics';
        this.logger.logImported('body_composition', dateKey, metricsDescription);
        
        if (existing) {
          // Merge only the approved fields
          const merged = ComprehensiveFieldMapper.mergeHealthRecords(existing, newMetric);
          await storage.updateHealthMetrics(existing.id!, merged);
          console.log(`✓ Merged RENPHO data with existing data for ${dateKey}`);
        } else {
          // No existing data, create new record
          await storage.upsertHealthMetrics(newMetric);
          console.log(`✓ Created new RENPHO health record for ${dateKey}`);
        }
      } else {
        // Log what was skipped and why
        const skippedMetrics = [];
        if (newMetric.weight) skippedMetrics.push(`Weight: ${newMetric.weight}${newMetric.weight > 50 ? 'kg' : 'lbs'}`);
        if (newMetric.bmi) skippedMetrics.push(`BMI: ${newMetric.bmi}`);
        if (newMetric.bodyFatPercentage) skippedMetrics.push(`Body Fat: ${newMetric.bodyFatPercentage}%`);
        if (newMetric.muscleMass) skippedMetrics.push(`Muscle: ${newMetric.muscleMass}${newMetric.muscleMass > 50 ? 'kg' : 'lbs'}`);
        
        const metricsDescription = skippedMetrics.length > 0 ? skippedMetrics.join(', ') : 'No new data';
        this.logger.logSkipped('body_composition', dateKey, `Data lock protection or fresher data exists: ${metricsDescription}`);
        console.log(`⏭ No RENPHO fields were fresher than existing data for ${dateKey}`);
      }
    } catch (error) {
      console.error('Error merging RENPHO health metric:', error);
      // Fallback to upsert if merge fails (but only with meaningful values)
      const hasMeaningfulValues = Object.entries(newMetric).some(([key, value]) => {
        if (['userId', 'date', 'source', 'importedAt', 'updatedAt', 'createdAt'].includes(key)) return false;
        return value !== null && value !== undefined && value !== 0;
      });
      
      if (hasMeaningfulValues) {
        await storage.upsertHealthMetrics(newMetric);
      }
    }
  }

}

export const renphoImporter = new RenphoImporter();