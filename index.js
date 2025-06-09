const express = require('express');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter, { links: [] });

app.use(express.urlencoded({ extended: true }));

// Carga la base de datos
(async () => {
  await db.read();
  db.data ||= { links: [] };
  await db.write();
})();

// Página principal
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background-color: #F2F4F6;
        }
        .container {
          max-width: 500px;
          margin: 60px auto;
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
          color: #004689;
          margin-bottom: 24px;
          font-size: 24px;
          text-align: center;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: #333333;
        }
        input {
          width: 100%;
          padding: 10px 12px;
          margin-bottom: 20px;
          border: 1px solid #CCCCCC;
          border-radius: 4px;
          font-size: 16px;
        }
        button {
          width: 100%;
          padding: 12px;
          background-color: #004689;
          color: white;
          font-size: 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color .2s ease;
        }
        button:hover {
          background-color: #003366;
        }
        a {
          color: #004689;
          word-break: break-word;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Enlace temporal BCD</h1>
        <form method="POST" action="/create">
          <label>URL original</label>
          <input name="url" placeholder="https://..." required>
          <label>Duración (horas)</label>
          <input name="duration" type="number" min="1" max="168" value="48" required>
          <button type="submit">Generar enlace</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Crear nuevo enlace temporal
app.post('/create', async (req, res) => {
  try {
    const { url, duration } = req.body;

    if (!url || !duration) {
      return res.status(400).send('URL y duración son requeridas.');
    }

    const id = nanoid(8);
    const expiresAt = Date.now() + parseInt(duration) * 60 * 60 * 1000;

    db.data.links.push({ id, url, expiresAt });
    await db.write();

    res.send(`
      <html>
        <body style="font-family:sans-serif;padding:2rem;">
          <h2>Tu enlace temporal (válido por ${duration}h):</h2>
          <a href="/link/${id}" target="_blank">${req.headers.host}/link/${id}</a>
          <br><br>
          <a href="/">← Volver</a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('❌ Error en /create:', err); // Esto lo verás en los logs de Render
    res.status(500).send('Error interno al generar enlace.');
  }
});

// Acceder a un enlace temporal
app.get('/link/:id', async (req, res) => {
  await db.read();
  const link = db.data.links.find(l => l.id === req.params.id);

  if (!link || Date.now() > link.expiresAt) {
    return res.status(404).send('<h2>❌ Enlace no encontrado o expirado</h2><a href="/">← Volver</a>');
  }

  // Mostrar contenido incrustado (sin redirigir)
  res.send(`
    <html>
      <body style="font-family:sans-serif;text-align:center;padding:2rem;">
        <h2>Contenido accesible temporalmente</h2>
        <iframe src="${link.url}" width="90%" height="600px" style="border:1px solid #ccc;border-radius:8px;"></iframe>
        <br><br>
        <a href="/">← Volver</a>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Servidor funcionando en puerto ${port}`);
});
