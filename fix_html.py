with open(r'c:\Users\sosingenieria\.gemini\antigravity\scratch\Inventario-sistemas\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

clean = lines[:1062]

modal = (
    '    <!-- MODAL: REPORTES DIARIOS -->\n'
    '    <div id="modal-logs-diarios" class="modal" style="display:none;">\n'
    '        <div class="modal-content" style="max-width: 700px;">\n'
    '            <div class="modal-header">\n'
    '                <h2><i class="fa-solid fa-clipboard-list"></i> Reportes Diarios</h2>\n'
    '                <span class="close" id="close-modal-logs">&times;</span>\n'
    '            </div>\n'
    '            <div class="modal-body">\n'
    '                <div id="log-task-info" style="margin-bottom:20px;padding:15px;background:rgba(99,102,241,0.05);border-radius:10px;border-left:4px solid #6366f1;">\n'
    '                    <h3 id="modal-log-task-name" style="margin:0;color:#1e293b;">Nombre de la Tarea</h3>\n'
    '                    <p id="modal-log-task-id" style="margin:5px 0 0;font-size:0.85rem;color:#64748b;font-family:monospace;">ID: TS-000</p>\n'
    '                </div>\n'
    '                <form id="form-log-diario" class="mant-form" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:25px;padding:15px;border:1px dashed #cbd5e1;border-radius:8px;">\n'
    '                    <div class="form-group"><label for="log-fecha">Fecha</label><input type="date" id="log-fecha" required></div>\n'
    '                    <div class="form-group"><label for="log-inicio">Hora Inicio</label><input type="time" id="log-inicio" required></div>\n'
    '                    <div class="form-group"><label for="log-fin">Hora Fin</label><input type="time" id="log-fin" required></div>\n'
    '                    <div class="form-group full-width" style="grid-column:1/-1;"><label for="log-notas">Notas (Opcional)</label><input type="text" id="log-notas" placeholder="Que se hizo hoy?"></div>\n'
    '                    <div class="form-actions" style="grid-column:1/-1;margin-top:0;"><button type="submit" class="btn btn-primary" style="width:100%;"><i class="fa-solid fa-plus-circle"></i> Agregar Reporte del Dia</button></div>\n'
    '                </form>\n'
    '                <div class="table-wrap">\n'
    '                    <table class="preventivo-table">\n'
    '                        <thead><tr><th>Fecha</th><th>Inicio</th><th>Fin</th><th>Total</th><th>Accion</th></tr></thead>\n'
    '                        <tbody id="tbody-logs-diarios"></tbody>\n'
    '                    </table>\n'
    '                </div>\n'
    '            </div>\n'
    '        </div>\n'
    '    </div>\n'
    '</body>\n'
    '</html>\n'
)

clean.append(modal)

with open(r'c:\Users\sosingenieria\.gemini\antigravity\scratch\Inventario-sistemas\index.html', 'w', encoding='utf-8') as f:
    f.writelines(clean)

print('Done. Lines:', len(clean))
