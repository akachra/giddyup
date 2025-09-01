import { db } from "./db";
import { importLogs } from "@shared/schema";
import { sql } from "drizzle-orm";

export interface ImportLogEntry {
  dataType: string;
  date: string;
  status: 'imported' | 'skipped' | 'error';
  reason?: string;
  oldValue?: any;
  newValue?: any;
  details?: string;
}

export interface ImportSummary {
  source: string;
  startTime: Date;
  endTime: Date;
  totalProcessed: number;
  imported: number;
  skipped: number;
  errors: number;
  entries: ImportLogEntry[];
  detailMessages: string[];
}

export class ImportLogger {
  private entries: ImportLogEntry[] = [];
  private detailMessages: string[] = [];
  private source: string;
  private startTime: Date;

  constructor(source: string) {
    this.source = source;
    this.startTime = new Date();
  }

  logImported(dataType: string, date: string, newValue: any, oldValue?: any, details?: string) {
    this.entries.push({
      dataType,
      date,
      status: 'imported',
      oldValue,
      newValue,
      details
    });
    
    const message = `✅ IMPORTED: ${dataType} for ${date} | Old: ${this.formatValue(oldValue)} → New: ${this.formatValue(newValue)}${details ? ` | ${details}` : ''}`;
    this.detailMessages.push(message);
    console.log(`${this.source} ${message}`);
  }

  logSkipped(dataType: string, date: string, reason: string, currentValue?: any, attemptedValue?: any) {
    this.entries.push({
      dataType,
      date,
      status: 'skipped',
      reason,
      oldValue: currentValue,
      newValue: attemptedValue
    });

    const message = `⏭️  SKIPPED: ${dataType} for ${date} | Reason: ${reason} | Current: ${this.formatValue(currentValue)} | Attempted: ${this.formatValue(attemptedValue)}`;
    this.detailMessages.push(message);
    console.log(`${this.source} ${message}`);
  }

  logError(dataType: string, date: string, error: string, details?: any) {
    this.entries.push({
      dataType,
      date,
      status: 'error',
      reason: error,
      details: details ? JSON.stringify(details) : undefined
    });

    const message = `❌ ERROR: ${dataType} for ${date} | Error: ${error}${details ? ` | Details: ${JSON.stringify(details)}` : ''}`;
    this.detailMessages.push(message);
    console.error(`${this.source} ${message}`, details);
  }

  logInfo(action: string, details?: string) {
    const message = `ℹ️  INFO: ${action}${details ? ` | ${details}` : ''}`;
    this.detailMessages.push(message);
    console.log(`${this.source} ${message}`);
  }

  logSuccess(action: string, details?: string) {
    const message = `✅ SUCCESS: ${action}${details ? ` | ${details}` : ''}`;
    this.detailMessages.push(message);
    console.log(`${this.source} ${message}`);
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  getSummary(): ImportSummary {
    const endTime = new Date();
    const imported = this.entries.filter(e => e.status === 'imported').length;
    const skipped = this.entries.filter(e => e.status === 'skipped').length;
    const errors = this.entries.filter(e => e.status === 'error').length;

    return {
      source: this.source,
      startTime: this.startTime,
      endTime,
      totalProcessed: this.entries.length,
      imported,
      skipped,
      errors,
      entries: this.entries,
      detailMessages: this.detailMessages
    };
  }

  async saveToDB() {
    try {
      console.log(`📝 ${this.source} Saving import log to database...`);
      const summary = this.getSummary();
      const duration = summary.endTime.getTime() - summary.startTime.getTime();
      
      const status = summary.errors > 0 ? 'error' : 
                    summary.imported > 0 ? 'success' : 'partial';
      
      await db.insert(importLogs).values({
        type: this.source,
        operation: 'import',
        status,
        recordsImported: summary.imported,
        recordsSkipped: summary.skipped,
        recordsErrors: summary.errors,
        message: `${this.source} import: ${summary.imported} imported, ${summary.skipped} skipped, ${summary.errors} errors (${duration}ms)`,
        details: this.detailMessages,
        error: summary.errors > 0 ? summary.entries.filter(e => e.status === 'error').map(e => e.reason).join('; ') : null,
        userId: 'default-user'
      });
      console.log(`✅ ${this.source} Import log saved to database successfully`);
    } catch (error) {
      console.error(`❌ ${this.source} Failed to save import logs to database:`, error);
    }
  }

  printSummary() {
    const summary = this.getSummary();
    const duration = summary.endTime.getTime() - summary.startTime.getTime();
    
    console.log(`\n📊 ${this.source} IMPORT SUMMARY`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📈 Total Processed: ${summary.totalProcessed}`);
    console.log(`✅ Imported: ${summary.imported}`);
    console.log(`⏭️  Skipped: ${summary.skipped}`);
    console.log(`❌ Errors: ${summary.errors}`);
    
    if (summary.skipped > 0) {
      console.log(`\n📋 SKIP REASONS:`);
      const skipReasons = summary.entries
        .filter(e => e.status === 'skipped')
        .reduce((acc, entry) => {
          const key = entry.reason || 'Unknown';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      
      Object.entries(skipReasons).forEach(([reason, count]) => {
        console.log(`   • ${reason}: ${count} items`);
      });
    }
    
    if (summary.errors > 0) {
      console.log(`\n🚨 ERRORS:`);
      summary.entries
        .filter(e => e.status === 'error')
        .forEach(entry => {
          console.log(`   • ${entry.dataType} (${entry.date}): ${entry.reason}`);
        });
    }
  }
}

// Global import tracking
export class ImportLogManager {
  private static logs: ImportSummary[] = [];

  static addLog(summary: ImportSummary) {
    this.logs.push(summary);
    // Keep only last 50 import sessions
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
  }

  static getRecentLogs(limit: number = 10): ImportSummary[] {
    return this.logs.slice(-limit);
  }

  static getLogsBySource(source: string, limit: number = 10): ImportSummary[] {
    return this.logs
      .filter(log => log.source === source)
      .slice(-limit);
  }
}