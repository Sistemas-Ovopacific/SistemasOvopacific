// ============================================================
//  utils.js — Utilidades y Helpers
// ============================================================

const utils = {
    // ── Loader global ──
    mostrarLoader(msg = 'Procesando...') {
        document.getElementById('loader-msg').textContent = msg;
        document.getElementById('global-loader').classList.add('active');
    },
    
    ocultarLoader() {
        document.getElementById('global-loader').classList.remove('active');
    },

    // ── Notificaciones Toast ──
    mostrarToast(msg, tipo = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        const iconos = { success: 'circle-check', danger: 'circle-xmark', warning: 'triangle-exclamation' };
        toast.innerHTML = `<i class="fa-solid fa-${iconos[tipo] || 'info'}"></i><span>${msg}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // ── Formateo de Datos ──
    formatearFecha(val) {
        if (!val) return '—';
        // Forzar interpretación local reemplazando "-" por "/" o añadiendo hora
        // Las fechas YYYY-MM-DD en JS se asumen UTC, lo que causa desfase de un día.
        const fechaLimpia = typeof val === 'string' ? val.split('T')[0] : val;
        const d = new Date(fechaLimpia + 'T00:00:00'); 
        if (isNaN(d.getTime())) return val;
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    escHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    
    escAttr(str) {
        return this.escHtml(str).replace(/'/g, '&#39;');
    },

    // ── Animación de números ──
    animateNumber(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        const start = parseInt(el.textContent) || 0;
        if (start === target) return;
        const step = target > start ? 1 : -1;
        
        // Evitar timers infinitos si target es muy grande
        const diff = Math.abs(target - start);
        const maxFrames = 30; // 30 frames max
        const frameStep = Math.max(1, Math.floor(diff / maxFrames)) * step;
        
        const timer = setInterval(() => {
            const cur = parseInt(el.textContent) || 0;
            if ((step > 0 && cur >= target) || (step < 0 && cur <= target)) {
                el.textContent = target; // target exacto al final
                clearInterval(timer);
                return;
            }
            // Asegurar que no nos pasamos
            const nextVal = cur + frameStep;
            el.textContent = (step > 0 && nextVal > target) || (step < 0 && nextVal < target) ? target : nextVal;
        }, 30);
    },
    
    // ── Exportación CSV Genérica ──
    exportarCSV(data, filename = 'export', headers = null) {
        if (!data || data.length === 0) { 
            this.mostrarToast('No hay datos para exportar', 'warning'); 
            return; 
        }
        
        // Si no se dan headers, usar las llaves del primer objeto
        const finalHeaders = headers || Object.keys(data[0]);
        
        const rows = data.map(item => {
            return finalHeaders.map(h => {
                let val = item[h];
                if (val === null || val === undefined) val = '';
                // Limpiar saltos de línea y escapar comillas
                const str = val.toString().replace(/\n/g, ' ').replace(/"/g, '""');
                return `"${str}"`;
            }).join(',');
        });
        
        const csv = [finalHeaders.join(','), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
        this.mostrarToast(`${filename.charAt(0).toUpperCase() + filename.slice(1)} exportado`, 'success');
    }
};

window.utils = utils;
