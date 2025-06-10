// index.js
const express = require("express");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const { nanoid } = require("nanoid");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const adapter = new FileSync("db.json");
const db = low(adapter);
db.defaults({ links: [] }).write();

const renderForm = () => `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BCD Travel - Enlace temporal</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
      body {
        background-color: #F1F4F6;
        font-family: 'Inter', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        padding: 1rem;
      }
      .container {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        text-align: center;
      }
      img {
        width: 180px;
        margin-bottom: 1rem;
      }
      input, button {
        font-family: inherit;
        font-size: 1rem;
        margin-top: 0.5rem;
        padding: 0.6rem 1rem;
        width: 100%;
        max-width: 300px;
        border-radius: 8px;
        border: 1px solid #ccc;
        box-sizing: border-box;
      }
      button {
        background-color: #141B4D;
        color: white;
        cursor: pointer;
        margin-top: 1rem;
        border: none;
        transition: background-color 0.3s ease;
      }
      button:hover {
        background-color: #FF6720;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="https://bcdtravel.es/wp-content/uploads/2024/02/Identidad_BCDTravel.es_.svg" alt="Logo BCD Travel">
      <h4>Crear enlace temporal</h4>
      <form method="POST" action="/create">
        <input name="url" placeholder="URL original" required /><br>
        <input name="duration" type="number" value=48horas min="1" max="168" placeholder="Duración (en horas)" /><br>
        <button type="submit">Generar</button>
      </form>
    </div>
  </body>
  </html>
`;

app.get("/", (req, res) => {
  res.send(renderForm());
});

app.post("/create", (req, res) => {
  const { url, duration } = req.body;
  const id = nanoid(8);
  const expiresAt = Date.now() + parseInt(duration) * 60 * 60 * 1000;

  db.get("links").push({ id, url, expiresAt }).write();

res.send(`
  <head>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
  </head>
  <body style="background-color:#F1F4F6; font-family:'Inter', sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
    <div style="text-align:center; background:white; padding:40px; border-radius:16px; box-shadow:0 0 10px rgba(0,0,0,0.1);">
      <h2 style="color:#141B4D; font-weight:300; font-size:24px; margin-bottom:20px;">Tu enlace temporal</h2>
      <p style="margin-bottom:10px;">Válido por <strong>${duration}h</strong></p>
      <a href="/link/${id}" style="display:inline-block; padding:10px 20px; background-color:#141B4D; color:white; text-decoration:none; border-radius:8px; transition:0.3s;">
        ${req.headers.host}/link/${id}
      </a>
      <br><br>
      <a href="/" style="color:#FF6720; font-size:14px; text-decoration:underline;">Crear otro enlace</a>
    </div>
  </body>
`);
  
app.get("/link/:id", async (req, res) => {
  const link = db.get("links").find({ id: req.params.id }).value();
  if (!link) return res.status(404).send("Enlace no encontrado.");

  if (Date.now() > link.expiresAt) {
    db.get("links").remove({ id: req.params.id }).write();
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
