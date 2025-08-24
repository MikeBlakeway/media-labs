import express from 'express';
import { json } from 'body-parser';
import { router as apiRouter } from './routes';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(json());
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`API server is running on http://localhost:${PORT}`);
});