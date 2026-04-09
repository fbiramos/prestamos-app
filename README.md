# RZBRO$ - Control de Préstamos

## 🚀 Estado del Proyecto
Este proyecto es una PWA (Progressive Web App) diseñada para gestionar préstamos personales de manera eficiente, con soporte multiusuario, funcionamiento offline y reportes detallados.

## ✅ Cambios Recientes
- **Branding y UI**: Modo Oscuro (Dark Mode) integral con paleta `slate-950`. Nombre oficial: **RZBRO$**.
- **Navegación SPA**: Navegación por "páginas" internas (Dashboard, Formulario, Detalles) utilizando la **API de Historial** (el botón "atrás" del móvil no cierra la app).
- **Seguridad Autogestionada**: Sistema de PIN de 2 dígitos creado por el usuario en su primer ingreso, guardado localmente.
- **Formulario Inteligente**: Selección múltiple de deudores, fecha automática, cámara integrada y selección rápida de hermanos.
- **Flujo de Deuda**: Implementación de estados (`pending`, `reviewing`, `accepted`, `rejected`).
- **Notificaciones Inteligentes**: Sistema de alertas locales basado en cambios de Firestore en tiempo real (Plan Spark compatible).
- **Abonos Parciales**: Posibilidad de registrar pagos graduales en deudas aceptadas, con historial visible.
- **Liquidación de Cuentas**: Cálculo de balance neto por hermano y botón para saldar deudas mutuas en un solo clic.
- **Integridad de Datos**: Bloqueo de edición y borrado una vez que una deuda ha sido aceptada por el deudor.
- **Vista de Detalle**: Desglose por hermano en dos columnas (Mis Cobros vs Mis Deudas).
- **Notificaciones**: Avisos push locales cuando se asigna una deuda o cuando un deudor la rechaza.
- **Administración**: Sección dedicada para gestionar préstamos propios con visualización en tarjetas de gran formato.
- **Exportación**: Reportes PDF con confirmación de usuario y desglose de totales.
- **PWA**: Service Worker `v62` con persistencia offline activa.

## 🔄 Procedimiento de Actualización
Para desplegar cambios y que se reflejen en todos los dispositivos:
1. **Versión**: Incrementar el número de versión en `sw.js` (`CACHE_NAME`), `index.html` (parámetros `?v=`) y `app.js`.
2. **Comandos**:
   ```bash
   git add .
   git commit -m "v62: Descripción del cambio"
   git push origin main
   ```
3. **Detección Automática**: La PWA detecta el cambio en el Service Worker, instala la nueva versión en segundo plano y recarga la aplicación automáticamente cuando está lista.

## 🛠 Detalles Técnicos y Lógica de Negocio
- **Seguridad**: PIN de 2 dígitos por usuario guardado en `localStorage`. No se almacenan contraseñas en el servidor.
- **Integridad**: Una vez que una deuda es **Aceptada**, el acreedor no puede editar el monto ni borrarla; solo se permiten abonos o liquidación total.
- **Optimización de Imágenes**: Las fotos de los recibos se redimensionan a un máximo de 1024px y se comprimen al 70% de calidad antes de subir a Firebase Storage.
- **Balance Neto**: Cálculo automático de *(Mis Cobros - Mis Deudas)* por cada hermano para facilitar liquidaciones rápidas.
- **Notificaciones**: 
  - **Push**: Utiliza Firebase Cloud Messaging (FCM). 
  - **VAPID Key**: `BDIn-r_BQDMCVquSXd0dEEyIs2ZK1Mys7gzh-ws59OtWX6VcpDCt0n1X2FszmqVlD2O4K3QW7Qy1VolVaK_wOjA`
  - **Locales**: Alertas visuales (Toasts) y notificaciones de sistema basadas en cambios en tiempo real de Firestore.

- **Mantenimiento**: Función `resetAllData()` disponible en la consola para limpieza total de la base de datos y archivos.

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