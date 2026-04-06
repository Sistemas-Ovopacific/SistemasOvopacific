// ==============================================================================
// backend.gs - Google Apps Script para Sistema de Inventario y Mantenimiento
// ==============================================================================

const NOMBRES_HOJAS = {
  PRODUCTOS: 'Productos',
  ENTRADAS: 'Entradas',
  SALIDAS: 'Salidas',
  ENTREGAS: 'Entregas',
  TAREAS_MENSUALES: 'TareasMensuales', 
  TAREAS_SEMANALES: 'TareasSemanales', 
  PLAN_PREVENTIVO: 'MantenimientoPreventivo',
  USUARIOS_PREVENTIVO: 'UsuariosPreventivo', // Nueva pestaña para responsables
  BITACORA: 'Bitacora',
  USUARIOS: 'Usuarios' // Usuarios del login
};

// ================= CONFIGURACIÓN =================
const SPREADSHEET_ID = '1WAI12VaIhhZDHefdfryjpQjXcmIAhNmwVPkqgqo3orI';
const DRIVE_FOLDER_ID = '1MRlf29HmpJkc5Zi8_yjrQikKv0cWvVqB'; 

function getSpreadsheet() {
  try {
    if (SPREADSHEET_ID) {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error("No se pudo acceder a la hoja. Verifica permisos o ID.");
  }
}

// ==========================================
// 1. GESTIÓN DE CORS OBLIGATORIA
// ==========================================
function respuestaJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("");
}

// ==========================================
// 2. DO GET (Leer Datos)
// ==========================================
function doGet(e) {
  const action = e.parameter.action;

  try {
    switch (action) {
      case 'login':
        return login(e.parameter.usuario, e.parameter.password);
      case 'getProductos':
        return respuestaJSON(leerHoja(NOMBRES_HOJAS.PRODUCTOS));
      case 'getEntradas':
        return respuestaJSON(leerHoja(NOMBRES_HOJAS.ENTRADAS));
      case 'getSalidas':
        return respuestaJSON(leerHoja(NOMBRES_HOJAS.SALIDAS));
      case 'getEntregas':
        return respuestaJSON(leerHoja(NOMBRES_HOJAS.ENTREGAS));
      case 'getUsuarios':
        return respuestaJSON(leerHoja(NOMBRES_HOJAS.USUARIOS));
      case 'getTareasData':
        return respuestaJSON({
          tareasRecurrentes: leerHoja(NOMBRES_HOJAS.TAREAS_MENSUALES),
          tareasSemanales: leerHoja(NOMBRES_HOJAS.TAREAS_SEMANALES),
          planPreventivo: leerHoja(NOMBRES_HOJAS.PLAN_PREVENTIVO),
          usuariosPreventivo: leerHoja(NOMBRES_HOJAS.USUARIOS_PREVENTIVO),
          bitacora: leerHoja(NOMBRES_HOJAS.BITACORA)
        });
      default:
        return respuestaJSON({ error: "Acción GET no reconocida" });
    }
  } catch (error) {
    return respuestaJSON({ error: error.message });
  }
}

