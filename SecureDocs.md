# SecureDocs
## Plataforma Inteligente para la Gestión Segura de Documentos Confidenciales

**Universidad de Cartagena**  
**Ingeniería de Software**

---

# 1. Descripción General

SecureDocs es una plataforma web diseñada para el almacenamiento, intercambio, aprobación y auditoría de documentos digitales confidenciales.

A diferencia de servicios tradicionales de almacenamiento en la nube, SecureDocs integra mecanismos de criptografía moderna, control de acceso, auditoría y gestión documental para garantizar la confidencialidad, integridad y trazabilidad de la información.

El objetivo principal no es simplemente cifrar documentos, sino proporcionar un entorno seguro donde empresas, universidades e instituciones puedan gestionar información sensible durante todo su ciclo de vida.

---

# 2. Planteamiento del Problema

Actualmente muchas organizaciones intercambian documentos sensibles mediante herramientas como correo electrónico, WhatsApp, Google Drive o memorias USB.

Esta práctica genera diversos problemas:

- No existe garantía de que únicamente el destinatario autorizado pueda acceder al documento.
- Es imposible conocer quién abrió el documento y cuándo lo hizo.
- Los documentos pueden modificarse sin que exista evidencia de ello.
- No existe trazabilidad sobre las diferentes versiones.
- Es difícil administrar permisos cuando varias personas participan en un mismo proceso.
- Muchas pequeñas empresas no cuentan con sistemas especializados de gestión documental segura debido a sus altos costos.

Como consecuencia, aumenta el riesgo de fuga de información, alteración de documentos, pérdida de versiones y acceso no autorizado.

---

# 3. Justificación

La transformación digital ha incrementado significativamente el intercambio de documentos electrónicos.

Sin embargo, la mayoría de organizaciones continúa utilizando plataformas cuyo objetivo principal es almacenar archivos y no garantizar su seguridad.

SecureDocs busca cubrir esta necesidad mediante una plataforma que combine principios de Ingeniería de Software, Seguridad Informática y Criptografía.

Además, el proyecto permite aplicar conceptos relacionados con:

- Ingeniería de requisitos
- Arquitectura de Software
- UML
- Bases de Datos
- Criptografía
- Gestión documental
- Control de acceso basado en roles
- Auditoría de eventos

---

# 4. Objetivo General

Diseñar e implementar una plataforma web para la gestión segura de documentos digitales mediante mecanismos de cifrado, control de acceso, auditoría y seguimiento de versiones.

---

# 5. Objetivos Específicos

- Diseñar una arquitectura segura para el almacenamiento de documentos.
- Implementar autenticación y autorización basada en roles.
- Integrar mecanismos de cifrado híbrido para proteger los documentos.
- Implementar control de versiones.
- Registrar todas las acciones realizadas sobre los documentos.
- Permitir compartir documentos únicamente con usuarios autorizados.
- Garantizar la integridad de los documentos mediante funciones hash.

---

# 6. Usuarios del Sistema

## Administrador

Responsable de administrar la plataforma.

Funciones:

- Gestionar usuarios
- Gestionar organizaciones
- Ver auditorías
- Configurar políticas de seguridad

---

## Usuario

Puede:

- Subir documentos
- Crear carpetas
- Compartir documentos
- Descargar documentos autorizados
- Consultar historial

---

## Auditor

Puede visualizar:

- Eventos
- Accesos
- Cambios
- Versiones
- Reportes

No puede modificar documentos.

---

# 7. Módulos del Sistema

## 7.1 Gestión de Usuarios

- Registro
- Inicio de sesión
- Recuperación de contraseña
- Gestión de perfiles
- Cambio de contraseña
- Doble autenticación (opcional)

---

## 7.2 Gestión Documental

Permite:

- Crear carpetas
- Organizar documentos
- Buscar documentos
- Etiquetar documentos
- Eliminar documentos
- Restaurar documentos

---

## 7.3 Almacenamiento Seguro

Cada documento almacenado será:

1. Procesado.
2. Se calcula su hash.
3. Se cifra.
4. Se almacena.
5. Se registra su metadata.

---

## 7.4 Compartición Segura

Permite compartir mediante:

- Usuarios internos
- Enlaces temporales
- Fecha de expiración
- Número máximo de descargas

---

## 7.5 Control de Versiones

Cada modificación genera automáticamente una nueva versión.

