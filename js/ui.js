// ============================================================
//  ui.js — Manejo de la Interfaz de Usuario (UI) y Vistas
// ============================================================

const ui = {
    toggleAllChecks(masterId, childClass) {
        const checked = document.getElementById(masterId).checked;
        document.querySelectorAll(childClass).forEach(ch => ch.checked = checked);
    },

    // ── Elementos DOM cacheados ──
    els: {
        getConnectionStatus: () => document.getElementById('connection-status'),
        getProductosTbody: () => document.getElementById('productos-tbody'),
        getInventarioTbody: () => document.getElementById('inventario-tbody'),
        getEntradasTbody: () => document.getElementById('entradas-tbody'),
        getSalidasTbody: () => document.getElementById('salidas-tbody'),
        getEntregasTbody: () => document.getElementById('entregas-tbody'),
        getInicioInventarioTbody: () => document.getElementById('inicio-inventario-tbody'),
        getTareasRecurrentesTbody: () => document.getElementById('tareas-recurrentes-tbody'),
        getMantCategoriasContainer: () => document.getElementById('mant-categorias-container'),
        getMantSemanalContainer: () => document.getElementById('mant-semanal-container'),
        getMantPreventivoTable: () => ({ thead: document.getElementById('thead-preventivo'), tbody: document.getElementById('tbody-preventivo') }),
        getBitacoraGrid: () => document.getElementById('bitacora-grid'),
        getSummaryGrid: () => document.getElementById('summary-grid'),
        getResponsablesTbody: () => document.getElementById('tbody-responsables'),
    },

    /**
     * Actualiza el indicador de estado de conexión en el sidebar.
     * @param {string} estado - 'ok', 'error' o 'connecting'
     */
    setConexionStatus(estado) {
        const el = this.els.getConnectionStatus();
        if (!el) return;
        const dot = el.querySelector('.dot');
        const text = el.querySelector('span:last-child');
        
        dot.className = 'dot ' + (estado === 'ok' ? 'dot-success' : estado === 'error' ? 'dot-danger' : 'dot-warning');
        text.textContent = estado === 'ok' ? 'Conectado' : estado === 'error' ? 'Sin conexión' : 'Conectando...';
    },

    actualizarMiniStats(productos) {
        const total = productos.length;
        const bajoStock = productos.filter(p => Number(p.Cantidad) <= 5).length;
        const cats = new Set(productos.map(p => p.Categoria)).size;

        utils.animateNumber('stat-total', total);
        utils.animateNumber('stat-bajo-stock', bajoStock);
        utils.animateNumber('stat-categorias', cats);
    },

    actualizarMiniStatsTareas(state) {
        const programadas = state.tareasRecurrentes.length + state.tareasSemanales.length;
        
        let completadas = 0;
        state.tareasRecurrentes.forEach(t => { if (t.Estado === 'Finalizada') completadas++; });
        state.tareasSemanales.forEach(t => { if (t.Estado === 'Finalizada') completadas++; });
        state.planPreventivo.forEach(t => { if (t.Estado === 'Realizado') completadas++; });

        utils.animateNumber('stat-tareas-prog', programadas);
        utils.animateNumber('stat-tareas-comp', completadas);
        utils.animateNumber('stat-tareas-equipos', state.planPreventivo.length);
    },
};
window.ui = ui;
