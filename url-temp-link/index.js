const express = require("express");
const app = express();
const crypto = require("crypto");
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

const store = {}; // { id: { url, expiresAt } }

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
  const id = crypto.randomBytes(4).toString("hex");
  const expiresAt = Date.now() + parseInt(duration) * 60 * 60 * 1000;
  store[id] = { url, expiresAt };
  res.send(`
    <p>Tu enlace temporal (válido por ${duration}h):</p>
    <a href="/link/${id}">${req.headers.host}/link/${id}</a>
  `);
});

app.get("/link/:id", (req, res) => {
  const link = store[req.params.id];
  if (!link) return res.status(404).send("Enlace no encontrado.");

  if (Date.now() > link.expiresAt) {
    delete store[req.params.id];
    return res.send("<h3>Este enlace ha expirado.</h3>");
  }

  res.redirect(link.url);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
