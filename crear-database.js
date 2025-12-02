import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function crearBaseDatos() {
  let connection;
  
  try {
    console.log("🔄 Conectando a MySQL...");
    
    // Conectar sin especificar base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || ""
    });
    
    console.log("✅ Conectado a MySQL");
    
    // Crear la base de datos primero
    console.log("🔄 Creando base de datos 'secretaria'...");
    try {
      await connection.query("CREATE DATABASE IF NOT EXISTS `secretaria` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
      console.log("✅ Base de datos 'secretaria' creada");
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log("ℹ️  La base de datos 'secretaria' ya existe");
      } else {
        throw error;
      }
    }
    
    // Conectar a la base de datos
    await connection.query('USE secretaria');
    console.log("✅ Conectado a la base de datos 'secretaria'");
    
    // Eliminar tablas existentes si hay problemas
    console.log("🔄 Limpiando tablas existentes (si existen)...");
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      await connection.query('DROP TABLE IF EXISTS `citas`');
      await connection.query('DROP TABLE IF EXISTS `estudiantes`');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log("✅ Tablas limpiadas");
    } catch (e) {
      console.log("ℹ️  No había tablas que eliminar");
    }
    
    // Crear las tablas directamente
    console.log("🔄 Creando tablas...");
    
    // Crear tabla de estudiantes
    await connection.query(`
      CREATE TABLE \`estudiantes\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`nombre\` varchar(100) NOT NULL,
        \`apellido\` varchar(100) NOT NULL,
        \`sexo\` enum('Masculino','Femenino','Otro') NOT NULL,
        \`telefono\` varchar(20) DEFAULT NULL,
        \`carrera\` varchar(100) NOT NULL,
        \`foto\` longtext DEFAULT NULL,
        \`fecha_registro\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Tabla 'estudiantes' creada");
    
    // Crear tabla de citas sin foreign key primero
    await connection.query(`
      CREATE TABLE \`citas\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`student_id\` int(11) NOT NULL,
        \`fecha\` date NOT NULL,
        \`hora\` time NOT NULL,
        \`estado\` enum('programada','completada','cancelada') NOT NULL DEFAULT 'programada',
        \`fecha_completada\` timestamp NULL DEFAULT NULL,
        \`fecha_creacion\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`student_id\` (\`student_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Tabla 'citas' creada");
    
    // Agregar foreign key después
    try {
      await connection.query(`
        ALTER TABLE \`citas\`
        ADD CONSTRAINT \`citas_ibfk_1\` 
        FOREIGN KEY (\`student_id\`) 
        REFERENCES \`estudiantes\` (\`id\`) 
        ON DELETE CASCADE
      `);
      console.log("✅ Foreign key agregada");
    } catch (error) {
      console.warn(`⚠️  No se pudo agregar foreign key: ${error.message}`);
      console.warn("   La tabla funciona sin foreign key constraint");
    }
    
    console.log("✅ Tablas creadas correctamente");
    
    // Verificar que las tablas existen
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ Tablas encontradas: ${tables.length}`);
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
  } catch (error) {
    console.error("❌ Error al crear la base de datos:");
    console.error(`   ${error.message}`);
    console.error("");
    console.error("Por favor verifica:");
    console.error("1. Que MySQL esté corriendo");
    console.error("2. Que las credenciales en .env sean correctas");
    console.error("3. Que tengas permisos para crear bases de datos");
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

crearBaseDatos();

