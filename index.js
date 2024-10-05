const express = require("express");
const fs = require("fs/promises"); // Módulo para leer archivos de manera asincrónica
const path = require("path");
const XLSX = require("xlsx"); // Importar xlsx
const multer = require("multer"); // Importar multer para subir archivos
const cheerio = require("cheerio");
const archiver = require("archiver"); // Biblioteca para comprimir archivos

const app = express();
const port = 3000;
// Configurar multer para manejar archivos subidos y almacenarlos temporalmente
const upload = multer({ dest: "uploads/" });

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

// Ruta principal que sirve el formulario HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post(
  "/procesar-archivos",
  upload.array("archivosHtml"),
  async (req, res) => {
    try {
      // Acceder a los archivos subidos desde req.files
      const archivos = req.files;
      let resultados = [];
      let divsConcatenados = ""; // Almacenará todos los divs concatenados

      // Procesar cada archivo recibido
      for (const archivo of archivos) {
        const filePath = path.join(__dirname, archivo.path); // Ruta temporal del archivo
        const content = await fs.readFile(filePath, "utf8"); // Leer el contenido del archivo
        // Extraer todos los divs con la clase "_1vWYxse2"
        const $ = cheerio.load(content);

        const divs = $("div._1vWYxse2");
        divs.each((index, element) => {
          divsConcatenados += $.html(element); // Convertir el div a HTML y concatenarlo
        });
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
          const _precio = Number(precios[index].replace(/\$/, ""));
          const _cantidad = Number(cantidad[index].slice(9));

          return {
            Nombre: nombres[index],
            Detalles: detalles[index].trim(),
            Cantidad: _cantidad,
            Precio: _precio,
            Costo: _cantidad * _precio,
          };
        });
        elementos.forEach((item) => resultados.push(item)); // Almacenar el contenido en el arreglo
      }

      // Eliminar los archivos temporales después de procesarlos
      for (const archivo of archivos) {
        await fs.unlink(archivo.path); // Eliminar archivo temporal
      }
      try {
        // Crear un libro de trabajo
        const workbook = XLSX.utils.book_new();

        // Crear una hoja de trabajo a partir del arreglo de objetos
        const worksheet = XLSX.utils.json_to_sheet(resultados);

        // Agregar la hoja de trabajo al libro
        XLSX.utils.book_append_sheet(workbook, worksheet, "DatosHTML");

        // Definir el archivo Excel como un archivo binario
        const excelBuffer = XLSX.write(workbook, {
          type: "buffer",
          bookType: "xlsx",
        });

        // Crear un archivo HTML con los divs concatenados
        const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
       <style>
    body {
      font-family: Arial, sans-serif;
    }

    ._1vWYxse2 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      border: 1px solid #ccc;
      margin-bottom: 20px;
    }

    /* Estilos para la imagen */
    ._15n6zmXZ {
      margin-right: 20px;
    }

    ._15n6zmXZ img {
      width: 150px; /* Ajusta el tamaño de la imagen */
      height: auto;
      border-radius: 8px;
    }

    /* Contenedor de texto */
    ._32msOJ4B {
      display: flex;
      flex-direction: column;
      justify-content: center;
      max-width: 70%;
    }

    /* Título del producto */
    ._2CzqyEwl {
      font-size: 1.5em; /* Tamaño de fuente más grande */
      font-weight: bold;
      margin-bottom: 10px;
    }

    /* Precio */
    ._3QXWbu8N {
      font-size: 1.4em; /* Tamaño de fuente para el precio */
      color: #f00; /* Color rojo para destacar */
      margin-bottom: 10px;
    }

    /* Detalles adicionales */
    ._2mokkSXY, ._3kmrz08e {
      font-size: 1.2em;
      margin-bottom: 5px;
    }

    /* Responsividad: ajustar el diseño en pantallas pequeñas */
    @media (max-width: 600px) {
      ._1vWYxse2 {
        flex-direction: column;
        text-align: center;
      }

      ._15n6zmXZ {
        margin-right: 0;
        margin-bottom: 20px;
      }

      ._32msOJ4B {
        max-width: 100%;
      }
    }
  </style>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Divs Concatenados</title>
      </head>
      <body>
        ${divsConcatenados} <!-- Divs concatenados aquí -->
      </body>
      </html>
    `;
        // Crear el archivo ZIP y agregar los archivos HTML y Excel
        const zip = archiver("zip", { zlib: { level: 9 } }); // Nivel máximo de compresión

        // Configurar las cabeceras para la descarga del archivo ZIP
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=archivos.zip"
        );
        res.setHeader("Content-Type", "application/zip");

        // Adjuntar el stream de respuesta al archivo ZIP
        zip.pipe(res);

        // Agregar el archivo HTML al ZIP
        zip.append(htmlContent, { name: "divs-concatenados.html" });

        // Agregar el archivo Excel al ZIP
        zip.append(excelBuffer, { name: "datos-html.xlsx" });

        // Finalizar la creación del archivo ZIP
        zip.finalize();
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      res.status(500).send(`Error procesando archivos: ${error.message}`);
    }
  }
);

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
