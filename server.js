const express = require('express');
const cors = require('cors');
const yaml = require('js-yaml');

const app = express();
app.use(cors());

// УВАГА: Замініть 'denris87/vilnohirsk-promos-api' на назву ВАШОГО репозиторію на GitHub!
const GITHUB_API_URL = 'https://api.github.com/repos/denris87/vilnohirsk-promos-api/contents/promos.yaml';

app.get('/api/promos', async (req, res) => {
    try {
        const fetchUrl = `${GITHUB_API_URL}?ref=main&t=${Date.now()}`;
        
        const response = await fetch(fetchUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3.raw',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'If-None-Match': '' 
            }
        });
        
        if (!response.ok) throw new Error(`Помилка GitHub API: ${response.status}`);
        
        const yamlText = await response.text();
        const data = yaml.load(yamlText);
        
        res.setHeader('Surrogate-Control', 'no-store');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.json(data.promos || []);
    } catch (error) {
        console.error('Помилка сервера:', error);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