// ==========================================
// 3. DO POST (Escribir / Subir Datos)
// ==========================================
function doPost(e) {
  try {
    let payload;
    if (e.parameter && e.parameter.data) {
      payload = JSON.parse(e.parameter.data);
    } else {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action;

    switch (action) {
      // --------- INVENTARIO Y ENTREGAS ---------
      case 'guardarProducto':
        return respuestaJSON(guardarItem(NOMBRES_HOJAS.PRODUCTOS, payload.producto, 'ID'));
      case 'eliminarProducto':
        return respuestaJSON(eliminarItem(NOMBRES_HOJAS.PRODUCTOS, payload.id, 'ID'));
      case 'registrarEntrada':
        return respuestaJSON(registrarMovimiento('entrada', payload.movimiento));
      case 'registrarSalida':
        return respuestaJSON(registrarMovimiento('salida', payload.movimiento));
      case 'registrarEntrega':
        return respuestaJSON(guardarItem(NOMBRES_HOJAS.ENTREGAS, payload.entrega, 'id'));
      case 'eliminarEntrega':
        return respuestaJSON(eliminarItem(NOMBRES_HOJAS.ENTREGAS, payload.id, 'id'));

      // --------- MÓDULO TAREAS MENSUALES ---------
      case 'addTareaMensualGroup':
        return respuestaJSON(crearMesesEspecificos(payload.Nombre, payload.meses, payload.UsuarioSistema));
      
      case 'updateTareaMensual':
        return respuestaJSON(guardarItem(NOMBRES_HOJAS.TAREAS_MENSUALES, payload.tarea, 'id'));

      case 'deleteTareaMensual':
        return respuestaJSON(eliminarItem(NOMBRES_HOJAS.TAREAS_MENSUALES, payload.id, 'id'));

      case 'deleteTareaMensualGroup':
        return respuestaJSON(eliminarTareasPorNombre(NOMBRES_HOJAS.TAREAS_MENSUALES, payload.Nombre));

      // --------- MÓDULO TAREAS SEMANALES ---------
      case 'addTareaSemanal':
        return respuestaJSON(guardarItem(NOMBRES_HOJAS.TAREAS_SEMANALES, {
          id: payload.id,
          Nombre: payload.Nombre,
          Semana: payload.Semana,
          FechaCreacion: payload.FechaCreacion,
          FechaFinalizacion: payload.FechaFinalizacion,
          Estado: payload.Estado,
          UsuarioSistema: payload.UsuarioSistema
        }, 'id'));

      case 'updateTareaSemanal':
        return respuestaJSON(guardarItem(NOMBRES_HOJAS.TAREAS_SEMANALES, payload.tarea, 'id'));
        
      case 'deleteTareaSemanal':
        return respuestaJSON(eliminarItem(NOMBRES_HOJAS.TAREAS_SEMANALES, payload.id, 'id'));

      // --------- MÓDULO PREVENTIVAS ---------
      // Gestión del catálogo de usuarios/responsables del área
      case 'addUsuarioPreventivo':
        return respuestaJSON(guardarItem(NOMBRES_HOJAS.USUARIOS_PREVENTIVO, payload.usuario, 'id'));
      case 'deleteUsuarioPreventivo':
        return respuestaJSON(eliminarItem(NOMBRES_HOJAS.USUARIOS_PREVENTIVO, payload.id, 'id'));

      case 'addPreventivoIndividual':
        return respuestaJSON(guardarItem(NOMBRES_HOJAS.PLAN_PREVENTIVO, payload.preventivo, 'id'));
      
      case 'updatePreventivo':
        return respuestaJSON(guardarItem(NOMBRES_HOJAS.PLAN_PREVENTIVO, payload.preventivo, 'id'));

      case 'addPreventivoMasivo':
        // Asignar el mantenimiento a todos los usuarios de la base de datos en un mes
        return respuestaJSON(crearPreventivoATodos(payload.Mes, payload.FechaRealizacion, payload.UsuarioSistema));

      case 'deletePreventivo':
        return respuestaJSON(eliminarItem(NOMBRES_HOJAS.PLAN_PREVENTIVO, payload.id, 'id'));

      // --------- BITÁCORA ---------
      case 'uploadEvidencia':
        return respuestaJSON(subirEvidenciaDrive(payload));

      default:
        return respuestaJSON({ error: "Acción POST no reconocida" });
    }
  } catch (error) {
    return respuestaJSON({ error: error.message });
  }
}

// ==========================================
// 4. FUNCIONES DE TAREAS MASIVAS
// ==========================================

function crearMesesEspecificos(nombre, mesesSeleccionados, usuarioSistema) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(NOMBRES_HOJAS.TAREAS_MENSUALES);
  if (!sheet) {
    sheet = inicializarHojaVacia(ss, NOMBRES_HOJAS.TAREAS_MENSUALES);
  }

  const columnas = ["id", "Nombre", "Mes", "Estado", "FechaCreacion", "FechaFinalizacion", "UsuarioSistema"];
  const actualHeadersRange = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn()));
  let headers = actualHeadersRange.getValues()[0];
  
  if (sheet.getLastRow() === 0 || !headers.includes("Nombre")) {
    sheet.getRange(1, 1, 1, columnas.length).setValues([columnas]);
    headers = columnas;
  }

  const batchId = Date.now().toString();
  const fechaHoy = new Date().toISOString().split('T')[0];
  const itemsGuardados = [];

  const meses = Array.isArray(mesesSeleccionados) && mesesSeleccionados.length > 0 ? mesesSeleccionados : [1,2,3,4,5,6,7,8,9,10,11,12];

  for (let mes of meses) {
    const obj = {
      id: "TM-" + batchId + "-" + mes,
      Nombre: nombre,
      Mes: mes,
      Estado: "Pendiente",
      FechaCreacion: fechaHoy,
      FechaFinalizacion: "",
      UsuarioSistema: usuarioSistema
    };

    const rowArray = headers.map(h => obj[h] !== undefined ? obj[h] : "");
    sheet.appendRow(rowArray);
    itemsGuardados.push(obj);
  }

  return { success: true, generados: itemsGuardados };
}

