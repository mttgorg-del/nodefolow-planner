const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskPriority = document.getElementById('taskPriority');
const taskCategory = document.getElementById('taskCategory');
const taskDueDate = document.getElementById('taskDueDate');
const taskReminderDate = document.getElementById('taskReminderDate');
const taskReminderTime = document.getElementById('taskReminderTime');
const taskRepeat = document.getElementById('taskRepeat');
const taskNotes = document.getElementById('taskNotes');
const taskList = document.getElementById('taskList');
const focusList = document.getElementById('focusList');
const calendarGrid = document.getElementById('calendarGrid');
const totalCount = document.getElementById('totalCount');
const doneCount = document.getElementById('doneCount');
const pendingCount = document.getElementById('pendingCount');
const ringValue = document.getElementById('ringValue');
const todayDate = document.getElementById('todayDate');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');
const backgroundUpload = document.getElementById('backgroundUpload');
const glassModeToggle = document.getElementById('glassModeToggle');
const blurBackgroundToggle = document.getElementById('blurBackgroundToggle');
const accentColorPicker = document.getElementById('accentColorPicker');
const notificationToggle = document.getElementById('notificationToggle');
const reminderWindowSelect = document.getElementById('reminderWindowSelect');
const quickAddToggle = document.getElementById('quickAddToggle');
const clearBackgroundBtn = document.getElementById('clearBackgroundBtn');
const quickAddWidget = document.getElementById('quickAddWidget');
const quickAddForm = document.getElementById('quickAddForm');
const quickAddInput = document.getElementById('quickAddInput');
const filterButtons = [...document.querySelectorAll('.filter')];
const navButtons = [...document.querySelectorAll('.nav-item')];

let state = {
  tasks: [],
  activeFilter: 'all',
  activeView: 'overview',
  search: '',
  darkMode: localStorage.getItem('node-planner-theme') === 'dark',
  glassMode: localStorage.getItem('node-planner-glass') === 'true',
  blurBackground: localStorage.getItem('node-planner-blur') === 'true',
  accentColor: localStorage.getItem('node-planner-accent') || '#7c3aed',
  notificationEnabled: localStorage.getItem('node-planner-notifications') === 'true',
  reminderWindowMinutes: Number(localStorage.getItem('node-planner-reminder-window') || 15),
  quickAddEnabled: localStorage.getItem('node-planner-quick-add') === 'true',
};

