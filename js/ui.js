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
        getInicioTareasTbody: () => document.getElementById('inicio-tareas-tbody'),
        getTareasRecurrentesTbody: () => document.getElementById('tareas-recurrentes-tbody'),
        getBitacoraGrid: () => document.getElementById('bitacora-grid'),
        getSummaryGrid: () => document.getElementById('summary-grid'),
    },

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

    renderizarProductos(productos, filtro = '') {
        const tbody = this.els.getProductosTbody();
        if (!tbody) return;
        tbody.innerHTML = '';

        let lista = productos;
        if (filtro) {
            const f = filtro.toLowerCase().trim();
            lista = productos.filter(p =>
                (p.Nombre || '').toLowerCase().includes(f) ||
                (String(p.ID) || '').toLowerCase().trim().includes(f) ||
                (p.Categoria || '').toLowerCase().includes(f)
            );
        }

        if (lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state">
                <i class="fa-solid fa-box-open"></i> No hay productos registrados
            </td></tr>`;
            return;
        }

        lista.forEach(p => {
            const qty = Number(p.Cantidad) || 0;
            let badgeClass = qty > 20 ? 'stock-high' : qty > 5 ? 'stock-medium' : 'stock-low';
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

    renderizarInicioTareas(tareas) {
        const tbody = this.els.getInicioTareasTbody();
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!tareas || tareas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No hay tareas programadas</td></tr>`;
            return;
        }
        
        const sorted = [...tareas].sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
        
        sorted.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${utils.formatearFecha(t.Fecha)}</td>
                <td><strong>${utils.escHtml(t.Nombre)}</strong></td>
                <td>
                    <button class="action-btn del" onclick="MainApp.eliminarInicioTarea('${utils.escAttr(String(t.id))}')" title="Completar / Eliminar">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // ── TAREAS RECURRENTES ──
    generarCheckboxesMeses() {
        const container = document.getElementById('tr-meses-checkboxes');
        if (!container) return;
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        container.innerHTML = meses.map((m, i) => `
            <label style="display: flex; align-items: center; gap: 5px; color: #e2e8f0; background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 6px; cursor: pointer; transition: background 0.2s;">
                <input type="checkbox" class="tr-mes-check" value="${i + 1}"> ${m}
            </label>
        `).join('');
    },

    renderizarTareasRecurrentes(tareas) {
        const tbody = this.els.getTareasRecurrentesTbody();
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!tareas || tareas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No hay tareas recurrentes programadas este año</td></tr>`;
            return;
        }

        const mesesLabel = ['1','2','3','4','5','6','7','8','9','10','11','12'];

        tareas.forEach(t => {
            const tr = document.createElement('tr');
            
            // Parsear JSON (protegido por try-catch)
            let prog = [];
            let comp = [];
            try { prog = JSON.parse(t.MesesProg || "[]"); } catch (e) {}
            try { comp = JSON.parse(t.MesesComp || "[]"); } catch (e) {}

            // Construir el HTML de los círculos (1 al 12)
            const circulosHtml = mesesLabel.map((str, idx) => {
                const mesNum = idx + 1;
                const estaProg = prog.includes(mesNum);
                const estaComp = comp.includes(mesNum);

                let clase = 'inactivo'; // gris por defecto
                let clickEvent = ''; // si inactivo, no hace nada

                if (estaProg) {
                    if (estaComp) {
                        clase = 'completado'; // Verde
                    } else {
                        clase = 'pendiente'; // Naranja/rojo
                    }
                    clickEvent = `onclick="MainApp.toggleMesTarea('${t.id}', ${mesNum})"`;
                }

                // Tooltip nombre mes
                const mName = new Date(2000, idx, 1).toLocaleString('es-ES', { month: 'short' }).toUpperCase();
                
                return `<div class="mes-circle ${clase}" ${clickEvent} title="${mName}">${str}</div>`;
            }).join('');

            tr.innerHTML = `
                <td><strong>${utils.escHtml(t.Nombre)}</strong></td>
                <td><div class="meses-grid">${circulosHtml}</div></td>
                <td>
                    <button class="action-btn del" onclick="MainApp.eliminarTareaRecurrente('${t.id}')" title="Eliminar Programación">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // ── BITÁCORA ──
    renderizarBitacora(registros) {
        const container = this.els.getBitacoraGrid();
        if (!container) return;
        container.innerHTML = '';

        if (!registros || registros.length === 0) {
            container.innerHTML = `<p style="color: #94a3b8; text-align: center; width: 100%; grid-column: 1 / -1;">No hay evidencias registradas en la bitácora todavía.</p>`;
            return;
        }

        registros.forEach(b => {
            const card = document.createElement('div');
            card.className = 'bitacora-card';
            card.innerHTML = `
                <img src="${b.Imagen || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" class="bitacora-img" alt="Evidencia">
                <div class="bitacora-content">
                    <div class="bitacora-date">${utils.formatearFecha(b.Fecha)}</div>
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
    }
};

window.ui = ui;
