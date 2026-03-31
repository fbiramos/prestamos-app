# RZBRO$ - Control de Préstamos

## 🚀 Estado del Proyecto
Este proyecto es una PWA (Progressive Web App) diseñada para gestionar préstamos personales de manera eficiente, con soporte multiusuario, funcionamiento offline y reportes detallados.

## ✅ Cambios Recientes
- **Branding y UI**: Modo Oscuro (Dark Mode) integral con paleta `slate-950`. Nombre oficial: **RZBRO$**.
- **Navegación SPA**: Navegación por "páginas" internas (Dashboard, Formulario, Detalles) utilizando la **API de Historial** (el botón "atrás" del móvil no cierra la app).
- **Seguridad Autogestionada**: Sistema de PIN de 2 dígitos creado por el usuario en su primer ingreso, guardado localmente.
- **Formulario Inteligente**: Selección múltiple de deudores, fecha automática, cámara integrada y selección rápida de hermanos.
- **Flujo de Deuda**: Implementación de estados (`pending`, `reviewing`, `accepted`, `rejected`).
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
1. **Abonos Parciales**: Permitir que un préstamo aceptado reciba pagos graduales hasta saldar la deuda.
2. **Lógica de Intereses**: Actualmente el campo `interest` está en la base de datos pero desactivado en el formulario (fijo en 0). Falta decidir si se calculará automáticamente.
3. **Notificaciones Cloud**: Evolucionar de notificaciones locales a Firebase Cloud Messaging (FCM) para recibirlas incluso con la app cerrada.
4. **Liquidación de Cuentas**: Botón para "salar cuentas" con un hermano cuando el balance neto sea 0 o se haya pagado todo.

## ⚠️ Problemas Conocidos / Notas para la próxima sesión
- **Campo Interés**: El formulario fue simplificado y el interés se envía como `0`. Si se requiere usarlo, hay que reactivar el input en `index.html`.
- **Caché Persistente**: En algunos dispositivos iOS, el icono y el nombre tardan en actualizarse; se recomienda reinstalar la PWA si el cambio visual no es inmediato.
- **Filtros de Admin**: Se decidió no tener un modo admin en la UI, pero el control total se mantiene mediante reglas en la consola de Firebase.