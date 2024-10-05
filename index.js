const express = require("express");
const fs = require("fs/promises"); // Módulo para leer archivos de manera asincrónica
const path = require("path");
const XLSX = require("xlsx"); // Importar xlsx
const multer = require("multer"); // Importar multer para subir archivos

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

      // Enviar el archivo Excel como descarga
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=datos-html.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(excelBuffer);
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});
app.post("/upload", async (req, res) => {
  try {
    console.log(req.body);
    const archivos = req.body.files; // Esperamos que los archivos vengan como un arreglo de base64 o texto en el cuerpo de la solicitud

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

      // Enviar el archivo Excel como descarga
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=datos-html.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(excelBuffer);
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});
app.post(
  "/procesar-archivos",
  upload.array("archivosHtml"),
  async (req, res) => {
    try {
      // Acceder a los archivos subidos desde req.files
      const archivos = req.files;
      let resultados = [];

      // Procesar cada archivo recibido
      for (const archivo of archivos) {
        const filePath = path.join(__dirname, archivo.path); // Ruta temporal del archivo
        const content = await fs.readFile(filePath, "utf8"); // Leer el contenido del archivo

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

        // Enviar el archivo Excel como descarga
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=datos-html.xlsx"
        );
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.send(excelBuffer).redirect("/");
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
