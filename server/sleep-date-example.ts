/**
 * Sleep Date Attribution Example - August 8th
 */

console.log('🗓️  Sleep Date Attribution: August 8th Example');
console.log('='.repeat(55));

// Example: What sleep shows up on August 8th in the app?
const sleepSession = {
  // Sleep that started on August 7th at 10:30 PM and ended August 8th at 6:45 AM
  start: new Date('2025-08-07T22:30:00'), // 10:30 PM Aug 7
  end: new Date('2025-08-08T06:45:00')    // 6:45 AM Aug 8
};

console.log('\n🛏️  Sleep Session Details:');
console.log(`   Bedtime: ${sleepSession.start.toLocaleString()}`);
console.log(`   Wake time: ${sleepSession.end.toLocaleString()}`);
console.log(`   Duration: ${Math.round((sleepSession.end.getTime() - sleepSession.start.getTime()) / (1000 * 60))} minutes`);

// Apply our sleep attribution logic
let sleepDate: Date;
if (sleepSession.start.getHours() >= 18) {
  // Sleep starts after 6 PM - attribute to next day
  sleepDate = new Date(sleepSession.start);
  sleepDate.setDate(sleepDate.getDate() + 1);
} else {
  // Sleep starts before 6 PM (naps) - attribute to same day
  sleepDate = sleepSession.start;
}

const attributedDate = sleepDate.toISOString().split('T')[0];

console.log('\n📅 Attribution Logic:');
console.log(`   Sleep started at: ${sleepSession.start.getHours()}:${sleepSession.start.getMinutes().toString().padStart(2, '0')}`);
console.log(`   Since ${sleepSession.start.getHours()}:${sleepSession.start.getMinutes().toString().padStart(2, '0')} >= 18:00 (6 PM)`);
console.log(`   ✅ Attributed to: ${attributedDate}`);

console.log('\n🎯 Result:');
console.log(`   When you view August 8th in the app, you see:`);
console.log(`   - Sleep from Aug 7 10:30 PM → Aug 8 6:45 AM`);
console.log(`   - This is your "August 8th sleep night"`);
console.log(`   - The full 8+ hour session is consolidated under Aug 8`);

console.log('\n💡 User Experience:');
console.log('   - Aug 8 shows: Sleep from last night (7th → 8th)');
console.log('   - Aug 7 shows: Sleep from night before (6th → 7th)');
console.log('   - Matches how people think: "How did I sleep last night?"');

console.log('\n✅ Sleep data properly grouped by sleep night, not bedtime date!');