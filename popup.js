// Main application controller for the checklist
console.log('[Popup] Script loaded. Chrome API available:', !!window.chrome);
console.log('[Popup] Storage API available:', !!(window.chrome && window.chrome.storage));

class ChecklistApp {
  constructor() {
    this.affirmationInProgress = false;
    this.apiStatus = 'unknown'; // 'unknown', 'ready', 'downloading', 'unavailable'
    this.init();
  }

  async init() {
    console.log('[App.init] Initializing app...');
    this.setupEventListeners();
    console.log('[App.init] Event listeners setup');

    try {
      // Check if storage API is available
      if (!chrome || !chrome.storage || !chrome.storage.local) {
        throw new Error(
          'Chrome Storage API not available. ' +
          'Please: 1) Close this popup, 2) Go to chrome://extensions, 3) Find extension, 4) Click refresh icon'
        );
      }

      await this.checkAPIStatus();
      console.log('[App.init] API status checked');

      await this.loadAndRenderTasks();
      console.log('[App.init] Tasks loaded and rendered');

      this.setupDateDisplay();
      console.log('[App.init] App initialization complete');
    } catch (error) {
      console.error('[App.init] Critical error during initialization:', error);
      console.error('[App.init] Error stack:', error.stack);
      this.showStatusBanner('error', error.message, false);
    }
  }

