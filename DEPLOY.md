# Publish NodeFlow

1. Create a new GitHub repository named `nodeflow-planner`.
2. Upload this project folder to that repository.
3. In Render, choose **New > Web Service** and connect the GitHub repository.
4. Render will read `render.yaml`, install the app, and run `npm start`.
5. Open the generated `onrender.com` URL and share it.

The app stores tasks in `data/tasks.json` locally. The included `.gitignore` keeps that local data out of GitHub. For durable shared data across redeploys, a database or persistent disk should be added later.