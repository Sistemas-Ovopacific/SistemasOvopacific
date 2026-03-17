// ============================================================
//  app.js — Controlador Principal
// ============================================================

const MainApp = {
    // Estado Global
    state: {
        productos: [],
        entradas: [],
        salidas: [],
        chartInstance: null,
        vistaActual: 'productos'
    },

    init() {
        this.inicializarNavegacion();
        this.inicializarEventos();
        this.cargarTodosLosDatos();
    },

    // ── NAVEGACIÓN ──
    inicializarNavegacion() {
        document.querySelectorAll('#nav-links li').forEach(li => {
            li.addEventListener('click', () => this.cambiarVista(li.dataset.view));
        });
    },

    cambiarVista(vista) {
        this.state.vistaActual = vista;
        document.querySelectorAll('#nav-links li').forEach(li => {
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

        utils.mostrarLoader('Cargando datos desde Google Sheets...');
        ui.setConexionStatus('connecting');

        try {
            const [p, e, s] = await Promise.all([
                api.get('getProductos'),
                api.get('getEntradas'),
                api.get('getSalidas')
            ]);

            if (p.error) throw new Error(p.error);
            if (e.error) throw new Error(e.error);
            if (s.error) throw new Error(s.error);

            this.state.productos = Array.isArray(p) ? p : [];
            this.state.entradas = Array.isArray(e) ? e : [];
            this.state.salidas = Array.isArray(s) ? s : [];

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

        if (vistaActual === 'productos') ui.renderizarProductos(productos);
        if (vistaActual === 'entradas') ui.renderizarEntradas(entradas);
        if (vistaActual === 'salidas') ui.renderizarSalidas(salidas);
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
        this.actualizarUI();
    },

    // ── EVENTOS DOM ──
    inicializarEventos() {
        // Búsqueda
        document.getElementById('global-search').addEventListener('input', e => {
            const term = e.target.value.toLowerCase().trim();
            if (this.state.vistaActual === 'productos') ui.renderizarProductos(this.state.productos, term);
            if (this.state.vistaActual === 'inventario') ui.renderizarInventario(this.state.productos, term);
        });

        // Botones Generales
        document.getElementById('btn-refresh').addEventListener('click', () => this.cargarTodosLosDatos());
        document.getElementById('btn-export-inv').addEventListener('click', () => utils.exportarCSV(this.state.productos));

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
    },

    // ── ACCIONES DE PRODUCTO ──
    abrirNuevoProducto() {
        document.getElementById('form-producto').reset();
        document.getElementById('prod-id-edit').value = '';
        document.getElementById('prod-id').disabled = false;
        document.getElementById('modal-titulo').textContent = 'Nuevo Producto';
        document.getElementById('grupo-cantidad-inicial').style.display = '';
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

        const producto = {
            ID: String(finalId).trim(),
            Nombre: document.getElementById('prod-nombre').value.trim(),
            Categoria: document.getElementById('prod-categoria').value.trim(),
            Descripcion: document.getElementById('prod-desc').value.trim(),
            Cantidad: parseInt(document.getElementById('prod-cantidad').value) || 0,
            Unidad: document.getElementById('prod-unidad').value
        };

        if (!producto.ID || !producto.Nombre || !producto.Categoria) {
            utils.mostrarToast('Complete los campos requeridos', 'warning');
            return;
        }

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
    }
};

window.MainApp = MainApp;

document.addEventListener('DOMContentLoaded', () => {
    MainApp.init();
});
