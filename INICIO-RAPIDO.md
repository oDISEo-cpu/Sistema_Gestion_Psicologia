# 🚀 INICIO RÁPIDO - Sistema de Secretaría Psicológica

## ⚠️ PROBLEMA COMÚN

Si ves el error: **"No se puede conectar al servidor"**

**CAUSA:** Estás abriendo el archivo `Index.html` directamente desde el sistema de archivos (`file://`)

**SOLUCIÓN:** Debes acceder a través del servidor web en `http://localhost:4000`

---

## 📋 PASOS PARA USAR LA APLICACIÓN

### 1️⃣ Iniciar el Servidor

Abre una terminal y ejecuta:

```bash
cd "/home/odiseo/Vídeos/pagina psicologica1.2/pagina psicologica"
npm start
```

O directamente:

```bash
cd "/home/odiseo/Vídeos/pagina psicologica1.2/pagina psicologica"
node server.js
```

**Deberías ver:**
```
✅ Conexión a la base de datos establecida correctamente
Servidor corriendo en http://localhost:4000
```

### 2️⃣ Abrir la Aplicación en el Navegador

**❌ NO HAGAS ESTO:**
- NO abras el archivo `Index.html` directamente haciendo doble clic
- NO uses la ruta `file:///home/odiseo/...`

**✅ HAZ ESTO:**
1. Abre tu navegador (Chrome, Firefox, etc.)
2. En la barra de direcciones, escribe: **`http://localhost:4000`**
3. Presiona Enter

### 3️⃣ Verificar que Funciona

Si todo está bien, deberías ver:
- ✅ La aplicación carga sin errores
- ✅ Puedes ver la lista de estudiantes
- ✅ Puedes registrar nuevos estudiantes
- ✅ Puedes eliminar estudiantes

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Error: "No se puede conectar al servidor"

**Causa:** El servidor no está corriendo o estás abriendo el archivo directamente

**Solución:**
1. Verifica que el servidor esté corriendo (deberías ver el mensaje en la terminal)
2. Asegúrate de abrir `http://localhost:4000` en el navegador, NO el archivo directamente

### Error: "Unknown database 'secretaria'"

**Causa:** La base de datos no está creada

**Solución:**
```bash
cd "/home/odiseo/Vídeos/pagina psicologica1.2/pagina psicologica"
node crear-database.js
```

### El servidor se detiene

**Solución:** Simplemente vuelve a ejecutar `npm start` o `node server.js`

---

## 📝 NOTAS IMPORTANTES

- **El servidor debe estar corriendo siempre** que uses la aplicación
- **Nunca abras el archivo HTML directamente** - siempre usa `http://localhost:4000`
- Si cierras la terminal donde corre el servidor, el servidor se detendrá
- Para mantener el servidor corriendo en segundo plano, puedes usar `nohup` o `screen`

---

## 🎯 RESUMEN

1. **Terminal 1:** Ejecuta `npm start` (mantén esta terminal abierta)
2. **Navegador:** Abre `http://localhost:4000`
3. **¡Listo!** Ya puedes usar la aplicación

