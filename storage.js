// Storage persistence layer for daily tasks
const StorageManager = {
  STORAGE_KEY: "dailyTasks",
  DATE_KEY: "lastActiveDate",

  getTodayString() {
    return new Date().toISOString().split("T")[0];
  },

  async _checkStorageAPI() {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      throw new Error(
        "Chrome Storage API not available. " +
          "Check: 1) Extension loaded? 2) Permissions in manifest? 3) Reload at chrome://extensions",
      );
    }
  },

  async isNewDay() {
    try {
      await this._checkStorageAPI();
      const data = await chrome.storage.local.get(this.DATE_KEY);
      const lastDate = data[this.DATE_KEY];
      console.log(
        "[Storage.isNewDay] Last stored date:",
        lastDate,
        "Today:",
        this.getTodayString(),
      );
      return lastDate !== this.getTodayString();
    } catch (error) {
      console.error("[Storage.isNewDay] Error checking if new day:", error);
      throw error;
    }
  },

  async resetForNewDay() {
    try {
      await this._checkStorageAPI();
      console.log("[Storage.resetForNewDay] Resetting tasks for new day");
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: { items: [] },
        [this.DATE_KEY]: this.getTodayString(),
      });
      console.log("[Storage.resetForNewDay] Reset complete");
    } catch (error) {
      console.error("[Storage.resetForNewDay] Error:", error);
      throw error;
    }
  },

  async getTodaysTasks() {
    try {
      await this._checkStorageAPI();
      console.log("[Storage.getTodaysTasks] Loading tasks...");

      // Check if it's a new day and reset if needed
      if (await this.isNewDay()) {
        console.log("[Storage.getTodaysTasks] New day detected, resetting");
        await this.resetForNewDay();
      }

      const data = await chrome.storage.local.get(this.STORAGE_KEY);
      console.log("[Storage.getTodaysTasks] Retrieved data:", data);

      if (!data[this.STORAGE_KEY]) {
        // Initialize if doesn't exist
        console.log("[Storage.getTodaysTasks] No tasks found, initializing");
        await chrome.storage.local.set({
          [this.STORAGE_KEY]: { items: [] },
          [this.DATE_KEY]: this.getTodayString(),
          // initialize streak info
          streakInfo: { count: 0, lastDate: null },
        });
        return { items: [] };
      }
      console.log(
        "[Storage.getTodaysTasks] Found",
        data[this.STORAGE_KEY].items.length,
        "tasks",
      );
      return data[this.STORAGE_KEY];
    } catch (error) {
      console.error("[Storage.getTodaysTasks] Error:", error);
      throw error;
    }
  },

  async addTask(text) {
    console.log("[Storage.addTask] Getting tasks...");
    const tasks = await this.getTodaysTasks();
    console.log("[Storage.addTask] Current tasks count:", tasks.items.length);

    const newTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text,
      completed: false,
      completedAt: null,
    };
    console.log("[Storage.addTask] New task created:", newTask);

    tasks.items.push(newTask);
    console.log(
      "[Storage.addTask] Saving to storage... Tasks count now:",
      tasks.items.length,
    );

    await chrome.storage.local.set({ [this.STORAGE_KEY]: tasks });
    console.log("[Storage.addTask] Saved successfully");

    return newTask;
  },

  async toggleTask(taskId) {
    try {
      await this._checkStorageAPI();
      const tasks = await this.getTodaysTasks();
      const task = tasks.items.find((t) => t.id === taskId);

      if (!task) {
        throw new Error(`Task with id ${taskId} not found`);
      }

      const wasCompleted = task.completed;
      task.completed = !task.completed;

      // Track first completion
      if (task.completed && !wasCompleted) {
        task.completedAt = Date.now();
        console.log("[Storage.toggleTask] First completion detected");
      } else if (!task.completed) {
        task.completedAt = null;
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: tasks });
      console.log(
        "[Storage.toggleTask] Task toggled:",
        taskId,
        "completed:",
        task.completed,
      );

      // If this is the first completion for today, update streak info
      if (task.completed && !wasCompleted) {
        try {
          await this._updateStreakOnCompletion();
        } catch (err) {
          console.warn("[Storage.toggleTask] Failed to update streak:", err);
        }
      }
      return {
        task,
        isFirstCompletion: task.completed && !wasCompleted,
      };
    } catch (error) {
      console.error("[Storage.toggleTask] Error:", error);
      throw error;
    }
  },

  async deleteTask(taskId) {
    try {
      await this._checkStorageAPI();
      const tasks = await this.getTodaysTasks();
      tasks.items = tasks.items.filter((t) => t.id !== taskId);
      await chrome.storage.local.set({ [this.STORAGE_KEY]: tasks });
      console.log("[Storage.deleteTask] Task deleted:", taskId);
    } catch (error) {
      console.error("[Storage.deleteTask] Error:", error);
      throw error;
    }
  },

  async getCompletedTasks() {
    try {
      const tasks = await this.getTodaysTasks();
      const completed = tasks.items.filter((t) => t.completed);
      console.log(
        "[Storage.getCompletedTasks] Found",
        completed.length,
        "completed tasks",
      );
      return completed;
    } catch (error) {
      console.error("[Storage.getCompletedTasks] Error:", error);
      throw error;
    }
  },

  // Returns progress summary: { total, completed }
  async getProgress() {
    const tasks = await this.getTodaysTasks();
    const total = tasks.items.length;
    const completed = tasks.items.filter((t) => t.completed).length;
    return { total, completed };
  },

  // Streak helpers
  async _getStreakInfo() {
    await this._checkStorageAPI();
    const data = await chrome.storage.local.get("streakInfo");
    return data.streakInfo || { count: 0, lastDate: null };
  },

  async getStreak() {
    const info = await this._getStreakInfo();
    return info.count || 0;
  },

  // Called when user completes a task for the first time today
  async _updateStreakOnCompletion() {
    await this._checkStorageAPI();
    const today = this.getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];

    const info = await this._getStreakInfo();
    let count = info.count || 0;
    const last = info.lastDate;

    if (last === today) {
      // already counted today
      return;
    }

    if (last === yStr) {
      count = (count || 0) + 1;
    } else {
      count = 1;
    }

    const newInfo = { count, lastDate: today };
    await chrome.storage.local.set({ streakInfo: newInfo });
    console.log("[Storage._updateStreakOnCompletion] Streak updated:", newInfo);
  },

  async clearAllTasks() {
    try {
      await this._checkStorageAPI();
      await chrome.storage.local.set({ [this.STORAGE_KEY]: { items: [] } });
      console.log("[Storage.clearAllTasks] All tasks cleared");
    } catch (error) {
      console.error("[Storage.clearAllTasks] Error:", error);
      throw error;
    }
  },
};
