import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function limpiarDuplicadosYReordenar() {
  let db;
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "secretaria"
    });
    
    console.log("✅ Conectado a la base de datos");
    
    // Deshabilitar temporalmente las verificaciones de claves foráneas
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    
    // Obtener todos los estudiantes ordenados por ID actual
    const [students] = await db.query("SELECT * FROM estudiantes ORDER BY id");
    
    if (students.length === 0) {
      console.log("ℹ️  No hay estudiantes en la base de datos");
      await db.query("SET FOREIGN_KEY_CHECKS = 1");
      return;
    }
    
    console.log(`📊 Total de estudiantes encontrados: ${students.length}`);
    
    // Eliminar duplicados: mantener solo el primero de cada nombre/apellido
    const seen = new Map(); // clave: "nombre|apellido" (lowercase), valor: id original
    const duplicateIds = []; // IDs de estudiantes duplicados a eliminar
    const duplicatesInfo = []; // Información de duplicados para mostrar
    
    for (const student of students) {
      const key = `${student.nombre.toLowerCase().trim()}|${student.apellido.toLowerCase().trim()}`;
      
      if (seen.has(key)) {
        // Es un duplicado, marcar para eliminar
        duplicateIds.push(student.id);
        const originalId = seen.get(key);
        duplicatesInfo.push({
          duplicado: { id: student.id, nombre: student.nombre, apellido: student.apellido },
          original: { id: originalId }
        });
        // Mover las citas del duplicado al estudiante original
        const [citasMovidas] = await db.query("UPDATE citas SET student_id = ? WHERE student_id = ?", [originalId, student.id]);
        console.log(`  ↪️  Citas del estudiante ID ${student.id} movidas al ID ${originalId}`);
      } else {
        // Es único, agregarlo
        seen.set(key, student.id);
      }
    }
    
    if (duplicatesInfo.length > 0) {
      console.log(`\n⚠️  Duplicados encontrados:`);
      duplicatesInfo.forEach(dup => {
        console.log(`  - ID ${dup.duplicado.id}: ${dup.duplicado.nombre} ${dup.duplicado.apellido} (duplicado de ID ${dup.original.id})`);
      });
    }
    
    // Eliminar estudiantes duplicados
    if (duplicateIds.length > 0) {
      const placeholders = duplicateIds.map(() => '?').join(',');
      await db.query(`DELETE FROM estudiantes WHERE id IN (${placeholders})`, duplicateIds);
      console.log(`\n✅ Eliminados ${duplicateIds.length} estudiantes duplicados`);
    } else {
      console.log(`\n✅ No se encontraron duplicados`);
    }
    
    // Obtener estudiantes únicos ordenados por ID
    const [uniqueStudentsList] = await db.query(
      "SELECT * FROM estudiantes ORDER BY id"
    );
    
    if (uniqueStudentsList.length === 0) {
      console.log("ℹ️  No quedan estudiantes después de la limpieza");
      await db.query("SET FOREIGN_KEY_CHECKS = 1");
      return;
    }
    
    console.log(`\n📋 Reordenando ${uniqueStudentsList.length} estudiantes únicos...`);
    
    // Crear una tabla temporal con los nuevos IDs
    await db.query("CREATE TEMPORARY TABLE temp_students AS SELECT * FROM estudiantes WHERE 1=0");
    
    // Insertar estudiantes con nuevos IDs secuenciales
    for (let i = 0; i < uniqueStudentsList.length; i++) {
      const newId = i + 1;
      const oldId = uniqueStudentsList[i].id;
      
      if (oldId !== newId) {
        // Actualizar las citas primero
        await db.query("UPDATE citas SET student_id = ? WHERE student_id = ?", [newId, oldId]);
        console.log(`  ↻️  ID ${oldId} → ${newId}: ${uniqueStudentsList[i].nombre} ${uniqueStudentsList[i].apellido}`);
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
    
    console.log(`\n✅ Proceso completado:`);
    console.log(`   - Estudiantes únicos: ${uniqueStudentsList.length}`);
    console.log(`   - IDs reordenados: 1-${uniqueStudentsList.length}`);
    console.log(`   - AUTO_INCREMENT configurado: ${nextId}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (db) {
      await db.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
    }
  }
}

// Ejecutar la función
limpiarDuplicadosYReordenar();

