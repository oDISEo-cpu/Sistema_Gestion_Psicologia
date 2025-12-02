import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Cargar variables de entorno desde el mismo directorio del servidor
// Esto permite ejecutar el servidor desde la raíz del proyecto
// aunque el archivo .env esté dentro de "pagina psicologica/"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });


const app = express();
app.use(cors());
// Aumentar el límite de tamaño del payload para permitir imágenes en base64 (hasta 10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static(__dirname));

// Ruta principal para servir el archivo HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Index.html'));
});

// Conexión a MySQL
let db;
try {
  const poolConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "secretaria",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };
  
  // Para conexiones remotas (como Render), puede necesitar SSL
  if (process.env.DB_HOST && process.env.DB_HOST !== "localhost" && process.env.DB_HOST !== "127.0.0.1") {
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
  }
  
  db = await mysql.createPool(poolConfig);
  
  // Probar la conexión
  const testConnection = await db.getConnection();
  await testConnection.ping();
  testConnection.release();
  
  console.log("✅ Conexión a la base de datos establecida correctamente");
} catch (error) {
  console.error("❌ Error al conectar con la base de datos:", error.message);
  console.error("Stack trace:", error.stack);
  console.error("Por favor verifica:");
  console.error("1. Que MySQL esté corriendo");
  console.error("2. Que la base de datos 'secretaria' exista (ejecuta database.sql)");
  console.error("3. Que las credenciales en .env sean correctas");
  console.error("4. Variables de entorno:", {
    DB_HOST: process.env.DB_HOST || "no definida",
    DB_USER: process.env.DB_USER || "no definida",
    DB_NAME: process.env.DB_NAME || "no definida",
    DB_PASS: process.env.DB_PASS ? "***definida***" : "no definida"
  });
  process.exit(1);
}

// ------------------ ESTUDIANTES ------------------
app.get("/estudiantes", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM estudiantes ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener estudiantes:", error);
    res.status(500).json({ error: "Error al obtener estudiantes" });
  }
});

