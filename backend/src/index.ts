import app from './app';
import { env } from './env';

const port = env.port;

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});