function eliminarTareasPorNombre(nombreHoja, nombreTarea) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) return { success: false, error: "La hoja no existe." };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: true };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIndex = headers.indexOf("Nombre");

  if (colIndex === -1) return { success: false, error: "No existe la columna Nombre" };

  let eliminados = 0;
  for (let i = lastRow; i > 1; i--) {
    let rowVal = data[i - 1][colIndex];
    if (String(rowVal).trim() === String(nombreTarea).trim()) {
      sheet.deleteRow(i);
      eliminados++;
    }
  }

  return { success: true, eliminados: eliminados };
}

function crearPreventivoATodos(mes, fechaManual, usuarioSistema) {
  const ss = getSpreadsheet();
  
  // 1. Obtener la lista de usuarios.
  let sheetUsr = ss.getSheetByName(NOMBRES_HOJAS.USUARIOS_PREVENTIVO);
  if (!sheetUsr || sheetUsr.getLastRow() <= 1) {
    throw new Error("No hay usuarios preventivos registrados. Creadlos en la sección Usuarios.");
  }
  const usrData = sheetUsr.getDataRange().getValues();
  const usrHeaders = usrData[0];
  const colUsrName = usrHeaders.indexOf("Nombre");
  const colUsrArea = usrHeaders.indexOf("Area");

  if (colUsrName === -1 || colUsrArea === -1) {
    throw new Error("La hoja de Usuarios Preventivo debe tener columnas 'Nombre' y 'Area'.");
  }

  let sheetPrev = ss.getSheetByName(NOMBRES_HOJAS.PLAN_PREVENTIVO);
  if (!sheetPrev) {
    sheetPrev = inicializarHojaVacia(ss, NOMBRES_HOJAS.PLAN_PREVENTIVO);
  }

  const columnas = ["id", "Area", "Usuario", "Mes", "Estado", "FechaRealizacion", "UsuarioSistema"];
  let prevHeaders;
  if(sheetPrev.getLastRow() === 0) {
    sheetPrev.getRange(1, 1, 1, columnas.length).setValues([columnas]);
    prevHeaders = columnas;
  } else {
    prevHeaders = sheetPrev.getRange(1, 1, 1, sheetPrev.getLastColumn()).getValues()[0];
  }

  const batchId = Date.now().toString();
  const fechaFinal = fechaManual ? fechaManual : "";
  const estadoFinal = fechaFinal !== "" ? "Realizado" : "Pendiente";
  const itemsGuardados = [];

  for (let i = 1; i < usrData.length; i++) {
    let unombre = usrData[i][colUsrName];
    let uarea = usrData[i][colUsrArea];
    if(!unombre) continue;

    const obj = {
      id: "PREV-" + batchId + "-" + i,
      Area: uarea,
      Usuario: unombre,
      Mes: mes,
      Estado: estadoFinal,
      FechaRealizacion: fechaFinal,
      UsuarioSistema: usuarioSistema
    };

    const rowArray = prevHeaders.map(h => obj[h] !== undefined ? obj[h] : "");
    sheetPrev.appendRow(rowArray);
    itemsGuardados.push(obj);
  }

  return { success: true, generados: itemsGuardados };
}

// ==========================================
// 5. FUNCIONES AUXILIARES GENERALES
// ==========================================
function leerHoja(nombreHoja) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) {
    sheet = inicializarHojaVacia(ss, nombreHoja);
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const items = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j] !== undefined ? data[i][j] : "";
    }
    items.push(obj);
  }
  return items;
}

function inicializarHojaVacia(ss, nombreHoja) {
  const sheet = ss.insertSheet(nombreHoja);
  sheet.appendRow(["id"]); 
  return sheet;
}

function guardarItem(nombreHoja, item, idField = "id") {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(nombreHoja);
  
  if (!sheet) {
    sheet = ss.insertSheet(nombreHoja);
    sheet.appendRow(Object.keys(item));
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const itemId = String(item[idField]).trim();
  let rowIndex = -1;

  const idColIndex = headers.indexOf(idField);
  if (idColIndex !== -1) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idColIndex]).trim() === itemId) {
        rowIndex = i + 1;
        break;
      }
    }
  }

  let rowAInsertar = headers.map(h => item[h] !== undefined ? item[h] : "");

  for (const key in item) {
    if (headers.indexOf(key) === -1) {
      headers.push(key);
      sheet.getRange(1, headers.length).setValue(key);
      rowAInsertar.push(item[key]);
    }
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowAInsertar.length).setValues([rowAInsertar]);
    return { success: true, mensaje: "Actualizado correctamente" };
  } else {
    sheet.appendRow(rowAInsertar);
    return { success: true, mensaje: "Registrado correctamente", idAñadido: itemId };
  }
}

