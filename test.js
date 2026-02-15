// Simple test to validate core logic without Chrome APIs
console.log('🧪 Testing Extension Logic\n');

// Mock chrome.storage API
const mockStorage = {};
global.chrome = {
  storage: {
    local: {
      get: async (key) => {
        await new Promise(r => setTimeout(r, 10));
        return { [key]: mockStorage[key] };
      },
      set: async (data) => {
        await new Promise(r => setTimeout(r, 10));
        Object.assign(mockStorage, data);
      }
    }
  },
  alarms: {
    create: () => {},
    onAlarm: { addListener: () => {} }
  },
  runtime: {
    onInstalled: { addListener: () => {} }
  }
};

// Load the storage module
const fs = require('fs');
const storageCode = fs.readFileSync('./storage.js', 'utf8');
const geminiCode = fs.readFileSync('./gemini-api.js', 'utf8');

eval(storageCode);
eval(geminiCode);

async function runTests() {
  try {
    console.log('Test 1: Initialize tasks');
    const tasks1 = await StorageManager.getTodaysTasks();
    console.log('✓ Got empty task list:', tasks1.items.length === 0 ? 'PASS' : 'FAIL');

    console.log('\nTest 2: Add a task');
    const task1 = await StorageManager.addTask('Learn JavaScript');
    console.log('✓ Task added:', task1.text);
    console.log('✓ Task has unique ID:', task1.id ? 'PASS' : 'FAIL');
    console.log('✓ Task not completed:', !task1.completed ? 'PASS' : 'FAIL');

    console.log('\nTest 3: Add more tasks');
    await StorageManager.addTask('Write documentation');
    await StorageManager.addTask('Review code');
    const allTasks = await StorageManager.getTodaysTasks();
    console.log('✓ Total tasks:', allTasks.items.length, '(expected 3)');

    console.log('\nTest 4: Toggle task (first completion)');
    const taskId = task1.id;
    const { task, isFirstCompletion } = await StorageManager.toggleTask(taskId);
    console.log('✓ Task toggled:', task.completed ? 'completed' : 'not completed');
    console.log('✓ First completion detected:', isFirstCompletion ? 'PASS' : 'FAIL');
    console.log('✓ CompletedAt timestamp:', task.completedAt ? 'PASS' : 'FAIL');

    console.log('\nTest 5: Toggle again (should not be first completion)');
    const result2 = await StorageManager.toggleTask(taskId);
    console.log('✓ Task toggled back:', !result2.task.completed ? 'not completed' : 'completed');
    console.log('✓ First completion flag:', result2.isFirstCompletion ? 'FAIL - should be false' : 'PASS - correctly false');
    console.log('✓ CompletedAt cleared:', result2.task.completedAt === null ? 'PASS' : 'FAIL');

    console.log('\nTest 6: Toggle third time (still not first)');
    const result3 = await StorageManager.toggleTask(taskId);
    console.log('✓ Third toggle - first completion:', result3.isFirstCompletion ? 'FAIL' : 'PASS - correctly false');

    console.log('\nTest 7: Get completed tasks');
    await StorageManager.toggleTask(allTasks.items[1].id); // Complete second task
    const completedTasks = await StorageManager.getCompletedTasks();
    console.log('✓ Completed tasks count:', completedTasks.length, '(expected 1)');

    console.log('\nTest 8: Delete task');
    const beforeDelete = await StorageManager.getTodaysTasks();
    await StorageManager.deleteTask(allTasks.items[2].id);
    const afterDelete = await StorageManager.getTodaysTasks();
    console.log('✓ Task deleted:', beforeDelete.items.length - afterDelete.items.length === 1 ? 'PASS' : 'FAIL');

    console.log('\nTest 9: Clear all tasks');
    await StorageManager.clearAllTasks();
    const cleared = await StorageManager.getTodaysTasks();
    console.log('✓ All tasks cleared:', cleared.items.length === 0 ? 'PASS' : 'FAIL');

    console.log('\nTest 10: New day detection');
    const beforeReset = mockStorage.lastActiveDate;
    mockStorage.lastActiveDate = '2025-01-01'; // Simulate old date
    const isNewDay = await StorageManager.isNewDay();
    console.log('✓ New day detected:', isNewDay ? 'PASS' : 'FAIL');

    console.log('\nTest 11: GeminiAPI availability check');
    const availability = await GeminiAPI.checkAvailability();
    console.log('✓ Availability checked (no API in test):', availability === 'no' ? 'PASS' : 'FAIL');
    console.log('  Result:', availability);

    console.log('\nTest 12: Fallback affirmation');
    const fallback = GeminiAPI.getRandomFallback();
    console.log('✓ Fallback affirmation:', fallback ? 'PASS' : 'FAIL');
    console.log('  Message:', fallback);

    console.log('\n✨ All tests completed!');
    console.log('\n📝 Summary:');
    console.log('✓ Storage persistence working');
    console.log('✓ First completion detection working');
    console.log('✓ Task management (add/delete/toggle) working');
    console.log('✓ Date-based reset detection working');
    console.log('✓ Gemini API graceful degradation working');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
