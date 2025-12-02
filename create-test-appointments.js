// Script para crear citas de prueba
import mysql from "mysql2/promise";

const db = await mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "Secretaria"
});

async function createTestAppointments() {
    try {
        console.log('Creando citas de prueba...');
        
        // Crear algunas citas de prueba usando IDs existentes
        await db.query(`
            INSERT INTO citas (student_id, fecha, hora, estado) VALUES 
            (1, '2025-10-25', '09:00:00', 'programada'),
            (3, '2025-10-26', '14:30:00', 'programada'),
            (1, '2025-10-27', '10:15:00', 'programada')
        `);
        
        console.log('✅ Citas de prueba creadas exitosamente');
        
        // Verificar las citas creadas
        const [citas] = await db.query("SELECT * FROM citas ORDER BY id DESC LIMIT 5");
        console.log('\nÚltimas 5 citas:');
        console.table(citas);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.end();
    }
}

createTestAppointments();