function formatDate(dateString) {
  if (!dateString) return 'No due date';
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function hasMatch(task, query) {
  if (!query) return true;
  const value = `${task.title} ${task.notes || ''} ${task.category || ''}`.toLowerCase();
  return value.includes(query.toLowerCase());
}

function getVisibleTasks() {
  const query = state.search.trim();
  return state.tasks.filter((task) => {
    const matchesSearch = hasMatch(task, query);
    const matchesFilter = state.activeFilter === 'all'
      ? true
      : state.activeFilter === 'todo'
        ? !task.completed
        : task.completed;
    return matchesSearch && matchesFilter;
  });
}

function getTasksForView() {
  const visible = getVisibleTasks();
  if (state.activeView === 'today') {
    const today = new Date().toISOString().slice(0, 10);
    return visible.filter((task) => task.dueDate === today || (!task.dueDate && !task.completed));
  }
  if (state.activeView === 'focus') {
    return [...visible].filter((task) => task.priority === 'high' || task.completed === false).sort((a, b) => {
      const rank = { high: 3, medium: 2, low: 1 };
      return (rank[b.priority] || 0) - (rank[a.priority] || 0);
    });
  }
  return visible;
}

function applyTheme() {
  document.body.classList.toggle('dark-mode', state.darkMode);
  themeToggle.textContent = state.darkMode ? 'Light mode' : 'Dark mode';
  localStorage.setItem('node-planner-theme', state.darkMode ? 'dark' : 'light');
}

function applyAccentColor() {
  const accent = state.accentColor || '#7c3aed';
  document.documentElement.style.setProperty('--primary', accent);
  document.documentElement.style.setProperty('--primary-strong', accent);
  accentColorPicker.value = accent;
  localStorage.setItem('node-planner-accent', accent);
}

function applyBackgroundImage() {
  const savedBackground = localStorage.getItem('node-planner-background');
  if (!savedBackground) {
    document.body.style.backgroundImage = '';
    return;
  }

  document.body.style.backgroundImage = `url("${savedBackground}")`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundAttachment = 'fixed';
}

function applySettings() {
  document.body.classList.toggle('glass-mode', state.glassMode);
  document.body.classList.toggle('blurred-bg', state.blurBackground);
  quickAddWidget.classList.toggle('hidden', !state.quickAddEnabled);

  glassModeToggle.checked = state.glassMode;
  blurBackgroundToggle.checked = state.blurBackground;
  notificationToggle.checked = state.notificationEnabled;
  reminderWindowSelect.value = String(state.reminderWindowMinutes);
  quickAddToggle.checked = state.quickAddEnabled;

  localStorage.setItem('node-planner-glass', String(state.glassMode));
  localStorage.setItem('node-planner-blur', String(state.blurBackground));
  localStorage.setItem('node-planner-notifications', String(state.notificationEnabled));
  localStorage.setItem('node-planner-reminder-window', String(state.reminderWindowMinutes));
  localStorage.setItem('node-planner-quick-add', String(state.quickAddEnabled));
}

function getReminderStamp(task) {
  if (!task.reminderDate || !task.reminderTime) return null;
  return `${task.id}:${task.reminderDate}T${task.reminderTime}`;
}

function getReminderLog() {
  try {
    return JSON.parse(localStorage.getItem('node-planner-reminder-log') || '[]');
  } catch {
    return [];
  }
}

function saveReminderLog(entries) {
  localStorage.setItem('node-planner-reminder-log', JSON.stringify(entries));
}

async function ensureNotificationPermission() {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const result = await Notification.requestPermission();
  return result === 'granted';
}

function checkReminderNotifications() {
  if (!state.notificationEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const log = getReminderLog();
  const nextLog = [...log];

  for (const task of state.tasks) {
    const stamp = getReminderStamp(task);
    if (!stamp || task.completed) continue;

    const reminderTime = new Date(`${task.reminderDate}T${task.reminderTime}`);
    if (Number.isNaN(reminderTime.getTime())) continue;

    const reminderWindowMs = state.reminderWindowMinutes * 60 * 1000;
    const startWindow = new Date(reminderTime.getTime() - reminderWindowMs);
    const now = new Date();

    if (now >= reminderTime && !nextLog.includes(stamp) && now >= startWindow) {
      new Notification('Task reminder', {
        body: `${task.title} is due now.`,
      });
      nextLog.push(stamp);
    }
  }

  saveReminderLog(nextLog);
}

async function fetchTasks() {
  const response = await fetch(`/api/tasks?filter=${encodeURIComponent(state.activeFilter)}`);
  if (!response.ok) {
    throw new Error('Unable to load tasks.');
  }

  const tasks = await response.json();
  state.tasks = tasks;
  localStorage.setItem('node-planner-tasks', JSON.stringify(tasks));
  return tasks;
}

async function fetchStats() {
  const response = await fetch('/api/stats');
  if (!response.ok) {
    throw new Error('Unable to load stats.');
  }

  return response.json();
}

function renderTaskList(targetList, tasks) {
  if (!tasks.length) {
    targetList.innerHTML = '<li class="empty-state">No tasks in this view.</li>';
    return;
  }

  targetList.innerHTML = tasks.map((task) => {
    const priorityClass = `priority-${task.priority || 'medium'}`;
    const categoryClass = `category-${task.category || 'general'}`;
    const reminderText = task.reminderDate && task.reminderTime ? `Reminder ${task.reminderDate} ${task.reminderTime}` : '';
  const tags = [
      `<span class="task-badge ${priorityClass}">${(task.priority || 'medium').toUpperCase()}</span>`,
      `<span class="task-badge ${categoryClass}">${(task.category || 'general').toUpperCase()}</span>`,
      task.dueDate ? `<span class="task-badge category-general">Due ${formatDate(task.dueDate)}</span>` : '',
      reminderText ? `<span class="task-badge category-general">${reminderText}</span>` : '',
      task.recurring ? '<span class="task-badge category-general">Recurring</span>' : '',
    ].join('');

    return `
      <li class="task-item ${task.completed ? 'done' : ''}" draggable="true" data-id="${task.id}">
        <div class="task-main">
          <input class="task-checkbox" type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" />
          <div class="task-meta">
            <span class="task-text">${task.title}</span>
            <div class="task-details">
              ${tags}
              ${task.notes ? `<span>${task.notes}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="task-edit" type="button" data-edit-id="${task.id}">Edit</button>
          <button class="task-delete" type="button" data-delete-id="${task.id}">Delete</button>
        </div>
      </li>
    `;
  }).join('');
}

function renderCalendar() {
  const start = new Date();
  const dayOfWeek = start.getDay();
  const mondayOffset = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() + mondayOffset);

  const cells = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const isoDate = date.toISOString().slice(0, 10);
    const matchingTasks = state.tasks.filter((task) => task.dueDate === isoDate && !task.completed);

    cells.push(`
      <div class="day-card ${isoDate === new Date().toISOString().slice(0, 10) ? 'is-today' : ''}">
        <h4>${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
        <ul>
          ${matchingTasks.length ? matchingTasks.map((task) => `<li>${task.title}</li>`).join('') : '<li>No tasks</li>'}
        </ul>
      </div>
    `);
  }

  calendarGrid.innerHTML = cells.join('');
}

function renderFocusPanel() {
  const focusTasks = getTasksForView().filter((task) => task.priority === 'high' || task.priority === 'medium');
  renderTaskList(focusList, focusTasks);
}

function renderViews() {
  const views = document.querySelectorAll('.view');
  views.forEach((view) => {
    view.classList.toggle('active', view.id === `${state.activeView}View`);
  });

  const visibleTasks = getTasksForView();
  renderTaskList(taskList, visibleTasks);
  renderFocusPanel();
  renderCalendar();
}

async function quickAddTask(title) {
  const trimmed = String(title || '').trim();
  if (!trimmed) return;

  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: trimmed,
      priority: 'medium',
      category: 'general',
      dueDate: '',
      notes: '',
    }),
  });

  if (response.ok) {
    quickAddInput.value = '';
    await refresh();
  }
}

async function refresh() {
  try {
    const tasks = await fetchTasks();
    state.tasks = tasks;
    const stats = await fetchStats();
    renderViews();

    totalCount.textContent = String(stats.total);
    doneCount.textContent = String(stats.completed);
    pendingCount.textContent = String(stats.pending);
    ringValue.textContent = `${stats.percentage}%`;

    const ring = document.querySelector('.ring');
    if (ring) {
      const degrees = (stats.percentage / 100) * 360;
      ring.style.background = `conic-gradient(#8b5cf6 0deg, #8b5cf6 ${degrees}deg, rgba(255,255,255,0.15) ${degrees}deg 360deg)`;
    }
  } catch (error) {
    taskList.innerHTML = `<li class="empty-state">${error.message}</li>`;
    focusList.innerHTML = '<li class="empty-state">Unable to load focus tasks.</li>';
  }
}

function addDays(dateString, days) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function applyRecurring(task) {
  if (!task.recurring || !task.repeatInterval || Number(task.repeatInterval) <= 0) return task;
  const nextDate = addDays(task.dueDate || new Date().toISOString().slice(0, 10), Number(task.repeatInterval));
  return { ...task, completed: false, dueDate: nextDate };
}

async function saveTaskUpdate(id, payload) {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Could not update task.');
  }

  return response.json();
}

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();

  if (!title) {
    taskInput.focus();
    return;
  }

  const repeat = taskRepeat.value;
  const payload = {
    title,
    priority: taskPriority.value,
    category: taskCategory.value,
    dueDate: taskDueDate.value,
    reminderDate: taskReminderDate.value,
    reminderTime: taskReminderTime.value,
    notes: taskNotes.value.trim(),
    recurring: repeat !== 'none',
    repeatInterval: repeat === 'none' ? 0 : repeat === 'daily' ? 1 : repeat === 'weekly' ? 7 : 30,
  };

  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Unable to add task.');
  }

  taskInput.value = '';
  taskPriority.value = 'medium';
  taskCategory.value = 'general';
  taskDueDate.value = '';
  taskReminderDate.value = '';
  taskReminderTime.value = '';
  taskRepeat.value = 'none';
  taskNotes.value = '';
  await refresh();
});

