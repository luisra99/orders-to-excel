const express = require("express");
const fs = require("fs/promises"); // Módulo para leer archivos de manera asincrónica
const path = require("path");

const app = express();
const port = 3000;

function extractSpanContents(text, startExpr, endExpr) {
  const regex = new RegExp(`${startExpr}(.*?)(?=(${endExpr}))`, "gs");

  let result = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    result.push(match[1].trim());
  }

  return result;
}

// Middleware para servir archivos estáticos (si usamos la interfaz en el frontend)
app.use(express.static("public"));

// Ruta principal
app.get("/", (req, res) => {
  res.send("Bienvenido a la conversión de HTML a texto.");
});

// Ruta para procesar archivos HTML en una carpeta
app.get("/convertir-html", async (req, res) => {
  try {
    const folderPath = path.join(__dirname, "/public"); // Ruta de la carpeta
    const files = await fs.readdir(folderPath); // Leer los archivos dentro de la carpeta
    let htmlFiles = files.filter((file) => path.extname(file) === ".html"); // Filtrar solo los HTML

    let resultados = [];
    for (const file of htmlFiles) {
      const filePath = path.join(folderPath, file);
      const content = await fs.readFile(filePath, "utf8"); // Leer contenido del archivo
      const nombres = extractSpanContents(
        content,
        `class="_2CzqyEwl">`,
        `</span>`
      );
      const precios = extractSpanContents(
        content,
        `class="_3QXWbu8N">`,
        `</div>`
      );
      const detalles = extractSpanContents(
        content,
        `class="_2mokkSXY">`,
        `</span>`
      );
      const cantidad = extractSpanContents(
        content,
        `class="_3kmrz08e">`,
        `</div>`
      );
      const elementos = nombres.map((item, index) => {
        return {
          nombre: nombres[index],
          precio: Number(precios[index].replace(/\$/,"")),
          detalles: detalles[index].trim(),
          cantidad: Number(cantidad[index].slice(9)),
        };
      });
      elementos.forEach(item=>resultados.push(item)) // Almacenar el contenido en el arreglo
    }
   
    
    res.json(resultados);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
