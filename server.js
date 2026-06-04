const express = require('express');
const cors = require('cors');
const yaml = require('js-yaml');

const app = express();
app.use(cors());

// Пряме посилання на сирий файл (щоб уникнути помилки 403 від GitHub API)
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/denris87/vilnohirsk-promos-api/main/promos.yaml';

// Приводимо кожну акцію до повного вигляду. Автор у promos.yaml може вказати
// скільки завгодно мало полів (обов'язковий лише shop) — решту підставляємо
// за замовчуванням. Завдяки цьому однаково просто публікувати і короткі
// акції (кілька рядків), і довгі (з великим текстом у блоці "|").
function normalizePromo(raw) {
    if (!raw || typeof raw !== 'object') return null;

    // Фото можна задати як одне (photo), так і списком (photos) — зводимо до списку.
    const photos = [];
    if (typeof raw.photo === 'string' && raw.photo.trim()) {
        photos.push(raw.photo.trim());
    }
    if (Array.isArray(raw.photos)) {
        for (const url of raw.photos) {
            if (typeof url === 'string' && url.trim()) photos.push(url.trim());
        }
    } else if (typeof raw.photos === 'string' && raw.photos.trim()) {
        photos.push(raw.photos.trim());
    }

    const promo = {
        ...raw,
        shop: raw.shop ?? '',
        title: raw.title ?? '',
        discount: raw.discount ?? '',
        validUntil: raw.validUntil ?? '',
        description: raw.description ?? '',
        phone: raw.phone ?? '',
        photos: [...new Set(photos)],
        vip: raw.vip === true,
        // Якщо active не вказано — акція вважається опублікованою. Сховати: active: false.
        active: raw.active !== false,
    };
    delete promo.photo; // фото вже зведене у photos
    return promo;
}

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
        
        const rawPromos = Array.isArray(data?.promos) ? data.promos : [];
        const promos = rawPromos.map(normalizePromo).filter(Boolean);

        res.json(promos);
    } catch (error) {
        console.error('Внутрішня помилка сервера:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
