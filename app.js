// Lista de hermanos autorizados
const BROTHERS = {
    'Fabio': {},
    'Juan Carlos': {},
    'Ronald': {},
    'Luis': {}
};

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = localStorage.getItem('rzbros_user') || null;
    const firebaseConfig = {
        apiKey: "AIzaSyCg8HhgWAwiDQHaU53GS9H99Kw6S2-rSgQ", // <-- ¡Reemplaza con tu API Key real!
        authDomain: "prestamos-app-dfddb.firebaseapp.com",
        projectId: "prestamos-app-dfddb",
        storageBucket: "prestamos-app-dfddb.appspot.com",
        messagingSenderId: "492698713145",
        appId: "1:492698713145:web:38f380e443601a817761e8"
    };
    
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const storage = firebase.storage();

    // Habilitar Persistencia Offline
    db.enablePersistence().catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistencia falló: múltiples pestañas abiertas');
        } else if (err.code == 'unimplemented') {
            console.warn('El navegador no soporta persistencia');
        }
    });

    // Elementos del DOM
    const loanForm = document.getElementById('loan-form');
    const loansList = document.getElementById('loans-list');
    const loanIdInput = document.getElementById('loan-id');
    const saveBtn = document.getElementById('save-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const totalAmountDisplay = document.getElementById('total-amount');
    const searchInput = document.getElementById('search-input');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    
    // Elementos de Login
    const userSelection = document.getElementById('user-selection');
    const pinModal = document.getElementById('pin-modal');
    const pinInput = document.getElementById('pin-input');
    const pinTitle = document.getElementById('pin-title');
    const pinSubtitle = document.getElementById('pin-subtitle');
    
    let selectedUser = null;
    let loginStep = 'LOGIN'; // 'SET', 'CONFIRM', 'LOGIN'
    let tempPin = '';

    // Estado de la app
    let allLoans = [];
    let unsubscribe = null; // Para limpiar el listener de Firestore

    // --- MANEJO DE SESIÓN ---
    window.selectUser = (name) => {
        selectedUser = name;
        const savedPin = localStorage.getItem(`rzbros_pin_${name}`);
        
        pinTitle.textContent = `Hola, ${name}`;
        pinModal.classList.remove('hidden');
        pinInput.focus();

        if (!savedPin) {
            loginStep = 'SET';
            pinSubtitle.textContent = 'Crea tu PIN de 2 dígitos';
        } else {
            loginStep = 'LOGIN';
            pinSubtitle.textContent = 'Ingresa tu PIN';
        }
    };

    window.cancelLogin = () => {
        pinModal.classList.add('hidden');
        pinInput.value = '';
    };

    // Validación automática al ingresar exactamente 2 dígitos
    pinInput.addEventListener('input', () => {
        const pinValue = pinInput.value;

        if (pinValue.length !== 2) {
            return;
        }

        const savedPin = localStorage.getItem(`rzbros_pin_${selectedUser}`);

        if (loginStep === 'SET') {
            tempPin = pinValue;
            loginStep = 'CONFIRM';
            pinSubtitle.textContent = 'Confirma tu PIN';
            pinInput.value = '';
            pinInput.focus();
            showToast("Ahora confirma tu PIN");
        } 
        else if (loginStep === 'CONFIRM') {
            if (pinValue === tempPin) {
                localStorage.setItem(`rzbros_pin_${selectedUser}`, pinValue);
                loginSuccess(selectedUser);
            } else {
                showToast("Los PINs no coinciden, intenta de nuevo", true);
                loginStep = 'SET';
                pinSubtitle.textContent = 'Crea tu PIN de 2 dígitos';
                pinInput.value = '';
            }
        } 
        else if (loginStep === 'LOGIN') {
            if (pinValue === savedPin) {
                loginSuccess(selectedUser);
            } else {
                showToast("PIN incorrecto", true);
                pinInput.value = '';
            }
        }
    });

    const loginSuccess = (userName) => {
        currentUser = userName;
        localStorage.setItem('rzbros_user', userName);
        userSelection.classList.add('hidden');
        pinModal.classList.add('hidden');
        initFirestoreListener();
        showToast(`Bienvenido ${userName}`);
    };

    window.logout = () => {
        localStorage.removeItem('rzbros_user');
        location.reload();
    };

    // --- NOTIFICACIONES ---
    const showToast = (message, isError = false) => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `fixed bottom-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 ${isError ? 'bg-red-500' : 'bg-green-500'}`;
        toast.classList.remove('hidden', 'translate-y-20');
        setTimeout(() => {
            toast.classList.add('translate-y-20');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000);
    };

    // --- RENDERIZADO ---
    const renderLoans = (loans) => {
        loansList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        const filteredLoans = loans.filter(loan => 
            loan.client.toLowerCase().includes(searchTerm)
        );

        // Calcular Total
        const total = filteredLoans.reduce((acc, loan) => acc + (parseFloat(loan.amount) || 0), 0);
        totalAmountDisplay.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total);

        if (filteredLoans.length === 0) {
            loansList.innerHTML = '<p class="text-gray-500">No hay préstamos registrados.</p>';
            return;
        }

        filteredLoans.forEach(loan => {
            const amount = parseFloat(loan.amount);
            const loanElement = document.createElement('div');
            loanElement.className = 'p-4 border rounded-lg shadow-sm bg-slate-50';
            loanElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-lg">${loan.client}</p>
                        <p class="text-gray-800">Monto: <span class="font-semibold text-blue-600">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)}</span></p>
                        <p class="text-gray-800">Fecha: <span class="font-semibold">${loan.loanDate}</span></p>
                        ${loan.details ? `<p class="text-sm text-gray-600 mt-1">Detalles: ${loan.details}</p>` : ''}
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${loan.id}" class="edit-btn bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm">Editar</button>
                        <button data-id="${loan.id}" class="remove-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">PAGADO</button>
                    </div>
                </div>
                ${loan.receiptURL ? `<div class="mt-2"><a href="${loan.receiptURL}" target="_blank" class="text-red-500 hover:underline text-sm">Ver Comprobante</a></div>` : ''}
            `;
            loansList.appendChild(loanElement);
        });
    };

    // Evento de búsqueda
    searchInput.addEventListener('input', () => renderLoans(allLoans));

    const initFirestoreListener = () => {
        if (unsubscribe) unsubscribe();
        
        // Filtramos solo los préstamos del usuario actual
        unsubscribe = db.collection('loans')
            .where('owner', '==', currentUser)
            .onSnapshot(
                snapshot => {
                    allLoans = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    renderLoans(allLoans);
                },
                error => {
                    console.error("Error Firestore: ", error);
                }
            );
    };

    // --- LÓGICA DE LA CÁMARA ---
    const startCameraBtn = document.getElementById('start-camera-btn');
    const cameraContainer = document.getElementById('camera-container');
    const video = document.getElementById('camera-stream');
    const captureBtn = document.getElementById('capture-btn');
    const cancelCameraBtn = document.getElementById('cancel-camera-btn');
    const canvas = document.getElementById('canvas');
    const loanReceiptInput = document.getElementById('loan-receipt');
    let stream;

    startCameraBtn.addEventListener('click', async () => {
        cameraContainer.classList.remove('hidden');
        startCameraBtn.textContent = 'Iniciando...';
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            video.play();
        } catch (error) {
            console.error("Error al acceder a la cámara: ", error);
            alert("No se pudo acceder a la cámara. Asegúrate de dar permiso.");
            cameraContainer.classList.add('hidden');
        }
        startCameraBtn.textContent = 'Tomar Foto';
    });

    captureBtn.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        
        // Redimensionar para ahorrar espacio (máximo 1024px)
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height) {
            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }
        } else {
            if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
            }
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
        
        // Bajamos la calidad a 0.7 (70%) para reducir drásticamente el peso del archivo
        canvas.toBlob(blob => {
            const file = new File([blob], `captura_${Date.now()}.jpg`, { type: 'image/jpeg' });
            
            // Asignar el archivo al input file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            loanReceiptInput.files = dataTransfer.files;

            // Opcional: mostrar un feedback al usuario
            console.log("Foto capturada y asignada al formulario.");

            stopCamera();
        }, 'image/jpeg');
    });

    cancelCameraBtn.addEventListener('click', () => {
        stopCamera();
    });

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraContainer.classList.add('hidden');
    };

    // --- MANEJO DEL FORMULARIO (AGREGAR/EDITAR) ---
    loanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loanId = loanIdInput.value;
        const client = document.getElementById('client-name').value;
        const amount = parseFloat(document.getElementById('loan-amount').value);
        const loanDate = document.getElementById('loan-date').value; // Get the new date value
        const details = document.getElementById('loan-details').value;
        const receiptFile = document.getElementById('loan-receipt').files[0];

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
            let receiptURL = loanId ? (allLoans.find(l => l.id === loanId)?.receiptURL || '') : '';

            if (receiptFile) {
                const filePath = `receipts/${Date.now()}_${receiptFile.name}`;
                const fileRef = storage.ref(filePath);
                await fileRef.put(receiptFile);
                receiptURL = await fileRef.getDownloadURL();
            }

            // Agregamos el campo 'owner' para saber de quién es el préstamo
            const loanData = { client, amount, loanDate, details, receiptURL, owner: currentUser };

            if (loanId) { // Actualizar
                await db.collection('loans').doc(loanId).update(loanData);
            } else { // Crear
                await db.collection('loans').add(loanData);
            }

            showToast(loanId ? "Préstamo actualizado" : "Préstamo guardado correctamente");
        } catch (error) {
            console.error("Error guardando el préstamo: ", error);
            alert("Hubo un error al guardar. Inténtalo de nuevo.");
        } finally {
            saveBtn.disabled = false;
            resetForm();
        }
    });

    // --- MODO EDICIÓN Y BORRADO ---
    loansList.addEventListener('click', (e) => {
        const loanId = e.target.getAttribute('data-id');
        if (!loanId) return;

        if (e.target.classList.contains('edit-btn')) {
            const loanToEdit = allLoans.find(loan => loan.id === loanId);
            if (loanToEdit) {
                loanIdInput.value = loanToEdit.id;
                document.getElementById('client-name').value = loanToEdit.client;
                document.getElementById('loan-amount').value = parseFloat(loanToEdit.amount);
                document.getElementById('loan-date').value = loanToEdit.loanDate; // Populate date field
                document.getElementById('loan-details').value = loanToEdit.details || '';
                
                saveBtn.textContent = 'Actualizar Préstamo';
                cancelEditBtn.classList.remove('hidden');
                window.scrollTo(0, 0);
            }
        } else if (e.target.classList.contains('remove-btn')) {
            if (confirm('¿Seguro que quieres marcar este préstamo como pagado?')) {
                const loanToDelete = allLoans.find(loan => loan.id === loanId);

                // Si el préstamo tiene una imagen, la borramos de Storage
                if (loanToDelete && loanToDelete.receiptURL) {
                    const imageRef = storage.refFromURL(loanToDelete.receiptURL);
                    imageRef.delete().catch(error => {
                        console.error("Error al eliminar el archivo físico:", error);
                    });
                }

                // Borramos el registro de la base de datos
                db.collection('loans').doc(loanId).delete()
                    .then(() => showToast("Préstamo marcado como pagado"))
                    .catch(error => console.error("Error borrando el registro: ", error));
            }
        }
    });

    const resetForm = () => {
        loanForm.reset();
        loanIdInput.value = '';
        // Establecer la fecha de hoy por defecto tras limpiar
        document.getElementById('loan-date').value = new Date().toISOString().split('T')[0];
        loanReceiptInput.value = ''; // Limpiar el input de archivo físicamente
        saveBtn.textContent = 'Guardar Préstamo';
        cancelEditBtn.classList.add('hidden');
    };

    cancelEditBtn.addEventListener('click', resetForm);

    // --- EXPORTAR A PDF ---
    exportPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const searchTerm = searchInput.value.toLowerCase();
        const filteredLoans = allLoans.filter(loan => 
            loan.client.toLowerCase().includes(searchTerm)
        );

        if (filteredLoans.length === 0) {
            showToast("No hay datos para exportar", true);
            return;
        }

        // Título y encabezado
        doc.setFontSize(18);
        doc.text("Reporte de Préstamos - RZBRO$", 14, 15);
        doc.setFontSize(10);
        doc.text(`Fecha del reporte: ${new Date().toLocaleDateString()}`, 14, 22);

        const tableData = filteredLoans.map(loan => [
            loan.client,
            new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(loan.amount),
            loan.loanDate,
            loan.details || ''
        ]);

        doc.autoTable({
            startY: 30,
            head: [['Cliente', 'Monto', 'Fecha', 'Detalles']],
            body: tableData,
            headStyles: { fillColor: [2, 117, 216] }, // Azul de la marca
        });

        doc.save(`reporte_prestamos_${new Date().toISOString().split('T')[0]}.pdf`);
    });

    // --- INICIO DE APP ---
    document.getElementById('loan-date').value = new Date().toISOString().split('T')[0];
    if (currentUser) {
        userSelection.classList.add('hidden');
        initFirestoreListener();
    }
});

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log('Service Worker registrado.');
            
            // Detectar si hay una actualización esperando
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Nueva versión lista, el Service Worker se activará automáticamente por skipWaiting()
                        console.log('Nueva versión detectada, recargando...');
                    }
                };
            };
        }).catch(err => console.log('Error registro SW: ', err));
    });

    // Recargar la página automáticamente cuando el nuevo Service Worker tome el control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            window.location.reload();
            refreshing = true;
        }
    });
}
