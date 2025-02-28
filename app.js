const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
app.use(express.urlencoded({ extended: true })); // Добавляем middleware для обработки данных формы
app.use(express.json()); // Для обработки JSON данных

const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname) !== '.blend') {
            return cb(new Error('Только .blend файлы разрешены!'), false);
        }
        cb(null, true);
    }
});

// Статическая папка для фронтенда
app.use(express.static('public'));

let renderStatus = {}; // Хранение статуса рендеринга

// Загрузка .blend файла
app.post('/upload', upload.single('blendFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Файл не загружен.');
    }

    const { resolution, format } = req.body;
    const outputFileName = `output_${Date.now()}.${format.toLowerCase()}`;
    const blendFilePath = req.file.path;
    const outputPath = path.join(__dirname, 'renders', outputFileName);

    renderStatus[outputFileName] = 0; // Инициализация статуса рендеринга

    const command = `blender -b ${blendFilePath} -o ${outputPath} -F ${format} -x 1 -f 1 -- --render-resolution ${resolution}`;

    try {
        const renderProcess = exec(command);

        renderProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            // Обновление статуса рендеринга (примерно)
            renderStatus[outputFileName] = Math.min(renderStatus[outputFileName] + 10, 100);
        });

        renderProcess.on('close', (code) => {
            console.log(`Рендеринг завершен с кодом: ${code}`);
            renderStatus[outputFileName] = 100;
            res.json({ message: 'Рендеринг завершен!', filename: outputFileName });
        });
    } catch (error) {
        console.error(`Ошибка рендеринга: ${error}`);
        res.status(500).send('Ошибка при рендеринге.');
    } finally {
        fs.unlink(blendFilePath, (err) => {
            if (err) console.error(`Ошибка удаления файла: ${err}`);
        });
    }
});

app.get('/status/:filename', (req, res) => {
    const filename = req.params.filename;
    const status = renderStatus[filename] || 0;
    res.json({ progress: status });
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