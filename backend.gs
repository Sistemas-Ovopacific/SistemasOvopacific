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
  USUARIOS_PREVENTIVO: 'UsuariosPreventivo',
  BITACORA: 'Bitacora',
  USUARIOS: 'Usuarios'
};

const SPREADSHEET_ID = '1WAI12VaIhhZDHefdfryjpQjXcmIAhNmwVPkqgqo3orI';
const DRIVE_FOLDER_ID = '1MRlf29HmpJkc5Zi8_yjrQikKv0cWvVqB'; 

function getSpreadsheet() {
  try {
    if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) { throw new Error("No se pudo acceder a la hoja."); }
}

function respuestaJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;
  try {
    switch (action) {
      case 'login': return login(e.parameter.usuario, e.parameter.password);
      case 'getTareasData':
        return respuestaJSON({
          tareasRecurrentes: leerHoja(NOMBRES_HOJAS.TAREAS_MENSUALES),
          tareasSemanales: leerHoja(NOMBRES_HOJAS.TAREAS_SEMANALES),
          planPreventivo: leerHoja(NOMBRES_HOJAS.PLAN_PREVENTIVO),
          usuariosPreventivo: leerHoja(NOMBRES_HOJAS.USUARIOS_PREVENTIVO),
          bitacora: leerHoja(NOMBRES_HOJAS.BITACORA)
        });
      case 'getProductos': return respuestaJSON(leerHoja(NOMBRES_HOJAS.PRODUCTOS));
      case 'getEntradas': return respuestaJSON(leerHoja(NOMBRES_HOJAS.ENTRADAS));
      case 'getSalidas': return respuestaJSON(leerHoja(NOMBRES_HOJAS.SALIDAS));
      case 'getEntregas': return respuestaJSON(leerHoja(NOMBRES_HOJAS.ENTREGAS));
      case 'getUsuarios': return respuestaJSON(leerHoja(NOMBRES_HOJAS.USUARIOS));
      case 'getAllData':
        return respuestaJSON({
          productos: leerHoja(NOMBRES_HOJAS.PRODUCTOS),
          entradas: leerHoja(NOMBRES_HOJAS.ENTRADAS),
          salidas: leerHoja(NOMBRES_HOJAS.SALIDAS),
          entregas: leerHoja(NOMBRES_HOJAS.ENTREGAS),
          tareasRecurrentes: leerHoja(NOMBRES_HOJAS.TAREAS_MENSUALES),
          tareasSemanales: leerHoja(NOMBRES_HOJAS.TAREAS_SEMANALES),
          planPreventivo: leerHoja(NOMBRES_HOJAS.PLAN_PREVENTIVO),
          usuariosPreventivo: leerHoja(NOMBRES_HOJAS.USUARIOS_PREVENTIVO),
          bitacora: leerHoja(NOMBRES_HOJAS.BITACORA)
        });
      default: return respuestaJSON({ error: "Acción no reconocida" });
    }
  } catch (err) { return respuestaJSON({ error: err.message }); }
}

