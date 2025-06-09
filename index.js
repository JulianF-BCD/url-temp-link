const express = require("express");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const { nanoid } = require("nanoid");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ links: [] }).write();

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

app.post("/create", (req, res) => {
  const { url, duration } = req.body;

  const id = nanoid(8);
  const expiresAt = Date.now() + parseInt(duration) * 60 * 60 * 1000;
  db.get('links')
    .push({ id, url, expiresAt })
    .write();

  res.send(`
    <p>Tu enlace temporal (válido por ${duration}h):</p>
    <a href="/link/${id}">${req.headers.host}/link/${id}</a>
  `);
});

app.get("/link/:id", async (req, res) => {
  const link = db.get('links').find({ id: req.params.id }).value();
  if (!link) return res.status(404).send("Enlace no encontrado.");

  if (Date.now() > link.expiresAt) {
    db.get('links').remove({ id: req.params.id }).write();
    return res.send("<h3>Este enlace ha expirado.</h3>");
  }

  try {
    const response = await axios.get(link.url, { responseType: "arraybuffer" });
    const contentType = response.headers["content-type"];
    res.set("Content-Type", contentType);
    res.send(response.data);
  } catch (err) {
    res.status(500).send("Error al cargar el contenido.");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
