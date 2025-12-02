// Detectar automáticamente la URL de la API según el entorno
// En desarrollo: usa localhost, en producción (Render): usa URL relativa
const URL_API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000'
    : ''; // URL relativa - usará el mismo dominio/host donde está alojada la aplicación

// - Variables Globales / Estado -
let createdObjectURLs = new Set(); // Para evitar fugas de memoria

// - Funciones de Ayuda -
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeString) {
    return timeString || 'Sin hora';
}

function showNotification(message, type = 'success') {
    const MAX_NOTIFICATIONS = 3;
    const currentNotifications = document.querySelectorAll('.notification');
    if (currentNotifications.length >= MAX_NOTIFICATIONS) {
        currentNotifications[0].remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = document.createElement('i');
    icon.className = `ph ph-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}`;
    
    const text = document.createElement('span');
    text.textContent = message;

    notification.appendChild(icon);
    notification.appendChild(text);

    document.body.appendChild(notification);

    // Mostrar notificación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Ocultar y eliminar notificación (más tiempo para errores, especialmente duplicados)
    const duration = type === 'error' && message.includes('ya está registrado') ? 6000 : 3500;
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, duration);
}

// - CRUD Estudiantes -
async function addStudent(studentData) {
    try {
        const res = await fetch(`${URL_API}/estudiantes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });
        
        // Leer la respuesta como texto primero
        const responseText = await res.text();
        
        if (!res.ok) {
            let errorMessage = `Error ${res.status}: ${res.statusText}`;
            let isDuplicate = false;
            
            // Intentar parsear como JSON
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
                isDuplicate = errorData.duplicate || false;
            } catch {
                // Si no es JSON, usar el texto directamente
                errorMessage = responseText || errorMessage;
            }
            
            const error = new Error(errorMessage);
            error.isDuplicate = isDuplicate;
            throw error;
        }
        
        // Si la respuesta es exitosa, parsear el JSON
        const result = JSON.parse(responseText);
        showNotification(`✅ ${studentData.nombre} ${studentData.apellido} registrado correctamente.`, "success");
        return true;
    } catch (error) {
        console.error("Error al registrar estudiante:", error);
        console.error("Error completo:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        let errorMessage;
        
        // Errores de conexión de red
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') || 
            error.message.includes('Network request failed') ||
            error.name === 'TypeError' && error.message.includes('fetch')) {
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            errorMessage = isLocalhost
                ? "❌ No se puede conectar al servidor. Verifica que el servidor esté corriendo en http://localhost:4000"
                : "❌ No se puede conectar al servidor. Por favor, intenta nuevamente o contacta al administrador.";
        } else if (error.isDuplicate || error.message.includes('ya está registrado')) {
            // Mensaje especial para duplicados
            errorMessage = error.message || `⚠️ No se puede registrar: ${studentData.nombre} ${studentData.apellido} ya está registrado en el sistema.`;
        } else if (!error.message || error.message.trim() === '' || error.message === 'Error al agregar estudiante:') {
            // Si el mensaje está vacío o incompleto
            errorMessage = "❌ Error desconocido al registrar estudiante. Por favor, verifica la conexión a la base de datos.";
        } else {
            errorMessage = `❌ Error al registrar: ${error.message}`;
        }
        showNotification(errorMessage, "error");
        return false; // Retornar false para que NO se limpie el formulario
    }
}

async function getAllStudents() {
    try {
        const res = await fetch(`${URL_API}/estudiantes`);
        if (!res.ok) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error cargando estudiantes:", error);
        const errorMessage = error.message.includes('Failed to fetch') || error.message.includes('NetworkError')
            ? "❌ No se puede conectar al servidor. Verifica que el servidor esté corriendo en http://localhost:4000"
            : `❌ Error al cargar estudiantes: ${error.message}`;
        showNotification(errorMessage, "error");
        return [];
    }
}

async function deleteStudent(id) {
    try {
        const res = await fetch(`${URL_API}/estudiantes/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            let errorMessage = `Error ${res.status}: ${res.statusText}`;
            try {
                const errorText = await res.text();
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
            } catch {
                // Si no se puede leer el texto, usar el mensaje por defecto
            }
            throw new Error(errorMessage);
        }
        showNotification("✅ Estudiante y todas sus citas eliminados.");
        return true;
    } catch (error) {
        console.error("Error al eliminar estudiante:", error);
        const errorMessage = error.message.includes('Failed to fetch') || error.message.includes('NetworkError')
            ? "❌ No se puede conectar al servidor. Verifica que el servidor esté corriendo en http://localhost:4000"
            : `❌ Error al eliminar estudiante: ${error.message}`;
        showNotification(errorMessage, "error");
        return false;
    }
}

// - CRUD Citas -
async function addAppointment(appointmentData) {
    try {
        const res = await fetch(`${URL_API}/citas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });
        
        // Leer la respuesta como texto primero
        const responseText = await res.text();
        
        if (!res.ok) {
            let errorMessage = `Error ${res.status}: ${res.statusText}`;
            let isMaxReached = false;
            
            // Intentar parsear como JSON
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
                isMaxReached = errorData.maxReached || false;
            } catch {
                // Si no es JSON, usar el texto directamente
                errorMessage = responseText || errorMessage;
            }
            
            const error = new Error(errorMessage);
            error.isMaxReached = isMaxReached;
            throw error;
        }
        
        // Si la respuesta es exitosa, parsear el JSON
        const result = JSON.parse(responseText);
        showNotification("📅 Cita agendada correctamente.", "success");
        return true;
    } catch (error) {
        console.error("Error al agendar cita:", error);
        let errorMessage;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = "❌ No se puede conectar al servidor. Verifica que el servidor esté corriendo en http://localhost:4000";
        } else if (error.isMaxReached || error.message.includes('No hay disponibilidad')) {
            // Mensaje especial para cuando se alcanza el límite
            errorMessage = error.message || "⚠️ Este día ya tiene el máximo de citas permitidas (2 citas por día).";
        } else {
            errorMessage = `❌ Error al agendar cita: ${error.message}`;
        }
        showNotification(errorMessage, "error");
        return false;
    }
}

async function getAllAppointments() {
    try {
        const res = await fetch(`${URL_API}/citas`);
        const data = await res.json();
        return Array.isArray(data) ? data.sort((a, b) => new Date(b.fecha + 'T' + b.hora) - new Date(a.fecha + 'T' + a.hora)) : [];
    } catch (error) {
        console.error("Error cargando citas:", error);
        return [];
    }
}

async function completeAppointment(appointmentId) {
    try {
        const res = await fetch(`${URL_API}/citas/${appointmentId}/completar`, { method: 'PUT' });
        if (!res.ok) {
            let errorMessage = `Error ${res.status}: ${res.statusText}`;
            try {
                const errorText = await res.text();
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
            } catch {
                // Si no se puede leer el texto, usar el mensaje por defecto
            }
            throw new Error(errorMessage);
        }
        showNotification("✅ Cita completada.");
        return true;
    } catch (error) {
        console.error("Error al completar cita:", error);
        const errorMessage = error.message.includes('Failed to fetch') || error.message.includes('NetworkError')
            ? "❌ No se puede conectar al servidor. Verifica que el servidor esté corriendo en http://localhost:4000"
            : `❌ Error al completar cita: ${error.message}`;
        showNotification(errorMessage, "error");
        return false;
    }
}

async function cancelAppointment(appointmentId) {
    try {
        const res = await fetch(`${URL_API}/citas/${appointmentId}/cancelar`, { method: 'PUT' });
        if (!res.ok) {
            let errorMessage = `Error ${res.status}: ${res.statusText}`;
            try {
                const errorText = await res.text();
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
            } catch {
                // Si no se puede leer el texto, usar el mensaje por defecto
            }
            throw new Error(errorMessage);
        }
        showNotification("🗑️ Cita cancelada.");
        return true;
    } catch (error) {
        console.error("Error al cancelar cita:", error);
        const errorMessage = error.message.includes('Failed to fetch') || error.message.includes('NetworkError')
            ? "❌ No se puede conectar al servidor. Verifica que el servidor esté corriendo en http://localhost:4000"
            : `❌ Error al cancelar cita: ${error.message}`;
        showNotification(errorMessage, "error");
        return false;
    }
}

async function updateAppointment(appointmentId, appointmentData) {
    try {
        const res = await fetch(`${URL_API}/citas/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });
        if (!res.ok) {
            let errorMessage = `Error ${res.status}: ${res.statusText}`;
            try {
                const errorText = await res.text();
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
            } catch {
                // Si no se puede leer el texto, usar el mensaje por defecto
            }
            throw new Error(errorMessage);
        }
        showNotification("📝 Cita actualizada.");
        return true;
    } catch (error) {
        console.error("Error al actualizar cita:", error);
        const errorMessage = error.message.includes('Failed to fetch') || error.message.includes('NetworkError')
            ? "❌ No se puede conectar al servidor. Verifica que el servidor esté corriendo en http://localhost:4000"
            : `❌ Error al actualizar cita: ${error.message}`;
        showNotification(errorMessage, "error");
        return false;
    }
}

async function deleteAppointment(appointmentId) {
    try {
        const res = await fetch(`${URL_API}/citas/${appointmentId}`, { method: 'DELETE' });
        if (!res.ok) {
            let errorMessage = `Error ${res.status}: ${res.statusText}`;
            try {
                const errorText = await res.text();
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
            } catch {
                // Si no se puede leer el texto, usar el mensaje por defecto
            }
            throw new Error(errorMessage);
        }
        showNotification("🗑️ Cita eliminada.");
        return true;
    } catch (error) {
        console.error("Error al eliminar cita:", error);
        const errorMessage = error.message.includes('Failed to fetch') || error.message.includes('NetworkError')
            ? "❌ No se puede conectar al servidor. Verifica que el servidor esté corriendo en http://localhost:4000"
            : `❌ Error al eliminar cita: ${error.message}`;
        showNotification(errorMessage, "error");
        return false;
    }
}