  setupEventListeners() {
    document.getElementById('addBtn').addEventListener('click', () => this.handleAddTask());
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddTask();
    });
    document.getElementById('clearBtn').addEventListener('click', () => this.handleClearAll());
  }

  setupDateDisplay() {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    document.getElementById('dateDisplay').textContent = today;
  }

  async checkAPIStatus() {
    const availability = await GeminiAPI.checkAvailability();
    this.apiStatus = availability;

    if (availability === 'no') {
      this.showStatusBanner('warning', 'AI affirmations unavailable. Checklist still works!', false);
    } else if (availability === 'after-download') {
      this.showStatusBanner('info', 'Downloading AI model... This may take a while.', true);
    }
  }

  showStatusBanner(type, message, showSpinner = false) {
    const banner = document.getElementById('statusBanner');
    const msgEl = document.getElementById('statusMessage');
    const spinner = document.getElementById('statusSpinner');

    banner.className = `status-banner ${type}`;
    msgEl.textContent = message;

    if (showSpinner) {
      spinner.style.display = 'inline-block';
    } else {
      spinner.style.display = 'none';
    }

    if (type === 'none') {
      banner.classList.remove('show');
    } else {
      banner.classList.add('show');
    }
  }

  hideStatusBanner() {
    const banner = document.getElementById('statusBanner');
    banner.classList.remove('show');
  }

  async handleAddTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();

    console.log('[AddTask] Input text:', text);
    if (!text) {
      console.log('[AddTask] Empty input, returning');
      return;
    }

    const addBtn = document.getElementById('addBtn');
    addBtn.disabled = true;

    try {
      console.log('[AddTask] Adding task to storage...');
      const newTask = await StorageManager.addTask(text);
      console.log('[AddTask] Task added successfully:', newTask);

      input.value = '';
      console.log('[AddTask] Input cleared, reloading tasks...');

      await this.loadAndRenderTasks();
      console.log('[AddTask] Tasks reloaded and rendered');
    } catch (error) {
      console.error('[AddTask] Error adding task:', error);
      console.error('[AddTask] Error stack:', error.stack);
      this.showStatusBanner('error', 'Failed to add task: ' + error.message, false);
    } finally {
      addBtn.disabled = false;
      input.focus();
    }
  }

  async handleToggleTask(taskId) {
    console.log('[HandleToggleTask] ENTRY: taskId=', taskId);

    try {
      console.log('[HandleToggleTask] STEP 1: Calling StorageManager.toggleTask()...');
      const { task, isFirstCompletion } = await StorageManager.toggleTask(taskId);
      console.log('[HandleToggleTask] STEP 2: Got response, isFirstCompletion=', isFirstCompletion, 'completed=', task.completed);

      // Update UI checkbox state
      console.log('[HandleToggleTask] STEP 3: Updating UI...');
      this.updateCheckboxUI(taskId, task.completed);

      // Only generate affirmation on FIRST completion
      if (task.completed && isFirstCompletion) {
        console.log('[HandleToggleTask] STEP 4A: First completion detected, calling generateAndDisplayAffirmation()...');
        await this.generateAndDisplayAffirmation();
      } else if (!task.completed) {
        console.log('[HandleToggleTask] STEP 4B: Task unchecked, hiding affirmation');
        // Task unchecked - hide affirmation
        document.getElementById('affirmationSection').classList.remove('show');
      } else {
        console.log('[HandleToggleTask] STEP 4C: Not first completion or not completed');
      }
      console.log('[HandleToggleTask] STEP 5: All done');
    } catch (error) {
      console.error('[HandleToggleTask] ERROR:', error);
      console.error('[HandleToggleTask] Error stack:', error.stack);
      this.showStatusBanner('error', 'Failed to update task', false);
    }
  }

  async handleDeleteTask(taskId) {
    try {
      await StorageManager.deleteTask(taskId);
      await this.loadAndRenderTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      this.showStatusBanner('error', 'Failed to delete task', false);
    }
  }

  async handleClearAll() {
    if (confirm('Are you sure you want to clear all tasks?')) {
      try {
        await StorageManager.clearAllTasks();
        await this.loadAndRenderTasks();
        document.getElementById('affirmationSection').classList.remove('show');
      } catch (error) {
        console.error('Error clearing tasks:', error);
        this.showStatusBanner('error', 'Failed to clear tasks', false);
      }
    }
  }

  async generateAndDisplayAffirmation() {
    //if (this.affirmationInProgress) return;

    this.affirmationInProgress = true;
    console.log('[GenerateAffirmation] STEP 1: Showing status banner');
    this.showStatusBanner('info', 'Generating affirmation...', true);

    try {
      console.log('[GenerateAffirmation] STEP 2: Getting completed tasks...');
      const completedTasks = await StorageManager.getCompletedTasks();
      console.log('[GenerateAffirmation] STEP 3: Got completed tasks:', completedTasks.length);

      console.log('[GenerateAffirmation] STEP 4: Calling GeminiAPI.generateAffirmation()...');
      const result = await GeminiAPI.generateAffirmation(completedTasks);
      console.log('[GenerateAffirmation] STEP 5: Got result from API:', result);

      this.hideStatusBanner();
      this.renderAffirmation(result.text);
      console.log('[GenerateAffirmation] STEP 6: Affirmation rendered');
    } catch (error) {
      console.error('[GenerateAffirmation] *** ERROR CAUGHT ***', error);
      console.error('[GenerateAffirmation] Error name:', error.name);
      console.error('[GenerateAffirmation] Error message:', error.message);
      console.error('[GenerateAffirmation] Error code:', error.code);
      console.error('[GenerateAffirmation] Full error:', error);
      console.error('[GenerateAffirmation] Stack:', error.stack);

      // Show error in popup
      this.hideStatusBanner();
      this.showStatusBanner('error', 'Error: ' + error.message, false);

      // Still show fallback affirmation so user gets something
      this.renderAffirmation(GeminiAPI.getRandomFallback());
      console.log('[GenerateAffirmation] Showing fallback affirmation due to error');
    } finally {
      console.log('[GenerateAffirmation] STEP 7: Finally block, setting affirmationInProgress = false');
      this.affirmationInProgress = false;
    }
  }

  renderAffirmation(text) {
    const section = document.getElementById('affirmationSection');
    const textEl = document.getElementById('affirmationText');
    textEl.textContent = text;
    section.classList.add('show');
  }

  updateCheckboxUI(taskId, isCompleted) {
    const checkbox = document.querySelector(`input[data-task-id="${taskId}"]`);
    const item = checkbox.closest('.task-item');

    checkbox.checked = isCompleted;
    if (isCompleted) {
      item.classList.add('completed');
    } else {
      item.classList.remove('completed');
    }
  }

  async loadAndRenderTasks() {
    const tasks = await StorageManager.getTodaysTasks();
    this.renderTasks(tasks.items);
  }

  renderTasks(tasks) {
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');

    taskList.innerHTML = '';

    if (tasks.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    tasks.forEach((task, index) => {
      const item = document.createElement('div');
      item.className = `task-item ${task.completed ? 'completed' : ''}`;
      item.innerHTML = `
        <input
          type="checkbox"
          class="task-checkbox"
          data-task-id="${task.id}"
          ${task.completed ? 'checked' : ''}
          aria-label="Toggle task: ${task.text}"
        >
        <span class="task-text">${this.escapeHtml(task.text)}</span>
        <button class="delete-btn" data-task-id="${task.id}" aria-label="Delete task">×</button>
      `;

      // Checkbox event listener - bind to THIS context
      const checkbox = item.querySelector('.task-checkbox');
      console.log('[RenderTasks] Task', index, ':', task.id, 'checkbox element:', checkbox);
      console.log('[RenderTasks] Checkbox is checked?', checkbox.checked);

      const changeHandler = () => {
        console.log('[Checkbox.change] *** EVENT FIRED FOR TASK:', task.id);
        this.handleToggleTask(task.id);
      };

      checkbox.addEventListener('change', changeHandler);
      console.log('[RenderTasks] ✓ Listener attached to checkbox:', task.id);

      // Delete button event listener
      const deleteBtn = item.querySelector('.delete-btn');
      console.log('[RenderTasks] Attaching click listener to delete button:', task.id);
      deleteBtn.addEventListener('click', () => this.handleDeleteTask(task.id));

      taskList.appendChild(item);
    });
    console.log('[RenderTasks] Finished rendering', tasks.length, 'tasks');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Popup] DOM Content Loaded event fired');
  try {
    const app = new ChecklistApp();
    console.log('[Popup] App instance created:', app);
  } catch (error) {
    console.error('[Popup] Failed to create app:', error);
    console.error('[Popup] Error stack:', error.stack);
  }
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('[Popup] Global error:', event.error);
  console.error('[Popup] Error message:', event.message);
  console.error('[Popup] Line:', event.lineno);
});
