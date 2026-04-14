# RZBRO$ - Control de Préstamos

## 🚀 Estado del Proyecto
Este proyecto es una PWA (Progressive Web App) diseñada para gestionar préstamos personales de manera eficiente, con soporte multiusuario, funcionamiento offline y reportes detallados.

## ✅ Cambios Recientes (Hasta v88)
- **Consolidación de Interfaz**: Se fusionaron las secciones de "Estado" y "Administración" en una única vista por hermano, eliminando redundancias.
- **Nueva Página de Gestión**: Implementación de una vista dedicada para gestionar cada préstamo de forma individual, clara e intuitiva.
- **Mejoras de Legibilidad**: Aumento del tamaño de fuente en los balances y detalles, y rediseño de botones de acción (más grandes y centrados).
- **Simplificación Estratégica**: Eliminación de la funcionalidad de fotos y cámara para garantizar el funcionamiento perpetuo bajo el **Plan Spark (Gratuito)** de Firebase.
- **Otros Préstamos**: Nuevo apartado personal para registrar deudas con terceros, con acceso destacado mediante el botón "OTROS PRESTAMOS".
- **Branding y UI**: Modo Oscuro (Dark Mode) integral con paleta `slate-950`. Nombre oficial: **RZBRO$**.
- **Navegación SPA**: Navegación por "páginas" internas (Dashboard, Formulario, Detalles) utilizando la **API de Historial** (el botón "atrás" del móvil no cierra la app).
- **Seguridad Autogestionada**: Sistema de PIN de 2 dígitos creado por el usuario en su primer ingreso, guardado localmente.
- **Formulario Inteligente**: Selección múltiple de deudores, fecha automática y selección rápida de hermanos.
- **Flujo de Deuda**: Implementación de estados (`pending`, `reviewing`, `accepted`, `rejected`).
- **Notificaciones Inteligentes**: Sistema de alertas locales basado en cambios de Firestore en tiempo real (Plan Spark compatible).
- **Abonos Parciales**: Posibilidad de registrar pagos graduales en deudas aceptadas, con historial visible.
- **Liquidación Individual**: Capacidad de liquidar cada préstamo por separado para un control más preciso.
- **Integridad de Datos**: Bloqueo de edición y borrado una vez que una deuda ha sido aceptada por el deudor.
- **Vista de Detalle**: Desglose por hermano en dos columnas (Mis Cobros vs Mis Deudas).
- **Notificaciones**: Avisos push locales cuando se asigna una deuda o cuando un deudor la rechaza.
- **Exportación**: Reportes PDF con confirmación de usuario y desglose de totales.
- **PWA**: Service Worker `v88` con persistencia offline activa.

## 🔄 Procedimiento de Actualización (RECORDATORIO OBLIGATORIO)
Para desplegar cambios y que se reflejen en todos los dispositivos:

> **⚠️ NOTA PARA EL ASISTENTE:** Tienes la instrucción crítica de **SIEMPRE** recordar y proporcionar este grupo de comandos al usuario al finalizar cualquier ajuste o sesión de código para asegurar el despliegue de la versión.

1. **Versión**: Incrementar el número de versión en `sw.js` (`CACHE_NAME`), `index.html` (`?v=88`) y `app.js`.
2. **Comandos**:
   ```bash
   git add .
   git commit -m "v88: Consolidación de vistas, página de gestión individual y mejoras de legibilidad"
   git push origin main
   ```
3. **Detección Automática**: La PWA detecta el cambio en el Service Worker, instala la nueva versión en segundo plano y recarga la aplicación automáticamente cuando está lista.

## 🛠 Detalles Técnicos y Lógica de Negocio
- **Seguridad**: PIN de 2 dígitos por usuario guardado en `localStorage`. No se almacenan contraseñas en el servidor.
- **Integridad**: Una vez que una deuda es **Aceptada**, el acreedor no puede editar el monto ni borrarla; solo se permiten abonos o liquidación total.
- **Balance Neto**: Cálculo automático de *(Mis Cobros - Mis Deudas)* por cada hermano para facilitar liquidaciones rápidas.
- **Notificaciones**: 
  - **Push**: Utiliza Firebase Cloud Messaging (FCM). 
  - **VAPID Key**: `BDIn-r_BQDMCVquSXd0dEEyIs2ZK1Mys7gzh-ws59OtWX6VcpDCt0n1X2FszmqVlD2O4K3QW7Qy1VolVaK_wOjA`
  - **Locales**: Alertas visuales (Toasts) y notificaciones de sistema basadas en cambios en tiempo real de Firestore.

- **Mantenimiento**: El borrado total y reinicio del sistema se gestiona directamente solicitándolo a **Gemini Code Assist** dentro de Visual Studio Code en esta laptop. Para ejecutar comandos manuales en el navegador (como `resetAllData()`), se debe ingresar a la URL de la app (https://prestamos-app-dfddb.web.app/) y abrir la consola con **F12**, **Ctrl + Shift + I**, o **Clic derecho -> Inspeccionar**.
- **Entorno de Desarrollo**: Este proyecto se desarrolla y mantiene exclusivamente por Fabio utilizando **Gemini Code Assist** dentro de **Visual Studio Code** en su laptop personal. Se debe asegurar la integridad de la lógica operando siempre desde este entorno. Gemini tiene la capacidad de ejecutar o generar los scripts de limpieza profunda en la base de datos y Storage.

##  Usuarios Autorizados
El acceso está configurado para:
1. **Fabio**
2. **Juan Carlos**
3. **Ronald**
4. **Luis**

## 📂 Estructura
- `.github/workflows/`: Automatización de despliegue.
- `icons/`: Iconos de la aplicación para móviles.
- `app.js`: Lógica de Firebase y manejo de DOM.
- `firebase.json`: Configuración de hosting y redirecciones.
- `sw.js`: Gestión de caché y funcionamiento offline.

## 🛠 Próximos Pasos

## ⚠️ Problemas Conocidos / Notas para la próxima sesión
- **Caché Persistente**: En algunos dispositivos iOS, el icono y el nombre tardan en actualizarse; se recomienda reinstalar la PWA si el cambio visual no es inmediato.
- **Filtros de Admin**: Se decidió no tener un modo admin en la UI, pero el control total se mantiene mediante reglas en la consola de Firebase.