taskList.addEventListener('change', async (event) => {
  const checkbox = event.target.closest('.task-checkbox');
  if (!checkbox) return;

  const id = Number(checkbox.dataset.id);
  const task = state.tasks.find((entry) => Number(entry.id) === id);

  if (!task) return;

  const nextCompleted = checkbox.checked;
  const nextTask = nextCompleted && task.recurring ? applyRecurring({ ...task, completed: true }) : { ...task, completed: nextCompleted };

  await saveTaskUpdate(id, {
    completed: nextCompleted,
    dueDate: nextTask.dueDate || task.dueDate,
    recurring: Boolean(task.recurring),
    repeatInterval: Number(task.repeatInterval) || 0,
  });

  if (nextCompleted && task.recurring) {
    await saveTaskUpdate(id, {
      completed: false,
      dueDate: nextTask.dueDate,
    });
  }

  await refresh();
});

taskList.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit-id]');
  if (editButton) {
    const id = Number(editButton.dataset.editId);
    const task = state.tasks.find((entry) => Number(entry.id) === id);
    if (!task) return;

    const row = editButton.closest('.task-item');
    const template = document.getElementById('taskEditorTemplate');
    const clone = template.content.cloneNode(true);

    clone.querySelector('.editor-title').value = task.title;
    clone.querySelector('.editor-priority').value = task.priority || 'medium';
    clone.querySelector('.editor-category').value = task.category || 'general';
    clone.querySelector('.editor-date').value = task.dueDate || '';
    clone.querySelector('.editor-reminder-date').value = task.reminderDate || task.dueDate || '';
    clone.querySelector('.editor-reminder-time').value = task.reminderTime || '';
    clone.querySelector('.editor-repeat').value = task.recurring ? (task.repeatInterval === 1 ? 'daily' : task.repeatInterval === 7 ? 'weekly' : 'monthly') : 'none';
    clone.querySelector('.editor-notes').value = task.notes || '';

    clone.querySelector('.save-edit').addEventListener('click', async () => {
      const repeatValue = clone.querySelector('.editor-repeat').value;
      await saveTaskUpdate(id, {
        title: clone.querySelector('.editor-title').value,
        priority: clone.querySelector('.editor-priority').value,
        category: clone.querySelector('.editor-category').value,
        dueDate: clone.querySelector('.editor-date').value,
        reminderDate: clone.querySelector('.editor-reminder-date').value,
        reminderTime: clone.querySelector('.editor-reminder-time').value,
        notes: clone.querySelector('.editor-notes').value,
        recurring: repeatValue !== 'none',
        repeatInterval: repeatValue === 'none' ? 0 : repeatValue === 'daily' ? 1 : repeatValue === 'weekly' ? 7 : 30,
      });
      await refresh();
    });

    clone.querySelector('.cancel-edit').addEventListener('click', () => refresh());
    row.innerHTML = '';
    row.appendChild(clone);
    return;
  }

  const deleteButton = event.target.closest('[data-delete-id]');
  if (!deleteButton) return;

  const id = Number(deleteButton.dataset.deleteId);
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  await refresh();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.activeFilter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    refresh();
  });
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.activeView = button.dataset.view;
    navButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderViews();
  });
});

