
document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyCg8HhgWAwiDQHaU53GS9H99Kw6S2-rSgQ",
        authDomain: "prestamos-app-dfddb.firebaseapp.com",
        projectId: "prestamos-app-dfddb",
        storageBucket: "prestamos-app-dfddb.appspot.com", // Corregido para Storage
        messagingSenderId: "492698713145",
        appId: "1:492698713145:web:38f380e443601a817761e8"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const storage = firebase.storage();

    // Elementos del DOM
    const loanForm = document.getElementById('loan-form');
    const loansList = document.getElementById('loans-list');
    const loanIdInput = document.getElementById('loan-id');
    const saveBtn = document.getElementById('save-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Estado de la app
    let allLoans = [];

    // --- RENDERIZADO ---
    const renderLoans = (loans) => {
        loansList.innerHTML = '';
        if (loans.length === 0) {
            loansList.innerHTML = '<p class="text-gray-500">No hay préstamos registrados.</p>';
            return;
        }

        loans.forEach(loan => {
            const amount = parseFloat(loan.amount);
            const loanElement = document.createElement('div');
            loanElement.className = 'p-4 border rounded-lg shadow-sm bg-white';
            loanElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-lg">${loan.client}</p>
                        <p class="text-gray-800">Monto: <span class="font-semibold">$${amount.toFixed(2)}</span></p>
                        ${loan.details ? `<p class="text-sm text-gray-600 mt-1">Detalles: ${loan.details}</p>` : ''}
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${loan.id}" class="edit-btn bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm">Editar</button>
                        <button data-id="${loan.id}" class="remove-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">PAGADO</button>
                    </div>
                </div>
                ${loan.receiptURL ? `<div class="mt-2"><a href="${loan.receiptURL}" target="_blank" class="text-blue-500 hover:underline text-sm">Ver Comprobante</a></div>` : ''}
            `;
            loansList.appendChild(loanElement);
        });
    };

    // --- LÓGICA DE FIRESTORE ---
    db.collection('loans').orderBy('client').onSnapshot(snapshot => {
        allLoans = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        renderLoans(allLoans);
    });

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
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            video.play();
        } catch (error) {
            console.error("Error al acceder a la cámara: ", error);
            alert("No se pudo acceder a la cámara. Asegúrate de dar permiso.");
            cameraContainer.classList.add('hidden');
        }
    });

    captureBtn.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
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
        const amount = document.getElementById('loan-amount').value;
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

            const loanData = { client, amount, details, receiptURL };

            if (loanId) { // Actualizar
                await db.collection('loans').doc(loanId).update(loanData);
            } else { // Crear
                await db.collection('loans').add(loanData);
            }

            resetForm();
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
                document.getElementById('loan-details').value = loanToEdit.details || '';
                
                saveBtn.textContent = 'Actualizar Préstamo';
                cancelEditBtn.classList.remove('hidden');
                window.scrollTo(0, 0);
            }
        } else if (e.target.classList.contains('remove-btn')) {
            if (confirm('¿Seguro que quieres marcar este préstamo como pagado?')) {
                db.collection('loans').doc(loanId).delete().catch(error => console.error("Error borrando: ", error));
            }
        }
    });

    const resetForm = () => {
        loanForm.reset();
        loanIdInput.value = '';
        saveBtn.textContent = 'Guardar Préstamo';
        cancelEditBtn.classList.add('hidden');
    };

    cancelEditBtn.addEventListener('click', resetForm);

    });

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => console.log('Service Worker registrado.'), err => console.log('Error registro SW: ', err));
    });
}
