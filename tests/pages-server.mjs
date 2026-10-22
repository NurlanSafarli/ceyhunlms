import express from 'express';
import { fileURLToPath } from 'node:url';

const app = express();
app.use('/ceyhunlms', express.static(fileURLToPath(new URL('../dist-pages/', import.meta.url))));
app.use((_req, res) => res.status(404).send('Not found'));
const server = app.listen(4174, '127.0.0.1');
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
