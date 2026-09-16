# KNOWLEDGEFLOW — PROJECT STATUS

Este documento registra de forma continua el avance del proyecto, su estado técnico, decisiones de arquitectura y próximos pasos. Debe actualizarse al finalizar cada fase.

---

## Estado General

* **Fase Actual:** `FASE 2 — Identity & Authentication` (Completada)
* **Progreso Global:** 3 / 18 fases completadas (Fases 0, 1 y 2 finalizadas).
* **Fecha de Última Actualización:** 2026-09-16

---

## 1. Funcionalidades Terminadas

### FASE 0 — Architecture (Completada)
- [x] **Diagnóstico del entorno y repositorio:** Inspección de herramientas instaladas en host (Node v24.11.1, npm 11.6.2, Git 2.53.0, Docker CLI 28.5.2, Docker Desktop inactivo, ausencia de Python local en PATH).
- [x] **Control de versiones:** Inicialización del repositorio Git local (`git init`).
- [x] **Seguridad de secretos:** Creación de `.gitignore` riguroso que ignora credenciales, claves de API (`api_key.txt`), `.env*`, dependencias y cachés de build.
- [x] **Variables de entorno:** Creación de plantilla central `.env.example` documentando todas las variables requeridas por servicio.
- [x] **Estructura modular del monorepo:** Creación de directorios base (`backend/`, `frontend/`, `ai-service/`, `infrastructure/keycloak/`, `infrastructure/nginx/`, `.github/workflows/`).
- [x] **Orquestación de infraestructura:** Creación de `docker-compose.yml` multiserver validado sintácticamente (Keycloak con PostgreSQL dedicado, MongoDB, Redis, backend NestJS, servicio FastAPI de IA, frontend React).
- [x] **Documentación técnica fundacional:** Creación del `README.md` inicial con arquitectura, flujos, contratos y guía de inicio.

### FASE 1 — Backend Foundation (Completada)
- [x] **Setup de NestJS:** Inicialización del backend en `backend/` con TypeScript estricto, decoradores y dependencias modernas.
- [x] **Configuración validada con Joi:** Esquema exhaustivo en `config/env.validation.ts` y cargador tipado en `config/configuration.ts`.
- [x] **Persistencia Mongoose & MongoDB:** Integración reactiva de Mongoose con manejo de reconexiones y esquema base de `User`.
- [x] **Observabilidad y Logging estructurado:** `CustomLoggerService` (formateado en desarrollo, JSON estructurado en producción) e interceptor de latencia HTTP (`LoggingInterceptor`).
- [x] **Manejo unificado de errores:** `HttpExceptionFilter` global con códigos HTTP semánticos y sin filtración de stacktraces en producción.
- [x] **Health Check con Terminus:** Endpoint `GET /health` público verificando ping a MongoDB y uptime del sistema.
- [x] **Documentación OpenAPI / Swagger:** Configuración de Swagger en `/api/docs` con soporte de esquemas y autenticación Bearer JWT.
- [x] **Capa de Identidad y Autorización:**
  - `JwtStrategy` con `jwks-rsa` para validación dinámica de claves públicas de Keycloak.
  - `JwtAuthGuard` con soporte de decorador `@Public()` para endpoints abiertos.
  - `RolesGuard` con `@Roles(UserRole.ADMIN, UserRole.USER)` para control de acceso RBAC.
  - Sincronización automática de perfil de usuario Keycloak en MongoDB mediante `UsersService`.
  - Endpoint `GET /api/v1/auth/me` para devolver el contexto del usuario autenticado y sus roles.
- [x] **Testing automatizado:** 4 suites de tests unitarios (11 pruebas) pasando al 100% (`HealthController`, `UsersService`, `AuthController`, `RolesGuard`).
- [x] **Dockerización:** `Dockerfile` multi-stage (builder y producción con usuario no privilegiado `node` y health check) y `.dockerignore`.

### FASE 2 — Identity & Authentication (Completada)
- [x] **Keycloak Realm `KnowledgeFlow`:** Definición declarativa en `infrastructure/keycloak/knowledgeflow-realm.json`.
- [x] **Cliente OIDC SPA con PKCE:** Cliente `knowledgeflow-frontend` configurado como público con desafío `S256` y redirecciones permitidas.
- [x] **Cliente Backend Bearer:** Cliente `knowledgeflow-backend` para el servidor de recursos NestJS.
- [x] **Roles RBAC en IdP:** Roles `ADMIN` y `USER` definidos en el Realm.
- [x] **Usuarios de desarrollo aprovisionados:**
  - Administrador: `admin_user` / `Admin123!` (Roles: `ADMIN`, `USER`).
  - Usuario Estándar: `standard_user` / `User123!` (Role: `USER`).
