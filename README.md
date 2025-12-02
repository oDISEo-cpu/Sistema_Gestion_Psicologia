# Sistema de Secretaría Psicológica

Sistema web para la gestión de estudiantes y citas psicológicas con base de datos MySQL.

## 🚀 Características

- **Gestión de Estudiantes**: Registro, visualización y eliminación de estudiantes
- **Gestión de Citas**: Agendamiento, seguimiento y gestión de citas psicológicas
- **Interfaz Moderna**: Diseño responsive con cursor personalizado
- **Base de Datos MySQL**: Almacenamiento persistente de datos
- **API REST**: Backend con Express.js y MySQL2

## 📋 Requisitos Previos

- Node.js (versión 16 o superior)
- MySQL (versión 5.7 o superior)
- Navegador web moderno

## 🛠️ Instalación y Configuración

### 1. Clonar/Descargar el proyecto
```bash
cd "pagina psicologica"
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar la base de datos MySQL

#### Opción A: Usando MySQL Workbench o phpMyAdmin
1. Abre tu cliente MySQL
2. Ejecuta el archivo `database.sql` para crear la base de datos y tablas

#### Opción B: Usando línea de comandos
```bash
mysql -u root -p < database.sql
```

### 4. Configurar credenciales de base de datos

Edita el archivo `server.js` y actualiza las credenciales de conexión:

```javascript
const db = await mysql.createPool({
  host: "localhost",
  user: "tu_usuario",        // Cambia por tu usuario MySQL
  password: "tu_contraseña", // Cambia por tu contraseña MySQL
  database: "secretaria_psicológica"
});
```

### 5. Iniciar el servidor backend
```bash
npm start
```

El servidor se ejecutará en `http://localhost:4000`

### 6. Abrir la aplicación web
Abre el archivo `Index.html` en tu navegador web o usa un servidor local:

```bash
# Opción 1: Usar Python (si está instalado)
python -m http.server 8000

# Opción 2: Usar Node.js (si tienes http-server instalado)
npx http-server -p 8000
```

Luego abre `http://localhost:8000` en tu navegador.

## 📁 Estructura del Proyecto

```
pagina psicologica/
├── Index.html          # Página principal
├── app.js             # Lógica del frontend
├── server.js          # Servidor backend (Express + MySQL)
├── styles.css         # Estilos CSS
├── package.json       # Dependencias del proyecto
├── database.sql       # Script de base de datos
└── README.md          # Este archivo
```

## 🎯 Funcionalidades

### Gestión de Estudiantes
- ✅ Registrar nuevos estudiantes con foto de perfil
- ✅ Ver lista de todos los estudiantes
- ✅ Buscar estudiantes por nombre, apellido, carrera o teléfono
- ✅ Eliminar estudiantes
- ✅ Ver citas de un estudiante específico

### Gestión de Citas
- ✅ Agendar nuevas citas para estudiantes
- ✅ Ver todas las citas programadas
- ✅ Marcar citas como completadas
- ✅ Cancelar citas
- ✅ Eliminar citas
- ✅ Separación entre citas futuras e historial

## 🔧 API Endpoints

### Estudiantes
- `GET /estudiantes` - Obtener todos los estudiantes
- `POST /estudiantes` - Crear nuevo estudiante
- `DELETE /estudiantes/:id` - Eliminar estudiante

### Citas
- `GET /citas` - Obtener todas las citas
- `POST /citas` - Crear nueva cita
- `PUT /citas/:id/completar` - Marcar cita como completada
- `PUT /citas/:id/cancelar` - Cancelar cita
- `DELETE /citas/:id` - Eliminar cita

## 🎨 Características de la Interfaz

- **Diseño Responsive**: Funciona en desktop, tablet y móvil
- **Cursor Personalizado**: Efecto visual único
- **Notificaciones**: Feedback visual para todas las acciones
- **Búsqueda en Tiempo Real**: Filtrado instantáneo de estudiantes
- **Iconos Font Awesome**: Interfaz visual atractiva
- **Animaciones**: Transiciones suaves y efectos hover

## 🐛 Solución de Problemas

### Error de conexión a MySQL
- Verifica que MySQL esté ejecutándose
- Confirma las credenciales en `server.js`
- Asegúrate de que la base de datos existe

### Error de CORS
- El servidor ya tiene CORS habilitado
- Si persisten problemas, verifica que el backend esté en el puerto 4000

### La aplicación no carga datos
- Verifica que el backend esté ejecutándose
- Revisa la consola del navegador para errores
- Confirma que la base de datos tenga datos

## 📝 Notas Adicionales

- Las fotos de perfil se almacenan como Data URLs en la base de datos
- El tamaño máximo de foto es 2MB
- Las fechas se manejan en formato ISO (YYYY-MM-DD)
- Los horarios se manejan en formato 24h (HH:MM)

## 🔄 Actualizaciones Futuras

- [ ] Sistema de autenticación
- [ ] Reportes y estadísticas
- [ ] Notificaciones por email
- [ ] Calendario visual
- [ ] Backup automático de datos

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias, revisa los logs del servidor y la consola del navegador para más detalles.

