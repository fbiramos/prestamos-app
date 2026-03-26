
document.addEventListener('DOMContentLoaded', () => {
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

    // Estado de la app
    let allLoans = [];

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
            loanElement.className = 'p-4 border rounded-lg shadow-sm bg-white';
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

    // --- LÓGICA DE FIRESTORE CON MANEJO DE ERRORES ---
    db.collection('loans').orderBy('client').onSnapshot(
        snapshot => {
            allLoans = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            renderLoans(allLoans);
        },
        error => {
            console.error("Error en tiempo real de Firestore: ", error);
            loansList.innerHTML = '<p class="text-red-500 text-center p-4">Error al conectar con la base de datos. Verifica tu conexión.</p>';
        }
    );

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

            const loanData = { client, amount, loanDate, details, receiptURL }; // Include loanDate

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
                document.getElementById('loan-amount').value = loanToEdit.amount;
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

    // Establecer fecha de hoy al cargar la app por primera vez
    document.getElementById('loan-date').value = new Date().toISOString().split('T')[0];

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
