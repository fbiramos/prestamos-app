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

## 👥 Usuarios Autorizados
El acceso está configurado para los hermanos en el siguiente orden:
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