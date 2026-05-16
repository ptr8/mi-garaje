# Mi Garaje

Mi Garaje es una aplicación web móvil privada para gestionar vehículos, ITV, mantenimientos, gastos y vencimientos. Está pensada para uso personal en un NAS Synology con Docker Compose.

Licencia: AGPL-3.0.

## Funciones de la primera versión

- Crear, editar y borrar vehículos.
- Abrir la ficha de cada vehículo.
- Registrar ITV desde la ficha del vehículo.
- Registrar mantenimientos desde la ficha del vehículo.
- Inicio con próximas ITV, últimos mantenimientos y gasto total.
- Estadísticas con Recharts: gasto por vehículo, por categoría y evolución mensual.
- SQLite en una carpeta persistente.
- Imagen Docker lista para Synology Container Manager.

## Estructura

```text
mi-garaje/
  backend/          API Express, SQLite y servidor de la app en producción
  frontend/         React, Vite, Tailwind CSS y Recharts
  data/             Base de datos SQLite persistente, ignorada por Git
  docker-compose.yml
  Dockerfile
  .env.example
```

## Instalación local

Requisitos:

- Node.js 20 o superior
- npm

Instala dependencias:

```bash
npm install
```

Arranca el backend:

```bash
npm run dev:backend
```

En otra terminal, arranca el frontend:

```bash
npm run dev:frontend
```

Abre `http://localhost:5173`. El frontend usa proxy hacia `http://localhost:3000/api`.

Por defecto, la base de datos local se crea en `data/mi-garaje.sqlite` si no defines `DATABASE_PATH`.

## Variables de entorno

Copia `.env.example` si quieres personalizar la configuración:

```bash
cp .env.example .env
```

Variables disponibles:

- `PORT`: puerto del servidor Express.
- `DATABASE_PATH`: ruta del archivo SQLite.
- `NODE_ENV`: entorno de ejecución.

## Instalación en Synology

1. Copia el proyecto a una carpeta del NAS, por ejemplo `/volume1/docker/mi-garaje`.
2. En Synology Container Manager, crea un proyecto desde `docker-compose.yml`.
3. Mantén el volumen `./data:/app/data`; ahí se guarda la base de datos.
4. Levanta el proyecto.
5. Abre `http://IP_DEL_NAS:3000`.

También puedes ejecutarlo por SSH:

```bash
docker compose up -d --build
```

## Copia de seguridad de datos

La información vive en:

```text
data/mi-garaje.sqlite
```

Para una copia sencilla, detén el contenedor y copia la carpeta `data` completa:

```bash
docker compose down
cp -r data data-backup-$(date +%Y%m%d)
docker compose up -d
```

Para restaurar, detén el contenedor, sustituye `data/mi-garaje.sqlite` por tu copia y vuelve a levantar el servicio.

## Buenas prácticas de commits

Una secuencia clara para esta primera versión sería:

```bash
git add .
git commit -m "chore: scaffold app structure"
git commit -m "feat: add vehicle maintenance API"
git commit -m "feat: add mobile garage frontend"
git commit -m "docs: document local and synology setup"
```

Para cambios futuros, intenta que cada commit tenga un objetivo pequeño y verificable.
