import express from 'express';
import { nanoid } from 'nanoid';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

// Inicialización de rutas y base de datos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { links: [] });
await db.read();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Página principal
app.get('/', (req, res) => {
  res.send(`
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Enlace temporal</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 2rem; background: #f2f2f2; color: #333; }
          form { margin-top: 1rem; }
          input, button { padding: 0.5rem; margin-top: 0.5rem; width: 100%; }
        </style>
      </head>
      <body>
        <h1>Crear enlace temporal</h1>
        <form method="POST" action="/create">
          <label>URL original:</label>
          <input type="url" name="url" required />
          <label>Duración (en horas):</label>
          <input type="number" name="duration" min="1" required />
          <button type="submit">Generar enlace</button>
        </form>
      </body>
    </html>
  `);
});

// Crear nuevo enlace temporal
app.post('/create', async (req, res) => {
  try {
    const { url, duration } = req.body;
    if (!url || !duration) return res.status(400).send('Faltan datos');

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
  } catch (err) {
    console.error('❌ Error creando el enlace:', err);
    res.status(500).send('Error interno al crear el enlace.');
  }
});

// Acceso a enlace temporal
app.get('/link/:id', async (req, res) => {
  const { id } = req.params;
  await db.read();
  const link = db.data.links.find(l => l.id === id);

  if (!link || Date.now() > link.expiresAt) {
    return res.status(404).send('<h2>❌ Enlace no encontrado o expirado</h2>');
  }

  res.send(`
    <html><body>
      <h2>Enlace válido</h2>
      <p>Este recurso está disponible temporalmente. Puedes accederlo desde aquí:</p>
      <form method="POST" action="/redirect/${id}">
        <button>Acceder al recurso</button>
      </form>
    </body></html>
  `);
});

// Redirección real (oculta la URL original hasta el final)
app.post('/redirect/:id', async (req, res) => {
  const { id } = req.params;
  await db.read();
  const link = db.data.links.find(l => l.id === id);

  if (!link || Date.now() > link.expiresAt) {
    return res.status(404).send('<h2>❌ Enlace no encontrado o expirado</h2>');
  }

  res.redirect(link.url);
});

// Arranque del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor en marcha en http://localhost:${PORT}`);
});
