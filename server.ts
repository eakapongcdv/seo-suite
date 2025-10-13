// server.ts
import { createServer } from 'http';
import next from 'next';

const port = parseInt(process.env.PORT || '4102', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`> Server TS Ready on http://localhost:${port}`);
  });
});
