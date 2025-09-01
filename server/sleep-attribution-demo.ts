/**
 * Sleep Data Attribution Logic Demo
 */

console.log('🌙 Sleep Data Attribution Logic');
console.log('='.repeat(50));

console.log('\n📅 Sleep Night Attribution Rules:');
console.log('   • Sleep starting after 6 PM → Next calendar day');
console.log('   • Sleep starting before 6 PM → Same calendar day (naps)');

console.log('\n🛏️  Example Sleep Sessions:');

// Example 1: Normal nighttime sleep
const example1 = {
  start: new Date('2025-01-08T22:00:00'), // 10 PM Jan 8
  end: new Date('2025-01-09T06:00:00')    // 6 AM Jan 9
};

let sleepDate1: Date;
if (example1.start.getHours() >= 18) {
  sleepDate1 = new Date(example1.start);
  sleepDate1.setDate(sleepDate1.getDate() + 1);
} else {
  sleepDate1 = example1.start;
}

console.log(`   Sleep: ${example1.start.toLocaleString()} → ${example1.end.toLocaleString()}`);
console.log(`   ✅ Attributed to: ${sleepDate1.toISOString().split('T')[0]} (Jan 9 sleep night)`);

// Example 2: Afternoon nap
const example2 = {
  start: new Date('2025-01-08T14:00:00'), // 2 PM Jan 8
  end: new Date('2025-01-08T15:30:00')    // 3:30 PM Jan 8
};

let sleepDate2: Date;
if (example2.start.getHours() >= 18) {
  sleepDate2 = new Date(example2.start);
  sleepDate2.setDate(sleepDate2.getDate() + 1);
} else {
  sleepDate2 = example2.start;
}

console.log(`   Sleep: ${example2.start.toLocaleString()} → ${example2.end.toLocaleString()}`);
console.log(`   ✅ Attributed to: ${sleepDate2.toISOString().split('T')[0]} (Jan 8 nap)`);

// Example 3: Late night sleep
const example3 = {
  start: new Date('2025-01-08T23:45:00'), // 11:45 PM Jan 8
  end: new Date('2025-01-09T07:30:00')    // 7:30 AM Jan 9
};

let sleepDate3: Date;
if (example3.start.getHours() >= 18) {
  sleepDate3 = new Date(example3.start);
  sleepDate3.setDate(sleepDate3.getDate() + 1);
} else {
  sleepDate3 = example3.start;
}

console.log(`   Sleep: ${example3.start.toLocaleString()} → ${example3.end.toLocaleString()}`);
console.log(`   ✅ Attributed to: ${sleepDate3.toISOString().split('T')[0]} (Jan 9 sleep night)`);

console.log('\n🎯 Key Benefits:');
console.log('   • All nighttime sleep consolidated to one record per night');
console.log('   • Sleep debt calculations accurate by sleep night');
console.log('   • Consistent with user expectations (sleep "last night")');
console.log('   • Sleep stages and timestamps preserved for full session');

console.log('\n✅ Sleep data now properly attributes cross-midnight sessions!');