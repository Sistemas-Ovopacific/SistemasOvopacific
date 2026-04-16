// ============================================================
//  api.js — Módulo de Comunicación con Google Apps Script
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwiMpv-omhDCBgiVQMf1q7Ez-lgkJTAZvLv8erF1uGHYXh5Jr1d8wL14llqODyIiuPC/exec';

const api = {
    // Clave para localStorage
    SESSION_KEY: 'ovopacific_session',

    setSession(user) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    },

    getSession() {
        try {
            const s = localStorage.getItem(this.SESSION_KEY);
            return s ? JSON.parse(s) : null;
        } catch (e) {
            console.error("Error al leer sesión:", e);
            return null;
        }
    },

    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        window.location.reload();
    },

    async get(action) {
        const res = await fetch(`${GAS_URL}?action=${action}&t=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    },

    async getAllData() {
        return this.get('getAllData');
    },

    async login(usuario, password) {
        const u = encodeURIComponent(usuario);
        const p = encodeURIComponent(password);
        console.log('[API] Intentando login para:', usuario);
        const res = await fetch(`${GAS_URL}?action=login&usuario=${u}&password=${p}&t=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('[API] Respuesta del servidor:', data);
        if (data.error) throw new Error(data.error);

        // Almacenar sesión si es exitoso
        this.setSession(data);
        return data;
    },

    async post(payload) {
        // Adjuntar usuario actual a cualquier envío de datos
        const user = this.getSession();
        if (user && user.usuario) {
            payload.UsuarioSistema = user.usuario;
            payload.UsuarioSistemas = user.usuario;
            payload.quien_registro = user.usuario;
            payload.ejecutor = user.usuario;
        }

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
