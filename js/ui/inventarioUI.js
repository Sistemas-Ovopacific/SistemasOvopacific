// ============================================================
//  js/ui/inventarioUI.js
//  Renderizado UI de Inventario
// ============================================================

Object.assign(window.ui, {
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
});