- [x] **Infraestructura en ejecución:** PostgreSQL (`keycloak-db`), Keycloak 24 (`keycloak`), MongoDB 7 (`mongodb`) y Redis 7 (`redis`) activos y saludables.
- [x] **Testing E2E en Vivo:** Suite en `test/auth.e2e-spec.ts` validando endpoints públicos, rechazo 401 sin token/token inválido, y adquisición real de tokens OIDC con verificación del endpoint `GET /api/v1/auth/me` y sincronización en MongoDB (100% pasando).

---

## 2. Funcionalidades Pendientes (Próximas Fases)

- [ ] **FASE 3 — Documents:** Módulos de gestión documental, validación MIME/tamaño y máquina de estados.
- [ ] **FASE 4 — Redis + BullMQ:** Colas asíncronas para procesamiento de archivos y reintentos idempotentes.
- [ ] **FASE 5 — Python Service:** Microservicio FastAPI interno para tareas de IA y testing con pytest.
- [ ] **FASE 6 — Document Processing:** Extracción y chunking semántico de PDF, TXT y DOCX.
- [ ] **FASE 7 — Embeddings:** Generación de vectores con Google Gemini API y persistencia vectorial.
- [ ] **FASE 8 — RAG:** Pipeline de recuperación aumentada por generación con citas y detección de falta de información.
- [ ] **FASE 9 — Chat:** Sistema de conversaciones e historial contextual.
- [ ] **FASE 10 — Agent:** Agente autónomo con llamadas a herramientas (Tool Calling).
- [ ] **FASE 11 — AI Security:** Protección contra prompt injection, filtración de datos y rate limiting de IA.
- [ ] **FASE 12 — Frontend:** SPA en React (Vite + TS) para gestión documental y chat con fuentes.
- [ ] **FASE 13 — Testing:** Cobertura exhaustiva (unit, integration, e2e, AI evaluation).
- [ ] **FASE 14 — Docker & Production Hardening:** Optimización de imágenes de producción y redes.
- [ ] **FASE 15 — CI/CD:** GitHub Actions workflows para linting, typecheck, testing y docker builds.
- [ ] **FASE 16 — Observability:** Logs estructurados, métricas de latencia y monitoreo de costos LLM.
- [ ] **FASE 17 — Finalization:** Auditoría final, datos de prueba y release.

---

## 3. Restricciones Técnicas y Estado del Entorno

* **Docker Engine:** Activo y verificado (`Docker 28.5.2` en ejecución).
* **Python en el Host:** Instalado y verificado (`Python 3.14.7` disponible en PATH).
* **Sincronización de OneDrive:** Inactiva para este proyecto, eliminando riesgos de bloqueo de archivos I/O.
* **Mapeo de Puertos:** Puerto 5432 ocupado por contenedor preexistente `db-hackaton`; resuelto asignando el puerto host `5433` a `keycloak-db`.

---

## 4. Decisiones Técnicas Tomadas

* **D-001 (Monorepo Multi-servicio):** Se optó por una estructura de monorepo desacoplado (`backend/`, `frontend/`, `ai-service/`, `infrastructure/`), permitiendo CI/CD independiente por directorio y ejecución integrada mediante Docker Compose.
* **D-002 (Separación de Bases de Datos):** PostgreSQL se destina pura y exclusivamente a Keycloak (`keycloak-db`). Toda la persistencia de la lógica de negocio (usuarios, documentos, fragmentos vectoriales, conversaciones) reside en MongoDB.
* **D-003 (Manejo de Credenciales y Secretos):** La clave API de Gemini detectada en `api_key.txt` queda aislada de Git y se traslada a variables de entorno locales `.env`. La comunicación interna NestJS ↔ FastAPI utiliza una clave de servicio compartida (`INTERNAL_SERVICE_SECRET`).
* **D-004 (Abstracción de VectorStore):** Se define un diseño desacoplado para la búsqueda vectorial que admita MongoDB Vector Search nativo o fallback algorítmico local, asegurando portabilidad sin obligar a usar MongoDB Atlas en desarrollo.
* **D-005 (Mitigación de Colisión de Puertos Host):** `keycloak-db` expone el puerto `5433:5432` en el host para no entrar en conflicto con la instancia preexistente `db-hackaton` (puerto 5432), manteniendo la resolución interna del contenedor intacta en el puerto estándar 5432.

---

## 5. Próximo Paso Inmediato
* Proceder a la **FASE 1 — Backend Foundation** (NestJS, Mongoose, Swagger, Health checks y logging estructurado).
