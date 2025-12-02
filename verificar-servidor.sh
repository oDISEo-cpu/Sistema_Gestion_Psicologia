#!/bin/bash
echo "========================================="
echo "Verificación del Servidor"
echo "========================================="
echo ""
echo "1. Verificando si el servidor está corriendo..."
if curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo "   ✅ Servidor está corriendo en http://localhost:4000"
else
    echo "   ❌ Servidor NO está corriendo"
    echo "   Inicia el servidor con: npm start"
    exit 1
fi

echo ""
echo "2. Verificando conexión a la base de datos..."
DB_RESPONSE=$(curl -s http://localhost:4000/estudiantes 2>&1)
if echo "$DB_RESPONSE" | grep -q "error"; then
    echo "   ⚠️  Hay un problema con la base de datos"
    echo "   Ejecuta: mysql -u root -p < database.sql"
else
    echo "   ✅ Base de datos conectada correctamente"
fi

echo ""
echo "========================================="
echo "INSTRUCCIONES:"
echo "========================================="
echo "1. Abre tu navegador"
echo "2. Ve a: http://localhost:4000"
echo "3. NO abras el archivo Index.html directamente"
echo ""
echo "El servidor está corriendo en segundo plano."
echo "Para detenerlo, usa: pkill -f 'node server.js'"
echo "========================================="


