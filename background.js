// Background service worker for midnight reset
// Sets up alarm for daily midnight reset

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getNextMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

// Initialize alarm on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  // Set up the first alarm for next midnight
  chrome.alarms.create('midnightReset', {
    when: getNextMidnight(),
    periodInMinutes: 1440 // 24 hours
  });

  // Also initialize storage with today's date if not already set
  chrome.storage.local.get('lastActiveDate', (data) => {
    if (!data.lastActiveDate) {
      chrome.storage.local.set({
        'lastActiveDate': getTodayString(),
        'dailyTasks': { items: [] }
      });
    }
  });
});

// Handle midnight alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'midnightReset') {
    // Reset for new day
    chrome.storage.local.set({
      'dailyTasks': { items: [] },
      'lastActiveDate': getTodayString()
    });

    console.log('Daily reset completed at', new Date().toISOString());
  }
});
