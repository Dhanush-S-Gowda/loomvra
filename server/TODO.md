# Server Implementation Tasks

- [x] Explore existing codebase
- [x] Create `src/config/redis.js` - Redis connection
- [x] Create `src/services/StorageMng.js` - S3-like image storage service
- [x] Create `src/services/pexels.js` - Pexels API service
- [x] Update `src/storage/db.js` - New database schema (settings, project, slides tables)
- [x] Create `src/routes/project.routes.js` - Project endpoints
- [x] Create `src/routes/settings.routes.js` - Settings endpoints
- [x] Create `src/queues/design.queue.js` - Design plan queue
- [x] Create `src/queues/slides.queue.js` - Slides generation queue
- [x] Create `src/workers/design.worker.js` - Design plan worker
- [x] Create `src/workers/slides.worker.js` - Slides generation worker
- [x] Create `src/jobs/design.job.js` - Design plan job logic
- [x] Create `src/jobs/slides.job.js` - Slides generation job logic (boilerplate)
- [x] Update `src/index.js` - Express server with all routes, CORS, and worker initialization
- [x] Updated `package.json` - added `cors` dependency, fixed `start` script
