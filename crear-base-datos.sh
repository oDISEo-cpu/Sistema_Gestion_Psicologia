#!/bin/bash

echo "========================================="
echo "Creación de Base de Datos"
echo "========================================="
echo ""

# Intentar diferentes formas de conexión a MySQL
MYSQL_CMD=""
if command -v mysql &> /dev/null; then
    MYSQL_CMD="mysql"
elif command -v mariadb &> /dev/null; then
    MYSQL_CMD="mariadb"
else
    echo "❌ Error: MySQL/MariaDB no está instalado o no está en el PATH"
    echo ""
    echo "Instala MySQL con:"
    echo "  sudo apt install mysql-server"
    echo "  o"
    echo "  sudo apt install mariadb-server"
    exit 1
fi

echo "Intentando crear la base de datos..."
echo ""

# Intentar sin contraseña primero
if $MYSQL_CMD -u root < database.sql 2>/dev/null; then
    echo "✅ Base de datos creada exitosamente"
    exit 0
fi

# Si falla, pedir contraseña
echo "Se requiere contraseña de MySQL root."
echo ""
echo "Ejecuta manualmente:"
echo "  mysql -u root -p < database.sql"
echo ""
echo "O si no tienes contraseña:"
echo "  mysql -u root < database.sql"
echo ""
echo "Si tienes problemas, también puedes ejecutar el script desde MySQL:"
echo "  mysql -u root -p"
echo "  source database.sql;"
echo ""

exit 1


