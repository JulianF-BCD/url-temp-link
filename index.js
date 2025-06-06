const express = require("express");
const app = express();
const { Low, JSONFile } = require("lowdb");
const { nanoid } = require("nanoid");
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// Configurar LowDB
const adapter = new JSONFile("db.json");
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { links: [] };
  await db.write();
}
initDB();

app.get("/", (req, res) => {
  res.send(`
    <h2>Crear enlace temporal</h2>
    <form method="POST" action="/create">
      <label>URL original:</label><br>
      <input name="url" required style="width:300px"><br><br>
      <label>Duración (en horas):</label><br>
      <input name="duration" type="number" value="48" min="1" max="168"><br><br>
      <button type="submit">Generar enlace</button>
    </form>
  `);
});

app.post("/create", async (req, res) => {
  const { url, duration } = req.body;
  await db.read();

  const id = nanoid(8);
  const expiresAt = Date.now() + parseInt(duration) * 60 * 60 * 1000;
  db.data.links.push({ id, url, expiresAt });
  await db.write();

  res.send(`
    <p>Tu enlace temporal (válido por ${duration}h):</p>
    <a href="/link/${id}">${req.headers.host}/link/${id}</a>
  `);
});

app.get("/link/:id", async (req, res) => {
  await db.read();
  const link = db.data.links.find((l) => l.id === req.params.id);
  if (!link) return res.status(404).send("Enlace no encontrado.");

  if (Date.now() > link.expiresAt) {
    // Borrar enlace expirado
    db.data.links = db.data.links.filter((l) => l.id !== req.params.id);
    await db.write();
    return res.send("<h3>Este enlace ha expirado.</h3>");
  }

  res.redirect(link.url);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
