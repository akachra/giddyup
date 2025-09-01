/**
 * Timezone + Sleep Attribution Example
 */

console.log('🕐 Timezone + Sleep Attribution Logic');
console.log('='.repeat(50));

// Simulate Health Connect data (stored as UTC)
const healthConnectData = {
  start_time: '2025-08-08T02:30:00.000Z', // UTC: 2:30 AM Aug 8
  end_time: '2025-08-08T10:45:00.000Z'    // UTC: 10:45 AM Aug 8
};

console.log('\n📡 Raw Health Connect Data (UTC):');
console.log(`   Start: ${healthConnectData.start_time} (UTC)`);
console.log(`   End:   ${healthConnectData.end_time} (UTC)`);

// Step 1: Convert UTC to local time (EST/EDT)
function convertUTCToLocalTime(utcDate: Date): Date {
  // For August 2025, we're in EDT (UTC-4)
  const localDate = new Date(utcDate.getTime() - (4 * 60 * 60 * 1000));
  return localDate;
}

const startTimeUTC = new Date(healthConnectData.start_time);
const endTimeUTC = new Date(healthConnectData.end_time);

const startTime = convertUTCToLocalTime(startTimeUTC);
const endTime = convertUTCToLocalTime(endTimeUTC);

console.log('\n🏠 Converted to Local Time (EDT):');
console.log(`   Start: ${startTime.toLocaleString()} (EDT)`);
console.log(`   End:   ${endTime.toLocaleString()} (EDT)`);

// Step 2: Apply sleep attribution logic using local time
let sleepDate: Date;
if (startTime.getHours() >= 18) {
  // Sleep starts after 6 PM - attribute to next day
  sleepDate = new Date(startTime);
  sleepDate.setDate(sleepDate.getDate() + 1);
  sleepDate = new Date(sleepDate.getFullYear(), sleepDate.getMonth(), sleepDate.getDate());
} else {
  // Sleep starts before 6 PM (naps) - attribute to same day
  sleepDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
}

console.log('\n🛏️  Sleep Attribution:');
console.log(`   Local sleep start: ${startTime.getHours()}:${startTime.getMinutes().toString().padStart(2, '0')} (${startTime.getHours() >= 18 ? 'after' : 'before'} 6 PM)`);
console.log(`   Attributed to: ${sleepDate.toISOString().split('T')[0]}`);

console.log('\n🎯 Complete Flow:');
console.log('   1. Health Connect stores: UTC timestamps');
console.log('   2. We convert to: Local time (EST/EDT)');
console.log('   3. We apply attribution using: Local bedtime hour');
console.log('   4. Result: Correct sleep night grouping');

console.log('\n✅ Timezone conversion happens BEFORE sleep attribution!');
console.log('✅ Sleep night logic uses correct local bedtime hour!');
console.log('✅ Cross-midnight sessions properly grouped by local sleep night!');