// - Renderizado UI: Estudiantes -
async function renderStudents(students = null) {
    const container = document.getElementById('studentsList');
    if (!container) return;

    const data = students || await getAllStudents();
    if (data.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No hay estudiantes registrados.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(student => {
        const card = document.createElement('div');
        card.className = 'student-card';
        const initials = `${student.nombre[0] || ''}${student.apellido[0] || ''}`.toUpperCase();
        card.innerHTML = `
            <div class="student-photo-container">
                ${student.foto ? `<img src="${student.foto}" alt="Foto" class="student-photo">` : `<span class="default-photo">${initials}</span>`}
            </div>
            <div class="student-info">
                <h3 class="card-name">${student.nombre} ${student.apellido}</h3>
                <p class="card-id">ID: ${student.id}</p>
            </div>
            <div class="card-body">
                <div class="card-detail"><i class="ph ph-gender-intersex"></i> ${student.sexo}</div>
                <div class="card-detail"><i class="ph ph-phone"></i> ${student.telefono || 'No registrado'}</div>
                <div class="card-detail"><i class="ph ph-graduation-cap"></i> ${student.carrera}</div>
            </div>
            <div class="card-actions">
                <button class="btn btn-info btn-sm view-appointments-btn" data-student-id="${student.id}">
                    <i class="ph ph-calendar"></i> Citas
                </button>
                <button class="btn btn-danger btn-sm delete-student-btn" data-student-id="${student.id}">
                    <i class="ph ph-trash"></i> Eliminar
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    // Event listeners para botones de eliminar
    document.querySelectorAll('.delete-student-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(e.target.closest('button').dataset.studentId);
            const studentName = e.target.closest('.student-card').querySelector('.card-name').textContent;
            
            if (confirm(`⚠️ ¿Eliminar permanentemente a ${studentName}?\n\nEsto también eliminará TODAS sus citas asociadas.\n\nEsta acción NO se puede deshacer.`)) {
                const success = await deleteStudent(id);
                if (success) {
                    // Recargar estudiantes para mostrar los nuevos IDs
                    await renderStudents();
                    // Si estamos en modo maestro, también actualizar esa vista
                    if (isMaestroMode) {
                        await renderMaestroStudents();
                    }
                }
            }
        });
    });

    // Event listeners para botones de ver citas
    document.querySelectorAll('.view-appointments-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const studentId = parseInt(e.target.closest('button').dataset.studentId);
            showStudentAppointments(studentId);
        });
    });
}

// - Renderizado UI: Citas -
async function renderAppointments() {
    const container = document.getElementById('appointmentsList');
    if (!container) return;

    const appointments = await getAllAppointments();
    if (appointments.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No hay citas programadas.</p>';
        return;
    }

    container.innerHTML = '<h3>Próximas Citas</h3><div class="appointments-grid"></div>';
    const grid = container.querySelector('.appointments-grid');

    // Filtrar citas programadas (próximas)
    const upcomingAppointments = appointments.filter(app => app.estado === 'programada');
    
    if (upcomingAppointments.length === 0) {
        grid.innerHTML = '<p class="empty-list-message">No hay citas programadas.</p>';
    } else {
        upcomingAppointments.forEach(app => {
            const item = createAppointmentItem(app);
            grid.appendChild(item);
        });
    }

    container.innerHTML += '<h3>Historial de Citas</h3><div class="appointments-grid"></div>';
    const historyGrid = container.querySelectorAll('.appointments-grid')[1];

    // Filtrar citas completadas y canceladas (historial)
    const historyAppointments = appointments.filter(app => 
        app.estado === 'completada' || app.estado === 'cancelada'
    );
    
    if (historyAppointments.length === 0) {
        historyGrid.innerHTML = '<p class="empty-list-message">No hay citas en el historial.</p>';
    } else {
        historyAppointments.forEach(app => {
            const item = createAppointmentItem(app);
            historyGrid.appendChild(item);
        });
    }
}

function createAppointmentItem(app) {
    const item = document.createElement('div');
    item.className = `appointment-item ${app.estado === 'completada' ? 'past-due' : ''}`;
    item.innerHTML = `
        <div class="appointment-header">
            <div class="appointment-student-info">
                <div class="appointment-default-photo"><i class="ph ph-user"></i></div>
                <span>Estudiante ID: ${app.student_id}</span>
            </div>
            <span class="badge ${app.estado === 'programada' ? 'bg-primary' : 'bg-success'}">${app.estado}</span>
        </div>
        <div class="appointment-body">
            <div class="appointment-datetime"><i class="ph ph-clock"></i> ${formatDate(app.fecha)} a las ${formatTime(app.hora)}</div>
            ${app.estado === 'completada' && app.fecha_completada ? `<div class="completion-date">Completada: ${formatDate(app.fecha_completada.split('T')[0])}</div>` : ''}
        </div>
        <div class="appointment-actions">
            <button class="btn btn-sm btn-warning edit-appointment-btn" data-id="${app.id}"><i class="ph ph-pencil"></i> Editar</button>
            ${app.estado === 'programada' ? `<button class="btn btn-sm btn-success complete-appointment-btn" data-id="${app.id}"><i class="ph ph-check"></i> Completar</button>` : ''}
            ${app.estado === 'programada' ? `<button class="btn btn-sm btn-secondary cancel-appointment-btn" data-id="${app.id}"><i class="ph ph-x"></i> Cancelar</button>` : ''}
            <button class="btn btn-sm btn-danger delete-appointment-btn" data-id="${app.id}"><i class="ph ph-trash"></i> Borrar</button>
        </div>
    `;

    // Event listeners para botones de acciones
    const editBtn = item.querySelector('.edit-appointment-btn');
    const deleteBtn = item.querySelector('.delete-appointment-btn');
    const completeBtn = item.querySelector('.complete-appointment-btn');
    const cancelBtn = item.querySelector('.cancel-appointment-btn');

    editBtn.addEventListener('click', () => editAppointment(app.id));
    
    deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Eliminar esta cita?')) {
            await deleteAppointment(app.id);
            // Refrescar calendario si está visible
            if (document.getElementById('appointments').classList.contains('active')) {
                await renderCalendar();
                if (selectedCalendarDate) {
                    await renderAppointmentsForDay(selectedCalendarDate);
                }
            }
        }
    });

    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            if (confirm('¿Marcar esta cita como completada?')) {
                await completeAppointment(app.id);
                // Refrescar calendario si está visible
                if (document.getElementById('appointments').classList.contains('active')) {
                    await renderCalendar();
                    if (selectedCalendarDate) {
                        await renderAppointmentsForDay(selectedCalendarDate);
                    }
                }
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
            if (confirm('¿Cancelar esta cita?')) {
                await cancelAppointment(app.id);
                // Refrescar calendario si está visible
                if (document.getElementById('appointments').classList.contains('active')) {
                    await renderCalendar();
                    if (selectedCalendarDate) {
                        await renderAppointmentsForDay(selectedCalendarDate);
                    }
                }
            }
        });
    }

    return item;
}

// - Variables globales para agendamiento -
let currentSchedulingStudentId = null;
let currentSchedulingStudentName = null;

// - Funciones de Citas por Estudiante -
async function showStudentAppointments(studentId) {
    const students = await getAllStudents();
    const student = students.find(s => s.id === studentId);
    
    if (!student) return;

    // Guardar información del estudiante para agendamiento
    currentSchedulingStudentId = studentId;
    currentSchedulingStudentName = `${student.nombre} ${student.apellido}`;

    // Cambiar a sección de citas
    document.querySelector('[data-section="appointments"]').click();
    
    // Seleccionar día actual por defecto
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await selectCalendarDay(todayStr);
}

async function editAppointment(appointmentId) {
    try {
        // Obtener la cita actual
        const appointments = await getAllAppointments();
        const appointment = appointments.find(app => app.id === appointmentId);
        
        if (!appointment) {
            showNotification("Cita no encontrada", "error");
            return;
        }

        // Obtener información del estudiante
        const students = await getAllStudents();
        const student = students.find(s => s.id === appointment.student_id);
        
        if (!student) {
            showNotification("Estudiante no encontrado", "error");
            return;
        }

        // Configurar para edición usando el calendario
        currentSchedulingStudentId = appointment.student_id;
        currentSchedulingStudentName = `${student.nombre} ${student.apellido}`;
        
        // Cambiar a sección de citas
        document.querySelector('[data-section="appointments"]').click();
        
        // Seleccionar la fecha de la cita
        await selectCalendarDay(appointment.fecha);
        
        // Llenar el campo de hora con la hora actual de la cita
        const timeInput = document.getElementById('appointmentTimeInput');
        if (timeInput) {
            timeInput.value = appointment.hora;
        }
        
        // Guardar el ID de la cita para edición (usaremos una variable global)
        window.editingAppointmentId = appointmentId;
        
        // Cambiar el título del panel
        const panelTitle = document.getElementById('schedulePanelTitle');
        if (panelTitle) {
            panelTitle.innerHTML = '<i class="ph ph-pencil"></i> Editar Cita';
        }

    } catch (error) {
        console.error("Error al editar cita:", error);
        showNotification("Error al cargar cita para edición", "error");
    }
}

// - Formulario de Registro de Estudiante -
document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Obtener valores de forma segura
    const nombre = formData.get('nombre') || '';
    const apellido = formData.get('apellido') || '';
    const sexo = formData.get('sexo') || '';
    const telefono = formData.get('telefono') || '';
    const carrera = formData.get('carrera') || '';
    
    // Validar campos requeridos
    if (!nombre.trim() || !apellido.trim() || !sexo || !carrera.trim()) {
        showNotification("Por favor completa todos los campos requeridos.", "error");
        return;
    }

    const studentData = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        sexo: sexo,
        telefono: telefono.trim() || null,
        carrera: carrera.trim(),
        foto: null
    };

    const fileInput = document.getElementById('fotoEstudiante');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) {
            showNotification('La foto no debe superar 2MB.', 'error');
            return;
        }
        const reader = new FileReader();
        const promise = new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
        studentData.foto = await promise;
    }

    if (await addStudent(studentData)) {
        e.target.reset();
        const preview = document.querySelector('.photo-upload-area');
        if (preview) {
            preview.innerHTML = '<i class="ph ph-camera"></i><p>Subir foto</p><small>Opcional</small>';
            preview.classList.remove('has-photo');
            preview.style.backgroundImage = 'none';
        }
        await renderStudents();
    }
});


// - Navegación entre Secciones -
document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        const section = document.getElementById(btn.getAttribute('data-section'));
        if (section) section.classList.add('active');

        if (btn.getAttribute('data-section') === 'appointments') {
            await renderCalendar();
            // Siempre seleccionar día actual por defecto para mostrar las citas
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            await selectCalendarDay(todayStr);
        }
    });
});

// - Preview de foto -
document.getElementById('fotoEstudiante').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const preview = document.querySelector('.photo-upload-area');
    
    if (file && preview) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.classList.add('has-photo');
        };
        reader.readAsDataURL(file);
    } else if (preview) {
        preview.innerHTML = '<i class="ph ph-camera"></i><p>Subir foto</p><small>Opcional</small>';
        preview.classList.remove('has-photo');
        preview.style.backgroundImage = 'none';
    }
});

// - Calendario Visual -
let calendarCurrentDate = new Date();
let selectedCalendarDate = null;

async function renderCalendar() {
    const monthYearDisplay = document.getElementById('calendarMonthYear');
    const calendarGrid = document.getElementById('calendarDaysGrid');
    if (!monthYearDisplay || !calendarGrid) return;

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    // Mostrar mes y año
    monthYearDisplay.textContent = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    // Obtener citas del mes
    const appointments = await getAllAppointments();
    const appointmentsInMonth = appointments.filter(app => {
        const appDate = new Date(app.fecha);
        return appDate.getFullYear() === year && appDate.getMonth() === month && app.estado === 'programada';
    });
    
    // Contar citas por día
    const appointmentsByDate = new Map();
    appointmentsInMonth.forEach(app => {
        const dateStr = app.fecha.split('T')[0];
        appointmentsByDate.set(dateStr, (appointmentsByDate.get(dateStr) || 0) + 1);
    });
    
    const appointmentDates = new Set(appointmentsInMonth.map(a => a.fecha.split('T')[0]));

    // Calcular primer día del mes y días totales
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // Limpiar grid
    calendarGrid.innerHTML = '';

    // Días vacíos antes del primer día del mes
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        dayEl.dataset.date = dateStr;
        
        // Verificar si el día es pasado
        const dayDate = new Date(year, month, day);
        dayDate.setHours(0, 0, 0, 0);
        const isPast = dayDate < today;
        
        // Contar citas del día
        const appointmentsCount = appointmentsByDate.get(dateStr) || 0;
        const MAX_APPOINTMENTS_PER_DAY = getMaxAppointmentsPerDay(); // Máximo de citas por día
        
        // Marcar día como disponible o no disponible
        if (isPast) {
            dayEl.classList.add('unavailable'); // Días pasados en rojo
        } else if (appointmentsCount >= MAX_APPOINTMENTS_PER_DAY) {
            dayEl.classList.add('unavailable'); // Días llenos en rojo
        } else {
            dayEl.classList.add('available'); // Días disponibles en verde
        }
        
        // Marcar si tiene citas
        if (appointmentDates.has(dateStr)) {
            dayEl.classList.add('has-appointments');
        }
        
        // Marcar día actual
        if (isCurrentMonth && day === today.getDate()) {
            dayEl.classList.add('today');
        }
        
        // Marcar día seleccionado
        if (selectedCalendarDate === dateStr) {
            dayEl.classList.add('selected');
        }
        
        // Event listener para seleccionar día (solo si está disponible)
        if (!isPast && appointmentsCount < MAX_APPOINTMENTS_PER_DAY) {
            dayEl.addEventListener('click', () => selectCalendarDay(dateStr));
        } else {
            dayEl.style.cursor = 'not-allowed';
            dayEl.title = isPast ? 'Día pasado' : `Día completo (${appointmentsCount}/${MAX_APPOINTMENTS_PER_DAY} citas)`;
        }
        
        calendarGrid.appendChild(dayEl);
    }
}

function navigateCalendar(monthOffset) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + monthOffset);
    renderCalendar();
}

async function selectCalendarDay(dateStr) {
    selectedCalendarDate = dateStr;
    
    // Actualizar visual del calendario
    document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
    const selectedDay = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
    if (selectedDay) {
        selectedDay.classList.add('selected');
    }
    
    // Mostrar citas del día
    await renderAppointmentsForDay(dateStr);
    
    // Si hay un estudiante seleccionado para agendar, mostrar panel de agendamiento
    if (currentSchedulingStudentId) {
        showAppointmentSchedulePanel(dateStr);
    }
}

// - Funciones para Modal de Selección de Estudiante -
async function openSelectStudentModal() {
    const modal = document.getElementById('selectStudentModal');
    const searchInput = document.getElementById('studentSearchModal');
    
    if (modal) {
        modal.style.display = 'flex';
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        await renderStudentSelectList();
    }
}

function closeSelectStudentModal() {
    const modal = document.getElementById('selectStudentModal');
    const searchInput = document.getElementById('studentSearchModal');
    
    if (modal) modal.style.display = 'none';
    if (searchInput) searchInput.value = '';
}

async function renderStudentSelectList(query = '') {
    const container = document.getElementById('studentSelectList');
    if (!container) return;

    const students = await getAllStudents();
    let filteredStudents = students;

    if (query) {
        filteredStudents = students.filter(s => 
            s.nombre.toLowerCase().includes(query) ||
            s.apellido.toLowerCase().includes(query) ||
            s.carrera.toLowerCase().includes(query) ||
            (s.telefono && s.telefono.toLowerCase().includes(query))
        );
    }

    if (filteredStudents.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No se encontraron estudiantes.</p>';
        return;
    }

    container.innerHTML = '';
    filteredStudents.forEach(student => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 1rem; margin-bottom: 0.5rem; background: var(--dark); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: var(--transition);';
        item.className = 'student-select-item';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="display: block; margin-bottom: 0.25rem;">${student.nombre} ${student.apellido}</strong>
                    <div style="color: var(--text-muted); font-size: 0.875rem;">
                        <span><i class="ph ph-graduation-cap"></i> ${student.carrera}</span>
                        ${student.telefono ? `<span style="margin-left: 1rem;"><i class="ph ph-phone"></i> ${student.telefono}</span>` : ''}
                    </div>
                </div>
                <i class="ph ph-arrow-right" style="color: var(--primary);"></i>
            </div>
        `;
        
        item.addEventListener('click', () => {
            selectStudentForAppointment(student.id, `${student.nombre} ${student.apellido}`);
        });

        item.addEventListener('mouseenter', () => {
            item.style.background = 'var(--bg-hover)';
            item.style.borderColor = 'var(--primary)';
        });

        item.addEventListener('mouseleave', () => {
            item.style.background = 'var(--dark)';
            item.style.borderColor = 'var(--border)';
        });

        container.appendChild(item);
    });
}

function selectStudentForAppointment(studentId, studentName) {
    // Verificar si estamos en modo programador
    if (window.isSelectingForProgramador && isProgramadorMode) {
        programadorCurrentSchedulingStudentId = studentId;
        programadorCurrentSchedulingStudentName = studentName;
        window.isSelectingForProgramador = false;
        
        closeSelectStudentModal();
        
        // Cambiar a sección de agendar cita del programador
        switchProgramadorView('appointments');
        
        // Seleccionar día actual por defecto
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        setTimeout(async () => {
            await selectProgramadorCalendarDay(todayStr);
        }, 100);
        
        showNotification(`Estudiante seleccionado: ${studentName}. Selecciona un día en el calendario.`, "success");
        return;
    }
    
    // Modo normal
    currentSchedulingStudentId = studentId;
    currentSchedulingStudentName = studentName;
    
    closeSelectStudentModal();
    
    // Cambiar a sección de citas si no está ahí
    const appointmentsSection = document.getElementById('appointments');
    if (appointmentsSection && !appointmentsSection.classList.contains('active')) {
        document.querySelector('[data-section="appointments"]')?.click();
    }
    
    // Seleccionar día actual por defecto
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    setTimeout(async () => {
        await selectCalendarDay(todayStr);
    }, 100);
    
    showNotification(`Estudiante seleccionado: ${studentName}. Selecciona un día en el calendario.`, "success");
}

function showAppointmentSchedulePanel(dateStr) {
    const panel = document.getElementById('appointmentSchedulePanel');
    const studentNameEl = document.getElementById('schedulePanelStudentName');
    const dateEl = document.getElementById('schedulePanelDate');
    const timeInput = document.getElementById('appointmentTimeInput');
    
    if (!panel) return;
    
    studentNameEl.textContent = currentSchedulingStudentName || 'Estudiante';
    dateEl.textContent = `Fecha: ${formatDate(dateStr)}`;
    timeInput.value = ''; // Limpiar hora
    
    panel.classList.remove('hidden');
}

function hideAppointmentSchedulePanel() {
    const panel = document.getElementById('appointmentSchedulePanel');
    if (panel) {
        panel.classList.add('hidden');
    }
    currentSchedulingStudentId = null;
    currentSchedulingStudentName = null;
    window.editingAppointmentId = null;
    
    // Restaurar título del panel
    const panelTitle = document.getElementById('schedulePanelTitle');
    if (panelTitle) {
        panelTitle.innerHTML = '<i class="ph ph-calendar-plus"></i> Agendar Nueva Cita';
    }
}

async function confirmAppointmentFromCalendar() {
    if (!selectedCalendarDate || !currentSchedulingStudentId) {
        showNotification("Por favor selecciona un día y asegúrate de tener un estudiante seleccionado.", "error");
        return;
    }
    
    const timeInput = document.getElementById('appointmentTimeInput');
    const hora = timeInput.value;
    
    if (!hora) {
        showNotification("Por favor selecciona una hora.", "error");
        return;
    }
    
    // Verificar que la fecha no sea en el pasado
    const selectedDate = new Date(selectedCalendarDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showNotification("No se pueden agendar citas en fechas pasadas.", "error");
        return;
    }
    
    // Verificar que el día no esté lleno (máximo 5 citas por día)
    const appointments = await getAllAppointments();
    const dayAppointments = appointments.filter(app => {
        const appDate = app.fecha.split('T')[0];
        return appDate === selectedCalendarDate && app.estado === 'programada';
    });
    
    const MAX_APPOINTMENTS_PER_DAY = getMaxAppointmentsPerDay();
    if (dayAppointments.length >= MAX_APPOINTMENTS_PER_DAY) {
        showNotification(`Este día ya tiene ${MAX_APPOINTMENTS_PER_DAY} citas agendadas. No hay disponibilidad.`, "error");
        return;
    }
    
    // Obtener el nombre del estudiante antes de limpiar las variables
    let studentName = currentSchedulingStudentName;
    if (!studentName) {
        const students = await getAllStudents();
        const student = students.find(s => s.id === parseInt(currentSchedulingStudentId));
        if (student) {
            studentName = `${student.nombre} ${student.apellido}`;
        }
    }
    
    const appointmentData = {
        student_id: parseInt(currentSchedulingStudentId),
        fecha: selectedCalendarDate,
        hora: hora,
        estado: 'programada'
    };
    
    let success = false;
    const isEditing = !!window.editingAppointmentId;
    const editingId = window.editingAppointmentId;
    
    // Verificar si estamos editando una cita existente
    if (isEditing) {
        success = await updateAppointment(editingId, appointmentData);
        window.editingAppointmentId = null;
    } else {
        success = await addAppointment(appointmentData);
    }
    
    if (success) {
        hideAppointmentSchedulePanel();
        await renderCalendar();
        await renderAppointmentsForDay(selectedCalendarDate);
        const message = isEditing ? 'Cita actualizada' : `Cita agendada para ${studentName || 'el estudiante'}`;
        showNotification(message, "success");
    }
}

async function renderAppointmentsForDay(dateStr) {
    const container = document.getElementById('appointmentsListContent');
    if (!container) return;

    const appointments = await getAllAppointments();
    const dayAppointments = appointments.filter(app => app.fecha === dateStr);
    
    const formattedDate = formatDate(dateStr);
    
    if (dayAppointments.length === 0) {
        container.innerHTML = `<p class="empty-list-message">No hay citas programadas para el ${formattedDate}</p>`;
        return;
    }

    // Obtener información de estudiantes
    const students = await getAllStudents();
    const studentsMap = new Map(students.map(s => [s.id, s]));

    let html = `<p style="margin-bottom: 1rem; color: var(--text-muted);">Citas para el ${formattedDate}</p>`;
    
    // Ordenar citas por hora
    dayAppointments.sort((a, b) => {
        if (a.hora && b.hora) {
            return a.hora.localeCompare(b.hora);
        }
        return 0;
    });
    
    dayAppointments.forEach(app => {
        const student = studentsMap.get(app.student_id);
        const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
        
        html += `
            <div class="appointment-item" style="margin-bottom: 1rem; padding: 1rem; background: var(--dark); border: 1px solid var(--border); border-radius: 8px; border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div style="flex: 1;">
                        <strong style="display: block; margin-bottom: 0.5rem; font-size: 1.125rem;">${studentName}</strong>
                        <div style="color: var(--text-muted); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="ph ph-clock"></i> ${formatTime(app.hora)}
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span class="badge ${app.estado === 'programada' ? 'bg-primary' : app.estado === 'completada' ? 'bg-success' : 'bg-secondary'}">${app.estado}</span>
                        ${app.estado === 'programada' ? `
                            <button class="btn btn-sm btn-warning edit-appointment-btn" data-id="${app.id}" style="padding: 0.5rem 1rem;">
                                <i class="ph ph-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-appointment-btn" data-id="${app.id}" style="padding: 0.5rem 1rem;">
                                <i class="ph ph-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Agregar event listeners a los botones
    container.querySelectorAll('.edit-appointment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const appointmentId = parseInt(btn.dataset.id);
            editAppointment(appointmentId);
        });
    });
    
    container.querySelectorAll('.delete-appointment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const appointmentId = parseInt(btn.dataset.id);
            if (confirm('¿Eliminar esta cita?')) {
                await deleteAppointment(appointmentId);
                await renderCalendar();
                await renderAppointmentsForDay(dateStr);
            }
        });
    });
}

