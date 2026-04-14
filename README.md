# API de Gestión de Tareas

Esta es una solución robusta construida con **NestJS, PostgreSQL y Redis**, diseñada para la gestión escalable de tareas. El sistema implementa aislamiento de datos por organización (Multi-tenancy), auditoría automática y una capa de caché inteligente.

## 🚀 Inicio Rápido (Quick Start)

El proyecto incluye un sistema de **Auto-Seeding**. Al levantarlo en modo desarrollo, la base de datos se poblará automáticamente con organizaciones, usuarios y tareas de prueba.

### Requisitos previos

- Node.js (v20 o superior)
- Docker y Docker Compose instalados

### Instalación y Ejecución

1. Clonar el repositorio e instalar dependencias:
   `git clone https://github.com/Jamil-Palma/task-api-nest-postgres-redis`
   `cd task-api-nest-postgres-redis`
   `npm install`

2. Configurar el entorno (usa los valores preconfigurados para Docker):
   `cp .env.example .env`

3. Levantar la infraestructura (Base de datos y Caché):
   `docker compose up -d`

4. Ejecutar las migraciones y lanzar la aplicación:
   `npm run migration:run`
   `npm run start:dev`

### Credenciales de Prueba (Auto-generadas)

Una vez iniciada la aplicación, puedes probar la API inmediatamente con estas cuentas:

- **Usuario Principal (Org A):** admin@default.com / password123
- **Usuario Secundario (Org B):** admin@acme.com / password123

---

## 📖 Documentación de la API (Swagger)

La documentación interactiva cumple con el estándar OpenAPI 3.0.

- **URL Local:** http://localhost:3000/api/docs

**Instrucciones de uso:**

1. Realiza una petición al endpoint `POST /auth/login` con las credenciales de arriba.
2. Copia el `access_token` recibido.
3. Haz clic en el botón verde **"Authorize"** al inicio de la página de Swagger.
4. Escribe el formato: `Bearer TU_TOKEN_AQUI` y presiona Authorize.
5. Todos los candados de los endpoints se abrirán y podrás probar las rutas.

---

## 🧪 Testing

El proyecto incluye una suite de pruebas **End-to-End (E2E)** que garantiza la integridad de los flujos críticos.

Para ejecutar los tests:
`npm run test:e2e`

_Nota: El entorno de test utiliza una base de datos aislada y realiza un vaciado de esquema automático antes de cada ejecución para asegurar una limpieza total entre corridas._

---

## 🏗 Arquitectura y Decisiones de Diseño

### 1. Aislamiento de Datos (Multi-tenancy)

El sistema está diseñado para manejar múltiples organizaciones de forma segura mediante una estrategia de aislamiento lógico:

- **Identidad vinculada:** Cada usuario está asociado a una organización específica desde su registro.
- **Seguridad en peticiones:** El `organizationId` se extrae directamente del payload del JWT en cada petición, evitando manipulaciones externas.
- **Integridad de consultas:** Todas las operaciones de base de datos filtran estrictamente por este ID. Esto garantiza que ninguna organización pueda acceder o modificar datos ajenos, incluso si se intenta forzar el acceso mediante IDs de tareas de otros inquilinos (comportamiento validado en la suite de pruebas E2E).

### 2. Estrategia de Caché Distribuido (Redis)

Para optimizar el rendimiento en lecturas de alto tráfico:

- **Llaves Dinámicas:** Se generan llaves de caché basadas en un hash MD5 de los filtros de búsqueda (paginación, estado, prioridad).
- **Escalado Horizontal:** Al usar Redis externo, múltiples instancias de la API pueden compartir el mismo caché.
- **Invalidación Selectiva:** Al modificar una tarea, el sistema limpia únicamente el espacio de nombres del caché perteneciente a esa organización, evitando latencia innecesaria para otros clientes.

### 3. Seguridad y Resiliencia

- **Rate Limiting:** Control de flujo por IP para mitigar ataques DDoS y abusos de la API mediante `throttler`.
- **Audit Logs:** Implementación de un **Entity Subscriber** que captura cada cambio (INSERT, UPDATE, DELETE) en las tareas, guardando el estado anterior y posterior para auditoría inmutable.
- **Soft Deletes:** Uso de borrado lógico para prevenir la pérdida accidental de datos y mantener la integridad referencial.
- **Logging Estructurado:** Uso de `nestjs-pino` para logs legibles por máquinas y humanos.

### 4. CI/CD (GitHub Actions)

Se incluye un flujo automatizado que valida:

- Compilación exitosa del código TypeScript.
- Ejecución de tests E2E sobre servicios de Docker efímeros en la nube en cada Push o Pull Request.

### 5. Gestión de Esquema (Production Ready)

- Se desactivó la sincronización automática de TypeORM en desarrollo para evitar alteraciones accidentales.
- El esquema se gestiona mediante **Migraciones**, permitiendo un control de versiones preciso de la base de datos.
- El entorno de pruebas mantiene `synchronize: true` para garantizar que el CI/CD sea ágil y siempre trabaje sobre un esquema fresco.

---

## 📩 Contacto

**Jamil Palma**

- **LinkedIn:** [Jamil Palma](https://www.linkedin.com/in/jamil-brian-palma-salazar-62452922a)
- **GitHub:** [Jamil-Palma](https://github.com/Jamil-Palma)
- **Email:** [jbps.work@gmail.com](mailto:jbps.work@gmail.com)

---
