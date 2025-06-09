import express from 'express';
import { nanoid } from 'nanoid';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegúrate de que el archivo de base de datos existe
const dbFile = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({ links: [] }, null, 2));
}

const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Lee e inicializa la base de datos
await db.read();
if (!db.data) {
  db.data = { links: [] };
  await db.write();
}

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Generador de Enlaces Temporales</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; background: #f4f4f4; }
          input, button { padding: 0.5rem; margin-top: 0.5rem; width: 100%; }
        </style>
      </head>
      <body>
        <h1>Crear enlace temporal</h1>
        <form method="POST" action="/create">
          <label>URL original:</label><br>
          <input type="url" name="url" required><br>
          <label>Duración (en horas):</label><br>
          <input type="number" name="duration" min="1" required><br>
          <button type="submit">Generar enlace</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/create', async (req, res) => {
  const { url, duration } = req.body;
  if (!url || !duration) return res.status(400).send('Datos inválidos');

  const id = nanoid(8);
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
    return res.status(404).send('<h2>❌ Enlace no encontrado o expirado</h2>');
  }

  res.send(`
    <html><body>
      <h2>Enlace válido</h2>
      <form method="POST" action="/redirect/${link.id}">
        <button>Acceder al recurso</button>
      </form>
    </body></html>
  `);
});

app.post('/redirect/:id', async (req, res) => {
  await db.read();
  const link = db.data.links.find(l => l.id === req.params.id);

  if (!link || Date.now() > link.expiresAt) {
    return res.status(404).send('<h2>❌ Enlace no encontrado o expirado</h2>');
  }

  res.redirect(link.url);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en marcha en puerto ${PORT}`);
});
