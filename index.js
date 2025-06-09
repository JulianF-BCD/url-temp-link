import express from 'express';
import { nanoid } from 'nanoid';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

await db.read();
db.data ||= { links: [] };
await db.write();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Crear enlace temporal</h1>
        <form method="POST" action="/create">
          <label>URL original:</label><br>
          <input type="url" name="url" required><br>
          <label>Duración (en horas):</label><br>
          <input type="number" name="duration" required><br>
          <button type="submit">Generar enlace</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/create', async (req, res) => {
  const { url, duration } = req.body;
  const id = nanoid();
  const expiresAt = Date.now() + parseInt(duration) * 3600000;
  db.data.links.push({ id, url, expiresAt });
  await db.write();

  res.send(`
    <html><body>
      <p>Tu enlace temporal (válido por ${duration}h):</p>
      <a href="/link/${id}" target="_blank">${req.headers.host}/link/${id}</a><br><br>
      <a href="/">← Volver</a>
    </body></html>
  `);
});

app.get('/link/:id', async (req, res) => {
  await db.read();
  const link = db.data.links.find(l => l.id === req.params.id);
  if (!link || Date.now() > link.expiresAt) {
    return res.status(404).send('Enlace no encontrado o expirado');
  }
  res.redirect(link.url);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor funcionando en puerto ${PORT}`);
});
