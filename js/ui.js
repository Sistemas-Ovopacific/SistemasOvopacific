// ============================================================
//  ui.js — Manejo de la Interfaz de Usuario (UI) y Vistas
// ============================================================

const ui = {
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

    renderizarProductos(productos, filtroNombre = '', filtroFecha = '') {
        const tbody = this.els.getProductosTbody();
        if (!tbody) return;
        tbody.innerHTML = '';

        let lista = productos;
        if (filtroNombre) {
            const f = filtroNombre.toLowerCase().trim();
            lista = lista.filter(p =>
                (p.Nombre || '').toLowerCase().includes(f) ||
                (String(p.ID) || '').toLowerCase().trim().includes(f) ||
                (p.Categoria || '').toLowerCase().includes(f)
            );
        }
        if (filtroFecha) {
            lista = lista.filter(p => (p.FechaRegistro || '') === filtroFecha);
        }

        if (lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">
                <i class="fa-solid fa-box-open"></i> No hay productos registrados
            </td></tr>`;
            return;
        }

        lista.forEach(p => {
            const qty = Number(p.Cantidad) || 0;
            let badgeClass = qty > 20 ? 'stock-high' : qty > 5 ? 'stock-medium' : 'stock-low';
            const fechaDisplay = p.FechaRegistro ? utils.formatearFecha(p.FechaRegistro) : '—';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="product-code">${utils.escHtml(p.ID)}</span></td>
                <td>
                    <div class="product-name">${utils.escHtml(p.Nombre)}</div>
                </td>
                <td><span class="category-tag">${utils.escHtml(p.Categoria)}</span></td>
                <td class="desc-cell">${utils.escHtml(p.Descripcion || '—')}</td>
                <td><span class="stock-badge ${badgeClass}">${qty}</span></td>
                <td>${utils.escHtml(p.Unidad)}</td>
                <td><i class="fa-regular fa-calendar" style="margin-right:5px;opacity:0.6;"></i>${fechaDisplay}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="MainApp.abrirEditarProducto('${utils.escAttr(p.ID)}')" title="Editar">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="action-btn del" onclick="MainApp.eliminarProducto('${utils.escAttr(p.ID)}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderizarInventario(productos, filtro = '') {
        const tbody = this.els.getInventarioTbody();
        if (!tbody) return;
        tbody.innerHTML = '';

        let lista = [...productos];
        if (filtro) {
            lista = lista.filter(p =>
                (p.Nombre || '').toLowerCase().includes(filtro) ||
                (p.Categoria || '').toLowerCase().includes(filtro)
            );
        }

        if (lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No hay productos en inventario</td></tr>`;
            return;
        }

        lista.forEach((p, idx) => {
            const qty = Number(p.Cantidad) || 0;
            let estado, estadoClass;
            if (qty === 0) { estado = 'Agotado'; estadoClass = 'status-danger'; }
            else if (qty <= 5) { estado = 'Stock Bajo'; estadoClass = 'status-warning'; }
            else if (qty <= 20) { estado = 'Normal'; estadoClass = 'status-medium'; }
            else { estado = 'Abundante'; estadoClass = 'status-success'; }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="row-num">${idx + 1}</td>
                <td><span class="product-code">${utils.escHtml(p.ID)}</span></td>
                <td class="product-name">${utils.escHtml(p.Nombre)}</td>
                <td><span class="category-tag">${utils.escHtml(p.Categoria)}</span></td>
                <td>${utils.escHtml(p.Unidad)}</td>
                <td><span class="qty-display">${qty}</span></td>
                <td><span class="status-badge ${estadoClass}">${estado}</span></td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderizarEntradas(entradas) {
        const tbody = this.els.getEntradasTbody();
        if (!tbody) return;
        tbody.innerHTML = '';

        if (entradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No hay entradas registradas</td></tr>`;
            return;
        }

        // Ordenar las más recientes primero
        const sorted = [...entradas].reverse();
        sorted.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="mov-id">${utils.escHtml(String(e.ID_Movimiento || ''))}</span></td>
                <td>${utils.escHtml(e.Nombre_Producto || e.ID_Producto || '')}</td>
                <td><span class="qty-entrada">+${e.Cantidad}</span></td>
                <td>${utils.formatearFecha(e.Fecha)}</td>
                <td>${utils.escHtml(e.Observacion || '—')}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderizarSalidas(salidas) {
        const tbody = this.els.getSalidasTbody();
        if (!tbody) return;
        tbody.innerHTML = '';

        if (salidas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No hay salidas registradas</td></tr>`;
            return;
        }

        const sorted = [...salidas].reverse();
        sorted.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="mov-id">${utils.escHtml(String(s.ID_Movimiento || ''))}</span></td>
                <td>${utils.escHtml(s.Nombre_Producto || s.ID_Producto || '')}</td>
                <td><span class="qty-salida">-${s.Cantidad}</span></td>
                <td>${utils.formatearFecha(s.Fecha)}</td>
                <td>${utils.escHtml(s.Observacion || '—')}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderizarEntregas(entregas) {
        const tbody = this.els.getEntregasTbody();
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!entregas || entregas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No hay entregas registradas</td></tr>`;
            return;
        }

        const sorted = [...entregas].sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
        
        sorted.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${utils.formatearFecha(t.Fecha)}</td>
                <td><strong>${utils.escHtml(t.Nombre)}</strong></td>
                <td style="white-space: pre-wrap; font-size: 0.95em;">${utils.escHtml(t.Descripcion)}</td>
                <td>
                    <button class="action-btn del" onclick="MainApp.eliminarEntrega('${utils.escAttr(String(t.id))}')" title="Eliminar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderizarInicioInventario(productos) {
        const tbody = this.els.getInicioInventarioTbody();
        if (!tbody) return;
        tbody.innerHTML = '';
        if (productos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" class="empty-state">No hay inventario</td></tr>`;
            return;
        }

        // Mostrar solo los primeros 10 para resumen, o todos si se prefiere
        let vista = [...productos].sort((a,b) => Number(a.Cantidad) - Number(b.Cantidad)).slice(0, 10);
        
        vista.forEach(p => {
            const qty = Number(p.Cantidad) || 0;
            let badgeClass = qty > 20 ? 'stock-high' : qty > 5 ? 'stock-medium' : 'stock-low';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${utils.escHtml(p.Nombre)}</strong></td>
                <td><span class="stock-badge ${badgeClass}">${qty} ${utils.escHtml(p.Unidad)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    },
    // ============================================================
    //  MÓDULO: TAREAS (MANTENIMIENTO)
    // ============================================================

    /**
     * Renderiza un selector de usuarios para el rol visualizador.
     */
    renderizarSelectorVisualizador(containerId, modulo, onchange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const session = api.getSession();
        if (session.rol !== 'visualizador') {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        
        // Obtener lista única de usuarios de todos los datos de tareas
        const appState = window.MainApp.state;
        const allTasks = [
            ...appState.tareasRecurrentes,
            ...appState.tareasSemanales,
            ...appState.planPreventivo,
            ...appState.bitacora,
            ...appState.planPreventivo // Responsables también están aquí
        ];
        const users = [...new Set(allTasks.map(t => t.UsuarioSistema || t.Usuariosistema || t.UsuarioSist || '').filter(u => u !== ''))];
        
        // Si no hay usuarios en los registros, al menos mostrar el selector vacío o con "Todos"
        const currentSelected = appState[`selectedUser_${modulo}`] || '';

        container.innerHTML = `
            <label><i class="fa-solid fa-filter"></i> Ver tareas de:</label>
            <select onchange="window.MainApp.handleVisualizerUserChange('${modulo}', this.value)">
                <option value="">— Todos los usuarios —</option>
                ${users.map(u => `<option value="${u}" ${u === currentSelected ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
        `;
    },

    renderizarTareasRecurrentes(tareas) {
        // Actualizar label del año
        const yearLabel = document.getElementById('mant-year-label');
        if (yearLabel) yearLabel.textContent = new Date().getFullYear();

        const container = this.els.getMantCategoriasContainer();
        if (!container) return;
        container.innerHTML = '';

        // Renderizar selector si es visualizador
        this.renderizarSelectorVisualizador('visualizer-filter-recurrentes', 'recurrentes');

        if (!tareas || tareas.length === 0) {
            container.innerHTML = `<div class="mant-empty"><i class="fa-solid fa-calendar-days"></i><p>No hay actividades programadas.</p></div>`;
            return;
        }

        const session = api.getSession();
        const usr = (session.usuario || '').toLowerCase().trim();
        const isAdmin = session.rol === 'admin';
        const isVisualizer = session.rol === 'visualizador';
        const selectedUsr = isVisualizer ? (window.MainApp.state.selectedUser_recurrentes || '').toLowerCase().trim() : '';

        // Normalizar y Filtrar
        const tareasNorm = tareas
            .filter(t => {
                const celdasValidas = Object.values(t).filter(v => typeof v !== 'undefined' && String(v).trim() !== '');
                return celdasValidas.length >= 2;
            })
            .map(t => {
                const vals = Object.values(t);
                return {
                    ...t,
                    id:             String(t.id ?? t.ID ?? vals[0] ?? ''),
                    Nombre:         String(t.Nombre || t.nombre || t.Actividad || vals[1] || 'Sin nombre'),
                    Categoria:      String(t.Categoria || t.categoria || t.Tipo || vals[2] || 'General'),
                    MesesProg:      t.MesesProg || t.mesesprog || vals[3] || '[]',
                    MesesComp:      t.MesesComp || t.mesescomp || vals[4] || '[]',
                    UsuarioSistema: String(t.UsuarioSistema || t.Usuariosistema || t.Usuario || vals[5] || '')
                };
            })
            .filter(t => {
                const tUsr = t.UsuarioSistema.toLowerCase().trim();
                if (isAdmin) return true;
                if (isVisualizer) {
                    return selectedUsr === '' || tUsr === selectedUsr;
                }
                return tUsr === '' || tUsr === usr; // Operativo ve sus tareas o heredadas
            });
            

        if (tareasNorm.length === 0) {
            container.innerHTML = `
                <div class="mant-empty">
                    <i class="fa-solid fa-calendar-days"></i>
                    <p>No hay actividades programadas. Usa el formulario de arriba para añadir.</p>
                </div>`;
            return;
        }

        // Poblar datalist de categorías sugeridas (solo valores únicos, ignorando 'General' por defecto si no se usa)
        const datalist = document.getElementById('categorias-list');
        if (datalist) {
            const categoriasUnicas = [...new Set(tareasNorm.map(t => t.Categoria))].filter(c => c !== 'General');
            datalist.innerHTML = categoriasUnicas.map(cat => `<option value="${utils.escAttr(cat)}">`).join('');
        }

        // Colores e íconos por categoría
        const catStyles = {
            'Computadoras y Laptops':  { color: '#5b5ef4', icon: 'fa-laptop' },
            'Datacenter 1 y 2':        { color: '#0ea5e9', icon: 'fa-server' },
            'Cámaras de seguridad':    { color: '#f59e0b', icon: 'fa-camera' },
            'Red y Comunicaciones':    { color: '#10b981', icon: 'fa-network-wired' },
            'General':                 { color: '#94a3b8', icon: 'fa-gear' }
        };
        const defaultStyle = { color: '#64748b', icon: 'fa-wrench' };

        // Agrupar tareas por categoría (usando datos normalizados)
        const grupos = {};
        tareasNorm.forEach(t => {
            const cat = t.Categoria;
            if (!grupos[cat]) grupos[cat] = [];
            grupos[cat].push(t);
        });

        const mesesAbrev = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

        Object.entries(grupos).forEach(([catNombre, listaTareas]) => {
            const style = catStyles[catNombre] || defaultStyle;

            // Calcular progreso global de la categoría
            let totalProg = 0, totalComp = 0;
            listaTareas.forEach(t => {
                let prog = []; let comp = [];
                try { prog = JSON.parse(t.MesesProg || '[]'); } catch(e){}
                try { comp = JSON.parse(t.MesesComp || '[]'); } catch(e){}
                totalProg += prog.length;
                totalComp += comp.filter(m => prog.includes(m)).length;
            });
            const pct = totalProg > 0 ? Math.round((totalComp / totalProg) * 100) : 0;

            // Bloque de categoría
            const block = document.createElement('div');
            block.className = 'mant-categoria-block';

            // Header de categoría
            block.innerHTML = `
                <div class="mant-categoria-header">
                    <div class="mant-cat-icon" style="background:${style.color};">
                        <i class="fa-solid ${style.icon}"></i>
                    </div>
                    <span class="mant-cat-title">${utils.escHtml(catNombre)}</span>
                    <div class="mant-cat-progress-wrap">
                        <div class="mant-progress-bar">
                            <div class="mant-progress-fill" style="width:${pct}%;"></div>
                        </div>
                        <span class="mant-progress-pct">${pct}%</span>
                    </div>
                </div>
            `;

            // Filas de actividades
            listaTareas.forEach(t => {
                let prog = []; let comp = [];
                try { prog = JSON.parse(t.MesesProg || '[]'); } catch(e){}
                try { comp = JSON.parse(t.MesesComp || '[]'); } catch(e){}

                const dotsHtml = mesesAbrev.map((label, idx) => {
                    const mesNum = idx + 1;
                    const estaProg = prog.includes(mesNum);
                    const estaComp = comp.includes(mesNum);
                    let clase = 'inactivo';
                    let click = '';
                    if (estaProg) {
                        clase = estaComp ? 'completado' : 'pendiente';
                        click = `onclick="MainApp.toggleMesTarea('${utils.escAttr(String(t.id))}', ${mesNum})"`;
                    }
                    return `<div class="mes-dot ${clase}" ${click} title="${label}">${label.substring(0,1)}</div>`;
                }).join('');

                const row = document.createElement('div');
                row.className = 'mant-tarea-row';
                row.innerHTML = `
                    <div class="mant-tarea-nombre" title="${utils.escAttr(t.Nombre)}">${utils.escHtml(t.Nombre)}</div>
                    <div class="mant-meses-row">${dotsHtml}</div>
                    <div class="mant-tarea-actions">
                        <button class="action-btn del" onclick="MainApp.eliminarTareaRecurrente('${utils.escAttr(String(t.id))}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
                block.appendChild(row);
            });

            container.appendChild(block);
        });
    },

    renderizarTareasSemanales(tareas, filtroFechaValue = null) {
        const container = this.els.getMantSemanalContainer();
        if (!container) return;
        container.innerHTML = '';

        // Renderizar selector si es visualizador
        this.renderizarSelectorVisualizador('visualizer-filter-semanales', 'semanales');

        const session = api.getSession();
        const usr = (session.usuario || '').toLowerCase().trim();
        const isAdmin = session.rol === 'admin';
        const isVisualizer = session.rol === 'visualizador';
        const selectedUsr = isVisualizer ? (window.MainApp.state.selectedUser_semanales || '').toLowerCase().trim() : '';

        // Filtrar por usuario/rol
        let filtrado = tareas.filter(t => {
            const tUsr = String(t.UsuarioSistema || t.Usuariosistema || t.UsuarioSist || '').toLowerCase().trim();
            if (isAdmin) return true;
            if (isVisualizer) return selectedUsr === '' || tUsr === selectedUsr;
            return tUsr === '' || tUsr === usr;
        });

        // Filtrar por fecha si se proporciona
        if (filtroFechaValue) {
            filtrado = filtrado.filter(t => {
                const tFecha = t.Fecha ? t.Fecha.split('T')[0] : '';
                return tFecha === filtroFechaValue;
            });
        }

        if (filtrado.length === 0) {
            container.innerHTML = `<div class="mant-empty"><i class="fa-solid fa-calendar-week"></i><p>No hay tareas semanales registradas${filtroFechaValue ? ' para esta fecha' : ''}.</p></div>`;
            return;
        }

        const catStyles = {
            'Computadoras y Laptops':  { color: '#5b5ef4', icon: 'fa-laptop' },
            'Datacenter 1 y 2':        { color: '#0ea5e9', icon: 'fa-server' },
            'Cámaras de seguridad':    { color: '#f59e0b', icon: 'fa-camera' },
            'Red y Comunicaciones':    { color: '#10b981', icon: 'fa-network-wired' },
            'General':                 { color: '#94a3b8', icon: 'fa-gear' }
        };
        const defaultStyle = { color: '#64748b', icon: 'fa-wrench' };

        const grupos = {};
        filtrado.forEach(t => {
            const cat = t.Categoria || 'General';
            if (!grupos[cat]) grupos[cat] = [];
            grupos[cat].push(t);
        });

        const diasLabels = ['L','M','X','J','V'];

        Object.entries(grupos).forEach(([catNombre, listaTareas]) => {
            const style = catStyles[catNombre] || defaultStyle;
            const block = document.createElement('div');
            block.className = 'mant-categoria-block';
            block.innerHTML = `
                <div class="mant-categoria-header">
                    <div class="mant-cat-icon" style="background:${style.color};">
                        <i class="fa-solid ${style.icon}"></i>
                    </div>
                    <span class="mant-cat-title">${utils.escHtml(catNombre)}</span>
                </div>
            `;

            listaTareas.forEach(t => {
                let compObj = {};
                try { compObj = JSON.parse(t.DiasComp || '{}'); } catch(e){ compObj = {}; }

                const dotsHtml = [1,2,3,4,5].map((diaNum, idx) => {
                    const diaKey = String(diaNum);
                    const fecha = compObj[diaKey];
                    const estaComp = !!fecha;
                    const clase = estaComp ? 'completado has-date' : 'pendiente';
                    const label = estaComp ? fecha : diasLabels[idx];
                    
                    return `<div class="mes-dot ${clase}" onclick="MainApp.toggleDiaTarea('${utils.escAttr(String(t.id))}', ${diaNum})" title="${diasLabels[idx]}">${label}</div>`;
                }).join('');

                const row = document.createElement('div');
                row.className = 'mant-tarea-row';
                const eqText = t.Equipo ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;"><i class="fa-solid fa-laptop"></i> ${utils.escHtml(t.Equipo)}</div>` : '';
                const fechaText = t.Fecha ? `<div style="font-size:0.7rem; color:#94a3b8;"><i class="fa-regular fa-calendar"></i> ${t.Fecha.split('T')[0]}</div>` : '';

                row.innerHTML = `
                    <div class="mant-tarea-nombre-wrap">
                        <div class="mant-tarea-nombre" title="${utils.escAttr(t.Nombre)}">${utils.escHtml(t.Nombre)}</div>
                        ${eqText}
                        ${fechaText}
                    </div>
                    <div class="mant-meses-row">${dotsHtml}</div>
                    <div class="mant-tarea-actions">
                        <button class="action-btn del" onclick="MainApp.eliminarTareaSemanal('${utils.escAttr(String(t.id))}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
                block.appendChild(row);
            });

            container.appendChild(block);
        });
    },

    renderizarPlanPreventivo(plan) {
        const { thead, tbody } = this.els.getMantPreventivoTable();
        if (!thead || !tbody) return;

        thead.innerHTML = '';
        tbody.innerHTML = '';
        this.cerrarDetalleMes();

        // Renderizar selector si es visualizador
        this.renderizarSelectorVisualizador('visualizer-filter-preventivo', 'preventivo');

        // Header
        thead.innerHTML = `
            <tr>
                <th style="width:52px; min-width:52px;"></th>
                <th style="min-width:200px; text-align:left; padding-left:16px;">Usuario / Equipo</th>
                <th style="min-width:120px; text-align:left; padding-left:12px;">Área</th>
                <th style="width:44px;"></th>
            </tr>
        `;

        if (!plan || plan.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No hay equipos registrados</td></tr>`;
            return;
        }

        const session = api.getSession();
        const usr = (session.usuario || '').toLowerCase().trim();
        const isAdmin = session.rol === 'admin';
        const isVisualizer = session.rol === 'visualizador';
        const selectedUsr = isVisualizer ? (window.MainApp.state.selectedUser_preventivo || '').toLowerCase().trim() : '';

        const filtrado = plan.filter(reg => {
            const tUsr = String(reg.UsuarioSistema || reg.Usuariosistema || reg.UsuarioSist || '').toLowerCase().trim();
            if (isAdmin) return true;
            if (isVisualizer) {
                return selectedUsr === '' || tUsr === selectedUsr;
            }
            return tUsr === '' || tUsr === usr;
        });

        if (filtrado.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No hay registros para mostrar</td></tr>`;
            return;
        }

        filtrado.forEach(reg => {
            const initials = (reg.Usuario || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const tr = document.createElement('tr');
            const equipoTxt = reg.Equipo ? `<div style="font-size:0.7rem; color:#64748b; margin-top:2px;"><i class="fa-solid fa-laptop"></i> ${utils.escHtml(reg.Equipo)}</div>` : '';
            tr.innerHTML = `
                <td style="width:52px; padding:10px; text-align:center;">
                    <div class="prev-avatar">${initials}</div>
                </td>
                <td style="text-align:left; padding:10px 12px;">
                    <div style="font-weight:700; font-size:0.85rem; color:#1e293b;">${utils.escHtml(reg.Usuario)}</div>
                    ${equipoTxt}
                </td>
                <td style="text-align:left; padding:10px 12px;">
                    <span style="background:#ede9fe; color:#6d28d9; border-radius:20px; padding:3px 10px; font-size:0.72rem; font-weight:700;">${utils.escHtml(reg.Area)}</span>
                </td>
                <td style="width:44px; padding:8px; text-align:center;">
                    <div class="action-btns">
                        <button class="action-btn del" onclick="MainApp.eliminarUsuarioPreventivo('${utils.escAttr(String(reg.id))}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    /**
     * Mantenimiento Preventivo — Panel de Seguimiento Mensual
     * @param {number} mes - Número del mes (1-12)
     */
    abrirDetalleMes(mes) {
        const appState = window.MainApp && MainApp.state ? MainApp.state : {};
        const plan = appState.planPreventivo || [];
        const panel = document.getElementById('preventivo-detail-panel');
        const title = document.getElementById('prev-detail-title');
        const thead = document.getElementById('thead-prev-detail');
        const tbody = document.getElementById('tbody-prev-detail');
        if (!panel || !thead || !tbody) return;

        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const mesNombre = meses[mes - 1];

        title.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Detalle — ${mesNombre}`;
        panel.style.display = 'block';

        const sel = document.getElementById('prev-mes-select');
        if (sel) sel.value = mes;

        // Header
        thead.innerHTML = `
            <tr>
                <th class="th-sticky" style="left:0; z-index:16; min-width:120px;">Área</th>
                <th class="th-sticky" style="left:120px; z-index:16; min-width:160px;">Usuario</th>
                <th>Semana 1</th>
                <th>Semana 2</th>
                <th>Semana 3</th>
                <th>Semana 4</th>
            </tr>
        `;

        tbody.innerHTML = '';

        const session = api.getSession();
        const usr = (session.usuario || '').toLowerCase().trim();
        const isAdmin = session.rol === 'admin';
        const isVisualizer = session.rol === 'visualizador';
        const selectedUsr = isVisualizer ? (appState.selectedUser_preventivo || '').toLowerCase().trim() : '';

        const filtrado = plan.filter(reg => {
            const tUsr = String(reg.UsuarioSistema || reg.Usuariosistema || reg.UsuarioSist || '').toLowerCase().trim();
            if (isAdmin) return true;
            if (isVisualizer) {
                return selectedUsr === '' || tUsr === selectedUsr;
            }
            return tUsr === '' || tUsr === usr;
        });

        if (filtrado.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; color:#94a3b8; text-align:center;">Sin registros.</td></tr>`;
            return;
        }

        filtrado.forEach(reg => {
            let comp = {};
            try { comp = JSON.parse(reg.SemanasComp || '{}'); } catch(e){}
            const tr = document.createElement('tr');
            let html = `
                <td class="td-sticky" style="left:0; min-width:120px; font-size:0.8rem;">${utils.escHtml(reg.Area)}</td>
                <td class="td-sticky" style="left:120px; min-width:160px;"><strong style="font-size:0.8rem;">${utils.escHtml(reg.Usuario)}</strong></td>
            `;
            for (let w = 1; w <= 4; w++) {
                const semId = `M${mes}W${w}`;
                const estado = comp[semId];
                const clash = estado ? `res-${estado}` : '';
                // Usamos iniciales discretas: C=Completado, N=No hecho, I=Incompleto
                const label = estado === 'realizado' ? 'C' : (estado === 'fallo' ? 'N' : (estado === 'medio' ? 'I' : ''));
                html += `<td class="cell-week ${clash}" style="min-width:80px; font-size:0.85rem; cursor:pointer;" onclick="MainApp.toggleSemanaPreventivo('${utils.escAttr(String(reg.id))}', '${semId}')" title="S${w}">${label}</td>`;
            }
            tr.innerHTML = html;
            tbody.appendChild(tr);
        });

        // Agregar Leyenda
        const legendWrapper = document.getElementById('preventivo-detail-panel');
        if (legendWrapper) {
            const existingLegend = legendWrapper.querySelector('.prev-legend');
            if (existingLegend) existingLegend.remove();
            
            const legend = document.createElement('div');
            legend.className = 'prev-legend';
            legend.style.cssText = "padding:16px; display:flex; flex-wrap:wrap; gap:20px; font-size:0.75rem; border-top:1px solid #f1f5f9; background:#fff;";
            legend.innerHTML = `
                <div style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:12px; background:#22c55e; border-radius:3px;"></span> <strong>Verde:</strong> Realizado (C)</div>
                <div style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:12px; background:#ef4444; border-radius:3px;"></span> <strong>Rojo:</strong> No Realizado (N)</div>
                <div style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:12px; background:#eab308; border-radius:3px;"></span> <strong>Amarillo:</strong> Incompleto (I)</div>
                <div style="margin-left:auto; color:#94a3b8;">* Haz clic en las celdas para cambiar de estado</div>
            `;
            legendWrapper.appendChild(legend);
        }
    },

    // Close the detail panel
    cerrarDetalleMes() {
        const panel = document.getElementById('preventivo-detail-panel');
        if (panel) panel.style.display = 'none';
    },

    // ── BITÁCORA ──
    renderizarBitacora(registros) {
        const container = this.els.getBitacoraGrid();
        if (!container) return;
        container.innerHTML = '';

        // Renderizar selector si es visualizador
        this.renderizarSelectorVisualizador('visualizer-filter-bitacora', 'bitacora');

        const session = api.getSession();
        const usr = (session.usuario || '').toLowerCase().trim();
        const isAdmin = session.rol === 'admin';
        const isVisualizer = session.rol === 'visualizador';
        const selectedUsr = isVisualizer ? (window.MainApp.state.selectedUser_bitacora || '').toLowerCase().trim() : '';

        const misRegistros = registros.filter(b => {
            const bUsr = String(b.UsuarioSistema || b.Usuariosistema || b.Usuario || '').toLowerCase().trim();
            if (isAdmin) return true;
            if (isVisualizer) {
                return selectedUsr === '' || bUsr === selectedUsr;
            }
            return bUsr === '' || bUsr === usr;
        });

        if (!misRegistros || misRegistros.length === 0) {
            container.innerHTML = `
                <div class="mant-empty" style="grid-column:1/-1;">
                    <i class="fa-solid fa-images"></i>
                    <p>No hay evidencias para mostrar.</p>
                </div>`;
            return;
        }

        misRegistros.forEach(b => {
            const card = document.createElement('div');
            card.className = 'bitacora-card';
            card.innerHTML = `
                <img src="${b.Imagen || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" class="bitacora-img" alt="Evidencia" onclick="MainApp.abrirImagen(this.src)">
                <div class="bitacora-content">
                    <div class="bitacora-date"><i class="fa-regular fa-calendar"></i>${utils.formatearFecha(b.Fecha)}</div>
                    <div class="bitacora-desc">${utils.escHtml(b.Descripcion)}</div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    renderizarGrafica(productos, chartInstance) {
        const ctx = document.getElementById('inventoryChart').getContext('2d');
        const labels = productos.map(p => p.Nombre && p.Nombre.length > 20 ? p.Nombre.substring(0, 20) + '…' : (p.Nombre || 'N/A'));
        const data = productos.map(p => Number(p.Cantidad) || 0);

        const bgColors = data.map(qty => {
            if (qty <= 5) return 'rgba(239,68,68,0.75)';
            if (qty <= 20) return 'rgba(245,158,11,0.75)';
            return 'rgba(16,185,129,0.75)';
        });
        const borderColors = bgColors.map(c => c.replace('0.75', '1'));

        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = data;
            chartInstance.data.datasets[0].backgroundColor = bgColors;
            chartInstance.data.datasets[0].borderColor = borderColors;
            chartInstance.update('active');
        } else {
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Cantidad Disponible',
                        data,
                        backgroundColor: bgColors,
                        borderColor: borderColors,
                        borderWidth: 2,
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => `  ${ctx.parsed.y} ${productos[ctx.dataIndex]?.Unidad || 'unid.'}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { color: '#94a3b8', font: { size: 12 } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8', font: { size: 11 }, maxRotation: 40, minRotation: 20 }
                        }
                    }
                }
            });
        }

        // Resumen en tarjetas
        const grid = this.els.getSummaryGrid();
        if(grid) {
            grid.innerHTML = '';
            productos.forEach(p => {
                const qty = Number(p.Cantidad) || 0;
                let cls = qty > 20 ? 'sum-high' : qty > 5 ? 'sum-med' : 'sum-low';
                grid.innerHTML += `
                    <div class="sum-card ${cls}">
                        <span class="sum-name">${utils.escHtml(p.Nombre)}</span>
                        <span class="sum-qty">${qty}</span>
                        <span class="sum-unit">${utils.escHtml(p.Unidad)}</span>
                    </div>
                `;
            });
            if (productos.length === 0) grid.innerHTML = '<p class="empty-state">Sin productos.</p>';
        }
        
        return chartInstance;
    },

    renderizarSugerenciasInventario(productos) {
        // Esta función puede usarse para la vista de inventario si se añade el elemento al HTML
        const tbody = this.els.getInventarioTbody();
        if (!tbody) return;
        this.renderizarInventario(productos);
    },

    llenarSelectsEquipos(productos) {
        const selects = ['ts-equipo', 'prev-equipo'];
        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const prev = sel.value;
            sel.innerHTML = `<option value="">-- Seleccionar Equipo --</option>`;
            
            // Ordenar por nombre
            const sorted = [...productos].sort((a,b) => (a.Nombre||'').localeCompare(b.Nombre||''));
            
            sorted.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.Nombre || p.ID;
                opt.textContent = `${p.Nombre} (${p.ID})`;
                sel.appendChild(opt);
            });
            if (prev) sel.value = prev;
        });
    },

    generarCheckboxesMeses() {
        const container = document.getElementById('tr-meses-checkboxes');
        if (!container) return;
        
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        container.innerHTML = '';
        meses.forEach((mes, idx) => {
            const num = idx + 1;
            const item = document.createElement('div');
            item.className = 'tr-mes-item';
            item.innerHTML = `
                <input type="checkbox" id="tr-mes-${num}" class="tr-mes-check" value="${num}">
                <label for="tr-mes-${num}">${mes}</label>
            `;
            container.appendChild(item);
        });
    },

    llenarSelectsProductos(productos) {
        ['entrada-producto', 'salida-producto'].forEach(selId => {
            const sel = document.getElementById(selId);
            if (!sel) return;
            const prev = sel.value;
            sel.innerHTML = '<option value="" disabled selected>— Seleccione un producto —</option>';
            productos.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.ID;
                opt.textContent = `${p.ID} — ${p.Nombre}`;
                sel.appendChild(opt);
            });
            if (prev && productos.some(p => String(p.ID) === prev)) sel.value = prev;
        });
    },

    renderizarResponsables(responsables) {
        const tbody = this.els.getResponsablesTbody();
        if (!tbody) return;
        tbody.innerHTML = '';
        
        // Renderizar selector si es visualizador
        this.renderizarSelectorVisualizador('visualizer-filter-responsables', 'responsables');

        const session = api.getSession();
        const usr = (session.usuario || '').toLowerCase().trim();
        const isAdmin = session.rol === 'admin';
        const isVisualizer = session.rol === 'visualizador';
        const selectedUsr = isVisualizer ? (window.MainApp.state.selectedUser_responsables || '').toLowerCase().trim() : '';

        const filtrado = responsables.filter(u => {
            const uUsr = String(u.UsuarioSistema || u.Usuariosistema || u.UsuarioSist || '').toLowerCase().trim();
            if (isAdmin) return true;
            if (isVisualizer) return selectedUsr === '' || uUsr === selectedUsr;
            return uUsr === '' || uUsr === usr;
        });

        if (!filtrado || filtrado.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay responsables para mostrar.</td></tr>';
            return;
        }

        filtrado.forEach(u => {
            const initials = (u.Usuario || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const tr = document.createElement('tr');
            
            // Ocultar botón borrar para visualizadores
            const actionBtn = isVisualizer ? '' : `
                <button class="action-btn del" onclick="MainApp.eliminarResponsable('${utils.escAttr(u.id)}')" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;

            tr.innerHTML = `
                <td style="padding:12px; font-weight:500; color:var(--primary-color);">${utils.escHtml(u.Area || 'Gral')}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="prev-avatar" style="width:30px; height:30px; font-size:0.75rem;">${initials}</div>
                        <strong>${utils.escHtml(u.Usuario)}</strong>
                    </div>
                </td>
                <td>
                    <i class="fa-solid fa-laptop" style="opacity:0.5; margin-right:5px;"></i>
                    ${utils.escHtml(u.Equipo || 'N/A')}
                </td>
                <td>
                    ${actionBtn}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
};

window.ui = ui;
