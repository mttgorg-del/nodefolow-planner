const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPlanner } = require('../src/planner');

test('addTask creates a task with richer metadata', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planner-'));
  const dataFile = path.join(tempDir, 'tasks.json');
  const planner = createPlanner(dataFile);

  const task = planner.addTask('Write a blog post', {
    priority: 'high',
    category: 'creative',
    dueDate: '2026-09-12',
    reminderDate: '2026-09-11',
    reminderTime: '09:30',
    notes: 'Outline the key points before lunch.',
  });

  assert.equal(task.title, 'Write a blog post');
  assert.equal(task.priority, 'high');
  assert.equal(task.category, 'creative');
  assert.equal(task.reminderDate, '2026-09-11');
  assert.equal(task.reminderTime, '09:30');
  assert.equal(task.notes, 'Outline the key points before lunch.');
  assert.equal(planner.listTasks().length, 1);
});

test('toggleTask flips completed state', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planner-'));
  const dataFile = path.join(tempDir, 'tasks.json');
  const planner = createPlanner(dataFile);

  planner.addTask('Call a friend');
  const updated = planner.toggleTask(1);

  assert.equal(updated.completed, true);
  assert.equal(planner.listTasks('done').length, 1);
});

test('updateTask edits metadata without changing task count', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planner-'));
  const dataFile = path.join(tempDir, 'tasks.json');
  const planner = createPlanner(dataFile);

  planner.addTask('Plan the weekend', {
    priority: 'medium',
    category: 'personal',
    dueDate: '2026-09-12',
    notes: 'Pack snacks and check timings.',
  });

  const updated = planner.updateTask(1, {
    title: 'Plan the weekend trip',
    priority: 'high',
    notes: 'Book hotel and check flight times.',
  });

  assert.equal(updated.title, 'Plan the weekend trip');
  assert.equal(updated.priority, 'high');
  assert.equal(updated.notes, 'Book hotel and check flight times.');
  assert.equal(planner.listTasks().length, 1);
});

test('getStats reports totals and percent progress', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planner-'));
  const dataFile = path.join(tempDir, 'tasks.json');
  const planner = createPlanner(dataFile);

  planner.addTask('Task A');
  planner.addTask('Task B');
  planner.toggleTask(1);

  const stats = planner.getStats();

  assert.equal(stats.total, 2);
  assert.equal(stats.completed, 1);
  assert.equal(stats.pending, 1);
  assert.equal(stats.percentage, 50);
});
