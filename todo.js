const tasksKey = 'tasks'
const titleKey = 'listTitle'

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('add-form')
  const input = document.getElementById('new-task')
  const titleEl = document.getElementById('list-title')
  const tasksEl = document.getElementById('tasks')
  const clearBtn = document.getElementById('clear-completed')

  // Title load/save
  function loadTitle() {
    return new Promise(resolve => {
      chrome.storage.local.get([titleKey], (res) => {
        resolve(res[titleKey] || 'To-do List')
      })
    })
  }

  function saveTitle(title) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [titleKey]: title }, () => resolve())
    })
  }

  // Update title UI and persist on blur or Enter
  titleEl.addEventListener('blur', () => {
    const v = titleEl.value.trim() || 'To-do List'
    titleEl.value = v
    saveTitle(v)
  })
  titleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      titleEl.blur()
    }
  })

  form.addEventListener('submit', e => {
    e.preventDefault()
    const text = input.value.trim()
    if (!text) return
    addTask({ text, completed: false })
    input.value = ''
  })

  clearBtn.addEventListener('click', () => {
    loadTasks().then(tasks => {
      const remaining = tasks.filter(t => !t.completed)
      saveTasks(remaining).then(renderTasks)
    })
  })

  function renderTasks(tasks) {
    tasksEl.innerHTML = ''
    if (!tasks || tasks.length === 0) {
      return
    }
    tasks.forEach((task, index) => {
      const li = document.createElement('li')
      li.className = 'task' + (task.completed ? ' completed' : '')

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = !!task.completed
      checkbox.addEventListener('change', () => toggleTask(index))

      const span = document.createElement('span')
      span.className = 'text'
      span.textContent = task.text

      const del = document.createElement('button')
      del.className = 'delete-btn'
      del.textContent = '✕'
      del.addEventListener('click', () => deleteTask(index))

      li.appendChild(checkbox)
      li.appendChild(span)
      li.appendChild(del)
      tasksEl.appendChild(li)
    })
  }

  function loadTasks() {
    return new Promise(resolve => {
      chrome.storage.local.get([tasksKey], (res) => {
        resolve(res[tasksKey] || [])
      })
    })
  }

  function saveTasks(tasks) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [tasksKey]: tasks }, () => resolve())
    })
  }

  function addTask(task) {
    loadTasks().then(tasks => {
      tasks.unshift(task)
      saveTasks(tasks).then(() => renderTasks(tasks))
    })
  }

  function toggleTask(index) {
    loadTasks().then(tasks => {
      if (!tasks[index]) return
      tasks[index].completed = !tasks[index].completed
      saveTasks(tasks).then(() => renderTasks(tasks))
    })
  }

  function deleteTask(index) {
    loadTasks().then(tasks => {
      tasks.splice(index, 1)
      saveTasks(tasks).then(() => renderTasks(tasks))
    })
  }

  // initial render: load title then tasks
  loadTitle().then(title => {
    titleEl.value = title
    document.title = title
    loadTasks().then(renderTasks)
  })
})
