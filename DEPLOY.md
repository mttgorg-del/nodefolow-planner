# Publish Code Atlas

1. Push this project to the connected GitHub repository.
2. In Render, choose **New > Blueprint** and select `mttgorg-del/nodefolow-planner`.
3. Render will read `render.yaml`, install Node 20, and run `npm start`.
4. Open the generated `onrender.com` URL and test it on your phone.

Code Atlas currently stores learner progress in the browser with `localStorage`, so each device keeps its own progress. The app does not need a database for this first public version.

Before publishing, run `npm test` and `node --check public/app.js`.