function doPost(e) {
  try {
    let payload = JSON.parse(e.parameter && e.parameter.data ? e.parameter.data : (e.postData ? e.postData.contents : "{}"));
    const action = payload.action;
    switch (action) {
      case 'guardarProducto': return respuestaJSON(guardarItem(NOMBRES_HOJAS.PRODUCTOS, payload.producto, 'ID'));
      case 'eliminarProducto': return respuestaJSON(eliminarItem(NOMBRES_HOJAS.PRODUCTOS, payload.id, 'ID'));
      case 'registrarEntrada': return respuestaJSON(registrarMovimiento('entrada', payload.movimiento));
      case 'registrarSalida': return respuestaJSON(registrarMovimiento('salida', payload.movimiento));
      case 'registrarEntrega': return respuestaJSON(guardarItem(NOMBRES_HOJAS.ENTREGAS, payload.entrega, 'id'));
      case 'eliminarEntrega': return respuestaJSON(eliminarItem(NOMBRES_HOJAS.ENTREGAS, payload.id, 'id'));
      case 'addTareaMensualGroup': return respuestaJSON(crearMesesEspecificos(payload.Nombre, payload.meses, payload.UsuarioSistema));
      case 'updateTareaMensual': return respuestaJSON(guardarItem(NOMBRES_HOJAS.TAREAS_MENSUALES, payload.tarea, 'id'));
      case 'deleteTareaMensual': return respuestaJSON(eliminarItem(NOMBRES_HOJAS.TAREAS_MENSUALES, payload.id, 'id'));
      case 'deleteTareaMensualGroup': return respuestaJSON(eliminarTareasPorNombre(NOMBRES_HOJAS.TAREAS_MENSUALES, payload.Nombre));
      case 'addTareaSemanal': return respuestaJSON(guardarItem(NOMBRES_HOJAS.TAREAS_SEMANALES, payload, 'id'));
      case 'updateTareaSemanal': return respuestaJSON(guardarItem(NOMBRES_HOJAS.TAREAS_SEMANALES, payload.tarea, 'id'));
      case 'deleteTareaSemanal': return respuestaJSON(eliminarItem(NOMBRES_HOJAS.TAREAS_SEMANALES, payload.id, 'id'));
      case 'addUsuarioPreventivo': return respuestaJSON(guardarItem(NOMBRES_HOJAS.USUARIOS_PREVENTIVO, payload.usuario, 'id'));
      case 'deleteUsuarioPreventivo': return respuestaJSON(eliminarItem(NOMBRES_HOJAS.USUARIOS_PREVENTIVO, payload.id, 'id'));
      case 'addPreventivoMasivo': return respuestaJSON(addPreventivoMasivo(payload));
      case 'updatePreventivo': return respuestaJSON(guardarItem(NOMBRES_HOJAS.PLAN_PREVENTIVO, payload.preventivo, 'id'));
      case 'deletePreventivo': return respuestaJSON(eliminarItem(NOMBRES_HOJAS.PLAN_PREVENTIVO, payload.id, 'id'));
      case 'addRegistroPreventivo': return respuestaJSON(guardarItem(NOMBRES_HOJAS.PLAN_PREVENTIVO, payload.registro, 'id'));
      case 'uploadEvidencia': return respuestaJSON(subirEvidenciaDrive(payload));
      default: return respuestaJSON({ error: "Acción no reconocida" });
    }
  } catch (err) { return respuestaJSON({ error: err.message }); }
}

function getHeaderRowIndex(data) {
  for (let i = 0; i < data.length; i++) {
    const rowStr = data[i].join('').toLowerCase();
    if (rowStr.includes('id') || rowStr.includes('nombre') || rowStr.includes('fecha')) return i;
  }
  return 0;
}

function leerHoja(nombreHoja) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  let hIdx = getHeaderRowIndex(data);
  const h = data[hIdx].map(x => x.toString().trim());
  const items = [];
  for (let i = hIdx + 1; i < data.length; i++) {
    if (data[i].every(c => c === "")) continue;
    const obj = {};
    for (let j = 0; j < h.length; j++) {
      const key = h[j]; if (!key) continue;
      const val = data[i][j];
      obj[key] = val; obj[key.toLowerCase()] = val;
      const normalizedKey = key.toLowerCase().replace(/_/g, '').replace(/ /g, '');
      obj[normalizedKey] = val;
      if (normalizedKey === 'usuariosistemas') obj['usuariosistema'] = val;
    }
    items.push(obj);
  }
  return items;
}

function guardarItem(nombreHoja, item, idField = "id") {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) { sheet = ss.insertSheet(nombreHoja); sheet.appendRow(Object.keys(item)); }
  const data = sheet.getDataRange().getValues();
  const hIdx = getHeaderRowIndex(data);
  const h = data[hIdx].map(x => x.toString().trim());
  
  let itemId = "";
  for (let k in item) { if (k.toLowerCase() === idField.toLowerCase()) { itemId = String(item[k] || "").trim(); break; } }
  
  let idCol = -1;
  for (let j = 0; j < h.length; j++) { if (h[j].toLowerCase() === idField.toLowerCase()) { idCol = j; break; } }
  
  let rowIndex = -1;
  if (idCol !== -1 && itemId) {
    for (let i = hIdx + 1; i < data.length; i++) {
      if (String(data[i][idCol] || "").trim() === itemId) { rowIndex = i + 1; break; }
    }
  }
  
  let row = h.map((title, j) => {
    const tLowNorm = title.toLowerCase().replace(/_/g, '').replace(/ /g, '');
    for (let k in item) {
      const kLowNorm = k.toLowerCase().replace(/_/g, '').replace(/ /g, '');
      if (kLowNorm === tLowNorm || (kLowNorm === 'usuariosistema' && tLowNorm === 'usuariosistemas')) {
        if (item[k] !== undefined && item[k] !== null && item[k] !== "") return item[k];
      }
    }
    if (rowIndex !== -1) return data[rowIndex - 1][j];
    return "";
  });
  
  if (rowIndex !== -1) sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  return { success: true, data: item, mensaje: "Registro guardado correctamente" };
}

