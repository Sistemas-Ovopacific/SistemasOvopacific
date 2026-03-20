// ============================================================
//  api.js — Módulo de Comunicación con Google Apps Script
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyP_PhgyhUFvPeuT7iNJSstmH6hjIJcv1pLUOi5qI1bxD85LlwY5vBca7-7p8dM5vdUXA/exec';

const api = {
    async get(action) {
        const res = await fetch(`${GAS_URL}?action=${action}&t=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    },

    async post(payload) {
        const parseTextSafe = (text) => {
            const trimmed = text.trim();
            if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
                throw new Error('Respuesta no es JSON válido del servidor');
            }
            return JSON.parse(trimmed);
        };

        try {
            const res = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                redirect: 'follow'
            });
            const text = await res.text();
            const data = parseTextSafe(text);
            if (data.error) throw new Error(data.error);
            return data;
        } catch (err1) {
            try {
                const formData = new FormData();
                formData.append('data', JSON.stringify(payload));
                const res2 = await fetch(GAS_URL, {
                    method: 'POST',
                    body: formData,
                    redirect: 'follow'
                });
                const text2 = await res2.text();
                const data2 = parseTextSafe(text2);
                if (data2.error) throw new Error(data2.error);
                return data2;
            } catch (err2) {
                throw new Error(err1.message || err2.message);
            }
        }
    }
};

window.api = api;
