// ============================================================
//  js/ui/tareasUI.js
//  Renderizado UI de Tareas y Mantenimiento
// ============================================================

Object.assign(window.ui, {
    renderizarSelectorVisualizador(containerId, modulo, onchange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const session = api.getSession();
        if (!['admin', 'supervisor', 'visualizador'].includes(session.rol)) {
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

    // ==========================================
    // ── V3.0 RENDERERS ──
    // ==========================================
    
    renderizarTareasMensualesV3(tareas) {
        const tbody = document.getElementById('tbody-tareas-mensuales');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const fNom = document.getElementById('filter-tm-nombre') ? document.getElementById('filter-tm-nombre').value.toLowerCase().trim() : '';
        const fMes = document.getElementById('filter-tm-mes') ? document.getElementById('filter-tm-mes').value : '';
        const fEst = document.getElementById('filter-tm-estado') ? document.getElementById('filter-tm-estado').value : '';

        const filtrado = tareas.filter(t => {
            if (fNom && !(t.Nombre||'').toLowerCase().includes(fNom)) return false;
            if (fMes && String(t.Mes) !== String(fMes)) return false;
            if (fEst && String(t.Estado) !== String(fEst)) return false;
            return true;
        });

        if (filtrado.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No se encontraron tareas</td></tr>';
            return;
        }

        // Agrupar filtrado por Nombre
        const grupos = {};
        filtrado.forEach(t => {
            const nom = t.Nombre || 'Sin Nombre';
            if (!grupos[nom]) grupos[nom] = [];
            grupos[nom].push(t);
        });

        const mesesStr = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        let groupIndex = 0;

        for (const [nombreGrupo, items] of Object.entries(grupos)) {
            groupIndex++;
            const groupId = 'grupo-tm-' + groupIndex;
            
            // Header del Acordeón
            const finCount = items.filter(t => t.Estado === 'Finalizada').length;
            const allFinished = finCount === items.length && items.length > 0;
            const badgeBg = allFinished ? '#ecfdf5' : '#f8fafc';
            const badgeColor = allFinished ? '#10b981' : '#64748b';

            const hr = document.createElement('tr');
            hr.style.cursor = 'pointer';
            hr.style.background = '#f1f5f9';
            hr.onclick = () => {
                const rows = document.querySelectorAll('.' + groupId);
                let isOpen = false;
                rows.forEach(r => {
                    if (r.style.display === 'none') {
                        r.style.display = 'table-row';
                        isOpen = true;
                    } else {
                        r.style.display = 'none';
                    }
                });
                const icon = hr.querySelector('.fa-chevron-right, .fa-chevron-down');
                if (icon) {
                    if (isOpen) {
                        icon.classList.remove('fa-chevron-right');
                        icon.classList.add('fa-chevron-down');
                    } else {
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-right');
                    }
                }
            };
            
            hr.innerHTML = `
                <td colspan="6" style="padding: 12px; font-weight: 600; border-bottom: 2px solid #e2e8f0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <i class="fa-solid fa-chevron-right" style="margin-right: 8px; color: #64748b; width: 14px;"></i>
                            ${utils.escHtml(nombreGrupo)} 
                        </div>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <span style="font-size: 0.85em; color: ${badgeColor}; background: ${badgeBg}; padding: 2px 8px; border-radius: 12px; border: 1px solid #cbd5e1;">
                                ${finCount} / ${items.length} Finalizadas
                            </span>
                            <button class="action-btn del" onclick="event.stopPropagation(); MainApp.eliminarTareaMensualGrupo('${utils.escAttr(nombreGrupo)}')" title="Eliminar Grupo Completo">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(hr);

            // Ordenar por mes y renderizar los registros (ocultos inicialmente)
            items.sort((a, b) => {
                const mesA = a.Mes || a.mes || a.MES || 0;
                const mesB = b.Mes || b.mes || b.MES || 0;
                return Number(mesA) - Number(mesB);
            });

            items.forEach(t => {
                // Normalización robusta de campos
                const mesVal = t.Mes || t.mes || t.MES || "";
                const mesName = mesesStr[Number(mesVal) - 1] || mesVal || '?';
                
                const estado = t.Estado || t.estado || "Pendiente";
                const fCreacion = t.FechaCreacion || t.fechacreacion || "N/A";
                const fFinRaw = t.FechaFinalizacion || t.fechafinalizacion || "N/A";
                const fFin = fFinRaw.length > 10 ? fFinRaw.split('T')[0] : fFinRaw;
                
                const idTarea = t.id || t.ID || "";

                const estadoCls = estado === 'Finalizada' ? 'status-success' : 'status-warning';
                
                const tr = document.createElement('tr');
                tr.className = groupId;
                tr.style.display = 'none'; // Oculto por defecto
                tr.innerHTML = `
                    <td style="padding-left: 20px;"><input type="checkbox" class="tm-check" value="${idTarea}"></td>
                    <td><span style="color:#64748b;">${utils.escHtml(t.Nombre || t.nombre || "Sin nombre")}</span></td>
                    <td><span class="category-tag">${mesName}</span></td>
                    <td style="font-size:0.85em; color:#64748b;">Creación: ${fCreacion}<br>Fin: ${fFin}</td>
                    <td><span class="status-badge ${estadoCls}">${utils.escHtml(estado)}</span></td>
                    <td>
                        <button class="action-btn del" onclick="MainApp.eliminarTareaMensual('${idTarea}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    },

    renderizarTareasSemanalesV3(tareas) {
        const tbody = document.getElementById('tbody-tareas-semanales');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const fNom = document.getElementById('filter-ts-nombre') ? document.getElementById('filter-ts-nombre').value.toLowerCase().trim() : '';
        const fEst = document.getElementById('filter-ts-estado') ? document.getElementById('filter-ts-estado').value : '';
        const filtrado = tareas.filter(t => {
            if (fNom && !(t.Nombre||'').toLowerCase().includes(fNom)) return false;
            if (fEst && String(t.Estado) !== String(fEst)) return false;
            return true;
        });

        if (filtrado.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No se encontraron tareas</td></tr>';
            return;
        }

        filtrado.forEach(t => {
            const estadoCls = t.Estado === 'Finalizada' ? 'status-success' : 'status-warning';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="ts-check" value="${t.id}"></td>
                <td><strong>${utils.escHtml(t.Nombre)}</strong></td>
                <td style="font-size:0.85em; color:#64748b;">Creación: ${t.FechaCreacion || 'N/A'}<br>Fin: ${t.FechaFinalizacion || 'N/A'}</td>
                <td><span class="status-badge ${estadoCls}">${utils.escHtml(t.Estado)}</span></td>
                <td>
                    <button class="action-btn edit" onclick="MainApp.editarTareaSemanalV3('${t.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn del" onclick="MainApp.eliminarTareaSemanalV3('${t.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderizarPreventivoV3(registros) {
        const tbody = document.getElementById('tbody-tareas-preventivo');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const fUsr = document.getElementById('filter-prev-usuario') ? document.getElementById('filter-prev-usuario').value.toLowerCase().trim() : '';
        const fAre = document.getElementById('filter-prev-area') ? document.getElementById('filter-prev-area').value.toLowerCase().trim() : '';
        const fMes = document.getElementById('filter-prev-mes') ? document.getElementById('filter-prev-mes').value : '';
        const fEst = document.getElementById('filter-prev-estado') ? document.getElementById('filter-prev-estado').value : '';

        const filtrado = registros.filter(r => {
            // Normalización robusta de campos
            const rMes = r.Mes || r.mes || r.MES || "";
            const rUsr = r.Usuario || r.usuario || r.USUARIO || "";
            const rAre = r.Area || r.area || r.AREA || "";
            const rEst = r.Estado || r.estado || r.ESTADO || "Pendiente";

            if (fUsr && !String(rUsr).toLowerCase().includes(fUsr)) return false;
            if (fAre && !String(rAre).toLowerCase().includes(fAre)) return false;
            if (fMes && String(rMes) !== String(fMes)) return false;
            if (fEst && String(rEst) !== String(fEst)) return false;
            return true;
        });

        if (filtrado.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No se encontraron mantenimientos</td></tr>';
            return;
        }
        
        const mesesStr = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

        filtrado.forEach(r => {
            const rFec = r.FechaRealizacion || r.fecharealizacion || r.FECHAREALIZACION || "-";
            let rMes = r.Mes || r.mes || r.MES || "";
            
            // Fallback: Si no hay mes asignado, intentar deducirlo de la fecha si existe
            if (!rMes && rFec && rFec !== "-") {
                try {
                    const parts = rFec.split('-');
                    if (parts.length >= 2) rMes = parseInt(parts[1]);
                } catch(e) {}
            }

            const rUsr = r.Usuario || r.usuario || r.USUARIO || "Sin Usuario";
            const rAre = r.Area || r.area || r.AREA || "Sin Área";
            const rEst = r.Estado || r.estado || r.ESTADO || "Pendiente";

            const mesName = mesesStr[Number(rMes) - 1] || rMes || '?';
            const estadoCls = rEst === 'Realizado' ? 'status-success' : 'status-danger';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="prev-check" value="${r.id}"></td>
                <td><strong>${utils.escHtml(rUsr)}</strong></td>
                <td>${utils.escHtml(rAre)}</td>
                <td><span class="category-tag">${mesName}</span></td>
                <td><span class="status-badge ${estadoCls}">${utils.escHtml(rEst)}</span> <br> <span style="font-size:0.8em; color:#64748b;">${rFec}</span></td>
                <td>
                    <button class="action-btn del" onclick="MainApp.eliminarPreventivoV3('${r.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    
    renderizarDashboardTareas(state) {
        if (!document.getElementById('view-tareas-dashboard')) return;
        
        // Count for Mensuales
        const menTotal = state.tareasRecurrentes.length;
        const menFin = state.tareasRecurrentes.filter(t => t.Estado === 'Finalizada').length;
        const menPend = menTotal - menFin;

        // Count for Semanales
        const semTotal = state.tareasSemanales.length;
        const semFin = state.tareasSemanales.filter(t => t.Estado === 'Finalizada').length;
        const semPend = semTotal - semFin;

        // Count for Preventivo
        const preTotal = state.planPreventivo.length;
        const preFin = state.planPreventivo.filter(t => t.Estado === 'Realizado').length;
        const prePend = preTotal - preFin;

        const renderPie = (canvasId, fin, pend, label) => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (this[canvasId+'Instance']) this[canvasId+'Instance'].destroy();
            
            this[canvasId+'Instance'] = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Completado', 'Pendiente'],
                    datasets: [{
                        data: [fin, pend],
                        backgroundColor: ['#10b981', '#fbbf24']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        };

        renderPie('chart-mensuales', menFin, menPend, 'Mensuales');
        renderPie('chart-semanales', semFin, semPend, 'Semanales');
        renderPie('chart-preventivo', preFin, prePend, 'Preventivos');
    },
    
    renderizarBitacoraV3(registros) {
        const container = this.els.getBitacoraGrid();
        if (!container) return;
        container.innerHTML = '';

        this.renderizarSelectorVisualizador('visualizer-filter-bitacora', 'bitacora');

        const session = api.getSession();
        const usr = (session.usuario || '').toLowerCase().trim();
        const isSupervisor = session.rol === 'supervisor';
        const isAdmin = session.rol === 'admin' || isSupervisor;
        const isVisualizer = ['visualizador', 'admin', 'supervisor'].includes(session.rol);
        const selectedUsr = isVisualizer ? (window.MainApp.state.selectedUser_bitacora || '').toLowerCase().trim() : '';

        const filtrado = registros.filter(b => {
            // Tolerancia a singular/plural UsuarioSistema/UsuarioSistemas
            const bUsr = String(b.UsuarioSistema || b.UsuarioSistemas || b.usuariosistema || b.usuariosistemas || '').toLowerCase().trim();
            if (!isAdmin && !isVisualizer && bUsr !== usr && bUsr !== '') return false;
            // Si el registro no tiene usuario y no somos admin, igual lo mostramos para no perder datos históricos? 
            // O mejor permitir que se vea si está vacío (bUsr === '')
            if (isVisualizer && selectedUsr !== '' && bUsr !== selectedUsr) return false;
            return true;
        });

        if (filtrado.length === 0) {
            container.innerHTML = `
                <div class="mant-empty" style="grid-column:1/-1;">
                    <i class="fa-solid fa-images"></i>
                    <p>No hay evidencias registradas en Drive.</p>
                </div>`;
            return;
        }

        filtrado.forEach(b => {
            const card = document.createElement('div');
            card.className = 'bitacora-card';
            
            let btnAction = '';
            if (b.DriveUrl) {
                // Si es un enlace de Drive lo abrimos en nueva pestaña
                btnAction = `<a href="${utils.escAttr(b.DriveUrl)}" target="_blank" class="btn btn-outline" style="width:100%; text-align:center; margin-top:10px;"><i class="fa-brands fa-google-drive" style="color:#10b981;"></i> Abrir Evidencia</a>`;
            } else {
                btnAction = `<button disabled class="btn btn-outline" style="width:100%; border-color:#e2e8f0; color:#94a3b8;"><i class="fa-solid fa-unlink"></i> Sin archivo</button>`;
            }

            card.innerHTML = `
                <div class="bitacora-content" style="padding: 16px;">
                    <h3 style="margin-top:0; margin-bottom:8px; font-size:1.1rem; color:#0f172a;">${utils.escHtml(b.Titulo || 'Evidencia')}</h3>
                    <div style="font-size:0.8rem; background:#f1f5f9; padding:4px 8px; border-radius:4px; margin-bottom:12px; display:inline-block; font-family:monospace;">
                        🔗 ${utils.escHtml(b.AsociadoA || 'Ninguna')}
                    </div>
                    <div class="bitacora-date" style="margin-bottom:8px;"><i class="fa-regular fa-calendar"></i> ${utils.formatearFecha(b.Fecha)}</div>
                    <div class="bitacora-desc" style="color:#475569; font-size:0.9rem; margin-bottom:16px;">${utils.escHtml(b.Descripcion)}</div>
                    ${btnAction}
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
        const tbody = document.getElementById('tbody-usuarios-preventivo');
        if (!tbody) return;
        tbody.innerHTML = '';
        if(!responsables || responsables.length === 0){
             tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No hay usuarios dados de alta</td></tr>';
             return;
        }
        
        responsables.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
               <td><strong>${utils.escHtml(u.Nombre)}</strong></td>
               <td>${utils.escHtml(u.Area)}</td>
               <td><button class="action-btn del" onclick="MainApp.eliminarResponsable('${u.id || u.ID}')"><i class="fa-solid fa-trash"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    },

    _old_renderizarResponsables(responsables) { // just ignoring old signature

        const tbody = this.els.getResponsablesTbody();
        if (!tbody) return;
        tbody.innerHTML = '';
        
        // Renderizar selector si es visualizador
        this.renderizarSelectorVisualizador('visualizer-filter-responsables', 'responsables');

        const session = api.getSession();
        const usr = (session.usuario || '').toLowerCase().trim();
        const isSupervisor = session.rol === 'supervisor';
        const isAdmin = session.rol === 'admin' || isSupervisor;
        const isVisualizer = ['visualizador', 'admin', 'supervisor'].includes(session.rol);
        const selectedUsr = isVisualizer ? (window.MainApp.state.selectedUser_responsables || '').toLowerCase().trim() : '';

        const filtrado = responsables.filter(u => {
            const uUsr = String(u.UsuarioSistema || u.Usuariosistema || u.UsuarioSist || '').toLowerCase().trim();
            if (isAdmin) return true;
            if (isVisualizer && selectedUsr !== '') return uUsr === selectedUsr;
            return uUsr === '' || uUsr === usr;
        });

        if (!filtrado || filtrado.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay responsables para mostrar.</td></tr>';
            return;
        }

        filtrado.forEach(u => {
            const userName = u.Usuario || u.Nombre || '?';
            const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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
                        <strong>${utils.escHtml(userName)}</strong>
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
});
