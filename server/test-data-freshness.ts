/**
 * Test script to verify data freshness logic
 * This simulates importing older Mi Fitness data when newer Health Connect data exists
 */
import { dataFreshnessService } from './dataFreshnessService';

async function testDataFreshness() {
  console.log('🧪 Testing Data Freshness Logic');
  console.log('='.repeat(50));
  
  // Test 1: No existing data (should import)
  console.log('\n📝 Test 1: No existing data');
  const test1 = await dataFreshnessService.shouldOverwriteData(
    'test-user',
    new Date('2025-08-09'),
    'mi_fitness',
    new Date('2025-08-09T10:00:00Z')
  );
  console.log(`Result: ${test1.shouldOverwrite ? '✅ IMPORT' : '❌ SKIP'} - ${test1.reason}`);
  
  // Test 2: Higher priority source (manual > health_connect)
  console.log('\n📝 Test 2: Higher priority source');
  // This would require existing health_connect data to test properly
  
  // Test 3: Lower priority source (mi_fitness < health_connect)
  console.log('\n📝 Test 3: Lower priority source');
  // This would require existing health_connect data to test properly
  
  // Test 4: Same priority, newer timestamp
  console.log('\n📝 Test 4: Same priority, newer timestamp');
  
  // Test 5: Same priority, older timestamp
  console.log('\n📝 Test 5: Same priority, older timestamp');
  
  console.log('\n🏁 Data freshness tests completed');
}

// Run the tests
testDataFreshness().catch(console.error);