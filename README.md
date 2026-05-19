# SORA — Social Open React Application
Autor: Miguel Iglesias Valenzuela

Esta es una guía rápida para configurar y ejecutar el proyecto Sora en un entorno local.

## Requisitos previos
- PHP 8.3 o superior
- Composer
- Node.js y npm
- SQLite (o el motor de base de datos que prefieras)

## Pasos para la configuración

### 1. Configuración del Backend (Laravel)
Desde la raíz del proyecto, entra en la carpeta del backend:
```bash
cd backend
```

Instala las dependencias de PHP:
```bash
composer install
```

Configura el archivo de entorno:
- Copia el archivo `.env.example` y cámbiale el nombre a `.env`.
- Si vas a usar SQLite, asegúrate de que el archivo `database/database.sqlite` existe.

Genera la clave de la aplicación:
```bash
php artisan key:generate
```

Nota sobre la base de datos:
La base de datos ya viene lista con usuarios y datos de prueba cargados en el archivo `database/database.sqlite`. Así que no hace falta ejecutar ninguna migración ni comando de base de datos para empezar a usar la aplicación.

* **Si necesitas actualizar las tablas en el futuro sin perder tus datos:**
  Usa solo el comando:
  ```bash
  php artisan migrate
  ```

* **¡Cuidado con este comando!**
  Si ejecutas:
  ```bash
  php artisan migrate:fresh --seed
  ```
  Se borrará todo lo que tengas guardado en la base de datos (usuarios creados, fotos subidas, chats, etc.) y se quedará de nuevo con los datos de prueba iniciales. Úsalo solo si quieres resetear la base de datos por completo y empezar de cero.

Crea el enlace simbólico para el almacenamiento de imágenes:
```bash
php artisan storage:link
```

> **Nota de migración (Portátil de la presentación):**
> Si has copiado la carpeta completa del proyecto desde otro ordenador, el acceso directo de almacenamiento estará roto y dará errores al subir o visualizar fotos. Para restablecer las rutas en tu portátil, ejecuta en la terminal dentro de la carpeta `backend`:
> * **En PowerShell:**
>   ```powershell
>   Remove-Item public\storage
>   php artisan storage:link
>   ```
> * **En CMD (Consola clásica):**
>   ```cmd
>   rmdir public\storage
>   php artisan storage:link
>   ```
> * **Limpiar caché de rutas anteriores:**
>   ```bash
>   php artisan optimize:clear
>   ```

Inicia el servidor de desarrollo del backend:
```bash
php artisan serve
```

> **Si el servidor se queda pillado o da error:**
> Si no te arranca porque los puertos de red de tu portátil están ocupados o da fallos de conexión, puedes iniciarlo desactivando la recarga automática con este comando:
> ```bash
> php artisan serve --no-reload
> ```

---

### 2. Configuración del Frontend (React + Vite)
Desde la raíz del proyecto, entra en la carpeta del frontend:
```bash
cd frontend
```

Instala las dependencias de Node:
```bash
npm install
```

Inicia el servidor de desarrollo del frontend:
```bash
npm run dev
```

El proyecto debería estar funcionando en tu navegador en **`http://localhost:5173`**.

---

## Cómo subir fotos de hasta 10 MB (php.ini)

Para que la aplicación te deje subir fotos grandes de hasta 10 MB en la galería, foros y chats privados, tienes que cambiar un par de líneas en el archivo `php.ini` de tu ordenador:

1. Abre tu archivo `php.ini` activo.
2. Busca estas líneas y cámbialas a `12M` (así le dejas un margen por encima de los 10 MB):
   ```ini
   upload_max_filesize = 12M
   post_max_size = 12M
   ```
3. Cierra la terminal de `php artisan serve` con `Ctrl + C` y vuélvela a abrir para que cargue la nueva configuración.
