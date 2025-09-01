import { HealthConnectImporter } from './healthConnectImporter';
import path from 'path';

/**
 * Direct import from existing Health Connect database file
 */
export async function importFromExistingDatabase(): Promise<void> {
  const healthConnectImporter = new HealthConnectImporter();
  const dbPath = path.join(process.cwd(), 'attached_assets', 'health_connect_export_1754456925792.db');
  
  console.log('Starting direct Health Connect database import...');
  console.log(`Database path: ${dbPath}`);
  
  try {
    const result = await healthConnectImporter.importFromDatabase(dbPath);
    console.log('✅ Health Connect import completed:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Health Connect import failed:', error);
    throw error;
  }
}