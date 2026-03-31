// Lista de hermanos autorizados
const BROTHERS = {
    'Fabio': {},
    'Juan Carlos': {},
    'Ronald': {},
    'Luis': {}
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 RZBRO$ v61 Iniciando...");
    let currentUser = localStorage.getItem('rzbros_user') || null;
    const firebaseConfig = {
        apiKey: "AIzaSyCg8HhgWAwiDQHaU53GS9H99Kw6S2-rSgQ", 
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
    const loanIdInput = document.getElementById('loan-id');
    const dashboardView = document.getElementById('dashboard-view');
    const formView = document.getElementById('form-view');
    const brotherDetailView = document.getElementById('brother-detail-view');
    const brotherDetailTitle = document.getElementById('brother-detail-title');
    const brotherLoansList = document.getElementById('brother-loans-list');
    const adminDetailView = document.getElementById('admin-detail-view');
    const adminDetailTitle = document.getElementById('admin-detail-title');
    const adminLoansList = document.getElementById('admin-loans-list');
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const totalAmountDisplay = document.getElementById('total-amount');
    const totalToPayDisplay = document.getElementById('total-to-pay');
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
    let selectedBrothers = [];

    let globalData = [];
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

    // --- PERMISOS DE NOTIFICACIÓN ---
    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            if (Notification.permission !== 'granted') {
                await Notification.requestPermission();
            }
        }
    };

    // --- NAVEGACIÓN Y HISTORIAL ---
    const updateView = (view) => {
        dashboardView.classList.add('hidden');
        formView.classList.add('hidden');
        brotherDetailView.classList.add('hidden');
        adminDetailView.classList.add('hidden');

        if (view === 'form') {
            formView.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else if (view === 'brother-detail') {
            brotherDetailView.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else if (view === 'admin-detail') {
            adminDetailView.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else {
            dashboardView.classList.remove('hidden');
            clearForm();
        }
    };

    window.goBack = () => {
        if (!formView.classList.contains('hidden') || !brotherDetailView.classList.contains('hidden') || !adminDetailView.classList.contains('hidden')) {
            history.back();
        }
    };

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view === 'form') {
            updateView('form');
        } else if (event.state && event.state.view === 'brother-detail') {
            updateView('brother-detail');
            renderBrotherDetail(event.state.brotherName);
        } else if (event.state && event.state.view === 'admin-detail') {
            updateView('admin-detail');
            renderAdminDetail(event.state.brotherName);
        } else {
            updateView('dashboard');
        }
    });

    window.viewBrotherDetail = (name) => {
        history.pushState({ view: 'brother-detail', brotherName: name }, '');
        updateView('brother-detail');
        renderBrotherDetail(name);
    };

    window.viewAdminDetail = (name) => {
        history.pushState({ view: 'admin-detail', brotherName: name }, '');
        updateView('admin-detail');
        renderAdminDetail(name);
    };

    toggleFormBtn.addEventListener('click', () => {
        history.pushState({ view: 'form' }, '');
        updateView('form');
    });

    const renderBrothersStatus = () => {
        const dashboardContainer = document.getElementById('brothers-status-container');
        const adminContainer = document.getElementById('admin-brothers-container');
        const formContainer = document.getElementById('form-brothers-container');
        const others = Object.keys(BROTHERS).filter(name => name !== currentUser);

        // Renderizar en el Dashboard
        if (dashboardContainer) {
            dashboardContainer.innerHTML = '';
            others.forEach(name => {
                const btn = document.createElement('button');
                btn.className = 'bg-slate-900 border border-slate-700 p-2 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-center justify-center sm:justify-between hover:border-blue-500 hover:bg-slate-800 transition-all group active:scale-95 shadow-lg shadow-black/20';
                btn.innerHTML = `
                    <span class="font-bold text-slate-200 text-xl sm:text-3xl text-center">${name}</span>
                    <span class="text-blue-500 group-hover:translate-x-1 transition-transform hidden sm:inline">→</span>
                `;
            btn.onclick = () => window.viewBrotherDetail(name);
                dashboardContainer.appendChild(btn);
            });
        }

        // Renderizar en Administrar Préstamos
        if (adminContainer) {
            adminContainer.innerHTML = '';
            others.forEach(name => {
                const btn = document.createElement('button');
                btn.className = 'bg-slate-900 border border-slate-700 p-2 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-center justify-center sm:justify-between hover:border-amber-500 hover:bg-slate-800 transition-all group active:scale-95 shadow-lg shadow-black/20';
                btn.innerHTML = `
                    <span class="font-bold text-slate-200 text-xl sm:text-3xl text-center">${name}</span>
                    <span class="text-amber-500 group-hover:translate-x-1 transition-transform hidden sm:inline">⚙️</span>
                `;
                btn.onclick = () => window.viewAdminDetail(name);
                adminContainer.appendChild(btn);
            });
        }

        // Renderizar en el Formulario (Selección rápida)
        if (formContainer) {
            formContainer.innerHTML = '';
            others.forEach(name => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'bg-slate-800 border border-slate-700 p-4 rounded-xl font-bold text-slate-200 hover:border-blue-500 active:scale-95 transition-all text-sm uppercase';
                btn.textContent = name;
                btn.onclick = () => {
                    if (selectedBrothers.includes(name)) {
                        // Deseleccionar
                        selectedBrothers = selectedBrothers.filter(n => n !== name);
                        btn.classList.remove('bg-blue-600', 'border-blue-400');
                        btn.classList.add('bg-slate-800', 'border-slate-700');
                    } else {
                        // Seleccionar
                        selectedBrothers.push(name);
                        btn.classList.remove('bg-slate-800', 'border-slate-700');
                        btn.classList.add('bg-blue-600', 'border-blue-400');
                    }
                    document.getElementById('client-name').value = selectedBrothers.join(', ');
                };
                // Mantener estado visual si ya estaba seleccionado (ej: al editar)
                if (selectedBrothers.includes(name)) {
                    btn.classList.replace('bg-slate-800', 'bg-blue-600');
                    btn.classList.replace('border-slate-700', 'border-blue-400');
                }
                formContainer.appendChild(btn);
            });
        }
    };

    const loginSuccess = (userName) => {
        currentUser = userName;
        localStorage.setItem('rzbros_user', userName);
        userSelection.classList.add('hidden');
        pinModal.classList.add('hidden');
        initFirestoreListener();
        renderBrothersStatus();
        history.replaceState({ view: 'dashboard' }, '');
        requestNotificationPermission();
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

    // --- ACCIONES DE DEUDA ---
    window.updateDebtStatus = async (loanId, newStatus) => {
        try {
            const loanRef = db.collection('loans').doc(loanId);
            const doc = await loanRef.get();
            if (!doc.exists) return;

            const statuses = doc.data().statuses || {};
            statuses[currentUser] = newStatus;

            await loanRef.update({ statuses });
            showToast(`Estado actualizado: ${newStatus}`);
        } catch (error) {
            console.error("Error actualizando estado:", error);
            showToast("Error al procesar", true);
        }
    };

    // --- SISTEMA DE NOTIFICACIONES LOCALES ---
    let lastSnapshotIds = new Set();
    const checkNewNotifications = (allData) => {
        const currentIds = new Set(allData.map(l => l.id));
        
        allData.forEach(loan => {
            const isNew = !lastSnapshotIds.has(loan.id);
            const isDebtor = loan.client && loan.client.includes(currentUser);
            const isPending = loan.statuses && loan.statuses[currentUser] === 'pending';

            if (isNew && isDebtor && isPending && lastSnapshotIds.size > 0) {
                if (Notification.permission === 'granted') {
                    new Notification("RZBRO$: Nueva deuda asignada", { body: `${loan.owner} te ha asignado un préstamo de $${loan.amount}` });
                }
            }
        });
        lastSnapshotIds = currentIds;
    };

    // --- RENDERIZADO ---
    const renderLoans = (allData) => {
        loansList.innerHTML = '';
        
        // Cobros: Préstamos que yo otorgué (soy el dueño)
        const receivables = allData.filter(l => l.owner === currentUser);
        // Pagos: Préstamos donde yo soy el cliente
        const payables = allData.filter(l => l.client && l.client.split(',').map(s => s.trim()).includes(currentUser));

        const totalReceivables = receivables.reduce((acc, loan) => acc + (parseFloat(loan.amount) || 0), 0);
        const totalPayables = payables.reduce((acc, loan) => acc + (parseFloat(loan.amount) || 0), 0);

        totalAmountDisplay.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalReceivables);
        if (totalToPayDisplay) {
            totalToPayDisplay.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPayables);
        }

        allLoans = receivables; // Mantenemos Cobros para la gestión de la lista y exportación

        if (receivables.length === 0) {
            loansList.innerHTML = `<div class="text-center py-10 text-slate-500 font-bold uppercase tracking-widest text-sm">
                ${totalPayables > 0 ? 'SIN PRÉSTAMOS POR COBRAR' : 'NO DEBES NI TE DEBEN'}
            </div>`;
            return;
        }

        // Renderizar Deudas Pendientes (Sección superior de la lista)
        if (payables.length > 0) {
            const pendingSection = document.createElement('div');
            pendingSection.className = 'mb-8';
            pendingSection.innerHTML = `<h3 class="text-rose-500 font-bold text-sm mb-4 uppercase tracking-widest">Tus Deudas por Revisar</h3>`;
            
            payables.forEach(loan => {
                const status = (loan.statuses && loan.statuses[currentUser]) || 'pending';
                if (status === 'accepted') return; // Solo mostrar las que requieren atención

                const card = document.createElement('div');
                card.className = 'p-4 border border-rose-900/50 rounded-xl bg-slate-900 mb-3 shadow-lg';
                card.innerHTML = `
                    <div class="flex justify-between items-center mb-3">
                        <div>
                            <p class="text-xs text-slate-500 uppercase font-bold">Acreedor: ${loan.owner}</p>
                            <p class="text-xl font-bold text-white">$ ${loan.amount}</p>
                        </div>
                        <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${status === 'pending' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}">${status === 'reviewing' ? 'En revisión' : 'Pendiente'}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        ${status === 'pending' ? `
                            <button onclick="updateDebtStatus('${loan.id}', 'accepted')" class="bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold uppercase">Aceptar</button>
                            <button onclick="updateDebtStatus('${loan.id}', 'reviewing')" class="bg-slate-800 text-slate-300 py-2 rounded-lg text-xs font-bold uppercase border border-slate-700">En Revisión</button>
                        ` : status === 'reviewing' ? `
                            <button onclick="updateDebtStatus('${loan.id}', 'accepted')" class="bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold uppercase">Aceptar</button>
                            <button onclick="updateDebtStatus('${loan.id}', 'rejected')" class="bg-red-600 text-white py-2 rounded-lg text-xs font-bold uppercase">Rechazar</button>
                        ` : ''}
                    </div>
                    ${status === 'rejected' ? `<p class="text-red-500 text-[10px] mt-2 font-bold italic text-center uppercase">Has rechazado esta deuda</p>` : ''}
                `;
                pendingSection.appendChild(card);
            });
            if (pendingSection.children.length > 1) loansList.appendChild(pendingSection);
        }

        // Renderizar Mis Cobros
        const receivablesHeader = document.createElement('h3');
        receivablesHeader.className = 'text-blue-500 font-bold text-sm mb-4 uppercase tracking-widest';
        receivablesHeader.textContent = 'Tus Préstamos Activos';
        loansList.appendChild(receivablesHeader);

        receivables.forEach(loan => {
            const amount = parseFloat(loan.amount);
            const interest = parseFloat(loan.interest) || 0;
            const loanElement = document.createElement('div');
            loanElement.className = 'p-4 border border-slate-800 rounded-xl shadow-sm bg-slate-900';
            
            // Resumen de estados para el dueño
            let statusInfo = '';
            if(loan.statuses) {
                statusInfo = `<div class="mt-2 flex gap-1 flex-wrap">${Object.entries(loan.statuses).map(([name, st]) => `<span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${st === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' : st === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'}">${name.charAt(0)}: ${st}</span>`).join('')}</div>`;
            }

            loanElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-lg text-slate-100">${loan.client}</p>
                        <p class="text-slate-400">Monto: <span class="font-semibold text-blue-400">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)}</span></p>
                        ${interest > 0 ? `<p class="text-slate-400 text-xs italic">Interés: ${interest}%</p>` : ''}
                        <p class="text-slate-400">Fecha: <span class="font-semibold text-slate-200">${loan.loanDate}</span></p>
                        ${loan.details ? `<p class="text-sm text-slate-500 mt-1">Detalles: ${loan.details}</p>` : ''}
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${loan.id}" class="edit-btn bg-amber-600/20 text-amber-500 border border-amber-600/30 px-3 py-1 rounded hover:bg-amber-600/30 text-sm transition-colors">Editar</button>
                        <button data-id="${loan.id}" class="remove-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">PAGADO</button>
                    </div>
                </div>
                ${statusInfo}
                ${loan.receiptURL ? `<div class="mt-2"><a href="${loan.receiptURL}" target="_blank" class="text-red-500 hover:underline text-sm">Ver Comprobante</a></div>` : ''}
            `;
            loansList.appendChild(loanElement);
        });
    };

    const renderBrotherDetail = (brotherName) => {
        brotherDetailTitle.textContent = `Estado con ${brotherName}`;
        brotherLoansList.innerHTML = '';

        // Cobros por hacer a este hermano
        const myCollections = globalData.filter(l => 
            l.owner === currentUser && l.client && l.client.includes(brotherName)
        );

        // Mis deudas aceptadas de este hermano
        const myAcceptedDebts = globalData.filter(l => 
            l.owner === brotherName && 
            l.client && l.client.includes(currentUser) && 
            l.statuses && l.statuses[currentUser] === 'accepted'
        );

        const combined = [...myCollections, ...myAcceptedDebts];
        if (combined.length === 0) {
            brotherLoansList.innerHTML = `<div class="text-center py-20 text-slate-600 font-bold uppercase tracking-widest text-xs">Sin movimientos pendientes</div>`;
            return;
        }

        combined.sort((a,b) => new Date(b.loanDate) - new Date(a.loanDate));

        combined.forEach(loan => {
            const isCollection = loan.owner === currentUser;
            const card = document.createElement('div');
            card.className = `p-4 border rounded-xl bg-slate-900 shadow-sm mb-3 ${isCollection ? 'border-blue-500/30' : 'border-rose-500/30'}`;
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-[10px] font-bold uppercase ${isCollection ? 'text-blue-400' : 'text-rose-400'} mb-1">${isCollection ? 'Cobro Pendiente' : 'Deuda Aceptada'}</p>
                        <p class="font-bold text-slate-100">${isCollection ? loan.client : 'De: ' + loan.owner}</p>
                        <p class="text-xl font-black ${isCollection ? 'text-white' : 'text-slate-200'} mt-1">$ ${new Intl.NumberFormat('es-MX').format(loan.amount)}</p>
                        <p class="text-[10px] text-slate-500 mt-2 italic">${loan.loanDate}</p>
                    </div>
                    ${loan.details ? `<p class="text-[10px] text-slate-500 max-w-[100px] text-right">${loan.details}</p>` : ''}
                </div>
            `;
            brotherLoansList.appendChild(card);
        });
    };

    const renderAdminDetail = (brotherName) => {
        adminDetailTitle.textContent = `Gestionar: ${brotherName}`;
        adminLoansList.innerHTML = '';

        const myCollections = globalData.filter(l => 
            l.owner === currentUser && l.client && l.client.split(',').map(s => s.trim()).includes(brotherName)
        );

        if (myCollections.length === 0) {
            adminLoansList.innerHTML = `<div class="text-center py-20 text-slate-600 font-bold uppercase tracking-widest text-xs">No tienes préstamos otorgados a ${brotherName}</div>`;
            return;
        }

        myCollections.sort((a,b) => new Date(b.loanDate) - new Date(a.loanDate));

        myCollections.forEach(loan => {
            const card = document.createElement('div');
            card.className = 'p-6 border border-slate-800 rounded-3xl bg-slate-900 shadow-xl mb-6';
            card.innerHTML = `
                <div class="mb-4 text-center">
                    <p class="text-blue-400 font-bold uppercase text-xs tracking-widest mb-1">${loan.client}</p>
                    <p class="text-5xl font-black text-white leading-none">$ ${new Intl.NumberFormat('es-MX').format(loan.amount)}</p>
                    <p class="text-slate-500 text-sm mt-2">${loan.loanDate}</p>
                </div>
                ${loan.details ? `<p class="bg-slate-800/50 p-3 rounded-xl text-slate-300 text-sm mb-4 text-center italic">"${loan.details}"</p>` : ''}
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="editLoan('${loan.id}')" class="bg-amber-600/20 text-amber-500 border border-amber-600/40 py-3 rounded-2xl font-bold uppercase text-xs hover:bg-amber-600 hover:text-white transition-all">Editar</button>
                    <button onclick="deleteLoan('${loan.id}')" class="bg-red-600 text-white py-3 rounded-2xl font-bold uppercase text-xs shadow-lg shadow-red-900/20">Pagado</button>
                </div>
            `;
            adminLoansList.appendChild(card);
        });
    };

    window.editLoan = (id) => {
        const loanToEdit = globalData.find(l => l.id === id);
        if (loanToEdit) {
            loanIdInput.value = loanToEdit.id;
            document.getElementById('client-name').value = loanToEdit.client;
            document.getElementById('loan-amount').value = parseFloat(loanToEdit.amount);
            document.getElementById('loan-details').value = loanToEdit.details || '';
            
            if (loanToEdit.client) {
                selectedBrothers = loanToEdit.client.split(',').map(s => s.trim());
                renderBrothersStatus();
            }
            saveBtn.textContent = 'Actualizar Préstamo';
            cancelEditBtn.classList.remove('hidden');
            
            history.pushState({ view: 'form' }, '');
            updateView('form');
        }
    };

    window.deleteLoan = async (id) => {
        if (confirm('¿Seguro que quieres marcar este préstamo como pagado?')) {
            try {
                const loan = globalData.find(l => l.id === id);
                if (loan && loan.receiptURL) {
                    const imageRef = storage.refFromURL(loan.receiptURL);
                    await imageRef.delete().catch(e => console.warn("Error Storage:", e));
                }
                await db.collection('loans').doc(id).delete();
                showToast("Préstamo marcado como pagado");
            } catch (error) {
                console.error("Error borrando:", error);
                showToast("Error al procesar", true);
            }
        }
    };

    const initFirestoreListener = () => {
        if (!currentUser) {
            console.warn("No se puede iniciar el listener: No hay usuario definido.");
            return;
        }
        console.log("📡 Conectando Firestore para:", currentUser);
        
        if (unsubscribe) unsubscribe();
        
        // Obtenemos todos los datos para filtrar cobros y pagos localmente
        unsubscribe = db.collection('loans')
            .onSnapshot(
                snapshot => {
                    console.log("✅ Datos sincronizados v60.");
                    globalData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    checkNewNotifications(globalData);
                    renderLoans(globalData);
                    
                    // Si estamos en la vista de detalle, refrescarla
                    if (!brotherDetailView.classList.contains('hidden') && history.state && history.state.brotherName) {
                        renderBrotherDetail(history.state.brotherName);
                    }
                    // Si estamos en administración, refrescar
                    if (!adminDetailView.classList.contains('hidden') && history.state && history.state.brotherName) {
                        renderAdminDetail(history.state.brotherName);
                    }
                },
                error => {
                    console.error("❌ ERROR CRÍTICO:", error.code, error.message);
                    let friendlyMsg = error.message;
                    if (error.code === 'permission-denied') {
                        friendlyMsg = "Firebase bloqueó el acceso. Revisa las 'Rules' en la consola y dales a 'Publish'.";
                    }
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
        const interest = 0; // Campo eliminado del formulario
        const loanDate = new Date().toISOString().split('T')[0]; // Fecha automática al guardar
        const details = document.getElementById('loan-details').value;
        const receiptFile = document.getElementById('loan-receipt').files[0];

        if (!client) {
            showToast("Selecciona un hermano primero", true);
            return;
        }

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

            // Inicializar estados para deudores
            const statuses = {};
            selectedBrothers.forEach(name => {
                statuses[name] = 'pending';
            });

            // Agregamos el campo 'owner' para saber de quién es el préstamo
            const loanData = { client, amount, interest, loanDate, details, receiptURL, owner: currentUser, statuses };

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
            history.back();
        }
    });

    const clearForm = () => {
        loanForm.reset();
        loanIdInput.value = '';
        loanReceiptInput.value = '';
        saveBtn.textContent = 'Guardar Préstamo';
        cancelEditBtn.classList.add('hidden');
        selectedBrothers = [];
        renderBrothersStatus();
    };

    // Botón cancelar dentro del formulario
    cancelEditBtn.addEventListener('click', goBack);

    // --- EXPORTAR A PDF ---
    exportPdfBtn.addEventListener('click', () => {
        const confirmExport = confirm("¿Deseas generar un PDF de todas tus deudas y cobros activos, incluyendo fechas y detalles?");
        if (!confirmExport) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const filteredLoans = allLoans;

        if (filteredLoans.length === 0) {
            showToast("No hay datos para exportar", true);
            return;
        }

        // Título y encabezado
        doc.setFontSize(18);
        doc.text("Reporte de Préstamos - RZBRO$", 14, 15);
        doc.setFontSize(10);
        doc.text(`Fecha del reporte: ${new Date().toLocaleDateString()}`, 14, 22);
        doc.text(`Generado por: ${currentUser}`, 14, 27);

        const tableData = filteredLoans.map(loan => [
            loan.client,
            new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(loan.amount),
            loan.interest ? `${loan.interest}%` : '0%',
            loan.loanDate,
            loan.details || ''
        ]);
        
        const total = filteredLoans.reduce((acc, loan) => acc + (parseFloat(loan.amount) || 0), 0);
        const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total);

        doc.autoTable({
            startY: 35,
            head: [['Cliente', 'Monto', 'Int.', 'Fecha', 'Detalles']],
            body: tableData,
            foot: [['', `TOTAL: ${formattedTotal}`, '', '']],
            footStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
            headStyles: { fillColor: [2, 117, 216] }, // Azul de la marca
        });

        doc.save(`reporte_prestamos_${new Date().toISOString().split('T')[0]}.pdf`);
    });

    // --- INICIO DE APP ---
    if (currentUser) {
        console.log("Usuario detectado:", currentUser);
        userSelection.classList.add('hidden');
        initFirestoreListener();
        renderBrothersStatus();
        history.replaceState({ view: 'dashboard' }, '');
        requestNotificationPermission();
    } else {
        console.log("No hay sesión activa.");
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
