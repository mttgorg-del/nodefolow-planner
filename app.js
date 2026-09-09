const http = require('http');
const fs = require('fs');
const path = require('path');
const { createPlanner } = require('./src/planner');

const planner = createPlanner(path.join(__dirname, 'data', 'tasks.json'), [
  { id: 1, title: 'Finish photography project', completed: false, priority: 'high', category: 'work', dueDate: '2026-09-10', notes: 'Polish final edits and export the final set.', recurring: false, repeatInterval: 0, createdAt: '2026-09-08T09:00:00.000Z' },
  { id: 2, title: 'Review driving test questions', completed: false, priority: 'medium', category: 'personal', dueDate: '2026-09-11', notes: 'Focus on road signs and right-of-way rules.', recurring: false, repeatInterval: 0, createdAt: '2026-09-08T10:00:00.000Z' },
  { id: 3, title: 'Draft story outline', completed: true, priority: 'low', category: 'creative', dueDate: '2026-09-09', notes: 'Build the opening scene and plot arc.', recurring: false, repeatInterval: 0, createdAt: '2026-09-08T11:00:00.000Z' },
  { id: 4, title: 'Plan weekend trip', completed: false, priority: 'medium', category: 'personal', dueDate: '2026-09-14', notes: 'Check destinations and travel budget.', recurring: false, repeatInterval: 0, createdAt: '2026-09-09T03:02:16.056Z' },
  { id: 5, title: 'Organize weekly review', completed: false, priority: 'medium', category: 'general', dueDate: '2026-09-12', notes: 'Review wins, blockers, and next steps.', recurring: false, repeatInterval: 0, createdAt: '2026-09-09T03:02:20.688Z' },
]);

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const publicDir = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', reject);
  });
}

function serveStaticFile(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(requestPath).replace(/^\/+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    try {
      if (url.pathname === '/api/tasks' && req.method === 'GET') {
        const filter = url.searchParams.get('filter') || 'all';
        const tasks = planner.listTasks(filter);
        sendJson(res, 200, tasks);
        return;
      }

      if (url.pathname === '/api/tasks' && req.method === 'POST') {
        const body = await readBody(req);
        const task = planner.addTask(body.title, {
          priority: body.priority,
          category: body.category,
          dueDate: body.dueDate,
          reminderDate: body.reminderDate,
          reminderTime: body.reminderTime,
          notes: body.notes,
          recurring: body.recurring,
          repeatInterval: body.repeatInterval,
        });
        sendJson(res, 201, task);
        return;
      }

      if (url.pathname === '/api/tasks/reorder' && req.method === 'POST') {
        const body = await readBody(req);
        const ordered = planner.reorderTasks(body.orderedIds || []);
        sendJson(res, 200, ordered);
        return;
      }

      if (url.pathname.startsWith('/api/tasks/') && req.method === 'PATCH') {
        const match = url.pathname.match(/\/api\/tasks\/(\d+)$/);
        if (!match) {
          sendJson(res, 400, { error: 'Invalid task id.' });
          return;
        }

        const body = await readBody(req);
        const id = Number(match[1]);
        let task;

        if (body.title !== undefined || body.priority !== undefined || body.category !== undefined || body.dueDate !== undefined || body.reminderDate !== undefined || body.reminderTime !== undefined || body.notes !== undefined || body.recurring !== undefined || body.repeatInterval !== undefined) {
          task = planner.updateTask(id, body);
        } else {
          task = planner.toggleTask(id);
          if (body.completed !== undefined) {
            task.completed = Boolean(body.completed);
            planner.saveTasks(planner.loadTasks());
          }
        }

        sendJson(res, 200, task);
        return;
      }

      if (url.pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
        const match = url.pathname.match(/\/api\/tasks\/(\d+)$/);
        if (!match) {
          sendJson(res, 400, { error: 'Invalid task id.' });
          return;
        }

        const remaining = planner.deleteTask(Number(match[1]));
        sendJson(res, 200, { remaining });
        return;
      }

      if (url.pathname === '/api/stats' && req.method === 'GET') {
        sendJson(res, 200, planner.getStats());
        return;
      }

      sendJson(res, 404, { error: 'Route not found.' });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  serveStaticFile(req, res);
});

server.listen(port, host, () => {
  console.log(`Planner app running at http://${host}:${port}`);
});