function eliminarItem(nombreHoja, id, idField = "id") {
  const sheet = getSpreadsheet().getSheetByName(nombreHoja);
  const data = sheet.getDataRange().getValues();
  const hIdx = getHeaderRowIndex(data);
  const h = data[hIdx].map(x => x.toString().trim());
  let idCol = -1;
  for (let j = 0; j < h.length; j++) { if (h[j].toLowerCase() === idField.toLowerCase()) { idCol = j; break; } }
  const idStr = String(id).trim();
  for (let i = hIdx + 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === idStr) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { error: "No se encontró el registro" };
}

function eliminarTareasPorNombre(nombreHoja, nombreTarea) {
  const sheet = getSpreadsheet().getSheetByName(nombreHoja);
  const data = sheet.getDataRange().getValues();
  const hIdx = getHeaderRowIndex(data);
  const h = data[hIdx].map(x => x.toString().trim());
  let col = -1;
  for(let j=0; j<h.length; j++) { if(h[j].toLowerCase()==='nombre') { col = j; break; } }
  for (let i = data.length; i > hIdx + 1; i--) { 
    if (String(data[i-1][col]).trim() === String(nombreTarea).trim()) sheet.deleteRow(i);
  }
  return { success: true };
}

function registrarMovimiento(tipo, mov) {
  const ss = getSpreadsheet();
  const movHojaName = tipo === 'entrada' ? NOMBRES_HOJAS.ENTRADAS : NOMBRES_HOJAS.SALIDAS;
  let movHoja = ss.getSheetByName(movHojaName);
  const cabeceras = ["ID_Movimiento", "ID_Producto", "Nombre_Producto", "Cantidad", "Fecha", "Observacion"];
  if (!movHoja) { movHoja = ss.insertSheet(movHojaName); movHoja.appendRow(cabeceras); }
  else { const d = movHoja.getDataRange().getValues(); if (d.length === 0 || d[0].join('') === "") movHoja.appendRow(cabeceras); }
  
  const idMov = (tipo.toUpperCase().substring(0,3)) + "-" + new Date().getTime();
  const idProd = mov.ID_Producto || mov.idproducto || "";
  const nomProd = mov.Nombre_Producto || mov.nombreproducto || "";
  movHoja.appendRow([idMov, idProd, nomProd, mov.Cantidad, mov.Fecha, mov.Observacion]);
  
  const pSheet = ss.getSheetByName(NOMBRES_HOJAS.PRODUCTOS);
  const pData = pSheet.getDataRange().getValues();
  const pHIdx = getHeaderRowIndex(pData);
  const pH = pData[pHIdx];
  let idCol = -1; let cCol = -1;
  for(let j=0; j<pH.length; j++){ 
    if(pH[j].toLowerCase() === 'id') idCol = j;
    if(pH[j].toLowerCase() === 'cantidad') cCol = j;
  }
  for (let i = pHIdx + 1; i < pData.length; i++) {
    if (String(pData[i][idCol]).trim() === String(idProd).trim()) {
      let cur = Number(pData[i][cCol]) || 0;
      let nuevoStock = tipo === 'entrada' ? cur + Number(mov.Cantidad) : cur - Number(mov.Cantidad);
      pSheet.getRange(i + 1, cCol + 1).setValue(nuevoStock);
      return { success: true, stock_nuevo: nuevoStock, mensaje: "Movimiento registrado" };
    }
  }
  return { error: "Producto no encontrado en la base de datos" };
}

function crearMesesEspecificos(nombre, meses, usuario) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(NOMBRES_HOJAS.TAREAS_MENSUALES);
  const cabeceras = ["id", "Nombre", "Mes", "Estado", "FechaCreacion", "FechaFinalizacion", "UsuarioSistema"];
  if (!sheet) { sheet = ss.insertSheet(NOMBRES_HOJAS.TAREAS_MENSUALES); sheet.appendRow(cabeceras); }
  const batchId = Date.now().toString();
  const fecha = new Date().toISOString().split('T')[0];
  const generados = [];
  meses.forEach(mes => {
    const obj = { id: "TM-" + batchId + "-" + mes, Nombre: nombre, Mes: mes, Estado: "Pendiente", FechaCreacion: fecha, FechaFinalizacion: "", UsuarioSistema: usuario };
    sheet.appendRow([obj.id, obj.Nombre, obj.Mes, obj.Estado, obj.FechaCreacion, obj.FechaFinalizacion, obj.UsuarioSistema]);
    generados.push(obj);
  });
  return { success: true, generados: generados };
}