themeToggle.addEventListener('click', () => {
  state.darkMode = !state.darkMode;
  applyTheme();
});

notificationToggle.addEventListener('change', async () => {
  state.notificationEnabled = notificationToggle.checked;
  applySettings();

  if (state.notificationEnabled) {
    await ensureNotificationPermission();
    checkReminderNotifications();
  }
});

reminderWindowSelect.addEventListener('change', () => {
  state.reminderWindowMinutes = Number(reminderWindowSelect.value || 15);
  applySettings();
  checkReminderNotifications();
});

glassModeToggle.addEventListener('change', () => {
  state.glassMode = glassModeToggle.checked;
  applySettings();
});

blurBackgroundToggle.addEventListener('change', () => {
  state.blurBackground = blurBackgroundToggle.checked;
  applySettings();
});

accentColorPicker.addEventListener('input', (event) => {
  state.accentColor = event.target.value;
  applyAccentColor();
});

quickAddToggle.addEventListener('change', () => {
  state.quickAddEnabled = quickAddToggle.checked;
  applySettings();
});

backgroundUpload.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || '');
    localStorage.setItem('node-planner-background', dataUrl);
    applyBackgroundImage();
  };
  reader.readAsDataURL(file);
});

clearBackgroundBtn.addEventListener('click', () => {
  localStorage.removeItem('node-planner-background');
  applyBackgroundImage();
});

quickAddForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await quickAddTask(quickAddInput.value);
});

searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderViews();
});

taskList.addEventListener('dragstart', (event) => {
  const item = event.target.closest('.task-item');
  if (!item) return;
  item.classList.add('dragging');
  event.dataTransfer.setData('text/plain', item.dataset.id);
});

taskList.addEventListener('dragend', (event) => {
  const item = event.target.closest('.task-item');
  if (item) item.classList.remove('dragging');
});

taskList.addEventListener('dragover', (event) => {
  event.preventDefault();
});

taskList.addEventListener('drop', async (event) => {
  event.preventDefault();
  const sourceId = Number(event.dataTransfer.getData('text/plain'));
  const target = event.target.closest('.task-item');
  if (!target || !sourceId) return;

  const targetId = Number(target.dataset.id);
  const order = state.tasks.map((task) => Number(task.id));
  const sourceIndex = order.indexOf(sourceId);
  const targetIndex = order.indexOf(targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

  const [moved] = order.splice(sourceIndex, 1);
  order.splice(targetIndex, 0, moved);

  const payload = { orderedIds: order };
  await fetch('/api/tasks/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  await refresh();
});

todayDate.textContent = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}).format(new Date());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

applyTheme();
applyAccentColor();
applyBackgroundImage();
applySettings();
setInterval(checkReminderNotifications, 30000);
refresh();
