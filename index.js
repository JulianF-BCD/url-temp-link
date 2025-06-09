import express from 'express';
import { nanoid } from 'nanoid';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del archivo JSON que actúa como base de datos
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

await db.read();

// Inicializar db.data si está vacía o no existe
db.data ||= { links: [] };
await db.write();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Página principal con formulario para crear enlace temporal
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

// Endpoint para crear enlace temporal
app.post('/create', async (req, res) => {
  const { url, duration } = req.body;
  const id = nanoid();
  const expiresAt = Date.now() + parseInt(duration) * 3600000;

  // Leer base de datos para asegurar datos actuales
  await db.read();
  db.data.links.push({ id, url, expiresAt });
  await db.write();

  res.send(`
    <html>