El usuario podrá:

- Consultar versiones anteriores.
- Compararlas.
- Restaurarlas.

---

## 7.6 Auditoría

Registro automático de:

- Inicio de sesión
- Descargas
- Modificaciones
- Eliminaciones
- Comparticiones
- Cambios de permisos

---

## 7.7 Reportes

Generación de:

- Documentos más consultados.
- Usuarios más activos.
- Eventos recientes.
- Historial por documento.
- Estadísticas de almacenamiento.

---

# 8. Proceso General del Sistema

Usuario inicia sesión

↓

Sube documento

↓

Sistema calcula Hash

↓

Sistema cifra documento

↓

Documento almacenado

↓

Usuario comparte documento

↓

Destinatario recibe acceso

↓

Sistema verifica permisos

↓

Sistema descifra documento

↓

Se registra auditoría

---

# 9. Tecnologías Criptográficas

## Cifrado Simétrico

AES-256

Utilizado para cifrar el contenido del documento.

---

## Cifrado Asimétrico

RSA-4096

Utilizado para proteger la clave AES.

---

## Integridad

SHA-256

Permite detectar modificaciones del documento.

---

## Firmas Digitales

Permiten garantizar:

- autenticidad
- integridad
- no repudio

---

# 10. Requisitos Funcionales

RF01. Registrar usuarios.

RF02. Autenticar usuarios.

RF03. Crear carpetas.

RF04. Subir documentos.

RF05. Cifrar documentos automáticamente.

RF06. Descargar documentos autorizados.

RF07. Compartir documentos.

RF08. Gestionar permisos.

RF09. Registrar auditorías.

RF10. Consultar historial.

RF11. Administrar versiones.

RF12. Buscar documentos.

RF13. Restaurar versiones.

RF14. Firmar digitalmente documentos.

RF15. Generar reportes.

---

# 11. Requisitos No Funcionales

- Alta disponibilidad.
- Escalabilidad.
- Interfaz intuitiva.
- Tiempo de cifrado menor a 5 segundos para archivos de hasta 100 MB.
- Contraseñas cifradas mediante Argon2 o BCrypt.
- Comunicación HTTPS.
- Arquitectura multicapa.
- Auditoría inmutable.
- Cumplimiento de principios OWASP.

---

# 12. Modelo de Negocio

Los clientes serían organizaciones que manejan información sensible:

- Universidades
- Clínicas
- Notarías
- Firmas de abogados
- Empresas privadas
- Entidades gubernamentales

Modelo SaaS:

- Plan gratuito.
- Plan Profesional.
- Plan Empresarial.

---

# 13. Casos de Uso Principales

Administrador

- Crear usuarios
- Gestionar roles
- Consultar auditorías
- Gestionar organizaciones

Usuario

- Iniciar sesión
- Subir documento
- Compartir documento
- Descargar documento
- Firmar documento
- Consultar historial

Auditor

- Consultar registros
- Generar reportes

---

# 14. Arquitectura Propuesta

Frontend

- React
- TypeScript

Backend

- Spring Boot

Base de Datos

- PostgreSQL

Almacenamiento

- MinIO

Autenticación

- JWT

Criptografía

- Java Cryptography Architecture (JCA)

---

# 15. Posibles Diagramas UML

- Casos de uso
- Clases
- Secuencia
- Actividades
- Estados
- Componentes
- Despliegue

---

# 16. Posibles Entidades del Sistema

Usuario

Rol

Organización

Documento

Carpeta

Versión

Permiso

Auditoría

FirmaDigital

Notificación

HashDocumento

ClaveCriptográfica

Compartición

---

# 17. Posibles Mejoras Futuras

- Integración con Blockchain para registro de hashes.
- Integración con firmas electrónicas certificadas.
- Inteligencia Artificial para clasificación documental.
- OCR para indexación automática.
- Integración con Microsoft Office.
- Integración con Google Workspace.
- Integración con Active Directory.
- Gestión documental basada en normas ISO 27001.

---

# Valor Diferenciador

SecureDocs no pretende competir con plataformas de almacenamiento tradicionales.

Su propuesta de valor consiste en ofrecer una plataforma donde la seguridad, la trazabilidad y la integridad documental sean los pilares fundamentales, integrando criptografía moderna, auditoría y control de versiones dentro de un único sistema diseñado para organizaciones que requieren un alto nivel de protección sobre su información.