// ========== SISTEMA DE USUARIO MAESTRO Y PROGRAMADOR ==========
const MAESTRO_KEY = "12345678"; // Clave de acceso para usuario maestro
const PROGRAMADOR_KEY = "admin123"; // Clave de acceso para programador (cambia esta clave)
let isMaestroMode = false;
let isProgramadorMode = false;
let maestroCurrentDate = new Date();
let maestroSelectedDate = null;
let programadorCurrentDate = new Date();
let programadorSelectedDate = null;
let programadorCalendarCurrentDate = new Date();
let programadorSelectedCalendarDate = null;
let programadorCurrentSchedulingStudentId = null;
let programadorCurrentSchedulingStudentName = null;

// - Funciones de Autenticación Maestro -
function setupMaestroModule() {
    const maestroMenuBtn = document.getElementById('maestroMenuBtn');
    const maestroLogoutBtn = document.getElementById('maestroLogoutBtn');
    const maestroLoginModal = document.getElementById('maestroLoginModal');
    const maestroLoginCloseBtn = document.getElementById('maestroLoginCloseBtn');
    const maestroLoginSubmitBtn = document.getElementById('maestroLoginSubmitBtn');
    const maestroLoginCancelBtn = document.getElementById('maestroLoginCancelBtn');
    const maestroKeyInput = document.getElementById('maestroKeyInput');
    const maestroLoginError = document.getElementById('maestroLoginError');

    // Abrir modal de login
    if (maestroMenuBtn) {
        maestroMenuBtn.addEventListener('click', () => {
            if (maestroLoginModal) maestroLoginModal.style.display = 'flex';
            if (maestroKeyInput) maestroKeyInput.focus();
        });
    }

    // Cerrar modal
    if (maestroLoginCloseBtn) {
        maestroLoginCloseBtn.addEventListener('click', closeMaestroLoginModal);
    }

    if (maestroLoginCancelBtn) {
        maestroLoginCancelBtn.addEventListener('click', closeMaestroLoginModal);
    }

    // Cerrar modal al hacer clic fuera
    if (maestroLoginModal) {
        maestroLoginModal.addEventListener('click', (e) => {
            if (e.target === maestroLoginModal) {
                closeMaestroLoginModal();
            }
        });
    }

    // Login
    if (maestroLoginSubmitBtn) {
        maestroLoginSubmitBtn.addEventListener('click', handleMaestroLogin);
    }

    if (maestroKeyInput) {
        maestroKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleMaestroLogin();
            }
        });
    }

    // Logout
    if (maestroLogoutBtn) {
        maestroLogoutBtn.addEventListener('click', handleMaestroLogout);
    }

    // Navegación del menú maestro
    document.querySelectorAll('[data-maestro-section]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetView = e.currentTarget.dataset.maestroSection;
            switchMaestroView(targetView);
        });
    });

    // Calendario maestro
    const maestroNavLeft = document.getElementById('maestroNavLeft');
    const maestroNavRight = document.getElementById('maestroNavRight');
    const maestroCalendarGrid = document.getElementById('maestroCalendarDaysGrid');

    if (maestroNavLeft) {
        maestroNavLeft.addEventListener('click', () => navigateMaestroCalendar(-1));
    }

    if (maestroNavRight) {
        maestroNavRight.addEventListener('click', () => navigateMaestroCalendar(1));
    }

    // El event listener se agrega en renderMaestroCalendar para cada día individualmente

    // Búsqueda de estudiantes en vista maestro
    const maestroStudentSearch = document.getElementById('maestroStudentSearch');
    if (maestroStudentSearch) {
        maestroStudentSearch.addEventListener('input', async (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query) {
                const students = await getAllStudents();
                const filtered = students.filter(s => 
                    s.nombre.toLowerCase().includes(query) ||
                    s.apellido.toLowerCase().includes(query) ||
                    s.carrera.toLowerCase().includes(query) ||
                    (s.telefono && s.telefono.toLowerCase().includes(query))
                );
                await renderMaestroStudents(filtered);
            } else {
                await renderMaestroStudents();
            }
        });
    }
}

function handleMaestroLogin() {
    const maestroKeyInput = document.getElementById('maestroKeyInput');
    const maestroLoginError = document.getElementById('maestroLoginError');

    if (!maestroKeyInput) return;

    const inputKey = maestroKeyInput.value;

    if (inputKey === PROGRAMADOR_KEY) {
        // Acceso de programador
        isProgramadorMode = true;
        isMaestroMode = false;
        closeMaestroLoginModal();
        showNotification("🔐 Acceso de Programador concedido. Acceso completo a todos los módulos.", "success");
        switchToProgramadorView();
    } else if (inputKey === MAESTRO_KEY) {
        // Acceso de maestro
        isMaestroMode = true;
        isProgramadorMode = false;
        closeMaestroLoginModal();
        showNotification("Acceso Maestro concedido.", "success");
        switchToMaestroView();
    } else {
        if (maestroLoginError) {
            maestroLoginError.textContent = "Clave incorrecta.";
            maestroLoginError.style.display = 'block';
        }
        if (maestroKeyInput) maestroKeyInput.value = '';
    }
}

function handleMaestroLogout() {
    isMaestroMode = false;
    isProgramadorMode = false;
    switchToNormalView();
    showNotification("Sesión cerrada.", "info");
}

function closeMaestroLoginModal() {
    const maestroLoginModal = document.getElementById('maestroLoginModal');
    const maestroLoginError = document.getElementById('maestroLoginError');
    const maestroKeyInput = document.getElementById('maestroKeyInput');

    if (maestroLoginModal) maestroLoginModal.style.display = 'none';
    if (maestroLoginError) {
        maestroLoginError.textContent = '';
        maestroLoginError.style.display = 'none';
    }
    if (maestroKeyInput) maestroKeyInput.value = '';
}

function switchToMaestroView() {
    // Ocultar menú normal (solo los botones de navegación)
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) {
        mainMenu.style.display = 'none';
    }

    // Ocultar secciones normales
    document.querySelectorAll('.content-section:not(#maestro-section)').forEach(section => {
        section.classList.remove('active');
    });

    // Mostrar sección maestro
    const maestroSection = document.getElementById('maestro-section');
    if (maestroSection) {
        maestroSection.classList.add('active');
        maestroSection.style.display = 'block';
    }

    // Cambiar botones
    const maestroMenuBtn = document.getElementById('maestroMenuBtn');
    const maestroLogoutBtn = document.getElementById('maestroLogoutBtn');
    if (maestroMenuBtn) maestroMenuBtn.style.display = 'none';
    if (maestroLogoutBtn) {
        maestroLogoutBtn.style.display = 'inline-flex';
    }

    // Inicializar vista por defecto
    setTimeout(async () => {
        await switchMaestroView('maestro-requests');
    }, 100);
}

function switchToNormalView() {
    // Mostrar menú normal
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) {
        mainMenu.style.display = 'flex';
    }

    // Ocultar sección maestro
    const maestroSection = document.getElementById('maestro-section');
    if (maestroSection) {
        maestroSection.classList.remove('active');
        maestroSection.style.display = 'none';
    }

    // Ocultar sección programador
    const programadorSection = document.getElementById('programador-section');
    if (programadorSection) {
        programadorSection.classList.remove('active');
        programadorSection.style.display = 'none';
    }

    // Mostrar sección por defecto
    const registerSection = document.getElementById('register');
    if (registerSection) {
        registerSection.classList.add('active');
    }

    // Cambiar botones
    const maestroMenuBtn = document.getElementById('maestroMenuBtn');
    const maestroLogoutBtn = document.getElementById('maestroLogoutBtn');
    if (maestroMenuBtn) maestroMenuBtn.style.display = 'inline-flex';
    if (maestroLogoutBtn) maestroLogoutBtn.style.display = 'none';
    
    // Limpiar estado del maestro y programador
    maestroSelectedDate = null;
    programadorSelectedDate = null;
    programadorSelectedCalendarDate = null;
    programadorCurrentSchedulingStudentId = null;
    programadorCurrentSchedulingStudentName = null;
}

async function switchMaestroView(targetViewId) {
    // Actualizar menú
    document.querySelectorAll('[data-maestro-section]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.maestroSection === targetViewId);
    });

    // Actualizar áreas de contenido
    document.querySelectorAll('.maestro-content-area').forEach(area => {
        if (area.id === targetViewId) {
            area.classList.add('active');
        } else {
            area.classList.remove('active');
        }
    });

    // Cargar contenido según la vista
    if (targetViewId === 'maestro-students') {
        await renderMaestroStudents();
    } else if (targetViewId === 'maestro-appointments') {
        await renderMaestroCalendar();
        // Seleccionar día actual por defecto si no hay uno seleccionado
        if (!maestroSelectedDate) {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            await selectMaestroCalendarDay(todayStr);
        } else {
            await renderMaestroAppointmentsForDay(maestroSelectedDate);
        }
    } else if (targetViewId === 'maestro-requests') {
        await renderMaestroRequests();
    } else if (targetViewId === 'maestro-statistics') {
        await renderMaestroStatistics();
    }
}

