const { createPlanner } = require('./planner');

const planner = createPlanner();

function printHelp() {
  console.log(`
Planner CLI

Usage:
  node src/app.js list [all|todo|done]
  node src/app.js add "task title"
  node src/app.js done <task-id>
  node src/app.js delete <task-id>
  node src/app.js stats
  node src/app.js help
`);
}

function printTasks(tasks) {
  if (!tasks.length) {
    console.log('No tasks found.');
    return;
  }

  tasks.forEach((task) => {
    const marker = task.completed ? '[✓]' : '[ ]';
    console.log(`${marker} ${task.id}. ${task.title}`);
  });
}

function printStats() {
  const stats = planner.getStats();
  console.log(`Total: ${stats.total}`);
  console.log(`Completed: ${stats.completed}`);
  console.log(`Pending: ${stats.pending}`);
  console.log(`Progress: ${stats.percentage}%`);
}

function main() {
  const command = process.argv[2] || 'list';
  const argument = process.argv.slice(3).join(' ');

  try {
    switch (command) {
      case 'list': {
        const filter = argument || 'all';
        printTasks(planner.listTasks(filter));
        break;
      }
      case 'add': {
        const task = planner.addTask(argument);
        console.log(`Added task: ${task.title}`);
        break;
      }
      case 'done': {
        const task = planner.toggleTask(Number(argument));
        console.log(`${task.completed ? 'Completed' : 'Reopened'} task ${task.id}`);
        break;
      }
      case 'delete': {
        const tasks = planner.deleteTask(Number(argument));
        console.log(`Deleted task ${argument}. ${tasks.length} tasks remaining.`);
        break;
      }
      case 'stats': {
        printStats();
        break;
      }
      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        printHelp();
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