function addPreventivoMasivo(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Usamos los nombres definidos al principio de tu script
  const shUsuarios = ss.getSheetByName(NOMBRES_HOJAS.USUARIOS_PREVENTIVO);
  const shRegistros = ss.getSheetByName(NOMBRES_HOJAS.PLAN_PREVENTIVO);
  
  if (!shUsuarios || !shRegistros) throw new Error("Asegúrate de tener las hojas 'UsuariosPreventivo' y 'MantenimientoPreventivo'");
  
  const usuarios = shUsuarios.getDataRange().getValues();
  const mes = data.Mes;
  const semana = data.Semana; 
  const fecha = data.FechaRealizacion || "";
  const usuarioSistema = data.UsuarioSistema || "Admin";
  
  // Buscar dinámicamente las columnas necesarias (ID y UsuarioSistema)
  const hIdx = getHeaderRowIndex(usuarios);
  const headers = usuarios[hIdx].map(h => h.toString().toLowerCase().trim());
  let idCol = headers.indexOf('id');
  let uSistCol = headers.indexOf('usuariosistema');
  if (uSistCol === -1) uSistCol = headers.indexOf('usuariosistemas'); // Fallback común
  
  if (idCol === -1) idCol = 0; // Fallback a columna A

  const usuariosData = usuarios.slice(hIdx + 1).filter(u => {
      if (uSistCol === -1) return true; // Si no hay columna de supervisor, incluimos a todos
      const uSist = (u[uSistCol] || "").toString().toLowerCase().trim();
      if (usuarioSistema.toLowerCase() === "admin") return true; 
      return uSist === usuarioSistema.toLowerCase();
  });

  const generados = [];
  const timestamp = Date.now();
  
  usuariosData.forEach((u, index) => {
    const id = "PREV-M-" + timestamp + "-" + index;
    const uid = u[0]; // ID del usuario (Columna A)
    
    // El orden de las columnas debe ser: 
    // id | UsuarioId | Mes | Semana | FechaRealizacion | Estado | Notas | UsuarioSistema
    const row = [id, uid, mes, semana, fecha, "Realizado", "Asignación Masiva", usuarioSistema];
    
    shRegistros.appendRow(row);
    
    generados.push({
      id: id, UsuarioId: uid, Mes: mes, Semana: semana,
      FechaRealizacion: fecha, Estado: "Realizado", Notas: "Asignación Masiva",
      UsuarioSistema: usuarioSistema
    });
  });
  
  return { success: true, generados: generados };
}

function subirEvidenciaDrive(p) {
  const ss = getSpreadsheet();
  let bHoja = ss.getSheetByName(NOMBRES_HOJAS.BITACORA);
  const bCab = ["id", "Titulo", "AsociadoA", "Fecha", "Descripcion", "DriveUrl", "UsuarioSistema"];
  if (!bHoja) { bHoja = ss.insertSheet(NOMBRES_HOJAS.BITACORA); bHoja.appendRow(bCab); }
  else {
    const data = bHoja.getDataRange().getValues();
    if (data.length === 0 || data[0].join('') === "") bHoja.getRange(1,1,1,bCab.length).setValues([bCab]);
    else if (data[0][0].toLowerCase() !== 'id') {
      bHoja.insertColumnBefore(1);
      bHoja.getRange(1, 1).setValue("id");
      for(let i=2; i<=bHoja.getLastRow(); i++) bHoja.getRange(i,1).setValue("EVID-OLD-"+i);
    }
  }
  
  const bytes = Utilities.base64Decode(p.base64Data);
  const blob = Utilities.newBlob(bytes, p.mimeType, p.filename);
  let parent = DRIVE_FOLDER_ID ? DriveApp.getFolderById(DRIVE_FOLDER_ID) : DriveApp.createFolder("Evidencias Sistemas");
  let folder = parent.createFolder((p.Titulo || "Doc").replace(/[/\\?%*:|"<>]/g, '-') + "_" + new Date().getTime());
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const reg = { id: p.id, Titulo: p.Titulo, AsociadoA: p.AsociadoA, Fecha: p.Fecha, Descripcion: p.Descripcion, DriveUrl: file.getUrl(), UsuarioSistema: p.UsuarioSistema };
  guardarItem(NOMBRES_HOJAS.BITACORA, reg, 'id');
  return { success: true, data: reg };
}

function login(usuario, password) {
  const data = leerHoja(NOMBRES_HOJAS.USUARIOS);
  const uInput = String(usuario).trim().toLowerCase();
  const pInput = String(password).trim();
  for (let i = 0; i < data.length; i++) {
    const user = (data[i].usuario || data[i].Username || "").toString().trim().toLowerCase();
    const pass = (data[i].password || data[i].Password || "").toString().trim();
    if (user === uInput && pass === pInput) {
      return respuestaJSON({ success: true, usuario: user, nombre: data[i].nombre || data[i].Nombre || user, rol: String(data[i].rol || data[i].Rol || "usuario").toLowerCase() });
    }
  }
  return respuestaJSON({ error: "Usuario o contraseña incorrectos" });
}
