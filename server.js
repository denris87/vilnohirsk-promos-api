const express = require('express');
const cors = require('cors');
const yaml = require('js-yaml');

const app = express();
app.use(cors());

// Пряме посилання на сирий файл (щоб уникнути помилки 403 від GitHub API)
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/denris87/vilnohirsk-promos-api/main/promos.yaml';

app.get('/api/promos', async (req, res) => {
    try {
        const fetchUrl = `${GITHUB_RAW_URL}?t=${Date.now()}`;
        
        const response = await fetch(fetchUrl, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.error(`Помилка доступу до GitHub: ${response.status}`);
            return res.status(response.status).json({ error: `GitHub Error: ${response.status}` });
        }
        
        const yamlText = await response.text();
        
        let data;
        try {
            data = yaml.load(yamlText);
        } catch (yamlError) {
            console.error('Помилка синтаксису в YAML файлі:', yamlError.message);
            return res.status(500).json({ error: 'YAML Syntax Error', details: yamlError.message });
        }
        
        res.setHeader('Surrogate-Control', 'no-store');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.json(data?.promos || []);
    } catch (error) {
        console.error('Внутрішня помилка сервера:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
