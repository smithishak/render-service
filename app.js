const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Статическая папка для фронтенда
app.use(express.static('public'));

// Загрузка .blend файла
app.post('/upload', upload.single('blendFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Файл не загружен.');
    }

    const blendFilePath = req.file.path;
    const outputPath = path.join(__dirname, 'renders', `output_${Date.now()}.png`);

    // Команда для рендеринга в Blender
    const command = `blender -b ${blendFilePath} -o ${outputPath} -F PNG -x 1 -f 1`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка рендеринга: ${stderr}`);
            return res.status(500).send('Ошибка при рендеринге.');
        }

        console.log(`Рендеринг завершен: ${stdout}`);
        res.send('Рендеринг завершен!');
    });
});

// Скачивание результата
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'renders', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('Файл не найден.');
    }
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});