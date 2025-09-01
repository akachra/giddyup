const express = require('express');
const GoogleFitService = require('./server/googleFitService').GoogleFitService;

// Quick test to see what sleep data Google Fit returns
async function testSleepData() {
  try {
    const googleFitService = new GoogleFitService();
    const startDate = new Date('2025-08-15');
    const endDate = new Date('2025-08-17');
    
    console.log('Testing Google Fit sleep data retrieval...');
    const sleepData = await googleFitService.getSleepData(startDate, endDate);
    
    console.log('\n🌙 GOOGLE FIT SLEEP DATA RESULTS:');
    console.log(`Found ${sleepData.length} sleep records:`);
    
    for (const sleep of sleepData) {
      console.log(`\n📅 ${sleep.date}:`);
      console.log(`  Duration: ${Math.floor(sleep.sleepMinutes/60)}h ${sleep.sleepMinutes%60}m`);
      console.log(`  Efficiency: ${sleep.sleepEfficiency}%`);
      
      if (sleep.sleepStages) {
        console.log(`  Sleep Stages:`);
        console.log(`    🛌 Deep: ${sleep.sleepStages.deep}m`);
        console.log(`    💤 Light: ${sleep.sleepStages.light}m`);
        console.log(`    🧠 REM: ${sleep.sleepStages.rem}m`);
        console.log(`    😴 Awake: ${sleep.sleepStages.awake}m`);
        console.log(`    🔔 Wake Events: ${sleep.wakeEvents || 0}`);
      } else {
        console.log(`  Sleep Stages: Not available (basic session only)`);
      }
    }
    
  } catch (error) {
    console.error('Error testing sleep data:', error.message);
  }
}

testSleepData();