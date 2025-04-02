const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;
const IMAGES_DIR = path.join(__dirname, "images");

// Crear la carpeta si no existe
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

const UNSPLASH_API_KEY = "TU_CLAVE_DE_UNSPLASH"; // Reemplaza con tu clave real
const IMAGE_QUERY = "nature"; // Cambia esta palabra para obtener imágenes de otro tipo
const IMAGE_COUNT = 6; // Número de imágenes a descargar
const UNSPLASH_URL = `https://api.unsplash.com/photos/random?query=${IMAGE_QUERY}&count=${IMAGE_COUNT}&client_id=${UNSPLASH_API_KEY}`;

// Función para borrar imágenes antiguas
function limpiarCarpeta() {
    fs.readdir(IMAGES_DIR, (err, files) => {
        if (err) {
            console.error("Error al leer la carpeta:", err);
            return;
        }
        files.forEach(file => {
            fs.unlink(path.join(IMAGES_DIR, file), err => {
                if (err) console.error("Error al borrar archivo:", err);
            });
        });
    });
}

// Ruta para descargar nuevas imágenes y reemplazar las antiguas
app.get("/download-images", async (req, res) => {
    try {
        limpiarCarpeta(); // Borra imágenes antiguas antes de descargar nuevas

        const response = await axios.get(UNSPLASH_URL);
        const images = response.data;

        const downloadPromises = images.map(async (img, index) => {
            const imageUrl = img.urls.regular;
            const imagePath = path.join(IMAGES_DIR, `image_${index}.jpg`);

            const imageResponse = await axios({
                url: imageUrl,
                responseType: "stream",
            });

            const writer = fs.createWriteStream(imagePath);
            imageResponse.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on("finish", () => resolve(imagePath));
                writer.on("error", reject);
            });
        });

        const savedImages = await Promise.all(downloadPromises);
        res.json({ message: "Imágenes descargadas con éxito", images: savedImages });
    } catch (error) {
        console.error("Error al descargar imágenes:", error);
        res.status(500).json({ error: "No se pudieron descargar las imágenes" });
    }
});

// Servir imágenes guardadas
app.use("/images", express.static(IMAGES_DIR));

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
