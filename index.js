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
    res.send(`
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
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Enlace temporal BCD Travel</h1>
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
