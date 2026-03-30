# RZBRO$ - Control de Préstamos

## 🚀 Estado del Proyecto
Este proyecto es una PWA (Progressive Web App) diseñada para gestionar préstamos personales de manera eficiente, con soporte multiusuario, funcionamiento offline y reportes detallados.

## ✅ Cambios Recientes
- **Cambio de Marca**: Renombrado a **RZBRO$**.
- **UI/UX**: Implementación de colores `slate-50` y `slate-100` para mejorar la legibilidad y reducir fatiga visual.
- **Exportación**: Implementada la generación de reportes PDF con `jsPDF`.
- **Automatización**: Configuración exitosa de GitHub Actions para despliegue continuo en Firebase Hosting.
- **Seguridad**: Sistema de acceso multiusuario con PIN de 2 dígitos y soporte biométrico (WebAuthn).
- **Privacidad de Datos**: Cada usuario visualiza y gestiona únicamente sus propios préstamos mediante filtros en Firestore.
- **Feedback**: Sistema de notificaciones (Toasts) para confirmar operaciones exitosas.
- **PWA**: Service Worker actualizado a la versión `v11` con nuevos iconos y nombre oficial RZBRO$.

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
1. Implementar sistema de **abonos parciales** para permitir pagos graduales en cada préstamo.