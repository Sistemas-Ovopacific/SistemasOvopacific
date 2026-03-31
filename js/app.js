// ============================================================
//  app.js — Controlador Principal
// ============================================================

const MainApp = {
    // Estado Global
    state: {
        productos: [],
        entradas: [],
        salidas: [],
        entregas: [],
        tareasRecurrentes: [],
        bitacora: [],
        chartInstance: null,
        vistaActual: '', // Se setea por el portal
        moduloActual: '',
        tabTareasActual: 'recurrentes'
    },

    init() {
        this.inicializarNavegacion();
        this.inicializarEventos();
        this.inicializarLogin();
        
        // Mostrar perfil en sidebar
        const currentUser = sessionStorage.getItem('inv_currentUser');
        const currentName = sessionStorage.getItem('inv_currentName') || currentUser;
        
        if (currentUser) {
            const userBox = document.getElementById('sidebar-user');
            if (userBox) {
                userBox.style.display = 'flex';
                document.getElementById('user-name-display').textContent = currentName;
                document.getElementById('user-initial').textContent = currentName.charAt(0).toUpperCase();
            }
        }
        
        this.cargarTodosLosDatos();
    },

    logout() {
        if (confirm('¿Cerrar sesión?')) {
            sessionStorage.removeItem('inv_currentUser');
            sessionStorage.removeItem('inv_currentName');
            location.reload();
        }
    },

    // ── AUTENTICACIÓN ──
    inicializarLogin() {
        const form = document.getElementById('login-form');
        const btn = document.getElementById('login-submit-btn');
        const errorMsg = document.getElementById('login-error-msg');
        
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('login-user').value.trim();
            const pass = document.getElementById('login-pass').value.trim();
            
            if (!user || !pass) return;

            btn.disabled = true;
            btn.textContent = 'Verificando...';
            errorMsg.textContent = '';

            try {
                const res = await api.login(user, pass);
                if (res.success) {
                    // Guardar sesión
                    sessionStorage.setItem('inv_currentUser', res.usuario);
                    if (res.nombre) {
                        sessionStorage.setItem('inv_currentName', res.nombre);
                    } else {
                        sessionStorage.removeItem('inv_currentName');
                    }
                    
                    const currentName = res.nombre || res.usuario;
                    const userBox = document.getElementById('sidebar-user');
                    if (userBox) {
                        document.getElementById('user-name-display').textContent = currentName;
                        document.getElementById('user-initial').textContent = currentName.charAt(0).toUpperCase();
                    }
                    
                    // Ocultar login y mostrar portal
                    const loginScreen = document.getElementById('login-screen');
                    loginScreen.style.opacity = '0';
                    setTimeout(() => {
                        loginScreen.style.display = 'none';
                        const landing = document.getElementById('landing-portal');
                        if (landing) {
                            landing.style.display = 'flex';
                            setTimeout(() => {
                                landing.style.opacity = '1';
                                if (window.initPortalParticles) window.initPortalParticles();
                            }, 50);
                        }
                    }, 500);

                    // Recargar datos para aplicar filtros de usuario
                    this.cargarTodosLosDatos();
                }
            } catch (err) {
                console.error('[LOGIN] Error:', err);
                errorMsg.textContent = err.message || 'Error de conexión';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Entrar';
            }
        });
    },

    // ── NAVEGACIÓN ──
    inicializarNavegacion() {
        document.querySelectorAll('#nav-links li, #nav-links-tareas li').forEach(li => {
            li.addEventListener('click', () => this.cambiarVista(li.dataset.view));
        });
    },

    setMode(mode) {
        this.state.moduloActual = mode;
        const logoText = document.getElementById('sidebar-logo-text');
        const logoIcon = document.getElementById('sidebar-logo-icon');
        const searchWrap = document.querySelector('.search-wrap');

        // Garantizar que el perfil de usuario siga visible siempre que haya sesión
        const currentUser = sessionStorage.getItem('inv_currentUser');
        if (currentUser) {
            const userBox = document.getElementById('sidebar-user');
            if (userBox) userBox.style.display = 'flex';
        }

        if (mode === 'inventario') {
            if (searchWrap) searchWrap.style.display = 'block';
            document.getElementById('nav-menu-inventario').style.display = 'block';
            document.getElementById('nav-menu-tareas').style.display = 'none';
            const miniStats = document.querySelector('.mini-stats');
            if (miniStats) miniStats.style.display = 'flex';
            this.cambiarVista('productos');
            
            document.getElementById('page-title').textContent = 'Inventario';
            document.getElementById('page-subtitle').textContent = 'Gestión del almacén';
            
            if (logoText) logoText.innerHTML = `Inventario<span> Sistemas</span>`;
            if (logoIcon) logoIcon.className = `fa-solid fa-boxes-stacked`;
            
        } else if (mode === 'tareas') {
            if (searchWrap) {
                searchWrap.style.display = 'none';
                const searchInput = searchWrap.querySelector('input');
                if (searchInput) searchInput.value = ''; // Limpiar búsqueda al cambiar
            }
            document.getElementById('nav-menu-inventario').style.display = 'none';
            document.getElementById('nav-menu-tareas').style.display = 'block';
            const miniStats = document.querySelector('.mini-stats');
            if (miniStats) miniStats.style.display = 'none';
            this.cambiarVista('inicio-tareas-view');
            
            document.getElementById('page-title').textContent = 'Seguimiento de Tareas';
            document.getElementById('page-subtitle').textContent = 'Mis responsabilidades y actividades programadas';
            
            if (logoText) logoText.innerHTML = `Gestión de<span> Tareas</span>`;
            if (logoIcon) logoIcon.className = `fa-solid fa-list-check`;
            
            // Re-renderizar con los datos ya cargados
            ui.renderizarTareasRecurrentes(this.state.tareasRecurrentes);
            ui.renderizarBitacora(this.state.bitacora);
        }
    },

    cambiarVista(vista) {
        this.state.vistaActual = vista;
        document.querySelectorAll('#nav-links li, #nav-links-tareas li').forEach(li => {
            li.classList.toggle('active', li.dataset.view === vista);
        });
        document.querySelectorAll('.view-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === `view-${vista}`);
        });
        this.actualizarUI();
    },

    // ── DATOS ──
    async cargarTodosLosDatos() {
        if (GAS_URL.includes('TU_URL_WEB_APP')) {
            utils.ocultarLoader();
            ui.setConexionStatus('error');
            utils.mostrarToast('⚠️ Configura la URL de tu Web App en api.js', 'warning');
            this.usarDatosDemo();
            return;
        }

        utils.mostrarLoader('Cargando...');
        ui.setConexionStatus('connecting');

        try {
            const [p, e, s, t, tS, tR, b] = await Promise.all([
                api.get('getProductos'),
                api.get('getEntradas'),
                api.get('getSalidas'),
                api.get('getEntregas').catch(err => { console.error('[GET Entregas Failed]', err); return []; }), 
                api.get('getTareas').catch(err => { console.error('[GET Tareas Failed]', err); return []; }), 
                api.get('getTareasRecurrentes').catch(err => { console.error('[GET TareasRecurrentes Failed]', err); return []; }), 
                api.get('getBitacora').catch(err => { console.error('[GET Bitacora Failed]', err); return []; }) 
            ]);

            if (p.error) throw new Error(p.error);
            if (e.error) throw new Error(e.error);
            if (s.error) throw new Error(s.error);

            if (tR && tR.error) {
                console.error('[Backend Error en TareasRecurrentes]:', tR.error);
                utils.mostrarToast('Error cargando Tareas: ' + tR.error, 'danger');
            }
            if (tS && tS.error) console.error('[Backend Error en Tareas Simples]:', tS.error);
            if (b && b.error) console.error('[Backend Error en Bitacora]:', b.error);

            this.state.productos = Array.isArray(p) ? p : [];
            this.state.entradas = Array.isArray(e) ? e : [];
            this.state.salidas = Array.isArray(s) ? s : [];
            this.state.entregas = Array.isArray(t) ? t : (t && t.error ? [] : t);
            
            this.state.inicioTareas = Array.isArray(tS) ? tS : (tS && tS.error ? [] : tS);
            this.state.tareasRecurrentes = Array.isArray(tR) ? tR : (tR && tR.error ? [] : tR);
            this.state.bitacora = Array.isArray(b) ? b : (b && b.error ? [] : b);

            ui.setConexionStatus('ok');
            this.actualizarUI();
        } catch (err) {
            console.error('Error cargando datos:', err);
            ui.setConexionStatus('error');
            utils.mostrarToast('Error de conexión: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },

    actualizarUI() {
        const { vistaActual, productos, entradas, salidas, chartInstance } = this.state;
        ui.actualizarMiniStats(productos);
        ui.llenarSelectsProductos(productos);

        const enModuloTareas = vistaActual === 'inicio-tareas-view' || this.state.moduloActual === 'tareas';
        if (enModuloTareas) {
            ui.renderizarTareasRecurrentes(this.state.tareasRecurrentes);
            ui.renderizarBitacora(this.state.bitacora);
        }
        if (vistaActual === 'productos') ui.renderizarProductos(productos);
        if (vistaActual === 'entradas') ui.renderizarEntradas(entradas);
        if (vistaActual === 'salidas') ui.renderizarSalidas(salidas);
        if (vistaActual === 'entregas') ui.renderizarEntregas(this.state.entregas);
        if (vistaActual === 'grafica') {
            this.state.chartInstance = ui.renderizarGrafica(productos, chartInstance);
        }
    },

    usarDatosDemo() {
        this.state.productos = [
            { ID: 'PRD-001', Nombre: 'Laptop Dell XPS', Categoria: 'Electrónica', Descripcion: 'Demo', Cantidad: 15, Unidad: 'Unidades' },
            { ID: 'PRD-002', Nombre: 'Monitor 27"', Categoria: 'Electrónica', Descripcion: 'Demo', Cantidad: 4, Unidad: 'Unidades' }
        ];
        this.state.entradas = [];
        this.state.salidas = [];
        this.state.entregas = [];
        this.state.inicioTareas = [];
        this.state.tareasRecurrentes = [];
        this.state.bitacora = [];
        this.actualizarUI();
    },

    // ── EVENTOS DOM ──
    inicializarEventos() {
        // Búsqueda global
        document.getElementById('global-search').addEventListener('input', e => {
            const term = e.target.value.toLowerCase().trim();
            if (this.state.vistaActual === 'productos') ui.renderizarProductos(this.state.productos, term);
            if (this.state.vistaActual === 'inventario') ui.renderizarInventario(this.state.productos, term);
        });

        // Filtros de Productos
        const filterProdNombre = document.getElementById('filter-prod-nombre');
        const filterProdFecha = document.getElementById('filter-prod-fecha');
        if (filterProdNombre) filterProdNombre.addEventListener('input', () => this.filtrarProductos());
        if (filterProdFecha) filterProdFecha.addEventListener('input', () => this.filtrarProductos());

        // Botones Generales
        document.getElementById('btn-refresh').addEventListener('click', () => this.cargarTodosLosDatos());
        document.getElementById('btn-export-inv').addEventListener('click', () => {
            if (this.state.moduloActual === 'tareas') {
                if (this.state.tabTareasActual === 'bitacora') {
                    utils.exportarCSV(this.state.bitacora, 'bitacora', ['Fecha', 'Descripcion', 'Usuario']);
                } else {
                    const mesesName = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    const dataExport = this.state.tareasRecurrentes.map(t => {
                        // Normalización robusta (igual que en ui.js)
                        const vals = Object.values(t);
                        const mProgRaw = t.MesesProg || t.mesesprog || vals[3] || '[]';
                        const mCompRaw = t.MesesComp || t.mesescomp || vals[4] || '[]';
                        
                        let prog = []; let comp = [];
                        try { prog = typeof mProgRaw === 'string' ? JSON.parse(mProgRaw) : (Array.isArray(mProgRaw) ? mProgRaw : []); } catch(e){}
                        try { comp = typeof mCompRaw === 'string' ? JSON.parse(mCompRaw) : (Array.isArray(mCompRaw) ? mCompRaw : []); } catch(e){}
                        
                        return {
                            Actividad: t.Nombre || t.nombre || t.Actividad || vals[1] || 'Sin nombre',
                            Categoria: t.Categoria || t.categoria || t.Tipo || vals[2] || 'General',
                            Meses_Programados: Array.isArray(prog) ? prog.map(m => mesesName[m-1]).join(', ') : '',
                            Meses_Completados: Array.isArray(comp) ? comp.map(m => mesesName[m-1]).join(', ') : '',
                            Usuario: t.Usuario || vals[5] || ''
                        };
                    });
                    utils.exportarCSV(dataExport, 'plan_mantenimiento', ['Actividad', 'Categoria', 'Meses_Programados', 'Meses_Completados', 'Usuario']);
                }
            } else {
                utils.exportarCSV(this.state.productos, 'inventario', ['ID', 'Nombre', 'Categoria', 'Descripcion', 'Cantidad', 'Unidad', 'FechaRegistro']);
            }
        });

        // Modal Productos
        const modalProd = document.getElementById('modal-producto');
        document.getElementById('btn-nuevo-producto').addEventListener('click', () => this.abrirNuevoProducto());
        document.getElementById('close-modal-producto').addEventListener('click', () => this.cerrarModal());
        document.getElementById('btn-cancelar-prod').addEventListener('click', () => this.cerrarModal());
        modalProd.addEventListener('click', e => { if (e.target === modalProd) this.cerrarModal(); });
        document.getElementById('form-producto').addEventListener('submit', async e => {
            e.preventDefault();
            await this.guardarProducto();
        });

        // Formularios Movimientos
        document.getElementById('form-entrada').addEventListener('submit', async e => {
            e.preventDefault();
            await this.registrarEntrada();
        });
        document.getElementById('form-salida').addEventListener('submit', async e => {
            e.preventDefault();
            await this.registrarSalida();
        });

        // Cambio de producto en salida para mostrar stock
        document.getElementById('salida-producto').addEventListener('change', e => {
            const prod = this.state.productos.find(p => String(p.ID) === String(e.target.value));
            const info = document.getElementById('salida-stock-info');
            if (prod) {
                const qty = Number(prod.Cantidad) || 0;
                info.innerHTML = `<i class="fa-solid fa-boxes-stacked"></i> Disponible: <strong>${qty} ${prod.Unidad}</strong>`;
                document.getElementById('salida-cantidad').max = qty;
            } else {
                info.innerHTML = `<i class="fa-solid fa-info-circle"></i> Seleccione un producto`;
            }
        });

        // Fechas por defecto
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('entrada-fecha').value = hoy;
        document.getElementById('salida-fecha').value = hoy;
        const prodFecha = document.getElementById('prod-fecha');
        if (prodFecha) prodFecha.value = hoy;
        
        // Entregas
        const formEntrega = document.getElementById('form-entrega');
        if (formEntrega) {
            formEntrega.addEventListener('submit', e => {
                e.preventDefault();
                this.registrarEntrega();
            });
            document.getElementById('entrega-fecha').value = hoy;
            
            document.getElementById('filter-entrega-nombre').addEventListener('input', () => this.filtrarEntregas());
            document.getElementById('filter-entrega-fecha').addEventListener('input', () => this.filtrarEntregas());
        }



        // Tareas Recurrentes Generar Checkboxes
        ui.generarCheckboxesMeses();
        
        const formRecurrente = document.getElementById('form-tarea-recurrente');
        if (formRecurrente) {
            formRecurrente.addEventListener('submit', e => {
                e.preventDefault();
                this.registrarTareaRecurrente();
            });
        }

        const formBitacora = document.getElementById('form-bitacora');
        if (formBitacora) {
            document.getElementById('bitacora-fecha').value = hoy;
            formBitacora.addEventListener('submit', e => {
                e.preventDefault();
                this.registrarBitacora();
            });
        }
    },

    // ── ACCIONES DE PRODUCTO ──
    abrirNuevoProducto() {
        document.getElementById('form-producto').reset();
        document.getElementById('prod-id-edit').value = '';
        document.getElementById('prod-id').disabled = false;
        document.getElementById('modal-titulo').textContent = 'Nuevo Producto';
        document.getElementById('grupo-cantidad-inicial').style.display = '';
        // Fecha de hoy por defecto
        const prodFechaEl = document.getElementById('prod-fecha');
        if (prodFechaEl) prodFechaEl.value = new Date().toISOString().split('T')[0];
        document.getElementById('modal-producto').classList.add('active');
    },

    abrirEditarProducto(id) {
        const prod = this.state.productos.find(p => String(p.ID) === String(id));
        if (!prod) return;
        document.getElementById('form-producto').reset();
        document.getElementById('prod-id-edit').value = prod.ID;
        document.getElementById('prod-id').value = prod.ID;
        document.getElementById('prod-id').disabled = true;
        document.getElementById('prod-nombre').value = prod.Nombre || '';
        document.getElementById('prod-categoria').value = prod.Categoria || '';
        document.getElementById('prod-unidad').value = prod.Unidad || 'Unidades';
        document.getElementById('prod-desc').value = prod.Descripcion || '';
        document.getElementById('prod-cantidad').value = prod.Cantidad || 0;
        const prodFechaEl = document.getElementById('prod-fecha');
        if (prodFechaEl) prodFechaEl.value = prod.FechaRegistro || '';
        document.getElementById('modal-titulo').textContent = 'Editar Producto';
        document.getElementById('grupo-cantidad-inicial').style.display = '';
        document.getElementById('modal-producto').classList.add('active');
    },

    cerrarModal() {
        document.getElementById('modal-producto').classList.remove('active');
        document.getElementById('prod-id').disabled = false;
    },

    async guardarProducto() {
        const idEdit = document.getElementById('prod-id-edit').value;
        const idInput = document.getElementById('prod-id').value.trim();
        const finalId = idEdit || idInput;
        const hoy = new Date().toISOString().split('T')[0];
        const prodFechaEl = document.getElementById('prod-fecha');

        const producto = {
            ID: String(finalId).trim(),
            Nombre: document.getElementById('prod-nombre').value.trim(),
            Categoria: document.getElementById('prod-categoria').value.trim(),
            Descripcion: document.getElementById('prod-desc').value.trim(),
            Cantidad: parseInt(document.getElementById('prod-cantidad').value) || 0,
            Unidad: document.getElementById('prod-unidad').value,
            FechaRegistro: (prodFechaEl && prodFechaEl.value) ? prodFechaEl.value : hoy
        };

        if (!producto.ID || !producto.Nombre || !producto.Categoria) {
            utils.mostrarToast('Complete los campos requeridos', 'warning');
            return;
        }

        console.log('[DEBUG] Enviando producto al servidor:', producto);

        utils.mostrarLoader('Guardando producto...');
        try {
            const res = await api.post({ action: 'guardarProducto', producto });
            utils.mostrarToast(res.mensaje || 'Producto guardado', 'success');

            const idx = this.state.productos.findIndex(p => String(p.ID) === String(finalId));
            if (idx !== -1) this.state.productos[idx] = producto;
            else this.state.productos.push(producto);

            this.cerrarModal();
            this.actualizarUI();
        } catch (err) {
            utils.mostrarToast('Error al guardar: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },

    async eliminarProducto(id) {
        const idLimpio = String(id).trim();
        if (!confirm(`¿Eliminar el producto "${idLimpio}"?\nEsta acción no se puede deshacer.`)) return;
        
        utils.mostrarLoader('Eliminando producto...');
        try {
            const res = await api.post({ action: 'eliminarProducto', id: idLimpio });
            
            // Si el servidor confirma éxito, actualizamos el estado local
            this.state.productos = this.state.productos.filter(p => String(p.ID).trim() !== idLimpio);
            
            utils.mostrarToast(res.mensaje || 'Producto eliminado', 'success');
            this.actualizarUI();
        } catch (err) {
            console.error('Error al eliminar:', err);
            utils.mostrarToast('Error al eliminar: ' + err.message, 'danger');
            // Recargar datos por si acaso hay desincronización
            this.cargarTodosLosDatos();
        } finally {
            utils.ocultarLoader();
        }
    },

    // ── ACCIONES DE MOVIMIENTO ──
    async registrarEntrada() {
        const prodId = document.getElementById('entrada-producto').value;
        const cantidad = parseInt(document.getElementById('entrada-cantidad').value);
        const fecha = document.getElementById('entrada-fecha').value;
        const obs = document.getElementById('entrada-obs').value.trim();

        if (!prodId || cantidad < 1 || !fecha) {
            utils.mostrarToast('Complete campos requeridos', 'warning'); return;
        }

        const prod = this.state.productos.find(p => String(p.ID) === String(prodId));
        if (!prod) return;

        const movimiento = { ID_Producto: prod.ID, Nombre_Producto: prod.Nombre, Cantidad: cantidad, Fecha: fecha, Observacion: obs || 'Ingreso' };

        utils.mostrarLoader('Registrando entrada...');
        try {
            const res = await api.post({ action: 'registrarEntrada', movimiento });
            utils.mostrarToast(`Entrada registrada. Stock: ${res.stock_nuevo}`, 'success');

            prod.Cantidad = res.stock_nuevo;
            this.state.entradas.push({ ...movimiento, ID_Movimiento: res.id_movimiento });

            document.getElementById('form-entrada').reset();
            document.getElementById('entrada-fecha').value = new Date().toISOString().split('T')[0];
            this.actualizarUI();
        } catch (err) {
            utils.mostrarToast('Error: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },

    async registrarSalida() {
        const prodId = document.getElementById('salida-producto').value;
        const cantidad = parseInt(document.getElementById('salida-cantidad').value);
        const fecha = document.getElementById('salida-fecha').value;
        const obs = document.getElementById('salida-obs').value.trim();

        if (!prodId || cantidad < 1 || !fecha) {
            utils.mostrarToast('Complete campos requeridos', 'warning'); return;
        }

        const prod = this.state.productos.find(p => String(p.ID) === String(prodId));
        if (!prod) return;

        if (cantidad > Number(prod.Cantidad)) {
            utils.mostrarToast(`Stock insuficiente. Disp: ${prod.Cantidad}`, 'danger'); return;
        }

        const movimiento = { ID_Producto: prod.ID, Nombre_Producto: prod.Nombre, Cantidad: cantidad, Fecha: fecha, Observacion: obs || 'Retiro' };

        utils.mostrarLoader('Registrando salida...');
        try {
            const res = await api.post({ action: 'registrarSalida', movimiento });
            utils.mostrarToast(`Salida registrada. Stock: ${res.stock_nuevo}`, 'success');

            prod.Cantidad = res.stock_nuevo;
            this.state.salidas.push({ ...movimiento, ID_Movimiento: res.id_movimiento });

            document.getElementById('form-salida').reset();
            document.getElementById('salida-fecha').value = new Date().toISOString().split('T')[0];
            document.getElementById('salida-stock-info').innerHTML = `<i class="fa-solid fa-info-circle"></i> Seleccione un producto`;
            
            this.actualizarUI();
        } catch (err) {
            utils.mostrarToast('Error: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },

    // ── FILTROS DE PRODUCTOS ──
    filtrarProductos() {
        const nombre = (document.getElementById('filter-prod-nombre')?.value || '').toLowerCase().trim();
        const fecha  = document.getElementById('filter-prod-fecha')?.value || '';
        ui.renderizarProductos(this.state.productos, nombre, fecha);
    },

    // ── ACCIONES DE ENTREGAS ──
    filtrarEntregas() {
        const nombre = (document.getElementById('filter-entrega-nombre').value || '').toLowerCase().trim();
        const fecha = document.getElementById('filter-entrega-fecha').value || '';
        
        let filtradas = this.state.entregas;
        if (nombre) filtradas = filtradas.filter(t => t.Nombre.toLowerCase().includes(nombre));
        if (fecha) filtradas = filtradas.filter(t => t.Fecha === fecha);
        
        ui.renderizarEntregas(filtradas);
    },

    async registrarEntrega() {
        const nombre = document.getElementById('entrega-nombre').value.trim();
        const fecha = document.getElementById('entrega-fecha').value;
        const desc = document.getElementById('entrega-desc').value.trim();

        if (!nombre || !fecha || !desc) {
            utils.mostrarToast('Complete los campos de la entrega', 'warning');
            return;
        }

        const nuevaEntrega = {
            id: Date.now().toString(),
            Nombre: nombre,
            Fecha: fecha,
            Descripcion: desc
        };

        utils.mostrarLoader('Registrando entrega...');
        try {
            const res = await api.post({ action: 'registrarEntrega', entrega: nuevaEntrega });
            utils.mostrarToast(res.mensaje || 'Entrega registrada correctamente', 'success');
            
            this.state.entregas.push(nuevaEntrega);
            
            document.getElementById('form-entrega').reset();
            document.getElementById('entrega-fecha').value = new Date().toISOString().split('T')[0];
            
            this.filtrarEntregas();
        } catch (err) {
            utils.mostrarToast('Error al registrar: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },

    async eliminarEntrega(id) {
        if (!confirm('¿Desea eliminar esta entrega?')) return;
        
        utils.mostrarLoader('Eliminando entrega...');
        try {
            const res = await api.post({ action: 'eliminarEntrega', id });
            utils.mostrarToast(res.mensaje || 'Entrega eliminada', 'success');
            
            this.state.entregas = this.state.entregas.filter(t => String(t.id) !== String(id));
            this.filtrarEntregas();
        } catch (err) {
            utils.mostrarToast('Error al eliminar: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },



    // ── NAVEGACIÓN TABS TAREAS ──
    switchTareasTab(tabId) {
        this.state.tabTareasActual = tabId;
        document.querySelectorAll('.tareas-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.getElementById('tab-tareas-recurrentes').style.display = tabId === 'recurrentes' ? 'block' : 'none';
        document.getElementById('tab-tareas-bitacora').style.display    = tabId === 'bitacora' ? 'block' : 'none';
    },

    // ── ACCIONES TAREAS RECURRENTES ──
    async registrarTareaRecurrente() {
        const nombre = document.getElementById('tr-nombre').value.trim();
        const categoriaEl = document.getElementById('tr-categoria');
        const categoria = categoriaEl ? categoriaEl.value : 'General';
        if (!nombre) return;

        // Recolectar meses tickeados (1 a 12)
        const checkboxes = document.querySelectorAll('.tr-mes-check');
        const mesesProg = [];
        checkboxes.forEach(cb => {
            if (cb.checked) mesesProg.push(Number(cb.value));
        });

        if (mesesProg.length === 0) {
            utils.mostrarToast('Selecciona al menos un mes a programar', 'warning');
            return;
        }

        const usr = sessionStorage.getItem('inv_currentUser') || 'Admin';
        const nueva = { 
            id: 'TR-' + Date.now().toString(), 
            Nombre: nombre, 
            Categoria: categoria, 
            MesesProg: JSON.stringify(mesesProg), 
            MesesComp: "[]", 
            Año: new Date().getFullYear().toString(),
            Usuario: usr 
        };
        
        utils.mostrarLoader('Guardando configuración...');
        try {
            const res = await api.post({ action: 'guardarTareaRecurrente', tarea: nueva });
            utils.mostrarToast(res.mensaje || 'Programación Anual guardada', 'success');
            
            this.state.tareasRecurrentes.push(nueva);
            
            document.getElementById('form-tarea-recurrente').reset();
            ui.renderizarTareasRecurrentes(this.state.tareasRecurrentes);
        } catch (err) {
            utils.mostrarToast('Error al guardar: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },

    async toggleMesTarea(idTarea, mes) {
        const mesNum = Number(mes);
        // Encontrar la tarea en estado local
        const tarea = this.state.tareasRecurrentes.find(t => String(t.id) === String(idTarea));
        if (!tarea) { utils.mostrarToast('Tarea no encontrada localmente', 'danger'); return; }

        utils.mostrarLoader('Actualizando estado...');
        try {
            const res = await api.post({ action: 'toggleMesTarea', id: idTarea, mes: mesNum });
            if (res.error) throw new Error(res.error);
            utils.mostrarToast(res.mensaje || 'Actualizado', 'success');

            // Actualizar localmente (sin esperar a recargar)
            let comp = [];
            try { comp = JSON.parse(tarea.MesesComp || '[]').map(Number); } catch (e) { comp = []; }
            if (comp.includes(mesNum)) {
                comp = comp.filter(m => m !== mesNum);
            } else {
                comp.push(mesNum);
            }
            tarea.MesesComp = JSON.stringify(comp);

            ui.renderizarTareasRecurrentes(this.state.tareasRecurrentes);
        } catch (err) {
            utils.mostrarToast('Error de sincronización: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },

    async eliminarTareaRecurrente(id) {
        if (!confirm('¿Eliminar por completo esta programación anual?')) return;
        utils.mostrarLoader('Eliminando programación...');
        try {
            await api.post({ action: 'eliminarTareaRecurrente', id });
            utils.mostrarToast('Programación eliminada', 'success');
            this.state.tareasRecurrentes = this.state.tareasRecurrentes.filter(t => String(t.id) !== String(id));
            ui.renderizarTareasRecurrentes(this.state.tareasRecurrentes);
        } catch (err) {
            utils.mostrarToast('Error al eliminar: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },

    // ── ACCIONES BITÁCORA ──
    abrirImagen(src) {
        if (!src || src.includes('data:image/gif')) return;
        const modal = document.getElementById('modal-visor');
        const img = document.getElementById('visor-imagen-src');
        if (modal && img) {
            img.src = src;
            modal.classList.add('active');
        }
    },

    cerrarImagen() {
        const modal = document.getElementById('modal-visor');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                const img = document.getElementById('visor-imagen-src');
                if (img) img.src = '';
            }, 300);
        }
    },
    async registrarBitacora() {
        const fecha = document.getElementById('bitacora-fecha').value;
        const desc = document.getElementById('bitacora-desc').value.trim();
        const fileInput = document.getElementById('bitacora-file');

        if (!fecha || !desc || !fileInput.files[0]) return;

        utils.mostrarLoader('Comprimiendo imagen...');
        
        try {
            // Leer y comprimir la imagen localmente
            const base64Image = await this.comprimirImagenAbase64(fileInput.files[0]);
            const usr = sessionStorage.getItem('inv_currentUser') || 'Admin';
            const payload = { 
                id: Date.now().toString(), 
                Fecha: fecha, 
                Descripcion: desc, 
                Imagen: base64Image,
                Usuario: usr 
            };
            
            utils.mostrarLoader('Subiendo evidencia...');
            const res = await api.post({ action: 'registrarBitacora', bitacora: payload });
            utils.mostrarToast(res.mensaje || 'Registro completado', 'success');
            
            this.state.bitacora.unshift(payload); // Meter primero para que salga arriba
            
            document.getElementById('form-bitacora').reset();
            document.getElementById('bitacora-fecha').value = new Date().toISOString().split('T')[0];
            
            ui.renderizarBitacora(this.state.bitacora);
        } catch (err) {
            utils.mostrarToast('Error en la Bitácora: ' + err.message, 'danger');
        } finally {
            utils.ocultarLoader();
        }
    },

    // Función auxiliar para comprimir al máximo una imagen subida por el usuario
    comprimirImagenAbase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600; // Resolución tope para no crashear Google Sheets
                    const MAX_HEIGHT = 600;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Comprimir drásticamente a JPEG (0.5 calidad)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.5); 
                    resolve(dataUrl);
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    }
};

window.MainApp = MainApp;

window.startApp = function(mode) {
    const landing = document.getElementById('landing-portal');
    const appCont = document.getElementById('app-container');
    
    if (landing) {
        landing.style.opacity = '0';
        setTimeout(() => {
            landing.style.display = 'none';
            if (appCont) {
                appCont.style.display = 'flex';
                // Trigger a reflow
                void appCont.offsetWidth;
                appCont.style.opacity = '1';
                MainApp.setMode(mode);
            }
        }, 600);
    } else {
        MainApp.setMode(mode);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    MainApp.init();
});
