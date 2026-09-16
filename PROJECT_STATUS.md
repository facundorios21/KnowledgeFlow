# KNOWLEDGEFLOW — PROJECT STATUS

Este documento registra de forma continua el avance del proyecto, su estado técnico, decisiones de arquitectura y próximos pasos. Debe actualizarse al finalizar cada fase.

---

## Estado General

* **Fase Actual:** `FASE 0 — Architecture`
* **Progreso Global:** 1 / 18 fases completadas (Fase 0 finalizada).
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

---

## 2. Funcionalidades Pendientes (Próximas Fases)

- [ ] **FASE 1 — Backend Foundation:** Inicializar proyecto NestJS, setup modular, Mongoose, health checks, Swagger, validación de variables de entorno y base de integración OIDC.
- [ ] **FASE 2 — Identity & Authentication:** Realm Keycloak `KnowledgeFlow`, flujos OIDC con PKCE, validación JWKS en NestJS, RBAC y sincronización de perfiles en MongoDB.
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

## 3. Bugs Conocidos y Restricciones Técnicas

1. **Docker Engine inactivo en el Host:**
   * *Diagnóstico:* Docker Desktop no se encuentra corriendo en el sistema Windows anfitrión.
   * *Impacto:* Los contenedores no podrán inicializarse hasta que el usuario inicie Docker Desktop.
   * *Solución:* Mantener la posibilidad de iniciar servicios localmente o solicitar el encendido de Docker Desktop cuando se ejecute la integración.
2. **Python no instalado en el PATH de Windows:**
   * *Diagnóstico:* Solo existen ejecutables stub de Windows Store.
   * *Impacto:* Los tests y desarrollo de `ai-service` dependen del contenedor Docker o de la instalación de Python 3.11+.
3. **Workspace bajo OneDrive:**
   * *Diagnóstico:* Posible interferencia de la sincronización de archivos con `node_modules` y `.git`.
   * *Mitigación:* Se excluyen rigurosamente carpetas temporales y compiladas mediante `.gitignore`.

---

## 4. Decisiones Técnicas Tomadas

* **D-001 (Monorepo Multi-servicio):** Se optó por una estructura de monorepo desacoplado (`backend/`, `frontend/`, `ai-service/`, `infrastructure/`), permitiendo CI/CD independiente por directorio y ejecución integrada mediante Docker Compose.
* **D-002 (Separación de Bases de Datos):** PostgreSQL se destina pura y exclusivamente a Keycloak (`keycloak-db`). Toda la persistencia de la lógica de negocio (usuarios, documentos, fragmentos vectoriales, conversaciones) reside en MongoDB.
* **D-003 (Manejo de Credenciales y Secretos):** La clave API de Gemini detectada en `api_key.txt` queda aislada de Git y se traslada a variables de entorno locales `.env`. La comunicación interna NestJS ↔ FastAPI utiliza una clave de servicio compartida (`INTERNAL_SERVICE_SECRET`).
* **D-004 (Abstracción de VectorStore):** Se define un diseño desacoplado para la búsqueda vectorial que admita MongoDB Vector Search nativo o fallback algorítmico local, asegurando portabilidad sin obligar a usar MongoDB Atlas en desarrollo.

---

## 5. Próximo Paso Inmediato
* Presentar la conclusión de la **FASE 0** y solicitar aprobación para iniciar la **FASE 1 — Backend Foundation**.