function eliminarItem(nombreHoja, id, idField = "id") {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) return { error: "Hoja no encontrada" };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColIndex = headers.indexOf(idField);
  
  if (idColIndex === -1) return { error: "Columna de ID no existe" };

  const idStr = String(id).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]).trim() === idStr) {
      sheet.deleteRow(i + 1);
      return { success: true, mensaje: "Eliminado con éxito" };
    }
  }
  return { error: "ID no encontrado para eliminar" };
}

// INVENTARIO
function registrarMovimiento(tipo, movimiento) {
  const ss = getSpreadsheet();
  const movHoja = tipo === 'entrada' ? ss.getSheetByName(NOMBRES_HOJAS.ENTRADAS) || ss.insertSheet(NOMBRES_HOJAS.ENTRADAS) 
                                     : ss.getSheetByName(NOMBRES_HOJAS.SALIDAS) || ss.insertSheet(NOMBRES_HOJAS.SALIDAS);
  
  if (movHoja.getLastRow() === 0) {
    movHoja.appendRow(["ID_Movimiento", "ID_Producto", "Nombre_Producto", "Cantidad", "Fecha", "Observacion"]);
  }
  
  const idMov = (tipo.toUpperCase().substring(0,3)) + "-" + new Date().getTime();
  movimiento.ID_Movimiento = idMov;
  
  movHoja.appendRow([
    idMov,
    movimiento.ID_Producto,
    movimiento.Nombre_Producto,
    movimiento.Cantidad,
    movimiento.Fecha,
    movimiento.Observacion
  ]);

  const prodHoja = ss.getSheetByName(NOMBRES_HOJAS.PRODUCTOS);
  if (!prodHoja) return { error: "Falta hoja de productos" };
  
  const data = prodHoja.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('ID');
  const cantCol = headers.indexOf('Cantidad');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(movimiento.ID_Producto).trim()) {
      let cantActual = Number(data[i][cantCol]) || 0;
      let movCant = Number(movimiento.Cantidad);
      let nuevoStock = tipo === 'entrada' ? cantActual + movCant : cantActual - movCant;
      prodHoja.getRange(i + 1, cantCol + 1).setValue(nuevoStock);
      return { success: true, id_movimiento: idMov, stock_nuevo: nuevoStock };
    }
  }
  return { error: "Producto no encontrado para actualizar stock." };
}

function login(usuario, password) {
  const data = leerHoja(NOMBRES_HOJAS.USUARIOS);
  
  if (!data || data.length === 0) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(NOMBRES_HOJAS.USUARIOS);
    if (!sheet) { sheet = ss.insertSheet(NOMBRES_HOJAS.USUARIOS); }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["usuario", "password", "nombre", "rol"]);
      sheet.appendRow(["admin", "1234", "Administrador", "admin"]);
    }
    if (usuario === "admin" && password === "1234") {
       return respuestaJSON({ success: true, usuario: "admin", nombre: "Administrador", rol: "admin" });
    }
    return respuestaJSON({ error: "Debe crear usuarios en la hoja Usuarios de Google Sheets" });
  }

  for (let i = 0; i < data.length; i++) {
    if (String(data[i].usuario).trim().toLowerCase() === String(usuario).trim().toLowerCase() && 
        String(data[i].password).trim() === String(password).trim()) {
      return respuestaJSON({
        success: true,
        usuario: data[i].usuario,
        nombre: data[i].nombre,
        rol: String(data[i].rol).toLowerCase() 
      });
    }
  }
  return respuestaJSON({ error: "Usuario o contraseña incorrectos" });
}

function subirEvidenciaDrive(payload) {
  try {
    const bytes = Utilities.base64Decode(payload.base64Data);
    const blob = Utilities.newBlob(bytes, payload.mimeType, payload.filename);

    const CARPETA_NOMBRE = "Evidencias Mantenimiento";
    let carpeta;
    if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== '') {
        carpeta = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    } else {
        const carpetas = DriveApp.getFoldersByName("Evidencias Mantenimiento");
        if (carpetas.hasNext()) carpeta = carpetas.next();
        else carpeta = DriveApp.createFolder("Evidencias Mantenimiento");
    }

    const archivo = carpeta.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const urlArchivo = archivo.getUrl();

    const registro = {
      id: payload.id,
      Titulo: payload.Titulo,
      AsociadoA: payload.AsociadoA,
      Fecha: payload.Fecha,
      Descripcion: payload.Descripcion,
      DriveUrl: urlArchivo,
      UsuarioSistema: payload.UsuarioSistema
    };

    guardarItem(NOMBRES_HOJAS.BITACORA, registro, 'id');
    return { success: true, mensaje: "Evidencia subida correctamente", data: registro };
  } catch (error) {
    throw new Error("Error en Drive: " + error.message);
  }
}
