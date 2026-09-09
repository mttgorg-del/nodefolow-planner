const fs = require('fs');
const path = require('path');

const defaultTasks = [
  { id: 1, title: 'Finish photography project', completed: false, priority: 'high', category: 'work', dueDate: '2026-09-10', notes: 'Polish final edits and export.', recurring: false, repeatInterval: 0, createdAt: '2026-09-08T09:00:00.000Z' },
  { id: 2, title: 'Review driving test questions', completed: false, priority: 'medium', category: 'personal', dueDate: '2026-09-11', notes: 'Focus on road signs and right-of-way rules.', recurring: false, repeatInterval: 0, createdAt: '2026-09-08T10:00:00.000Z' },
  { id: 3, title: 'Draft story outline', completed: true, priority: 'low', category: 'creative', dueDate: '2026-09-09', notes: 'Build the opening scene and plot arc.', recurring: false, repeatInterval: 0, createdAt: '2026-09-08T11:00:00.000Z' },
];

function normalizeTask(task = {}, fallbackId = 1) {
  return {
    id: Number(task.id ?? fallbackId),
    title: String(task.title ?? '').trim(),
    completed: Boolean(task.completed),
    priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
    category: String(task.category ?? 'general').trim() || 'general',
    dueDate: task.dueDate || '',
    reminderDate: task.reminderDate || '',
    reminderTime: task.reminderTime || '',
    notes: String(task.notes ?? '').trim(),
    recurring: Boolean(task.recurring),
    repeatInterval: Number(task.repeatInterval ?? 0) || 0,
    createdAt: task.createdAt || new Date().toISOString(),
  };
}

function createPlanner(dataFile = path.join(__dirname, '..', 'data', 'tasks.json'), seedTasks = []) {
  function ensureFile() {
    const dir = path.dirname(dataFile);
    fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, JSON.stringify(seedTasks.map((task) => normalizeTask(task)), null, 2), 'utf8');
    }
  }

  function loadTasks() {
    ensureFile();
    const raw = fs.readFileSync(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    const tasks = Array.isArray(parsed) ? parsed : seedTasks;
    return tasks.map((task, index) => normalizeTask(task, index + 1));
  }

  function saveTasks(tasks) {
    ensureFile();
    const normalized = tasks.map((task, index) => normalizeTask(task, index + 1));
    fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2), 'utf8');
    return normalized;
  }

  function addTask(title, extra = {}) {
    const trimmed = String(title || '').trim();
    if (!trimmed) {
      throw new Error('Task title cannot be empty.');
    }

    const tasks = loadTasks();
    const nextId = tasks.reduce((max, task) => Math.max(max, Number(task.id) || 0), 0) + 1;
    const task = normalizeTask({
      id: nextId,
      title: trimmed,
      completed: false,
      priority: extra.priority || 'medium',
      category: extra.category || 'general',
      dueDate: extra.dueDate || '',
      reminderDate: extra.reminderDate || '',
      reminderTime: extra.reminderTime || '',
      notes: extra.notes || '',
      recurring: Boolean(extra.recurring),
      repeatInterval: Number(extra.repeatInterval ?? 0) || 0,
      createdAt: new Date().toISOString(),
    }, nextId);

    const updated = [...tasks, task];
    saveTasks(updated);
    return task;
  }

  function updateTask(id, updates = {}) {
    const tasks = loadTasks();
    const numericId = Number(id);
    const index = tasks.findIndex((task) => Number(task.id) === numericId);

    if (index === -1) {
      throw new Error(`Task ${id} was not found.`);
    }

    const nextTask = normalizeTask({
      ...tasks[index],
      title: updates.title !== undefined ? String(updates.title).trim() : tasks[index].title,
      priority: updates.priority !== undefined ? updates.priority : tasks[index].priority,
      category: updates.category !== undefined ? updates.category : tasks[index].category,
      dueDate: updates.dueDate !== undefined ? updates.dueDate : tasks[index].dueDate,
      reminderDate: updates.reminderDate !== undefined ? updates.reminderDate : tasks[index].reminderDate,
      reminderTime: updates.reminderTime !== undefined ? updates.reminderTime : tasks[index].reminderTime,
      notes: updates.notes !== undefined ? String(updates.notes).trim() : tasks[index].notes,
      completed: updates.completed !== undefined ? Boolean(updates.completed) : tasks[index].completed,
      recurring: updates.recurring !== undefined ? Boolean(updates.recurring) : tasks[index].recurring,
      repeatInterval: updates.repeatInterval !== undefined ? Number(updates.repeatInterval) || 0 : tasks[index].repeatInterval,
    }, numericId);

    if (!nextTask.title) {
      throw new Error('Task title cannot be empty.');
    }

    tasks[index] = nextTask;
    saveTasks(tasks);
    return nextTask;
  }

  function toggleTask(id) {
    const tasks = loadTasks();
    const numericId = Number(id);
    const task = tasks.find((entry) => Number(entry.id) === numericId);

    if (!task) {
      throw new Error(`Task ${id} was not found.`);
    }

    task.completed = !task.completed;
    saveTasks(tasks);
    return task;
  }

  function deleteTask(id) {
    const tasks = loadTasks();
    const numericId = Number(id);
    const filtered = tasks.filter((task) => Number(task.id) !== numericId);

    if (filtered.length === tasks.length) {
      throw new Error(`Task ${id} was not found.`);
    }

    saveTasks(filtered);
    return filtered;
  }

  function reorderTasks(orderedIds) {
    const tasks = loadTasks();
    const map = new Map(tasks.map((task) => [Number(task.id), task]));
    const next = orderedIds.map((id) => map.get(Number(id))).filter(Boolean);

    if (next.length !== tasks.length) {
      throw new Error('Could not reorder tasks because some tasks were missing.');
    }

    saveTasks(next);
    return next;
  }

  function listTasks(filter = 'all') {
    const tasks = loadTasks();
    const normalized = String(filter || 'all').toLowerCase();

    if (normalized === 'done') return tasks.filter((task) => task.completed);
    if (normalized === 'todo') return tasks.filter((task) => !task.completed);
    return tasks;
  }

  function getStats() {
    const tasks = loadTasks();
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, pending, percentage };
  }

  return {
    loadTasks,
    saveTasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    reorderTasks,
    listTasks,
    getStats,
  };
}

module.exports = { createPlanner, defaultTasks };
