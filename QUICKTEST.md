# Quick Test Guide

## Step 1: Load Extension
1. Go to `chrome://extensions/`
2. Enable **Developer mode** (toggle on top right)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. You should see "Daily Affirmation Checklist" in the list

## Step 2: Open Extension
1. Click the extension icon in your Chrome toolbar (top right)
2. A popup should appear with "Daily Checklist" header

## Step 3: Debug - Open Console
**While the popup is open:**
1. Right-click anywhere in the popup
2. Select **"Inspect"** (bottom of context menu)
3. Chrome DevTools will open with the popup HTML visible
4. Click the **Console** tab

**You should now see initialization logs like:**
```
[Popup] Script loaded. Chrome API available: true
[Popup] Storage API available: true
[Popup] DOM Content Loaded event fired
[App.init] Initializing app...
[App.init] Event listeners setup
[App.init] API status checked
[App.init] Tasks loaded and rendered
[App.init] App initialization complete
```

## Step 4: Test - Add a Task
1. In the popup input field, type: `Test Task`
2. Click **Add** button (or press Enter)
3. **Watch the Console tab** - you should see:
   ```
   [AddTask] Input text: "Test Task"
   [Storage.addTask] Getting tasks...
   [Storage.addTask] New task created: {id: "...", text: "Test Task", ...}
   [Storage.addTask] Saving to storage...
   [Storage.addTask] Saved successfully
   [AddTask] Tasks reloaded and rendered
   ```

4. The task should appear in the list below with a checkbox

## Step 5: Check Task
1. Click the checkbox next to your task
2. Task should show a strikethrough
3. After a few seconds, an affirmation should appear below

## Expected Behavior

| Action | Result | Console Log |
|--------|--------|------------|
| Open popup | Empty checklist appears | `[Popup] Script loaded...` |
| Type and add task | Task appears in list | `[AddTask] Input text...` |
| Check task | Task gets strikethrough | Task completion logged |
| Uncheck task | Strikethrough removed | No affirmation shown |
| Click Delete (×) | Task removed | Task list updates |
| Click Clear All | All tasks removed | Tasks list clears |

## Troubleshooting

### If you see RED errors in console:
1. Note the error message
2. Reload the extension: Go to `chrome://extensions`, find extension, click **⟲ Refresh**
3. Open popup again
4. Check console for new errors

### If task doesn't appear after adding:
1. Check console for errors (look for red text)
2. Verify you see `[Storage.addTask] Saved successfully`
3. If not saving: Check permissions
   - Go to `chrome://extensions`
   - Find extension → Details
   - Check for permission warnings

### If affirmation doesn't appear:
1. Make sure task is checked (shows strikethrough)
2. Wait 3-5 seconds
3. Check console for affirmation logs
4. For now, it will use fallback if Gemini API not available

## Quick Reload Workflow
After making any code changes:
1. Go to `chrome://extensions`
2. Find "Daily Affirmation Checklist"
3. Click **⟲ Refresh**
4. Click extension icon to test again
5. Open DevTools to see console

---

## Storage Inspector (Advanced)

In the Console tab, type:
```javascript
// See everything
chrome.storage.local.get(null, r => console.log('Storage:', r))

// Just see today's tasks
chrome.storage.local.get('dailyTasks', r => console.log('Tasks:', r.dailyTasks))
```

You should see something like:
```javascript
{
  "dailyTasks": {
    "items": [
      { "id": "...", "text": "Test Task", "completed": false, "completedAt": null }
    ]
  },
  "lastActiveDate": "2026-02-14"
}
```