// - Renderizado de Vistas Maestro -
async function renderMaestroStudents(students = null) {
    const container = document.getElementById('maestroStudentsList');
    if (!container) return;

    const data = students || await getAllStudents();
    if (data.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No se encontraron estudiantes.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(student => {
        const card = document.createElement('div');
        card.className = 'student-card';
        const initials = `${student.nombre[0] || ''}${student.apellido[0] || ''}`.toUpperCase();
        card.innerHTML = `
            <div class="student-photo-container">
                ${student.foto ? `<img src="${student.foto}" alt="Foto" class="student-photo">` : `<span class="default-photo">${initials}</span>`}
            </div>
            <div class="student-info">
                <h3 class="card-name">${student.nombre} ${student.apellido}</h3>
                <p class="card-id">ID: ${student.id}</p>
            </div>
            <div class="card-body">
                <div class="card-detail"><i class="ph ph-gender-intersex"></i> ${student.sexo}</div>
                <div class="card-detail"><i class="ph ph-phone"></i> ${student.telefono || 'No registrado'}</div>
                <div class="card-detail"><i class="ph ph-graduation-cap"></i> ${student.carrera}</div>
            </div>
            <div class="card-actions">
                <button class="btn btn-danger btn-sm delete-student-btn" data-student-id="${student.id}">
                    <i class="ph ph-trash"></i> Eliminar
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    // Event listeners para eliminar
    container.querySelectorAll('.delete-student-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(e.target.closest('button').dataset.studentId);
            const studentName = e.target.closest('.student-card').querySelector('.card-name').textContent;
            
            if (confirm(`⚠️ ¿Eliminar permanentemente a ${studentName}?\n\nEsto también eliminará TODAS sus citas asociadas.\n\nEsta acción NO se puede deshacer.`)) {
                const success = await deleteStudent(id);
                if (success) {
                    await renderMaestroStudents();
                }
            }
        });
    });
}

async function renderMaestroRequests() {
    const container = document.getElementById('maestro-requests-list');
    if (!container) return;

    // Por ahora, las solicitudes son las citas programadas
    const appointments = await getAllAppointments();
    const pendingAppointments = appointments.filter(app => app.estado === 'programada');

    if (pendingAppointments.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No hay solicitudes pendientes.</p>';
        return;
    }

    const students = await getAllStudents();
    const studentsMap = new Map(students.map(s => [s.id, s]));

    container.innerHTML = '';
    pendingAppointments.forEach(app => {
        const student = studentsMap.get(app.student_id);
        const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
        const studentCarrera = student ? student.carrera : '';
        const studentTelefono = student ? student.telefono : '';
        
        const item = document.createElement('div');
        item.className = 'appointment-item';
        item.style.cssText = 'margin-bottom: 1rem; padding: 1.5rem; background: var(--dark); border: 1px solid var(--border); border-radius: 8px; border-left: 4px solid var(--primary);';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1;">
                    <strong style="display: block; margin-bottom: 0.5rem; font-size: 1.125rem;">${studentName}</strong>
                    ${studentCarrera ? `<div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;"><i class="ph ph-graduation-cap"></i> ${studentCarrera}</div>` : ''}
                    ${studentTelefono ? `<div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;"><i class="ph ph-phone"></i> ${studentTelefono}</div>` : ''}
                    <div style="color: var(--text-muted); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <i class="ph ph-calendar"></i> ${formatDate(app.fecha)}
                    </div>
                    <div style="color: var(--text-muted); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ph ph-clock"></i> ${formatTime(app.hora)}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                    <span class="badge bg-primary">${app.estado}</span>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-success complete-appointment-maestro-btn" data-id="${app.id}" title="Completar cita">
                            <i class="ph ph-check"></i> Completar
                        </button>
                        <button class="btn btn-sm btn-secondary cancel-appointment-maestro-btn" data-id="${app.id}" title="Cancelar cita">
                            <i class="ph ph-x"></i> Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
    
    // Agregar event listeners a los botones del maestro
    attachMaestroAppointmentListeners();
}

async function renderMaestroCalendar() {
    const monthYearDisplay = document.getElementById('maestroCurrentMonthYear');
    const calendarGrid = document.getElementById('maestroCalendarDaysGrid');
    if (!monthYearDisplay || !calendarGrid) return;

    const year = maestroCurrentDate.getFullYear();
    const month = maestroCurrentDate.getMonth();

    monthYearDisplay.textContent = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const appointments = await getAllAppointments();
    const appointmentsInMonth = appointments.filter(app => {
        const appDate = new Date(app.fecha);
        return appDate.getFullYear() === year && appDate.getMonth() === month && app.estado === 'programada';
    });
    
    // Contar citas por día
    const appointmentsByDate = new Map();
    appointmentsInMonth.forEach(app => {
        const dateStr = app.fecha.split('T')[0];
        appointmentsByDate.set(dateStr, (appointmentsByDate.get(dateStr) || 0) + 1);
    });
    
    const appointmentDates = new Set(appointmentsInMonth.map(a => a.fecha.split('T')[0]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MAX_APPOINTMENTS_PER_DAY = getMaxAppointmentsPerDay();

    calendarGrid.innerHTML = '';

    // Días vacíos
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        dayEl.dataset.date = dateStr;

        // Verificar si el día es pasado
        const dayDate = new Date(year, month, day);
        dayDate.setHours(0, 0, 0, 0);
        const isPast = dayDate < today;
        
        // Contar citas del día
        const appointmentsCount = appointmentsByDate.get(dateStr) || 0;
        
        // Marcar día como disponible o no disponible
        if (isPast) {
            dayEl.classList.add('unavailable');
        } else if (appointmentsCount >= MAX_APPOINTMENTS_PER_DAY) {
            dayEl.classList.add('unavailable');
        } else {
            dayEl.classList.add('available');
        }

        if (appointmentDates.has(dateStr)) {
            dayEl.classList.add('has-appointments');
        }

        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayEl.classList.add('today');
        }

        if (maestroSelectedDate === dateStr) {
            dayEl.classList.add('selected');
        }

        // Event listener para seleccionar día
        // El maestro puede hacer clic en cualquier día (disponible o con límite alcanzado) para ver las citas
        if (!isPast) {
            // Días disponibles o con límite alcanzado - ambos son clickeables para el maestro
            dayEl.addEventListener('click', () => selectMaestroCalendarDay(dateStr));
            if (appointmentsCount >= MAX_APPOINTMENTS_PER_DAY) {
                dayEl.style.cursor = 'pointer';
                dayEl.title = `Día completo (${appointmentsCount}/${MAX_APPOINTMENTS_PER_DAY} citas) - Click para ver citas`;
            } else {
                dayEl.style.cursor = 'pointer';
                dayEl.title = appointmentsCount > 0 ? `${appointmentsCount} cita(s) agendada(s)` : 'Día disponible';
            }
        } else {
            // Días pasados - no clickeables
            dayEl.style.cursor = 'not-allowed';
            dayEl.title = 'Día pasado';
        }

        calendarGrid.appendChild(dayEl);
    }

    if (maestroSelectedDate) {
        await renderMaestroAppointmentsForDay(maestroSelectedDate);
    }
}

function navigateMaestroCalendar(monthOffset) {
    maestroCurrentDate.setMonth(maestroCurrentDate.getMonth() + monthOffset);
    renderMaestroCalendar();
}

async function selectMaestroCalendarDay(dateStr) {
    maestroSelectedDate = dateStr;
    await renderMaestroCalendar();
    await renderMaestroAppointmentsForDay(dateStr);
}

async function renderMaestroAppointmentsForDay(dateStr) {
    const dateDisplay = document.getElementById('maestroSelectedDateDisplay');
    const container = document.getElementById('maestroAppointmentsListDetail');
    if (!container) return;

    if (dateDisplay) {
        dateDisplay.textContent = formatDate(dateStr);
    }

    // Obtener todas las citas
    const appointments = await getAllAppointments();
    
    // Normalizar el formato de fecha para comparación
    // La fecha viene como "YYYY-MM-DD" desde el calendario
    const normalizedDateStr = dateStr.split('T')[0]; // Por si viene con hora
    
    // Filtrar citas del día seleccionado
    // Las fechas en la BD pueden venir como "YYYY-MM-DD" o con hora
    const dayAppointments = appointments.filter(app => {
        if (!app.fecha) return false;
        // Normalizar la fecha de la cita
        const appDate = app.fecha.split('T')[0];
        return appDate === normalizedDateStr;
    });

    console.log('Fecha seleccionada:', normalizedDateStr);
    console.log('Citas encontradas:', dayAppointments.length);
    console.log('Todas las citas:', appointments.map(a => ({ id: a.id, fecha: a.fecha, student_id: a.student_id })));

    // Obtener todos los estudiantes
    const students = await getAllStudents();
    const studentsMap = new Map(students.map(s => [s.id, s]));

    // Filtrar solo citas programadas para contar el límite
    const programadasAppointments = dayAppointments.filter(app => app.estado === 'programada');
    const MAX_APPOINTMENTS_PER_DAY = getMaxAppointmentsPerDay();
    const isLimitReached = programadasAppointments.length >= MAX_APPOINTMENTS_PER_DAY;

    if (dayAppointments.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No hay citas agendadas.</p>';
        return;
    }

    // Ordenar citas por hora
    dayAppointments.sort((a, b) => {
        if (a.hora && b.hora) {
            return a.hora.localeCompare(b.hora);
        }
        return 0;
    });

    // Renderizar las citas con información del estudiante
    container.innerHTML = '';
    
    // Mostrar indicador si el día tiene el límite alcanzado
    if (isLimitReached) {
        const limitIndicator = document.createElement('div');
        limitIndicator.style.cssText = 'margin-bottom: 1rem; padding: 1rem; background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 8px; color: #dc3545;';
        limitIndicator.innerHTML = `<strong><i class="ph ph-warning"></i> Límite alcanzado:</strong> Este día tiene ${programadasAppointments.length}/${MAX_APPOINTMENTS_PER_DAY} citas programadas.`;
        container.appendChild(limitIndicator);
    }
    dayAppointments.forEach(app => {
        const student = studentsMap.get(app.student_id);
        const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
        const studentCarrera = student ? student.carrera : '';
        const studentTelefono = student ? student.telefono : '';
        
        const item = document.createElement('div');
        item.style.cssText = 'margin-bottom: 1rem; padding: 1.5rem; background: var(--dark); border: 1px solid var(--border); border-radius: 8px; border-left: 4px solid var(--primary);';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1;">
                    <strong style="display: block; margin-bottom: 0.5rem; font-size: 1.125rem;">${studentName}</strong>
                    ${studentCarrera ? `<div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;"><i class="ph ph-graduation-cap"></i> ${studentCarrera}</div>` : ''}
                    ${studentTelefono ? `<div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;"><i class="ph ph-phone"></i> ${studentTelefono}</div>` : ''}
                    <div style="color: var(--text-muted); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ph ph-clock"></i> ${formatTime(app.hora)}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                    <span class="badge ${app.estado === 'programada' ? 'bg-primary' : app.estado === 'completada' ? 'bg-success' : 'bg-secondary'}">${app.estado}</span>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${app.estado === 'programada' ? `
                            <button class="btn btn-sm btn-success complete-appointment-maestro-btn" data-id="${app.id}" title="Completar cita">
                                <i class="ph ph-check"></i> Completar
                            </button>
                            <button class="btn btn-sm btn-secondary cancel-appointment-maestro-btn" data-id="${app.id}" title="Cancelar cita">
                                <i class="ph ph-x"></i> Cancelar
                            </button>
                        ` : ''}
                        ${app.estado === 'completada' ? `
                            <button class="btn btn-sm btn-info view-appointment-maestro-btn" data-id="${app.id}" title="Ver detalles">
                                <i class="ph ph-eye"></i> Ver
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
    
    // Agregar event listeners a los botones del maestro
    attachMaestroAppointmentListeners();
}

// Función para agregar event listeners a los botones de citas en vista maestro
function attachMaestroAppointmentListeners() {
    // Remover listeners anteriores para evitar duplicados
    document.querySelectorAll('.complete-appointment-maestro-btn, .cancel-appointment-maestro-btn, .view-appointment-maestro-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Botones de completar
    document.querySelectorAll('.complete-appointment-maestro-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const appointmentId = parseInt(e.currentTarget.dataset.id);
            if (confirm('¿Marcar esta cita como completada?')) {
                const success = await completeAppointment(appointmentId);
                if (success) {
                    // Recargar las citas del día seleccionado
                    if (maestroSelectedDate) {
                        await renderMaestroAppointmentsForDay(maestroSelectedDate);
                    }
                    // Actualizar calendario
                    await renderMaestroCalendar();
                    // Actualizar solicitudes si estamos en esa vista
                    if (isMaestroMode) {
                        await renderMaestroRequests();
                        // Actualizar estadísticas si estamos en esa vista
                        const statsArea = document.getElementById('maestro-statistics');
                        if (statsArea && statsArea.classList.contains('active')) {
                            await renderMaestroStatistics();
                        }
                    }
                }
            }
        });
    });
    
    // Botones de cancelar
    document.querySelectorAll('.cancel-appointment-maestro-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const appointmentId = parseInt(e.currentTarget.dataset.id);
            if (confirm('¿Cancelar esta cita?')) {
                const success = await cancelAppointment(appointmentId);
                if (success) {
                    // Recargar las citas del día seleccionado
                    if (maestroSelectedDate) {
                        await renderMaestroAppointmentsForDay(maestroSelectedDate);
                    }
                    // Actualizar calendario
                    await renderMaestroCalendar();
                    // Actualizar solicitudes si estamos en esa vista
                    if (isMaestroMode) {
                        await renderMaestroRequests();
                        // Actualizar estadísticas si estamos en esa vista
                        const statsArea = document.getElementById('maestro-statistics');
                        if (statsArea && statsArea.classList.contains('active')) {
                            await renderMaestroStatistics();
                        }
                    }
                }
            }
        });
    });
    
    // Botones de ver detalles
    document.querySelectorAll('.view-appointment-maestro-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const appointmentId = parseInt(e.currentTarget.dataset.id);
            await viewAppointmentDetails(appointmentId);
        });
    });
}

// ========== FUNCIONES DE ESTADÍSTICAS PARA MAESTRO ==========
async function renderMaestroStatistics() {
    const students = await getAllStudents();
    const appointments = await getAllAppointments();
    
    // Estadísticas básicas
    document.getElementById('maestroStatTotalStudents').textContent = students.length;
    document.getElementById('maestroStatTotalAppointments').textContent = appointments.length;
    
    const pendingAppointments = appointments.filter(a => a.estado === 'programada');
    const completedAppointments = appointments.filter(a => a.estado === 'completada');
    
    document.getElementById('maestroStatPendingAppointments').textContent = pendingAppointments.length;
    document.getElementById('maestroStatCompletedAppointments').textContent = completedAppointments.length;
    
    // Estadísticas por carrera
    const careerStats = {};
    students.forEach(student => {
        const carrera = student.carrera || 'Sin carrera';
        careerStats[carrera] = (careerStats[carrera] || 0) + 1;
    });
    
    const careerContainer = document.getElementById('maestroStatisticsByCareer');
    if (Object.keys(careerStats).length === 0) {
        careerContainer.innerHTML = '<p class="empty-list-message">No hay datos</p>';
    } else {
        let html = '';
        Object.entries(careerStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([carrera, count]) => {
                const percentage = ((count / students.length) * 100).toFixed(1);
                html += `
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span><strong>${carrera}</strong></span>
                            <span>${count} (${percentage}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: var(--primary); transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            });
        careerContainer.innerHTML = html;
    }
    
    // Estadísticas por sexo
    const genderStats = {};
    students.forEach(student => {
        const sexo = student.sexo || 'No especificado';
        genderStats[sexo] = (genderStats[sexo] || 0) + 1;
    });
    
    const genderContainer = document.getElementById('maestroStatisticsByGender');
    if (Object.keys(genderStats).length === 0) {
        genderContainer.innerHTML = '<p class="empty-list-message">No hay datos</p>';
    } else {
        let html = '';
        Object.entries(genderStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([sexo, count]) => {
                const percentage = ((count / students.length) * 100).toFixed(1);
                html += `
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span><strong>${sexo}</strong></span>
                            <span>${count} (${percentage}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: var(--primary); transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            });
        genderContainer.innerHTML = html;
    }
    
    // Estadísticas por estado de citas
    const statusStats = {
        'programada': appointments.filter(a => a.estado === 'programada'),
        'completada': appointments.filter(a => a.estado === 'completada'),
        'cancelada': appointments.filter(a => a.estado === 'cancelada')
    };
    
    const statusContainer = document.getElementById('maestroStatisticsByStatus');
    if (appointments.length === 0) {
        statusContainer.innerHTML = '<p class="empty-list-message">No hay citas</p>';
    } else {
        const studentsMap = new Map(students.map(s => [s.id, s]));
        let html = '';
        Object.entries(statusStats).forEach(([estado, estadoAppointments]) => {
            const count = estadoAppointments.length;
            const percentage = appointments.length > 0 ? ((count / appointments.length) * 100).toFixed(1) : 0;
            const color = estado === 'programada' ? '#3b82f6' : estado === 'completada' ? '#22c55e' : '#ef4444';
            const statusId = `maestro-status-${estado}`;
            html += `
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; cursor: pointer;" 
                         onclick="toggleMaestroStatusDetails('${statusId}')" 
                         class="status-header">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="ph ph-caret-down" id="${statusId}-icon" style="transition: transform 0.3s;"></i>
                            <span><strong>${estado.charAt(0).toUpperCase() + estado.slice(1)}</strong></span>
                        </div>
                        <span>${count} (${percentage}%)</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;">
                        <div style="width: ${percentage}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
                    </div>
                    <div id="${statusId}-details" style="display: none; margin-top: 1rem; max-height: 400px; overflow-y: auto;">
                        ${count === 0 ? '<p class="empty-list-message" style="font-size: 0.875rem;">No hay citas en este estado</p>' : ''}
                        ${estadoAppointments.slice(0, 10).map(app => {
                            const student = studentsMap.get(app.student_id);
                            const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
                            return `
                                <div class="appointment-stat-item" data-appointment-id="${app.id}" 
                                     style="padding: 0.75rem; margin-bottom: 0.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; border-left: 3px solid ${color};">
                                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.75rem; flex-wrap: wrap;">
                                        <div style="flex: 1; min-width: 200px;">
                                            <strong style="display: block; font-size: 0.9rem; margin-bottom: 0.25rem;">${studentName}</strong>
                                            <div style="color: var(--text-muted); font-size: 0.8rem;">
                                                <i class="ph ph-calendar"></i> ${formatDate(app.fecha)} a las ${formatTime(app.hora)}
                                            </div>
                                        </div>
                                        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                                            ${estado === 'programada' ? `
                                                <button class="btn btn-xs btn-success complete-appointment-maestro-btn" data-id="${app.id}" title="Completar">
                                                    <i class="ph ph-check"></i>
                                                </button>
                                                <button class="btn btn-xs btn-secondary cancel-appointment-maestro-btn" data-id="${app.id}" title="Cancelar">
                                                    <i class="ph ph-x"></i>
                                                </button>
                                            ` : ''}
                                            ${estado === 'completada' ? `
                                                <button class="btn btn-xs btn-info view-appointment-maestro-btn" data-id="${app.id}" title="Ver detalles">
                                                    <i class="ph ph-eye"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${count > 10 ? `<p style="text-align: center; color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">Y ${count - 10} más...</p>` : ''}
                    </div>
                </div>
            `;
        });
        statusContainer.innerHTML = html;
        
        // Agregar event listeners a los botones del maestro
        attachMaestroAppointmentListeners();
    }
    
    // Próximas citas
    const upcomingContainer = document.getElementById('maestroUpcomingAppointmentsList');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingAppointments = pendingAppointments
        .filter(app => {
            const appDate = new Date(app.fecha);
            appDate.setHours(0, 0, 0, 0);
            return appDate >= today;
        })
        .sort((a, b) => {
            const dateA = new Date(a.fecha + 'T' + a.hora);
            const dateB = new Date(b.fecha + 'T' + b.hora);
            return dateA - dateB;
        })
        .slice(0, 10);
    
    if (upcomingAppointments.length === 0) {
        upcomingContainer.innerHTML = '<p class="empty-list-message">No hay citas próximas</p>';
    } else {
        const studentsMap = new Map(students.map(s => [s.id, s]));
        let html = '';
        upcomingAppointments.forEach(app => {
            const student = studentsMap.get(app.student_id);
            const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
            html += `
                <div class="appointment-stat-item" data-appointment-id="${app.id}" style="padding: 1rem; margin-bottom: 0.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; border-left: 4px solid var(--primary);">
                    <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
                        <div style="flex: 1;">
                            <strong style="display: block; margin-bottom: 0.25rem;">${studentName}</strong>
                            <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">
                                <i class="ph ph-calendar"></i> ${formatDate(app.fecha)} a las ${formatTime(app.hora)}
                            </div>
                            ${student ? `
                                <div style="color: var(--text-muted); font-size: 0.875rem;">
                                    <i class="ph ph-graduation-cap"></i> ${student.carrera}
                                    ${student.telefono ? ` | <i class="ph ph-phone"></i> ${student.telefono}` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                            <span class="badge bg-primary">${app.estado}</span>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button class="btn btn-sm btn-success complete-appointment-maestro-btn" data-id="${app.id}" title="Completar cita">
                                    <i class="ph ph-check"></i> Completar
                                </button>
                                <button class="btn btn-sm btn-secondary cancel-appointment-maestro-btn" data-id="${app.id}" title="Cancelar cita">
                                    <i class="ph ph-x"></i> Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        upcomingContainer.innerHTML = html;
        
        // Agregar event listeners a los botones del maestro
        attachMaestroAppointmentListeners();
    }
}

// Función para expandir/colapsar detalles de estado en vista maestro (disponible globalmente)
window.toggleMaestroStatusDetails = function(statusId) {
    const details = document.getElementById(`${statusId}-details`);
    const icon = document.getElementById(`${statusId}-icon`);
    
    if (details && icon) {
        const isHidden = details.style.display === 'none';
        details.style.display = isHidden ? 'block' : 'none';
        icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        
        // Si se expande, re-agregar listeners por si acaso
        if (isHidden) {
            setTimeout(() => attachMaestroAppointmentListeners(), 100);
        }
    }
}

// ========== SISTEMA DE PROGRAMADOR ==========
function switchToProgramadorView() {
    // Ocultar menú normal
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) {
        mainMenu.style.display = 'none';
    }

    // Ocultar secciones normales y maestro
    document.querySelectorAll('.content-section:not(#programador-section)').forEach(section => {
        section.classList.remove('active');
    });

    // Mostrar sección programador
    const programadorSection = document.getElementById('programador-section');
    if (programadorSection) {
        programadorSection.classList.add('active');
        programadorSection.style.display = 'block';
    }

    // Cambiar botones
    const maestroMenuBtn = document.getElementById('maestroMenuBtn');
    const maestroLogoutBtn = document.getElementById('maestroLogoutBtn');
    if (maestroMenuBtn) maestroMenuBtn.style.display = 'none';
    if (maestroLogoutBtn) {
        maestroLogoutBtn.style.display = 'inline-flex';
    }

    // Inicializar vista por defecto
    setTimeout(async () => {
        await switchProgramadorView('register');
    }, 100);
}

async function switchProgramadorView(targetViewId) {
    // Actualizar menú
    document.querySelectorAll('[data-programador-section]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.programadorSection === targetViewId);
    });

    // Actualizar áreas de contenido del programador
    const programadorSection = document.getElementById('programador-section');
    if (programadorSection) {
        const allAreas = programadorSection.querySelectorAll('.maestro-content-area');
        allAreas.forEach(area => {
            area.classList.remove('active');
            
            if (targetViewId === 'register' && area.id === 'programador-register') {
                area.classList.add('active');
            } else if (targetViewId === 'appointments' && area.id === 'programador-appointments') {
                area.classList.add('active');
            } else if (targetViewId === 'maestro-requests' && area.id === 'programador-maestro-requests') {
                area.classList.add('active');
            } else if (targetViewId === 'maestro-appointments' && area.id === 'programador-maestro-appointments') {
                area.classList.add('active');
            } else if (targetViewId === 'maestro-students' && area.id === 'programador-maestro-students') {
                area.classList.add('active');
            } else if (targetViewId === 'statistics' && area.id === 'programador-statistics') {
                area.classList.add('active');
            } else if (targetViewId === 'settings' && area.id === 'programador-settings') {
                area.classList.add('active');
            }
        });
    }

    // Cargar contenido según la vista
    if (targetViewId === 'register') {
        // El formulario ya está en el HTML
    } else if (targetViewId === 'appointments') {
        await renderProgramadorCalendar();
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        await selectProgramadorCalendarDay(todayStr);
    } else if (targetViewId === 'maestro-requests') {
        await renderProgramadorRequests();
    } else if (targetViewId === 'maestro-appointments') {
        await renderProgramadorMaestroCalendar();
        if (!programadorSelectedDate) {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            await selectProgramadorMaestroCalendarDay(todayStr);
        } else {
            await renderProgramadorMaestroAppointmentsForDay(programadorSelectedDate);
        }
    } else if (targetViewId === 'maestro-students') {
        await renderProgramadorMaestroStudents();
    } else if (targetViewId === 'statistics') {
        await renderStatistics();
    } else if (targetViewId === 'settings') {
        loadSettings();
        updateLastUpdateTime();
    }
}

// Renderizado de vistas del programador
async function renderProgramadorRequests() {
    const container = document.getElementById('programador-requests-list');
    if (!container) return;

    const appointments = await getAllAppointments();
    const pendingAppointments = appointments.filter(app => app.estado === 'programada');

    if (pendingAppointments.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No hay solicitudes pendientes.</p>';
        return;
    }

    const students = await getAllStudents();
    const studentsMap = new Map(students.map(s => [s.id, s]));

    container.innerHTML = '';
    pendingAppointments.forEach(app => {
        const student = studentsMap.get(app.student_id);
        const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
        
        const item = document.createElement('div');
        item.className = 'appointment-item';
        item.style.cssText = 'margin-bottom: 1rem; padding: 1.5rem; background: var(--dark); border: 1px solid var(--border); border-radius: 8px; border-left: 4px solid var(--primary);';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                <div style="flex: 1;">
                    <strong style="display: block; margin-bottom: 0.5rem; font-size: 1.125rem;">${studentName}</strong>
                    <div style="color: var(--text-muted); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <i class="ph ph-calendar"></i> ${formatDate(app.fecha)}
                    </div>
                    <div style="color: var(--text-muted); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ph ph-clock"></i> ${formatTime(app.hora)}
                    </div>
                </div>
                <span class="badge bg-primary">${app.estado}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

async function renderProgramadorMaestroStudents(students = null) {
    const container = document.getElementById('programadorMaestroStudentsList');
    if (!container) return;

    const data = students || await getAllStudents();
    if (data.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No se encontraron estudiantes.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(student => {
        const card = document.createElement('div');
        card.className = 'student-card';
        const initials = `${student.nombre[0] || ''}${student.apellido[0] || ''}`.toUpperCase();
        card.innerHTML = `
            <div class="student-photo-container">
                ${student.foto ? `<img src="${student.foto}" alt="Foto" class="student-photo">` : `<span class="default-photo">${initials}</span>`}
            </div>
            <div class="student-info">
                <h3 class="card-name">${student.nombre} ${student.apellido}</h3>
                <p class="card-id">ID: ${student.id}</p>
            </div>
            <div class="card-body">
                <div class="card-detail"><i class="ph ph-gender-intersex"></i> ${student.sexo}</div>
                <div class="card-detail"><i class="ph ph-phone"></i> ${student.telefono || 'No registrado'}</div>
                <div class="card-detail"><i class="ph ph-graduation-cap"></i> ${student.carrera}</div>
            </div>
            <div class="card-actions">
                <button class="btn btn-danger btn-sm delete-student-btn" data-student-id="${student.id}">
                    <i class="ph ph-trash"></i> Eliminar
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    // Event listeners para eliminar
    container.querySelectorAll('.delete-student-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(e.target.closest('button').dataset.studentId);
            const studentName = e.target.closest('.student-card').querySelector('.card-name').textContent;
            
            if (confirm(`⚠️ ¿Eliminar permanentemente a ${studentName}?\n\nEsto también eliminará TODAS sus citas asociadas.\n\nEsta acción NO se puede deshacer.`)) {
                const success = await deleteStudent(id);
                if (success) {
                    await renderProgramadorMaestroStudents();
                }
            }
        });
    });
}

async function renderProgramadorMaestroCalendar() {
    const monthYearDisplay = document.getElementById('programadorMaestroCurrentMonthYear');
    const calendarGrid = document.getElementById('programadorMaestroCalendarDaysGrid');
    if (!monthYearDisplay || !calendarGrid) return;

    const year = programadorCurrentDate.getFullYear();
    const month = programadorCurrentDate.getMonth();

    monthYearDisplay.textContent = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const appointments = await getAllAppointments();
    const appointmentsInMonth = appointments.filter(app => {
        const appDate = new Date(app.fecha);
        return appDate.getFullYear() === year && appDate.getMonth() === month && app.estado === 'programada';
    });
    
    const appointmentsByDate = new Map();
    appointmentsInMonth.forEach(app => {
        const dateStr = app.fecha.split('T')[0];
        appointmentsByDate.set(dateStr, (appointmentsByDate.get(dateStr) || 0) + 1);
    });
    
    const appointmentDates = new Set(appointmentsInMonth.map(a => a.fecha.split('T')[0]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MAX_APPOINTMENTS_PER_DAY = getMaxAppointmentsPerDay();

    calendarGrid.innerHTML = '';

    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        dayEl.dataset.date = dateStr;

        const dayDate = new Date(year, month, day);
        dayDate.setHours(0, 0, 0, 0);
        const isPast = dayDate < today;
        
        const appointmentsCount = appointmentsByDate.get(dateStr) || 0;
        
        if (isPast) {
            dayEl.classList.add('unavailable');
        } else if (appointmentsCount >= MAX_APPOINTMENTS_PER_DAY) {
            dayEl.classList.add('unavailable');
        } else {
            dayEl.classList.add('available');
        }

        if (appointmentDates.has(dateStr)) {
            dayEl.classList.add('has-appointments');
        }

        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayEl.classList.add('today');
        }

        if (programadorSelectedDate === dateStr) {
            dayEl.classList.add('selected');
        }

        if (!isPast) {
            dayEl.addEventListener('click', () => selectProgramadorMaestroCalendarDay(dateStr));
            if (appointmentsCount >= MAX_APPOINTMENTS_PER_DAY) {
                dayEl.style.cursor = 'pointer';
                dayEl.title = `Día completo (${appointmentsCount}/${MAX_APPOINTMENTS_PER_DAY} citas) - Click para ver citas`;
            } else {
                dayEl.style.cursor = 'pointer';
                dayEl.title = appointmentsCount > 0 ? `${appointmentsCount} cita(s) agendada(s)` : 'Día disponible';
            }
        } else {
            dayEl.style.cursor = 'not-allowed';
            dayEl.title = 'Día pasado';
        }

        calendarGrid.appendChild(dayEl);
    }

    if (programadorSelectedDate) {
        await renderProgramadorMaestroAppointmentsForDay(programadorSelectedDate);
    }
}

function navigateProgramadorMaestroCalendar(monthOffset) {
    programadorCurrentDate.setMonth(programadorCurrentDate.getMonth() + monthOffset);
    renderProgramadorMaestroCalendar();
}

async function selectProgramadorMaestroCalendarDay(dateStr) {
    programadorSelectedDate = dateStr;
    await renderProgramadorMaestroCalendar();
    await renderProgramadorMaestroAppointmentsForDay(dateStr);
}

async function renderProgramadorMaestroAppointmentsForDay(dateStr) {
    const dateDisplay = document.getElementById('programadorMaestroSelectedDateDisplay');
    const container = document.getElementById('programadorMaestroAppointmentsListDetail');
    if (!container) return;

    if (dateDisplay) {
        dateDisplay.textContent = formatDate(dateStr);
    }

    const appointments = await getAllAppointments();
    const normalizedDateStr = dateStr.split('T')[0];
    
    const dayAppointments = appointments.filter(app => {
        if (!app.fecha) return false;
        const appDate = app.fecha.split('T')[0];
        return appDate === normalizedDateStr;
    });

    const students = await getAllStudents();
    const studentsMap = new Map(students.map(s => [s.id, s]));

    const programadasAppointments = dayAppointments.filter(app => app.estado === 'programada');
    const MAX_APPOINTMENTS_PER_DAY = getMaxAppointmentsPerDay();
    const isLimitReached = programadasAppointments.length >= MAX_APPOINTMENTS_PER_DAY;

    if (dayAppointments.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No hay citas agendadas.</p>';
        return;
    }

    dayAppointments.sort((a, b) => {
        if (a.hora && b.hora) {
            return a.hora.localeCompare(b.hora);
        }
        return 0;
    });

    container.innerHTML = '';
    
    if (isLimitReached) {
        const limitIndicator = document.createElement('div');
        limitIndicator.style.cssText = 'margin-bottom: 1rem; padding: 1rem; background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 8px; color: #dc3545;';
        limitIndicator.innerHTML = `<strong><i class="ph ph-warning"></i> Límite alcanzado:</strong> Este día tiene ${programadasAppointments.length}/${MAX_APPOINTMENTS_PER_DAY} citas programadas.`;
        container.appendChild(limitIndicator);
    }
    dayAppointments.forEach(app => {
        const student = studentsMap.get(app.student_id);
        const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
        const studentCarrera = student ? student.carrera : '';
        const studentTelefono = student ? student.telefono : '';
        
        const item = document.createElement('div');
        item.style.cssText = 'margin-bottom: 1rem; padding: 1.5rem; background: var(--dark); border: 1px solid var(--border); border-radius: 8px; border-left: 4px solid var(--primary);';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                <div style="flex: 1;">
                    <strong style="display: block; margin-bottom: 0.5rem; font-size: 1.125rem;">${studentName}</strong>
                    ${studentCarrera ? `<div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;"><i class="ph ph-graduation-cap"></i> ${studentCarrera}</div>` : ''}
                    ${studentTelefono ? `<div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;"><i class="ph ph-phone"></i> ${studentTelefono}</div>` : ''}
                    <div style="color: var(--text-muted); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ph ph-clock"></i> ${formatTime(app.hora)}
                    </div>
                </div>
                <span class="badge ${app.estado === 'programada' ? 'bg-primary' : app.estado === 'completada' ? 'bg-success' : 'bg-secondary'}">${app.estado}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// Calendario de agendamiento del programador
async function renderProgramadorCalendar() {
    const monthYearDisplay = document.getElementById('programadorCalendarMonthYear');
    const calendarGrid = document.getElementById('programadorCalendarDaysGrid');
    if (!monthYearDisplay || !calendarGrid) return;

    const year = programadorCalendarCurrentDate.getFullYear();
    const month = programadorCalendarCurrentDate.getMonth();
    
    monthYearDisplay.textContent = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const appointments = await getAllAppointments();
    const appointmentsInMonth = appointments.filter(app => {
        const appDate = new Date(app.fecha);
        return appDate.getFullYear() === year && appDate.getMonth() === month && app.estado === 'programada';
    });
    
    const appointmentsByDate = new Map();
    appointmentsInMonth.forEach(app => {
        const dateStr = app.fecha.split('T')[0];
        appointmentsByDate.set(dateStr, (appointmentsByDate.get(dateStr) || 0) + 1);
    });
    
    const appointmentDates = new Set(appointmentsInMonth.map(a => a.fecha.split('T')[0]));

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    calendarGrid.innerHTML = '';

    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        dayEl.dataset.date = dateStr;
        
        const dayDate = new Date(year, month, day);
        dayDate.setHours(0, 0, 0, 0);
        const isPast = dayDate < today;
        
        const appointmentsCount = appointmentsByDate.get(dateStr) || 0;
        const MAX_APPOINTMENTS_PER_DAY = getMaxAppointmentsPerDay();
        
        if (isPast) {
            dayEl.classList.add('unavailable');
        } else if (appointmentsCount >= MAX_APPOINTMENTS_PER_DAY) {
            dayEl.classList.add('unavailable');
        } else {
            dayEl.classList.add('available');
        }
        
        if (appointmentDates.has(dateStr)) {
            dayEl.classList.add('has-appointments');
        }
        
        if (isCurrentMonth && day === today.getDate()) {
            dayEl.classList.add('today');
        }
        
        if (programadorSelectedCalendarDate === dateStr) {
            dayEl.classList.add('selected');
        }
        
        if (!isPast && appointmentsCount < MAX_APPOINTMENTS_PER_DAY) {
            dayEl.addEventListener('click', () => selectProgramadorCalendarDay(dateStr));
        } else {
            dayEl.style.cursor = 'not-allowed';
            dayEl.title = isPast ? 'Día pasado' : `Día completo (${appointmentsCount}/${MAX_APPOINTMENTS_PER_DAY} citas)`;
        }
        
        calendarGrid.appendChild(dayEl);
    }
}

function navigateProgramadorCalendar(monthOffset) {
    programadorCalendarCurrentDate.setMonth(programadorCalendarCurrentDate.getMonth() + monthOffset);
    renderProgramadorCalendar();
}

async function selectProgramadorCalendarDay(dateStr) {
    programadorSelectedCalendarDate = dateStr;
    
    document.querySelectorAll('#programadorCalendarDaysGrid .calendar-day.selected').forEach(el => el.classList.remove('selected'));
    const selectedDay = document.querySelector(`#programadorCalendarDaysGrid .calendar-day[data-date="${dateStr}"]`);
    if (selectedDay) {
        selectedDay.classList.add('selected');
    }
    
    await renderProgramadorAppointmentsForDay(dateStr);
    
    if (programadorCurrentSchedulingStudentId) {
        showProgramadorAppointmentSchedulePanel(dateStr);
    }
}

async function renderProgramadorAppointmentsForDay(dateStr) {
    const container = document.getElementById('programadorAppointmentsListContent');
    if (!container) return;

    const appointments = await getAllAppointments();
    const dayAppointments = appointments.filter(app => app.fecha === dateStr);
    
    const formattedDate = formatDate(dateStr);
    
    if (dayAppointments.length === 0) {
        container.innerHTML = `<p class="empty-list-message">No hay citas programadas para el ${formattedDate}</p>`;
        return;
    }

    const students = await getAllStudents();
    const studentsMap = new Map(students.map(s => [s.id, s]));

    let html = `<p style="margin-bottom: 1rem; color: var(--text-muted);">Citas para el ${formattedDate}</p>`;
    
    dayAppointments.sort((a, b) => {
        if (a.hora && b.hora) {
            return a.hora.localeCompare(b.hora);
        }
        return 0;
    });
    
    dayAppointments.forEach(app => {
        const student = studentsMap.get(app.student_id);
        const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
        
        html += `
            <div class="appointment-item" style="margin-bottom: 1rem; padding: 1rem; background: var(--dark); border: 1px solid var(--border); border-radius: 8px; border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div style="flex: 1;">
                        <strong style="display: block; margin-bottom: 0.5rem; font-size: 1.125rem;">${studentName}</strong>
                        <div style="color: var(--text-muted); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="ph ph-clock"></i> ${formatTime(app.hora)}
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span class="badge ${app.estado === 'programada' ? 'bg-primary' : app.estado === 'completada' ? 'bg-success' : 'bg-secondary'}">${app.estado}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showProgramadorAppointmentSchedulePanel(dateStr) {
    const panel = document.getElementById('programadorAppointmentSchedulePanel');
    const studentNameEl = document.getElementById('programadorSchedulePanelStudentName');
    const dateEl = document.getElementById('programadorSchedulePanelDate');
    const timeInput = document.getElementById('programadorAppointmentTimeInput');
    
    if (!panel) return;
    
    studentNameEl.textContent = programadorCurrentSchedulingStudentName || 'Estudiante';
    dateEl.textContent = `Fecha: ${formatDate(dateStr)}`;
    timeInput.value = '';
    
    panel.classList.remove('hidden');
}

function hideProgramadorAppointmentSchedulePanel() {
    const panel = document.getElementById('programadorAppointmentSchedulePanel');
    if (panel) {
        panel.classList.add('hidden');
    }
    programadorCurrentSchedulingStudentId = null;
    programadorCurrentSchedulingStudentName = null;
    window.programadorEditingAppointmentId = null;
    
    const panelTitle = document.getElementById('programadorSchedulePanelTitle');
    if (panelTitle) {
        panelTitle.innerHTML = '<i class="ph ph-calendar-plus"></i> Agendar Nueva Cita';
    }
}

async function confirmProgramadorAppointmentFromCalendar() {
    if (!programadorSelectedCalendarDate || !programadorCurrentSchedulingStudentId) {
        showNotification("Por favor selecciona un día y asegúrate de tener un estudiante seleccionado.", "error");
        return;
    }
    
    const timeInput = document.getElementById('programadorAppointmentTimeInput');
    const hora = timeInput.value;
    
    if (!hora) {
        showNotification("Por favor selecciona una hora.", "error");
        return;
    }
    
    const selectedDate = new Date(programadorSelectedCalendarDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showNotification("No se pueden agendar citas en fechas pasadas.", "error");
        return;
    }
    
    const appointments = await getAllAppointments();
    const dayAppointments = appointments.filter(app => {
        const appDate = app.fecha.split('T')[0];
        return appDate === programadorSelectedCalendarDate && app.estado === 'programada';
    });
    
    const MAX_APPOINTMENTS_PER_DAY = getMaxAppointmentsPerDay();
    if (dayAppointments.length >= MAX_APPOINTMENTS_PER_DAY) {
        showNotification(`Este día ya tiene ${MAX_APPOINTMENTS_PER_DAY} citas agendadas. No hay disponibilidad.`, "error");
        return;
    }
    
    let studentName = programadorCurrentSchedulingStudentName;
    if (!studentName) {
        const students = await getAllStudents();
        const student = students.find(s => s.id === parseInt(programadorCurrentSchedulingStudentId));
        if (student) {
            studentName = `${student.nombre} ${student.apellido}`;
        }
    }
    
    const appointmentData = {
        student_id: parseInt(programadorCurrentSchedulingStudentId),
        fecha: programadorSelectedCalendarDate,
        hora: hora,
        estado: 'programada'
    };
    
    let success = false;
    const isEditing = !!window.programadorEditingAppointmentId;
    const editingId = window.programadorEditingAppointmentId;
    
    if (isEditing) {
        success = await updateAppointment(editingId, appointmentData);
        window.programadorEditingAppointmentId = null;
    } else {
        success = await addAppointment(appointmentData);
    }
    
    if (success) {
        hideProgramadorAppointmentSchedulePanel();
        await renderProgramadorCalendar();
        await renderProgramadorAppointmentsForDay(programadorSelectedCalendarDate);
        const message = isEditing ? 'Cita actualizada' : `Cita agendada para ${studentName || 'el estudiante'}`;
        showNotification(message, "success");
    }
}

// ========== FUNCIÓN HELPER PARA MÁXIMO DE CITAS POR DÍA ==========
function getMaxAppointmentsPerDay() {
    const max = localStorage.getItem('maxAppointmentsPerDay');
    return max ? parseInt(max) : 2; // Valor por defecto: 2
}

// ========== FUNCIONES DE ESTADÍSTICAS (Solo Programador) ==========
async function renderStatistics() {
    const students = await getAllStudents();
    const appointments = await getAllAppointments();
    
    // Estadísticas básicas
    document.getElementById('statTotalStudents').textContent = students.length;
    document.getElementById('statTotalAppointments').textContent = appointments.length;
    
    const pendingAppointments = appointments.filter(a => a.estado === 'programada');
    const completedAppointments = appointments.filter(a => a.estado === 'completada');
    
    document.getElementById('statPendingAppointments').textContent = pendingAppointments.length;
    document.getElementById('statCompletedAppointments').textContent = completedAppointments.length;
    
    // Estadísticas por carrera
    const careerStats = {};
    students.forEach(student => {
        const carrera = student.carrera || 'Sin carrera';
        careerStats[carrera] = (careerStats[carrera] || 0) + 1;
    });
    
    const careerContainer = document.getElementById('statisticsByCareer');
    if (Object.keys(careerStats).length === 0) {
        careerContainer.innerHTML = '<p class="empty-list-message">No hay datos</p>';
    } else {
        let html = '';
        Object.entries(careerStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([carrera, count]) => {
                const percentage = ((count / students.length) * 100).toFixed(1);
                html += `
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span><strong>${carrera}</strong></span>
                            <span>${count} (${percentage}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: var(--primary); transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            });
        careerContainer.innerHTML = html;
    }
    
    // Estadísticas por sexo
    const genderStats = {};
    students.forEach(student => {
        const sexo = student.sexo || 'No especificado';
        genderStats[sexo] = (genderStats[sexo] || 0) + 1;
    });
    
    const genderContainer = document.getElementById('statisticsByGender');
    if (Object.keys(genderStats).length === 0) {
        genderContainer.innerHTML = '<p class="empty-list-message">No hay datos</p>';
    } else {
        let html = '';
        Object.entries(genderStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([sexo, count]) => {
                const percentage = ((count / students.length) * 100).toFixed(1);
                html += `
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span><strong>${sexo}</strong></span>
                            <span>${count} (${percentage}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: var(--primary); transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            });
        genderContainer.innerHTML = html;
    }
    
    // Estadísticas por estado de citas
    const statusStats = {
        'programada': appointments.filter(a => a.estado === 'programada'),
        'completada': appointments.filter(a => a.estado === 'completada'),
        'cancelada': appointments.filter(a => a.estado === 'cancelada')
    };
    
    const statusContainer = document.getElementById('statisticsByStatus');
    if (appointments.length === 0) {
        statusContainer.innerHTML = '<p class="empty-list-message">No hay citas</p>';
    } else {
        const studentsMap = new Map(students.map(s => [s.id, s]));
        let html = '';
        Object.entries(statusStats).forEach(([estado, estadoAppointments]) => {
            const count = estadoAppointments.length;
            const percentage = appointments.length > 0 ? ((count / appointments.length) * 100).toFixed(1) : 0;
            const color = estado === 'programada' ? '#3b82f6' : estado === 'completada' ? '#22c55e' : '#ef4444';
            const statusId = `status-${estado}`;
            html += `
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; cursor: pointer;" 
                         onclick="toggleStatusDetails('${statusId}')" 
                         class="status-header">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="ph ph-caret-down" id="${statusId}-icon" style="transition: transform 0.3s;"></i>
                            <span><strong>${estado.charAt(0).toUpperCase() + estado.slice(1)}</strong></span>
                        </div>
                        <span>${count} (${percentage}%)</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;">
                        <div style="width: ${percentage}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
                    </div>
                    <div id="${statusId}-details" style="display: none; margin-top: 1rem; max-height: 400px; overflow-y: auto;">
                        ${count === 0 ? '<p class="empty-list-message" style="font-size: 0.875rem;">No hay citas en este estado</p>' : ''}
                        ${estadoAppointments.slice(0, 10).map(app => {
                            const student = studentsMap.get(app.student_id);
                            const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
                            return `
                                <div class="appointment-stat-item" data-appointment-id="${app.id}" 
                                     style="padding: 0.75rem; margin-bottom: 0.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; border-left: 3px solid ${color};">
                                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.75rem; flex-wrap: wrap;">
                                        <div style="flex: 1; min-width: 200px;">
                                            <strong style="display: block; font-size: 0.9rem; margin-bottom: 0.25rem;">${studentName}</strong>
                                            <div style="color: var(--text-muted); font-size: 0.8rem;">
                                                <i class="ph ph-calendar"></i> ${formatDate(app.fecha)} a las ${formatTime(app.hora)}
                                            </div>
                                        </div>
                                        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                                            ${estado === 'programada' ? `
                                                <button class="btn btn-xs btn-success complete-appointment-stat-btn" data-id="${app.id}" title="Completar">
                                                    <i class="ph ph-check"></i>
                                                </button>
                                                <button class="btn btn-xs btn-warning edit-appointment-stat-btn" data-id="${app.id}" title="Editar">
                                                    <i class="ph ph-pencil"></i>
                                                </button>
                                                <button class="btn btn-xs btn-secondary cancel-appointment-stat-btn" data-id="${app.id}" title="Cancelar">
                                                    <i class="ph ph-x"></i>
                                                </button>
                                            ` : ''}
                                            ${estado === 'completada' ? `
                                                <button class="btn btn-xs btn-info view-appointment-stat-btn" data-id="${app.id}" title="Ver detalles">
                                                    <i class="ph ph-eye"></i>
                                                </button>
                                            ` : ''}
                                            <button class="btn btn-xs btn-danger delete-appointment-stat-btn" data-id="${app.id}" title="Eliminar">
                                                <i class="ph ph-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${count > 10 ? `<p style="text-align: center; color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">Y ${count - 10} más...</p>` : ''}
                    </div>
                </div>
            `;
        });
        statusContainer.innerHTML = html;
        
        // Agregar event listeners a los botones
        attachStatisticsAppointmentListeners();
    }
}

// Función para expandir/colapsar detalles de estado (disponible globalmente)
window.toggleStatusDetails = function(statusId) {
    const details = document.getElementById(`${statusId}-details`);
    const icon = document.getElementById(`${statusId}-icon`);
    
    if (details && icon) {
        const isHidden = details.style.display === 'none';
        details.style.display = isHidden ? 'block' : 'none';
        icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        
        // Si se expande, re-agregar listeners por si acaso
        if (isHidden) {
            setTimeout(() => attachStatisticsAppointmentListeners(), 100);
        }
    }
    
    // Próximas citas
    const upcomingContainer = document.getElementById('upcomingAppointmentsList');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingAppointments = pendingAppointments
        .filter(app => {
            const appDate = new Date(app.fecha);
            appDate.setHours(0, 0, 0, 0);
            return appDate >= today;
        })
        .sort((a, b) => {
            const dateA = new Date(a.fecha + 'T' + a.hora);
            const dateB = new Date(b.fecha + 'T' + b.hora);
            return dateA - dateB;
        })
        .slice(0, 10);
    
    if (upcomingAppointments.length === 0) {
        upcomingContainer.innerHTML = '<p class="empty-list-message">No hay citas próximas</p>';
    } else {
        const studentsMap = new Map(students.map(s => [s.id, s]));
        let html = '';
        upcomingAppointments.forEach(app => {
            const student = studentsMap.get(app.student_id);
            const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${app.student_id}`;
            html += `
                <div class="appointment-stat-item" data-appointment-id="${app.id}" style="padding: 1rem; margin-bottom: 0.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; border-left: 4px solid var(--primary);">
                    <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
                        <div style="flex: 1;">
                            <strong style="display: block; margin-bottom: 0.25rem;">${studentName}</strong>
                            <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">
                                <i class="ph ph-calendar"></i> ${formatDate(app.fecha)} a las ${formatTime(app.hora)}
                            </div>
                            ${student ? `
                                <div style="color: var(--text-muted); font-size: 0.875rem;">
                                    <i class="ph ph-graduation-cap"></i> ${student.carrera}
                                    ${student.telefono ? ` | <i class="ph ph-phone"></i> ${student.telefono}` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                            <span class="badge bg-primary">${app.estado}</span>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${app.estado === 'programada' ? `
                                    <button class="btn btn-sm btn-success complete-appointment-stat-btn" data-id="${app.id}" title="Completar cita">
                                        <i class="ph ph-check"></i>
                                    </button>
                                    <button class="btn btn-sm btn-warning edit-appointment-stat-btn" data-id="${app.id}" title="Editar cita">
                                        <i class="ph ph-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-secondary cancel-appointment-stat-btn" data-id="${app.id}" title="Cancelar cita">
                                        <i class="ph ph-x"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-danger delete-appointment-stat-btn" data-id="${app.id}" title="Eliminar cita">
                                    <i class="ph ph-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        upcomingContainer.innerHTML = html;
        
        // Agregar event listeners a los botones
        attachStatisticsAppointmentListeners();
    }
}

// Función para agregar event listeners a los botones de citas en estadísticas
function attachStatisticsAppointmentListeners() {
    // Remover listeners anteriores para evitar duplicados
    document.querySelectorAll('.complete-appointment-stat-btn, .cancel-appointment-stat-btn, .edit-appointment-stat-btn, .delete-appointment-stat-btn, .view-appointment-stat-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Botones de completar
    document.querySelectorAll('.complete-appointment-stat-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const appointmentId = parseInt(e.currentTarget.dataset.id);
            if (confirm('¿Marcar esta cita como completada?')) {
                const success = await completeAppointment(appointmentId);
                if (success) {
                    await renderStatistics();
                }
            }
        });
    });
    
    // Botones de cancelar
    document.querySelectorAll('.cancel-appointment-stat-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const appointmentId = parseInt(e.currentTarget.dataset.id);
            if (confirm('¿Cancelar esta cita?')) {
                const success = await cancelAppointment(appointmentId);
                if (success) {
                    await renderStatistics();
                }
            }
        });
    });
    
    // Botones de editar
    document.querySelectorAll('.edit-appointment-stat-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const appointmentId = parseInt(e.currentTarget.dataset.id);
            await editAppointmentFromStatistics(appointmentId);
        });
    });
    
    // Botones de eliminar
    document.querySelectorAll('.delete-appointment-stat-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const appointmentId = parseInt(e.currentTarget.dataset.id);
            if (confirm('¿Eliminar esta cita permanentemente?')) {
                const success = await deleteAppointment(appointmentId);
                if (success) {
                    await renderStatistics();
                }
            }
        });
    });
    
    // Botones de ver detalles (para citas completadas)
    document.querySelectorAll('.view-appointment-stat-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const appointmentId = parseInt(e.currentTarget.dataset.id);
            await viewAppointmentDetails(appointmentId);
        });
    });
}

// Función para ver detalles de una cita
async function viewAppointmentDetails(appointmentId) {
    try {
        const appointments = await getAllAppointments();
        const appointment = appointments.find(app => app.id === appointmentId);
        
        if (!appointment) {
            showNotification("Cita no encontrada", "error");
            return;
        }

        const students = await getAllStudents();
        const student = students.find(s => s.id === appointment.student_id);
        
        const studentName = student ? `${student.nombre} ${student.apellido}` : `Estudiante ID: ${appointment.student_id}`;
        const studentInfo = student ? `
            <p><strong>Carrera:</strong> ${student.carrera}</p>
            ${student.telefono ? `<p><strong>Teléfono:</strong> ${student.telefono}</p>` : ''}
            <p><strong>Sexo:</strong> ${student.sexo}</p>
        ` : '';
        
        const details = `
            <div style="text-align: left;">
                <h3 style="margin-bottom: 1rem;">Detalles de la Cita</h3>
                <p><strong>Estudiante:</strong> ${studentName}</p>
                ${studentInfo}
                <p><strong>Fecha:</strong> ${formatDate(appointment.fecha)}</p>
                <p><strong>Hora:</strong> ${formatTime(appointment.hora)}</p>
                <p><strong>Estado:</strong> ${appointment.estado.charAt(0).toUpperCase() + appointment.estado.slice(1)}</p>
                ${appointment.fecha_completada ? `<p><strong>Fecha de Completación:</strong> ${formatDate(appointment.fecha_completada.split('T')[0])}</p>` : ''}
            </div>
        `;
        
        alert(details);
    } catch (error) {
        console.error("Error al ver detalles de cita:", error);
        showNotification("Error al cargar detalles de la cita", "error");
    }
}

// Función para editar cita desde estadísticas
async function editAppointmentFromStatistics(appointmentId) {
    try {
        const appointments = await getAllAppointments();
        const appointment = appointments.find(app => app.id === appointmentId);
        
        if (!appointment) {
            showNotification("Cita no encontrada", "error");
            return;
        }

        const students = await getAllStudents();
        const student = students.find(s => s.id === appointment.student_id);
        
        if (!student) {
            showNotification("Estudiante no encontrado", "error");
            return;
        }

        // Configurar para edición en modo programador
        programadorCurrentSchedulingStudentId = appointment.student_id;
        programadorCurrentSchedulingStudentName = `${student.nombre} ${student.apellido}`;
        window.programadorEditingAppointmentId = appointmentId;
        
        // Cambiar a sección de agendar cita del programador
        if (isProgramadorMode) {
            await switchProgramadorView('appointments');
            
            // Seleccionar la fecha de la cita
            await selectProgramadorCalendarDay(appointment.fecha);
            
            // Llenar el campo de hora
            const timeInput = document.getElementById('programadorAppointmentTimeInput');
            if (timeInput) {
                timeInput.value = appointment.hora;
            }
            
            // Cambiar el título del panel
            const panelTitle = document.getElementById('programadorSchedulePanelTitle');
            if (panelTitle) {
                panelTitle.innerHTML = '<i class="ph ph-pencil"></i> Editar Cita';
            }
            
            showNotification(`Editando cita de ${programadorCurrentSchedulingStudentName}`, "info");
        }
    } catch (error) {
        console.error("Error al editar cita desde estadísticas:", error);
        showNotification("Error al cargar cita para edición", "error");
    }
}

// ========== FUNCIONES DE CONFIGURACIÓN (Solo Programador) ==========
function loadSettings() {
    // Cargar configuración desde localStorage
    const maxAppointments = localStorage.getItem('maxAppointmentsPerDay') || '2';
    const maxAppointmentsInput = document.getElementById('maxAppointmentsPerDay');
    if (maxAppointmentsInput) {
        maxAppointmentsInput.value = maxAppointments;
    }
}

function saveSettings() {
    const maxAppointmentsInput = document.getElementById('maxAppointmentsPerDay');
    if (maxAppointmentsInput) {
        const maxAppointments = maxAppointmentsInput.value;
        localStorage.setItem('maxAppointmentsPerDay', maxAppointments);
        showNotification('✅ Configuración guardada correctamente', 'success');
    }
}

function updateLastUpdateTime() {
    const lastUpdateEl = document.getElementById('lastUpdateTime');
    if (lastUpdateEl) {
        const now = new Date();
        lastUpdateEl.textContent = now.toLocaleString('es-ES');
    }
}

function exportData(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`✅ Datos exportados: ${filename}`, 'success');
}

async function exportStudents() {
    const students = await getAllStudents();
    exportData(students, `estudiantes_${new Date().toISOString().split('T')[0]}.json`);
}

async function exportAppointments() {
    const appointments = await getAllAppointments();
    exportData(appointments, `citas_${new Date().toISOString().split('T')[0]}.json`);
}

async function exportAll() {
    const students = await getAllStudents();
    const appointments = await getAllAppointments();
    const allData = {
        estudiantes: students,
        citas: appointments,
        fecha_exportacion: new Date().toISOString(),
        version: '1.2.0'
    };
    exportData(allData, `backup_completo_${new Date().toISOString().split('T')[0]}.json`);
}

async function cleanDatabase() {
    if (!confirm('⚠️ ¿ESTÁS SEGURO?\n\nEsta acción eliminará TODOS los estudiantes y TODAS las citas.\n\nEsta acción NO se puede deshacer.\n\nEscribe "ELIMINAR TODO" para confirmar.')) {
        return;
    }
    
    const confirmation = prompt('Escribe "ELIMINAR TODO" para confirmar:');
    if (confirmation !== 'ELIMINAR TODO') {
        showNotification('❌ Confirmación incorrecta. Operación cancelada.', 'error');
        return;
    }
    
    try {
        // Eliminar todas las citas primero
        const appointments = await getAllAppointments();
        for (const app of appointments) {
            await deleteAppointment(app.id);
        }
        
        // Eliminar todos los estudiantes
        const students = await getAllStudents();
        for (const student of students) {
            await deleteStudent(student.id);
        }
        
        showNotification('✅ Base de datos limpiada correctamente', 'success');
        
        // Recargar estadísticas si estamos en esa vista
        if (isProgramadorMode) {
            await renderStatistics();
            await renderProgramadorMaestroStudents();
        }
    } catch (error) {
        console.error('Error al limpiar base de datos:', error);
        showNotification('❌ Error al limpiar la base de datos', 'error');
    }
}

// - Inicialización -
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const activeBtn = document.querySelector('.menu-btn.active') || document.querySelector('.menu-btn[data-section="register"]');
        if (activeBtn) {
            activeBtn.click();
        }
        
        // Inicializar calendario
        const calendarNavLeft = document.getElementById('calendarNavLeft');
        const calendarNavRight = document.getElementById('calendarNavRight');
        
        if (calendarNavLeft) {
            calendarNavLeft.addEventListener('click', () => navigateCalendar(-1));
        }
        if (calendarNavRight) {
            calendarNavRight.addEventListener('click', () => navigateCalendar(1));
        }
        
        // Event listeners para panel de agendamiento
        const confirmBtn = document.getElementById('confirmAppointmentBtn');
        const closeBtn = document.getElementById('closeSchedulePanel');
        const timeInput = document.getElementById('appointmentTimeInput');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmAppointmentFromCalendar);
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', hideAppointmentSchedulePanel);
        }
        
        // Permitir agendar con Enter en el campo de hora
        if (timeInput) {
            timeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmAppointmentFromCalendar();
                }
            });
        }

        // Búsqueda de estudiantes
        document.getElementById('studentSearch').addEventListener('input', async (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query) {
                const results = await getAllStudents();
                const filtered = results.filter(s =>
                    s.nombre.toLowerCase().includes(query) ||
                    s.apellido.toLowerCase().includes(query) ||
                    s.carrera.toLowerCase().includes(query) ||
                    (s.telefono && s.telefono.includes(query))
                );
                renderStudents(filtered);
            } else {
                renderStudents();
            }
        });

        // Inicializar módulo de maestro
        setupMaestroModule();

        // ========== EVENT LISTENERS PARA MODO PROGRAMADOR ==========
        // Navegación del menú programador
        document.querySelectorAll('[data-programador-section]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetView = e.currentTarget.dataset.programadorSection;
                switchProgramadorView(targetView);
            });
        });

        // Formulario de registro del programador
        const programadorStudentForm = document.getElementById('programadorStudentForm');
        if (programadorStudentForm) {
            programadorStudentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                
                const nombre = formData.get('nombre') || '';
                const apellido = formData.get('apellido') || '';
                const sexo = formData.get('sexo') || '';
                const telefono = formData.get('telefono') || '';
                const carrera = formData.get('carrera') || '';
                
                if (!nombre.trim() || !apellido.trim() || !sexo || !carrera.trim()) {
                    showNotification("Por favor completa todos los campos requeridos.", "error");
                    return;
                }

                const studentData = {
                    nombre: nombre.trim(),
                    apellido: apellido.trim(),
                    sexo: sexo,
                    telefono: telefono.trim() || null,
                    carrera: carrera.trim(),
                    foto: null
                };

                const fileInput = document.getElementById('programadorFotoEstudiante');
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    if (file.size > 2 * 1024 * 1024) {
                        showNotification('La foto no debe superar 2MB.', 'error');
                        return;
                    }
                    const reader = new FileReader();
                    const promise = new Promise((resolve) => {
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    });
                    studentData.foto = await promise;
                }

                if (await addStudent(studentData)) {
                    e.target.reset();
                    const preview = document.querySelector('#programador-register .photo-upload-area');
                    if (preview) {
                        preview.innerHTML = '<i class="ph ph-camera"></i><p>Subir foto</p><small>Opcional</small>';
                        preview.classList.remove('has-photo');
                        preview.style.backgroundImage = 'none';
                    }
                    await renderProgramadorMaestroStudents();
                }
            });
        }

        // Preview de foto del programador
        const programadorFotoInput = document.getElementById('programadorFotoEstudiante');
        if (programadorFotoInput) {
            programadorFotoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const preview = document.querySelector('#programador-register .photo-upload-area');
                
                if (file && preview) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        preview.style.backgroundImage = `url(${e.target.result})`;
                        preview.classList.add('has-photo');
                    };
                    reader.readAsDataURL(file);
                } else if (preview) {
                    preview.innerHTML = '<i class="ph ph-camera"></i><p>Subir foto</p><small>Opcional</small>';
                    preview.classList.remove('has-photo');
                    preview.style.backgroundImage = 'none';
                }
            });
        }

        // Calendario del programador
        const programadorCalendarNavLeft = document.getElementById('programadorCalendarNavLeft');
        const programadorCalendarNavRight = document.getElementById('programadorCalendarNavRight');
        
        if (programadorCalendarNavLeft) {
            programadorCalendarNavLeft.addEventListener('click', () => navigateProgramadorCalendar(-1));
        }
        if (programadorCalendarNavRight) {
            programadorCalendarNavRight.addEventListener('click', () => navigateProgramadorCalendar(1));
        }

        // Panel de agendamiento del programador
        const programadorConfirmBtn = document.getElementById('programadorConfirmAppointmentBtn');
        const programadorCloseBtn = document.getElementById('programadorCloseSchedulePanel');
        const programadorTimeInput = document.getElementById('programadorAppointmentTimeInput');
        
        if (programadorConfirmBtn) {
            programadorConfirmBtn.addEventListener('click', confirmProgramadorAppointmentFromCalendar);
        }
        
        if (programadorCloseBtn) {
            programadorCloseBtn.addEventListener('click', hideProgramadorAppointmentSchedulePanel);
        }
        
        if (programadorTimeInput) {
            programadorTimeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmProgramadorAppointmentFromCalendar();
                }
            });
        }

        // Botón para agendar nueva cita del programador
        const programadorNewAppointmentBtn = document.getElementById('programadorNewAppointmentBtn');
        if (programadorNewAppointmentBtn) {
            programadorNewAppointmentBtn.addEventListener('click', () => {
                openSelectStudentModal();
                // Guardar que estamos en modo programador para cuando se seleccione el estudiante
                window.isSelectingForProgramador = true;
            });
        }

        // Calendario maestro del programador
        const programadorMaestroNavLeft = document.getElementById('programadorMaestroNavLeft');
        const programadorMaestroNavRight = document.getElementById('programadorMaestroNavRight');
        
        if (programadorMaestroNavLeft) {
            programadorMaestroNavLeft.addEventListener('click', () => navigateProgramadorMaestroCalendar(-1));
        }
        if (programadorMaestroNavRight) {
            programadorMaestroNavRight.addEventListener('click', () => navigateProgramadorMaestroCalendar(1));
        }

        // Búsqueda de estudiantes del programador
        const programadorMaestroStudentSearch = document.getElementById('programadorMaestroStudentSearch');
        if (programadorMaestroStudentSearch) {
            programadorMaestroStudentSearch.addEventListener('input', async (e) => {
                const query = e.target.value.trim().toLowerCase();
                if (query) {
                    const students = await getAllStudents();
                    const filtered = students.filter(s => 
                        s.nombre.toLowerCase().includes(query) ||
                        s.apellido.toLowerCase().includes(query) ||
                        s.carrera.toLowerCase().includes(query) ||
                        (s.telefono && s.telefono.toLowerCase().includes(query))
                    );
                    await renderProgramadorMaestroStudents(filtered);
                } else {
                    await renderProgramadorMaestroStudents();
                }
            });
        }

        // ========== EVENT LISTENERS PARA ESTADÍSTICAS Y CONFIGURACIÓN ==========
        // Botón de actualizar estadísticas (Programador)
        const refreshStatisticsBtn = document.getElementById('refreshStatisticsBtn');
        if (refreshStatisticsBtn) {
            refreshStatisticsBtn.addEventListener('click', async () => {
                await renderStatistics();
                showNotification('✅ Estadísticas actualizadas', 'success');
            });
        }

        // Botón de actualizar estadísticas (Maestro)
        const refreshMaestroStatisticsBtn = document.getElementById('refreshMaestroStatisticsBtn');
        if (refreshMaestroStatisticsBtn) {
            refreshMaestroStatisticsBtn.addEventListener('click', async () => {
                await renderMaestroStatistics();
                showNotification('✅ Estadísticas actualizadas', 'success');
            });
        }

        // Botones de exportación
        const exportStudentsBtn = document.getElementById('exportStudentsBtn');
        const exportAppointmentsBtn = document.getElementById('exportAppointmentsBtn');
        const exportAllBtn = document.getElementById('exportAllBtn');
        
        if (exportStudentsBtn) {
            exportStudentsBtn.addEventListener('click', exportStudents);
        }
        if (exportAppointmentsBtn) {
            exportAppointmentsBtn.addEventListener('click', exportAppointments);
        }
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', exportAll);
        }

        // Botón de guardar configuración
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveSettings);
        }

        // Botón de limpiar base de datos
        const cleanDatabaseBtn = document.getElementById('cleanDatabaseBtn');
        if (cleanDatabaseBtn) {
            cleanDatabaseBtn.addEventListener('click', cleanDatabase);
        }

        // Botón para agendar nueva cita
        const newAppointmentBtn = document.getElementById('newAppointmentBtn');
        if (newAppointmentBtn) {
            newAppointmentBtn.addEventListener('click', () => {
                openSelectStudentModal();
            });
        }

        // Modal de selección de estudiante
        const selectStudentModal = document.getElementById('selectStudentModal');
        const selectStudentCloseBtn = document.getElementById('selectStudentCloseBtn');
        const selectStudentCancelBtn = document.getElementById('selectStudentCancelBtn');
        const studentSearchModal = document.getElementById('studentSearchModal');

        if (selectStudentCloseBtn) {
            selectStudentCloseBtn.addEventListener('click', closeSelectStudentModal);
        }

        if (selectStudentCancelBtn) {
            selectStudentCancelBtn.addEventListener('click', closeSelectStudentModal);
        }

        if (selectStudentModal) {
            selectStudentModal.addEventListener('click', (e) => {
                if (e.target === selectStudentModal) {
                    closeSelectStudentModal();
                }
            });
        }

        if (studentSearchModal) {
            studentSearchModal.addEventListener('input', async (e) => {
                const query = e.target.value.trim().toLowerCase();
                await renderStudentSelectList(query);
            });
        }

        // Cursor personalizado
        const cursor = document.querySelector('.cursor');
        if (cursor) {
            document.addEventListener('mousemove', (e) => {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
            });

            document.addEventListener('mousedown', () => {
                cursor.classList.add('click');
            });

            document.addEventListener('mouseup', () => {
                cursor.classList.remove('click');
            });

            document.querySelectorAll('button, a, input, select').forEach(el => {
                el.addEventListener('mouseenter', () => {
                    cursor.classList.add('hover');
                });
                el.addEventListener('mouseleave', () => {
                    cursor.classList.remove('hover');
                });
            });
        }

    } catch (error) {
        console.error("Error inicializando:", error);
        showNotification("Error al cargar la aplicación.", "error");
    }
});