app.post("/estudiantes", async (req, res) => {
  try {
    const { nombre, apellido, sexo, telefono, carrera, foto } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !apellido || !sexo || !carrera) {
      return res.status(400).json({ error: "Faltan campos requeridos: nombre, apellido, sexo, carrera" });
    }
    
    // Normalizar nombre y apellido: trim, eliminar espacios múltiples, y convertir a minúsculas para comparación
    const nombreNormalizado = nombre.trim().replace(/\s+/g, ' ').toLowerCase();
    const apellidoNormalizado = apellido.trim().replace(/\s+/g, ' ').toLowerCase();
    
    // Obtener todos los estudiantes y comparar en JavaScript para mayor control
    const [allStudents] = await db.query("SELECT id, nombre, apellido FROM estudiantes");
    
    // Buscar duplicados comparando nombres normalizados
    const existing = allStudents.find(student => {
      const studentNombre = student.nombre.trim().replace(/\s+/g, ' ').toLowerCase();
      const studentApellido = student.apellido.trim().replace(/\s+/g, ' ').toLowerCase();
      return studentNombre === nombreNormalizado && studentApellido === apellidoNormalizado;
    });
    
    const existingArray = existing ? [existing] : [];
    
    if (existingArray.length > 0) {
      console.log(`⚠️ Intento de registro duplicado: ${nombre.trim()} ${apellido.trim()} (ID existente: ${existingArray[0].id})`);
      return res.status(400).json({ 
        error: `⚠️ No se puede registrar: ${nombre.trim()} ${apellido.trim()} ya está registrado en el sistema.`,
        duplicate: true,
        existingStudent: existingArray[0]
      });
    }
    
    // Si no es duplicado, proceder con el registro
    console.log("Datos del estudiante a insertar:", {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      sexo,
      telefono: telefono || null,
      carrera,
      foto: foto ? "presente" : null
    });
    
    const [result] = await db.query(
      "INSERT INTO estudiantes (nombre, apellido, sexo, telefono, carrera, foto) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre.trim(), apellido.trim(), sexo, telefono || null, carrera, foto || null]
    );
    
    console.log(`✅ Estudiante registrado: ${nombre.trim()} ${apellido.trim()} (ID: ${result.insertId})`);
    res.json({ id: result.insertId, message: "Estudiante registrado" });
  } catch (error) {
    console.error("Error al agregar estudiante:", error);
    console.error("Error completo:", {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    res.status(500).json({ 
      error: `Error al agregar estudiante: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.delete("/estudiantes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "ID de estudiante inválido" });
    }
    
    // Primero eliminar todas las citas asociadas al estudiante
    await db.query("DELETE FROM citas WHERE student_id = ?", [id]);
    
    // Luego eliminar el estudiante
    const [result] = await db.query("DELETE FROM estudiantes WHERE id = ?", [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    
    // Reordenar los IDs para que no haya saltos y eliminar duplicados
    await reorderStudentIds();
    
    res.json({ message: "Estudiante y todas sus citas eliminados" });
  } catch (error) {
    console.error("Error al eliminar estudiante:", error);
    res.status(500).json({ error: `Error al eliminar estudiante: ${error.message}` });
  }
});

// Endpoint para limpiar duplicados y reordenar IDs manualmente
app.post("/estudiantes/limpiar-y-reordenar", async (req, res) => {
  try {
    await reorderStudentIds();
    const [students] = await db.query("SELECT COUNT(*) as total FROM estudiantes");
    res.json({ 
      message: "Duplicados eliminados e IDs reordenados correctamente",
      totalEstudiantes: students[0].total
    });
  } catch (error) {
    console.error("Error al limpiar y reordenar:", error);
    res.status(500).json({ error: `Error al limpiar y reordenar: ${error.message}` });
  }
});

// Función para reordenar los IDs de estudiantes y eliminar duplicados
async function reorderStudentIds() {
  try {
    // Deshabilitar temporalmente las verificaciones de claves foráneas
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    
    // Obtener todos los estudiantes ordenados por ID actual
    const [students] = await db.query("SELECT * FROM estudiantes ORDER BY id");
    
    if (students.length === 0) {
      await db.query("SET FOREIGN_KEY_CHECKS = 1");
      return;
    }
    
    // Eliminar duplicados: mantener solo el primero de cada nombre/apellido
    const seen = new Map(); // clave: "nombre|apellido" (lowercase), valor: id original
    const uniqueStudents = [];
    const duplicateIds = []; // IDs de estudiantes duplicados a eliminar
    
    for (const student of students) {
      const key = `${student.nombre.toLowerCase().trim()}|${student.apellido.toLowerCase().trim()}`;
      
      if (seen.has(key)) {
        // Es un duplicado, marcar para eliminar
        duplicateIds.push(student.id);
        // Mover las citas del duplicado al estudiante original
        const originalId = seen.get(key);
        await db.query("UPDATE citas SET student_id = ? WHERE student_id = ?", [originalId, student.id]);
      } else {
        // Es único, agregarlo
        seen.set(key, student.id);
        uniqueStudents.push(student);
      }
    }
    
    // Eliminar estudiantes duplicados
    if (duplicateIds.length > 0) {
      const placeholders = duplicateIds.map(() => '?').join(',');
      await db.query(`DELETE FROM estudiantes WHERE id IN (${placeholders})`, duplicateIds);
      console.log(`✅ Eliminados ${duplicateIds.length} estudiantes duplicados`);
    }
    
    // Obtener estudiantes únicos ordenados por ID
    const [uniqueStudentsList] = await db.query(
      "SELECT * FROM estudiantes ORDER BY id"
    );
    
    if (uniqueStudentsList.length === 0) {
      await db.query("SET FOREIGN_KEY_CHECKS = 1");
      return;
    }
    
    // Crear una tabla temporal con los nuevos IDs
    await db.query("CREATE TEMPORARY TABLE temp_students AS SELECT * FROM estudiantes WHERE 1=0");
    
    // Insertar estudiantes con nuevos IDs secuenciales
    for (let i = 0; i < uniqueStudentsList.length; i++) {
      const newId = i + 1;
      const oldId = uniqueStudentsList[i].id;
      
      if (oldId !== newId) {
        // Actualizar las citas primero
        await db.query("UPDATE citas SET student_id = ? WHERE student_id = ?", [newId, oldId]);
      }
      
      // Insertar en tabla temporal con nuevo ID
      await db.query(
        "INSERT INTO temp_students (id, nombre, apellido, sexo, telefono, carrera, foto) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newId, uniqueStudentsList[i].nombre, uniqueStudentsList[i].apellido, uniqueStudentsList[i].sexo, uniqueStudentsList[i].telefono, uniqueStudentsList[i].carrera, uniqueStudentsList[i].foto]
      );
    }
    
    // Eliminar todos los estudiantes
    await db.query("DELETE FROM estudiantes");
    
    // Copiar de vuelta desde la tabla temporal
    await db.query("INSERT INTO estudiantes SELECT * FROM temp_students");
    
    // Eliminar tabla temporal
    await db.query("DROP TEMPORARY TABLE temp_students");
    
    // Actualizar el AUTO_INCREMENT
    const [maxId] = await db.query("SELECT MAX(id) as maxId FROM estudiantes");
    const nextId = (maxId[0]?.maxId || 0) + 1;
    await db.query(`ALTER TABLE estudiantes AUTO_INCREMENT = ${nextId}`);
    
    // Rehabilitar verificaciones de claves foráneas
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    
    console.log(`✅ IDs reordenados secuencialmente (1-${uniqueStudentsList.length})`);
    
  } catch (error) {
    // Asegurarse de reactivar las verificaciones incluso si hay error
    await db.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
    throw error;
  }
}

// ------------------ CITAS ------------------
app.get("/citas", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM citas ORDER BY fecha DESC, hora DESC");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener citas:", error);
    res.status(500).json({ error: "Error al obtener citas" });
  }
});

app.post("/citas", async (req, res) => {
  try {
    const { student_id, fecha, hora, estado } = req.body;
    
    // Validar campos requeridos
    if (!student_id || !fecha || !hora) {
      return res.status(400).json({ error: "Faltan campos requeridos: student_id, fecha, hora" });
    }
    
    // Verificar que no haya más de 2 citas programadas en el mismo día
    const MAX_APPOINTMENTS_PER_DAY = 2;
    const [existingAppointments] = await db.query(
      "SELECT COUNT(*) as count FROM citas WHERE fecha = ? AND estado = 'programada'",
      [fecha]
    );
    
    if (existingAppointments[0].count >= MAX_APPOINTMENTS_PER_DAY) {
      return res.status(400).json({ 
        error: `Este día ya tiene ${MAX_APPOINTMENTS_PER_DAY} citas agendadas. No hay disponibilidad.`,
        maxReached: true
      });
    }
    
    const [result] = await db.query(
      "INSERT INTO citas (student_id, fecha, hora, estado) VALUES (?, ?, ?, ?)",
      [student_id, fecha, hora, estado || "programada"]
    );
    console.log(`✅ Cita registrada: Estudiante ${student_id} - ${fecha} ${hora}`);
    res.json({ id: result.insertId, message: "Cita registrada" });
  } catch (error) {
    console.error("Error al agregar cita:", error);
    res.status(500).json({ error: `Error al agregar cita: ${error.message}` });
  }
});

app.put("/citas/:id/completar", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE citas SET estado='completada', fecha_completada=NOW() WHERE id=?", [id]);
    res.json({ message: "Cita completada" });
  } catch (error) {
    console.error("Error al completar cita:", error);
    res.status(500).json({ error: "Error al completar cita" });
  }
});

app.put("/citas/:id/cancelar", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE citas SET estado='cancelada' WHERE id=?", [id]);
    res.json({ message: "Cita cancelada" });
  } catch (error) {
    console.error("Error al cancelar cita:", error);
    res.status(500).json({ error: "Error al cancelar cita" });
  }
});

app.put("/citas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id, fecha, hora, estado } = req.body;
    
    // Validar campos requeridos
    if (!student_id || !fecha || !hora) {
      return res.status(400).json({ error: "Faltan campos requeridos: student_id, fecha, hora" });
    }
    
    // Obtener la cita actual para verificar si la fecha está cambiando
    const [currentAppointment] = await db.query("SELECT fecha, estado FROM citas WHERE id = ?", [id]);
    
    if (currentAppointment.length === 0) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }
    
    const currentDate = currentAppointment[0].fecha;
    const dateChanged = currentDate !== fecha;
    const newEstado = estado || 'programada';
    
    // Si la fecha cambió y el nuevo estado es 'programada', verificar el límite
    if (dateChanged && newEstado === 'programada') {
      const MAX_APPOINTMENTS_PER_DAY = 2;
      const [existingAppointments] = await db.query(
        "SELECT COUNT(*) as count FROM citas WHERE fecha = ? AND estado = 'programada' AND id != ?",
        [fecha, id]
      );
      
      if (existingAppointments[0].count >= MAX_APPOINTMENTS_PER_DAY) {
        return res.status(400).json({ 
          error: `Este día ya tiene ${MAX_APPOINTMENTS_PER_DAY} citas agendadas. No hay disponibilidad.`,
          maxReached: true
        });
      }
    }
    
    await db.query(
      "UPDATE citas SET student_id=?, fecha=?, hora=?, estado=? WHERE id=?",
      [student_id, fecha, hora, newEstado, id]
    );
    console.log(`✅ Cita actualizada: ID ${id} - ${fecha} ${hora}`);
    res.json({ message: "Cita actualizada" });
  } catch (error) {
    console.error("Error al actualizar cita:", error);
    res.status(500).json({ error: `Error al actualizar cita: ${error.message}` });
  }
});

app.delete("/citas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM citas WHERE id=?", [id]);
    res.json({ message: "Cita eliminada" });
  } catch (error) {
    console.error("Error al eliminar cita:", error);
    res.status(500).json({ error: "Error al eliminar cita" });
  }
});

// ------------------ INICIO DEL SERVIDOR ------------------
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // Escuchar en todas las interfaces para Render

app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Servidor desplegado en producción`);
  }
});
