// Lista de hermanos autorizados
const BROTHERS = {
    'Fabio': {},
    'Juan Carlos': {},
    'Ronald': {},
    'Luis': {}
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 RZBRO$ v96 Iniciando...");
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
    const messaging = firebase.messaging();

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
    const loanManageView = document.getElementById('loan-manage-view');
    const singleLoanManageContainer = document.getElementById('single-loan-manage-container');
    const externalLoansView = document.getElementById('external-loans-view');
    const externalLoansList = document.getElementById('external-loans-list');
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    const openExternalBtn = document.getElementById('open-external-btn');
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

    window.submitPin = () => {
        const pinValue = pinInput.value;

        if (pinValue.length < 2) {
            showToast("Ingresa 2 dígitos", true);
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
                pinInput.focus();
            }
        } 
        else if (loginStep === 'LOGIN') {
            if (pinValue === savedPin) {
                loginSuccess(selectedUser);
            } else {
                showToast("PIN incorrecto", true);
                pinInput.value = '';
                pinInput.focus();
            }
        }
    };

    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.submitPin();
    });

    // --- PERMISOS DE NOTIFICACIÓN ---
    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    setupFCM();
                }
            } else {
                setupFCM();
            }
        }
    };

    const setupFCM = async () => {
        try {
            // Nota: Debes generar tu 'vapidKey' en la consola de Firebase: 
            // Configuración del proyecto > Cloud Messaging > Web Push certificates
            const token = await messaging.getToken({ vapidKey: 'BDIn-r_BQDMCVquSXd0dEEyIs2ZK1Mys7gzh-ws59OtWX6VcpDCt0n1X2FszmqVlD2O4K3QW7Qy1VolVaK_wOjA' }); 
            if (token) {
                await db.collection('fcm_tokens').doc(currentUser).set({
                    token: token,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.warn("FCM Token Error (es normal en desarrollo local):", error);
        }
    };

    messaging.onMessage((payload) => {
        showToast(`🔔 ${payload.notification.body}`);
    });

    // --- NAVEGACIÓN Y HISTORIAL ---
    const updateView = (view) => {
        dashboardView.classList.add('hidden');
        formView.classList.add('hidden');
        brotherDetailView.classList.add('hidden');
        externalLoansView.classList.add('hidden');
        loanManageView.classList.add('hidden');

        if (view === 'form') {
            formView.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else if (view === 'brother-detail') {
            brotherDetailView.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else if (view === 'loan-manage') {
            loanManageView.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else if (view === 'external-loans') {
            externalLoansView.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else {
            dashboardView.classList.remove('hidden');
            clearForm();
        }
    };

    window.goBack = () => {
        if (!formView.classList.contains('hidden') || !brotherDetailView.classList.contains('hidden') || !externalLoansView.classList.contains('hidden') || !loanManageView.classList.contains('hidden')) {
            history.back();
        }
    };

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view === 'form') {
            updateView('form');
        } else if (event.state && event.state.view === 'brother-detail') {
            updateView('brother-detail');
            renderBrotherDetail(event.state.brotherName);
        } else if (event.state && event.state.view === 'loan-manage') {
            updateView('loan-manage');
            renderSingleLoanManage(event.state.loanId);
        } else if (event.state && event.state.view === 'external-loans') {
            updateView('external-loans');
        } else {
            updateView('dashboard');
        }
    });

    window.viewBrotherDetail = (name) => {
        history.pushState({ view: 'brother-detail', brotherName: name }, '');
        updateView('brother-detail');
        renderBrotherDetail(name);
    };

    window.openLoanManage = (loanId) => {
        history.pushState({ view: 'loan-manage', loanId }, '');
        updateView('loan-manage');
        renderSingleLoanManage(loanId);
    };

    toggleFormBtn.addEventListener('click', () => {
        history.pushState({ view: 'form' }, '');
        updateView('form');
    });

    openExternalBtn.addEventListener('click', () => {
        history.pushState({ view: 'external-loans' }, '');
        updateView('external-loans');
    });

    const renderBrothersStatus = () => {
        const dashboardContainer = document.getElementById('brothers-status-container');
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
        initExternalLoansListener();
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
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = `fixed bottom-4 right-4 z-[100] text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 ${isError ? 'bg-red-500' : 'bg-green-500'}`;
        toast.classList.remove('hidden', 'translate-y-20');
        setTimeout(() => {
            toast.classList.add('translate-y-20');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000);
    };

    // --- ACCIONES DE DEUDA (Mejoradas con Notación de Puntos para Concurrencia) ---
    window.updateDebtStatus = async (loanId, newStatus) => {
        try {
            const loanRef = db.collection('loans').doc(loanId);
            // Usamos dot notation para actualizar solo la clave del usuario actual
            // sin arriesgarnos a borrar los estados de otros hermanos que se actualicen al mismo tiempo.
            const updatePayload = {};
            updatePayload[`statuses.${currentUser}`] = newStatus;

            await loanRef.update(updatePayload);
            showToast(`Movimiento: ${newStatus === 'accepted' ? 'Confirmado' : newStatus === 'rejected' ? 'Cancelado' : 'En revisión'}`);
        } catch (error) {
            console.error("Error actualizando estado:", error);
            showToast("Error al procesar", true);
        }
    };

    // --- SISTEMA DE NOTIFICACIONES LOCALES ---
    let lastLoansState = new Map(); // Guardamos el estado completo para comparar cambios

    const checkNewNotifications = (allData) => {
        allData.forEach(loan => {
            const prevState = lastLoansState.get(loan.id);
            
            // 1. Caso: Soy deudor y hay un préstamo NUEVO
            const isDebtor = loan.client && loan.client.includes(currentUser);
            if (isDebtor && !prevState && lastLoansState.size > 0) {
                const isPending = loan.statuses && loan.statuses[currentUser] === 'pending';
                if (isPending && Notification.permission === 'granted') {
                    new Notification("RZBRO$: Nueva deuda", { 
                        body: `${loan.owner} te ha asignado un préstamo de $${new Intl.NumberFormat('es-MX').format(loan.amount)}` 
                    });
                }
            }

            // 2. Caso: Soy el DUEÑO y alguien cambió el estado (Aceptó o Rechazó)
            if (loan.owner === currentUser && prevState) {
                const clients = Object.keys(loan.statuses || {});
                clients.forEach(client => {
                    const oldStatus = prevState.statuses ? prevState.statuses[client] : null;
                    const newStatus = loan.statuses[client];

                    if (oldStatus !== newStatus && newStatus !== 'pending') {
                        if (Notification.permission === 'granted') {
                            const title = newStatus === 'accepted' ? "✅ Préstamo Aceptado" : "❌ Préstamo RECHAZADO";
                            const body = `${client} ha ${newStatus === 'accepted' ? 'aceptado' : 'rechazado'} tu préstamo de $${new Intl.NumberFormat('es-MX').format(loan.amount)}`;
                            new Notification(`RZBRO$: ${title}`, { body });
                            showToast(`🔔 ${title}: ${client}`);
                        }
                    }
                });
            }
        });

        // Actualizamos el mapa de referencia con una copia profunda
        lastLoansState = new Map(allData.map(l => [l.id, JSON.parse(JSON.stringify(l))]));
    };

    // --- UTILIDADES DE CÁLCULO ---
    const getLoanBalance = (loan) => {
        const totalPaid = (loan.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const original = parseFloat(loan.amount) || 0;
        return {
            original,
            paid: totalPaid,
            remaining: original - totalPaid,
            isFullyPaid: (original - totalPaid) <= 0
        };
    };

    // --- RENDERIZADO ---
    const renderLoans = (allData) => {
        const loansList = document.getElementById('active-loans-list');
        if (!loansList) return;
        loansList.innerHTML = '';
        
        // Cobros: Préstamos que yo otorgué (soy el dueño)
        const receivables = allData.filter(l => l.owner === currentUser);
        // Pagos: Préstamos donde yo soy el cliente
        const payables = allData.filter(l => l.client && l.client.split(',').map(s => s.trim()).includes(currentUser));

        // 1. Cobrador: Solo sumamos si TODOS los deudores han aceptado la deuda
        const totalReceivables = receivables.reduce((acc, loan) => {
            const statuses = Object.values(loan.statuses || {});
            const allAccepted = statuses.length > 0 && statuses.every(s => s === 'accepted');
            if (!allAccepted) return acc;
            return acc + getLoanBalance(loan).remaining;
        }, 0);

        // 2. Deudor: Solo sumamos si yo (el deudor) he aceptado explícitamente la deuda
        const totalPayables = payables.reduce((acc, loan) => {
            const myStatus = (loan.statuses && loan.statuses[currentUser]) || 'pending';
            if (myStatus !== 'accepted') return acc;
            return acc + getLoanBalance(loan).remaining;
        }, 0);

        totalAmountDisplay.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalReceivables);
        if (totalToPayDisplay) {
            totalToPayDisplay.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPayables);
        }

        // Guardamos solo los préstamos aceptados para la exportación PDF y lista activa principal
        allLoans = receivables.filter(l => {
            const statuses = Object.values(l.statuses || {});
            return statuses.length > 0 && statuses.every(s => s === 'accepted');
        });

        // 3. Préstamos Rechazados (Alerta para el dueño)
        const rejectedByOthers = receivables.filter(l => l.statuses && Object.values(l.statuses).includes('rejected'));
        if (rejectedByOthers.length > 0) {
            const rejectSection = document.createElement('div');
            rejectSection.className = 'mb-6';
            rejectSection.innerHTML = `<h3 class="text-red-500 font-black text-lg mb-5 uppercase tracking-[0.2em] flex items-center gap-2">⚠️ ATENCIÓN: RECHAZADOS</h3>`;
            
            rejectedByOthers.forEach(loan => {
                const whoRejected = Object.entries(loan.statuses || {}).filter(([n, s]) => s === 'rejected').map(([n]) => n).join(', ');
                const card = document.createElement('div');
                card.className = 'p-8 border-4 border-red-600 rounded-3xl bg-red-950/60 mb-5 shadow-2xl flex justify-between items-center animate-pulse';
                card.innerHTML = `
                    <div>
                        <p class="text-sm text-red-400 uppercase font-bold mb-2 tracking-widest">POR ${whoRejected.toUpperCase()}</p>
                        <p class="text-5xl font-black text-white">$ ${new Intl.NumberFormat('es-MX').format(parseFloat(loan.amount))}</p>
                    </div>
                    <button onclick="viewBrotherDetail('${whoRejected.split(',')[0]}')" class="bg-red-600 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase shadow-lg shadow-red-900/40 active:scale-95 transition-all">Revisar</button>
                `;
                rejectSection.appendChild(card);
            });
            loansList.appendChild(rejectSection);
        }

        // 4. Préstamos Enviados (Esperando confirmación - Para el dueño)
        const waitingForOthers = receivables.filter(l => {
            const statuses = Object.values(l.statuses || {});
            return (statuses.includes('pending') || statuses.includes('reviewing')) && !statuses.includes('rejected');
        });
        if (waitingForOthers.length > 0) {
            const waitingSection = document.createElement('div');
            waitingSection.className = 'mb-8';
            waitingSection.innerHTML = `<h3 class="text-blue-400 font-black text-lg mb-5 uppercase tracking-[0.2em]">⏳ ESPERANDO CONFIRMACIÓN</h3>`;
            
            waitingForOthers.forEach(loan => {
                const statuses = Object.values(loan.statuses || {});
                const needsReview = statuses.includes('reviewing');

                const card = document.createElement('div');
                card.className = needsReview 
                    ? 'p-8 border-4 border-amber-500 rounded-3xl bg-amber-900/20 mb-5 shadow-2xl flex justify-between items-center animate-pulse cursor-pointer'
                    : 'p-8 border-2 border-blue-500/30 rounded-3xl bg-blue-500/10 mb-5 shadow-xl flex justify-between items-center';

                card.innerHTML = `
                    <div>
                        <p class="text-sm ${needsReview ? 'text-amber-500' : 'text-blue-400'} uppercase font-bold mb-2 tracking-widest">
                            ${needsReview ? '⚠️ REVISIÓN SOLICITADA' : `Para: ${loan.client}`}
                        </p>
                        <p class="text-5xl font-black text-white">$ ${new Intl.NumberFormat('es-MX').format(parseFloat(loan.amount))}</p>
                        ${needsReview ? `<p class="text-[10px] text-amber-500/70 font-bold uppercase mt-1">HOLA, REVISA ESTE PRÉSTAMO</p>` : ''}
                    </div>
                    <span class="${needsReview ? 'bg-amber-500 text-black font-black' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'} px-5 py-2 rounded-full text-xs font-black uppercase border">
                        ${needsReview ? 'REVISAR' : 'Pendiente'}
                    </span>
                `;
                if (needsReview) {
                    card.onclick = () => window.viewBrotherDetail(loan.client.split(',')[0]);
                }
                waitingSection.appendChild(card);
            });
            loansList.appendChild(waitingSection);
        }

        // 5. Deudas por Aprobar (Para el deudor)
        if (payables.length > 0) {
            const pendingSection = document.createElement('div');
            pendingSection.className = 'mb-8';
            pendingSection.innerHTML = `<h3 class="text-rose-500 font-black text-lg mb-5 uppercase tracking-[0.2em]">🔔 DEUDAS POR APROBAR</h3>`;
            
            payables.forEach(loan => {
                const status = (loan.statuses && loan.statuses[currentUser]) || 'pending';
                if (status === 'accepted' || status === 'rejected') return;

                const card = document.createElement('div');
                card.className = 'p-8 border-2 border-rose-900/50 rounded-3xl bg-slate-900 mb-5 shadow-2xl';
                card.innerHTML = `
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <p class="text-sm text-slate-500 uppercase font-bold mb-2 tracking-widest">De: ${loan.owner}</p>
                            <p class="text-5xl font-black text-white">$ ${new Intl.NumberFormat('es-MX').format(parseFloat(loan.amount))}</p>
                        </div>
                        <span class="px-4 py-2 rounded-lg text-xs font-black uppercase ${status === 'pending' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}">${status === 'reviewing' ? 'En revisión' : 'Nuevo'}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-3">
                        <button onclick="updateDebtStatus('${loan.id}', 'accepted')" class="bg-emerald-600 text-white py-5 rounded-2xl text-sm font-black uppercase shadow-lg shadow-emerald-900/40 active:scale-95 transition-all">Confirmar</button>
                        <button onclick="updateDebtStatus('${loan.id}', 'rejected')" class="bg-red-600 text-white py-5 rounded-2xl text-sm font-black uppercase active:scale-95 transition-all">Cancelar</button>
                    </div>
                    ${status === 'pending' ? `
                        <button onclick="updateDebtStatus('${loan.id}', 'reviewing')" class="w-full bg-slate-800 text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase border border-slate-700 active:scale-95 transition-all tracking-widest italic">¿Algo no cuadra? Solicitar Revisión</button>
                    ` : ''}
                `;
                pendingSection.appendChild(card);
            });
            if (pendingSection.children.length > 1) loansList.appendChild(pendingSection);
        }
    };

    const renderBrotherDetail = (brotherName) => {
        brotherDetailTitle.textContent = `Estado con ${brotherName}`;
        brotherLoansList.innerHTML = '';

        // Filtrar cobros: Soy el dueño, para este cliente, y no rechazados por él
        const collections = globalData.filter(l => 
            l.owner === currentUser && l.client && l.client.includes(brotherName) && 
            (!l.statuses || l.statuses[brotherName] !== 'rejected')
        );
        const debts = globalData.filter(l => l.owner === brotherName && l.client && l.client.includes(currentUser) && l.statuses && l.statuses[currentUser] === 'accepted');

        if (collections.length === 0 && debts.length === 0) {
            brotherLoansList.innerHTML = `<div class="text-center py-20 text-slate-600 font-bold uppercase tracking-widest text-xs">Sin movimientos pendientes</div>`;
            return;
        }

        const netCollections = collections.reduce((acc, l) => acc + getLoanBalance(l).remaining, 0);
        const netDebts = debts.reduce((acc, l) => acc + getLoanBalance(l).remaining, 0);
        const balance = netCollections - netDebts;

        const renderColumn = (list, isCollection) => {
            const container = document.createElement('div');
            container.className = 'space-y-3';
            list.forEach(loan => {
                const { original, remaining, paid } = getLoanBalance(loan);
                const card = document.createElement('div');
                card.className = `p-5 border rounded-2xl bg-slate-900 shadow-sm ${isCollection ? 'border-blue-500/30' : 'border-rose-500/30'}`;
                card.innerHTML = `
                    <p class="text-xs font-bold uppercase ${isCollection ? 'text-blue-400' : 'text-rose-400'} mb-1">${isCollection ? 'Cobro' : 'Deuda'}</p>
                    <p class="text-white font-bold text-2xl">$ ${new Intl.NumberFormat('es-MX').format(remaining)}</p>
                    ${paid > 0 ? `<p class="text-xs text-slate-500 italic">De $${new Intl.NumberFormat('es-MX').format(original)}</p>` : ''}
                    <p class="text-xs text-slate-600 mt-2">${loan.loanDate}</p>
                    ${isCollection ? `
                        <div class="mt-4 flex justify-center">
                            <button onclick="openLoanManage('${loan.id}')" class="w-full text-[10px] bg-blue-600/20 text-blue-400 py-2.5 rounded-xl border border-blue-500/30 font-black uppercase hover:bg-blue-600 hover:text-white transition-all tracking-widest">Gestionar</button>
                        </div>` : ''}
                `;
                container.appendChild(card);
            });
            return container;
        };

        // Encabezado de Balance Neto
        const summaryCard = document.createElement('div');
        summaryCard.className = `mb-6 p-4 rounded-2xl border ${balance >= 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-rose-500/10 border-rose-500/30'} text-center`;
        summaryCard.innerHTML = `
            <p class="text-sm uppercase font-bold tracking-widest text-slate-400 mb-1">Balance Neto</p>
            <p class="text-3xl font-black ${balance >= 0 ? 'text-blue-400' : 'text-rose-400'}">
                ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.abs(balance))}
            </p>
            <p class="text-sm uppercase font-bold mt-1 ${balance >= 0 ? 'text-blue-500/60' : 'text-rose-500/60'}">
                ${balance >= 0 ? `Te debe ${brotherName}` : `Le debes a ${brotherName}`}
            </p>
        `;

        brotherLoansList.appendChild(summaryCard);

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-3';
        
        const col1 = document.createElement('div');
        col1.innerHTML = `<h4 class="text-xs uppercase text-blue-500 font-bold mb-2 text-center">Cobros</h4>`;
        col1.appendChild(renderColumn(collections, true));

        const col2 = document.createElement('div');
        col2.innerHTML = `<h4 class="text-xs uppercase text-rose-500 font-bold mb-2 text-center">Deudas</h4>`;
        col2.appendChild(renderColumn(debts, false));

        grid.appendChild(col1);
        grid.appendChild(col2);
        brotherLoansList.appendChild(grid);
    };

    const renderSingleLoanManage = (loanId) => {
        const loan = globalData.find(l => l.id === loanId);
        singleLoanManageContainer.innerHTML = '';
        if (!loan) {
            singleLoanManageContainer.innerHTML = `<p class="text-center text-slate-500 py-20 font-bold uppercase tracking-widest text-xs">No se encontró la información del préstamo</p>`;
            return;
        }

        const { original, remaining, paid } = getLoanBalance(loan);
        const isLocked = loan.statuses && Object.values(loan.statuses).includes('accepted');
        
        // Obtener el primer cliente de la lista para mostrar el estado (asumiendo que brotherName es parte del cliente)
        const status = Object.values(loan.statuses || {})[0] || 'pending';
        let statusBadge = '';
        if (status === 'rejected') {
            statusBadge = `<p class="text-red-500 font-bold text-sm uppercase tracking-widest mb-2 animate-pulse">⚠️ Préstamo Rechazado</p>`;
        } else if (status === 'pending') {
            statusBadge = `<p class="text-amber-500 font-bold text-sm uppercase tracking-widest mb-2">⏳ Pendiente de revisión</p>`;
        } else if (status === 'reviewing') {
            statusBadge = `<p class="text-blue-500 font-bold text-sm uppercase tracking-widest mb-2 animate-pulse">⏳ Revisión Solicitada</p>`;
        }

        const card = document.createElement('div');
        card.className = 'p-8 border border-slate-800 rounded-3xl bg-slate-900 shadow-xl';
        card.innerHTML = `
            <div class="mb-8 text-center">
                ${statusBadge}
                <p class="text-blue-400 font-bold uppercase text-sm tracking-widest mb-2">${loan.client}</p>
                <p class="text-6xl font-black text-white leading-none">$ ${new Intl.NumberFormat('es-MX').format(remaining)}</p>
                ${paid > 0 ? `<p class="text-slate-500 text-sm mt-4 uppercase font-bold tracking-widest">Original: $${new Intl.NumberFormat('es-MX').format(original)}</p>` : ''}
                <p class="text-slate-600 text-sm mt-2">${loan.loanDate}</p>
            </div>
            ${paid > 0 ? `
                <div class="mb-8 bg-slate-800/30 rounded-2xl p-4">
                    <p class="text-xs text-slate-500 font-bold uppercase mb-4 tracking-widest">Historial de Abonos</p>
                    ${loan.payments.map(p => `<div class="flex justify-between text-base py-3 border-b border-slate-800/50 text-slate-400"><span>${p.date}</span><span class="font-bold text-emerald-500">+$${p.amount}</span></div>`).join('')}
                </div>
            ` : ''}
            ${loan.details ? `<div class="bg-slate-800/50 p-6 rounded-2xl text-slate-300 text-lg mb-8 text-center italic leading-relaxed">"${loan.details}"</div>` : ''}
            <div class="grid grid-cols-2 gap-4 mb-4">
                <button onclick="editLoan('${loan.id}')" class="bg-amber-600/20 text-amber-500 border border-amber-600/40 py-5 rounded-3xl font-black uppercase text-sm hover:bg-amber-600 hover:text-white transition-all shadow-lg active:scale-95">
                    ${isLocked ? 'Ver Info' : 'Editar'}
                </button>
                <button onclick="deleteLoan('${loan.id}')" class="py-5 rounded-3xl font-black uppercase text-sm transition-all shadow-lg active:scale-95 ${isLocked ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-600/40 hover:bg-emerald-600 hover:text-white' : 'bg-red-600 text-white shadow-red-900/20'}">
                    ${isLocked ? 'Liquidar' : 'Pagado'}
                </button>
            </div>
            ${isLocked ? `
                <button onclick="addPaymentPrompt('${loan.id}')" class="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase text-base hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 active:scale-95">
                    Registrar Abono
                </button>
            ` : ''}
        `;
        singleLoanManageContainer.appendChild(card);
    };

    window.addPaymentPrompt = async (id) => {
        const loan = globalData.find(l => l.id === id);
        if (!loan) return;
        const { remaining } = getLoanBalance(loan);

        const amount = prompt(`Monto del abono (Máx $${remaining}):`);
        if (!amount || isNaN(amount) || amount <= 0 || amount > remaining) {
            if (amount) showToast("Monto inválido", true);
            return;
        }

        const payments = loan.payments || [];
        payments.push({ amount: parseFloat(amount), date: new Date().toISOString().split('T')[0], registeredBy: currentUser });
        await db.collection('loans').doc(id).update({ payments });
        showToast("Abono registrado correctamente");
    };

    // --- SCRIPT ADMINISTRATIVO DE REINICIO ---
    // Para usar: Abrir consola (F12) en PC y escribir: resetAllData()
    window.resetAllData = async () => {
        if (!confirm("⚠️ ATENCIÓN: Vas a borrar TODOS los datos (Préstamos y Externos) de RZBRO$ en todos los dispositivos. Esta acción no se puede deshacer. ¿Continuar?")) return;
        
        try {
            showToast("Iniciando limpieza total...");
            const batch = db.batch();
            
            // Borrar Préstamos entre hermanos
            const loansSnapshot = await db.collection('loans').get();
            loansSnapshot.docs.forEach(doc => batch.delete(doc.ref));

            // Borrar Préstamos externos
            const extSnapshot = await db.collection('external_loans').get();
            extSnapshot.docs.forEach(doc => batch.delete(doc.ref));

            // Nota: fcm_tokens se mantienen para no romper notificaciones

            await batch.commit();
            showToast("Sistema reiniciado a cero con éxito");
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error("Error en el reinicio maestro:", error);
            showToast("Error al limpiar datos", true);
        }
    };

    window.liquidateAccounts = async (brotherName) => {
        const collections = globalData.filter(l => l.owner === currentUser && l.client && l.client.includes(brotherName));
        const debts = globalData.filter(l => l.owner === brotherName && l.client && l.client.includes(currentUser) && l.statuses && l.statuses[currentUser] === 'accepted');
        
        const allToSettle = [...collections, ...debts];
        if (allToSettle.length === 0) return;

        const netCollections = collections.reduce((acc, l) => acc + getLoanBalance(l).remaining, 0);
        const netDebts = debts.reduce((acc, l) => acc + getLoanBalance(l).remaining, 0);
        const balance = netCollections - netDebts;

        const confirmMsg = balance === 0 
            ? `El balance es $0.00. ¿Deseas archivar estos ${allToSettle.length} movimientos como liquidados?`
            : `Se liquidará un balance neto de ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.abs(balance))}. ¿Confirmas que se ha realizado el pago externo y quieres saldar estas cuentas?`;

        if (confirm(confirmMsg)) {
            try {
                showToast("Liquidando cuentas...");
                const batch = db.batch();
                
                for (const loan of allToSettle) {
                    batch.delete(db.collection('loans').doc(loan.id));
                }
                
                await batch.commit();
                showToast("Cuentas liquidadas con éxito");
            } catch (error) {
                console.error("Error en liquidación:", error);
                showToast("Error al liquidar cuentas", true);
            }
        }
    };

    window.editLoan = (id) => {
        const loanToEdit = globalData.find(l => l.id === id);
        if (loanToEdit) {
            const isLocked = loanToEdit.statuses && Object.values(loanToEdit.statuses).includes('accepted');
            
            loanIdInput.value = loanToEdit.id;
            document.getElementById('client-name').value = loanToEdit.client;
            document.getElementById('loan-amount').value = parseFloat(loanToEdit.amount);
            document.getElementById('loan-details').value = loanToEdit.details || '';
            
            // Bloquear campos si está aceptada
            const formInputs = loanForm.querySelectorAll('input, textarea');
            formInputs.forEach(input => {
                if(input.id !== 'loan-id') input.disabled = isLocked;
            });
            saveBtn.classList.toggle('hidden', isLocked);
            document.getElementById('form-brothers-container').classList.toggle('pointer-events-none', isLocked);
            document.getElementById('form-brothers-container').classList.toggle('opacity-50', isLocked);

            if (loanToEdit.client) {
                selectedBrothers = loanToEdit.client.split(',').map(s => s.trim());
                renderBrothersStatus();
            }
            saveBtn.textContent = isLocked ? 'Ver Detalle' : 'Actualizar Préstamo';
            cancelEditBtn.classList.remove('hidden');
            cancelEditBtn.textContent = isLocked ? 'Cerrar' : 'Cancelar Edición';
            
            history.pushState({ view: 'form' }, '');
            updateView('form');
        }
    };

    window.deleteLoan = async (id) => {
        const loan = globalData.find(l => l.id === id);
        if (!loan) return;

        if (confirm('¿Seguro que quieres marcar este préstamo como pagado o liquidado?')) {
            try {
                await db.collection('loans').doc(id).delete();
                showToast("Operación liquidada con éxito");
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
        console.log("📡 Conectando Firestore v96 para:", currentUser);
        
        if (unsubscribe) unsubscribe();
        
        // Obtenemos todos los datos para filtrar cobros y pagos localmente
        unsubscribe = db.collection('loans')
            .onSnapshot(
                snapshot => {
                    console.log("✅ Datos sincronizados v96.");
                    globalData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                    renderLoans(globalData);
                    checkNewNotifications(globalData);
                    
                    // Si estamos en la vista de detalle, refrescarla
                    if (!brotherDetailView.classList.contains('hidden') && history.state && history.state.brotherName) {
                        renderBrotherDetail(history.state.brotherName);
                    }
                    // Si estamos en la vista de gestión individual, refrescarla
                    if (!loanManageView.classList.contains('hidden') && history.state && history.state.loanId) {
                        renderSingleLoanManage(history.state.loanId);
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

    // --- PRÉSTAMOS EXTERNOS ---
    let unsubscribeExternal = null;
    const initExternalLoansListener = () => {
        if (!currentUser) return;
        if (unsubscribeExternal) unsubscribeExternal();

        unsubscribeExternal = db.collection('external_loans')
            .where('owner', '==', currentUser)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const loans = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                renderExternalLoans(loans);
            });
    };

    const renderExternalLoans = (loans) => {
        externalLoansList.innerHTML = '';
        if (loans.length === 0) {
            externalLoansList.innerHTML = `<p class="text-center text-slate-600 py-10 text-xs font-bold uppercase tracking-widest">No tienes préstamos externos registrados</p>`;
            return;
        }

        loans.forEach(loan => {
            const card = document.createElement('div');
            card.className = 'p-5 border border-slate-800 rounded-2xl bg-slate-950 shadow-lg';
            
            const isOverdue = new Date(loan.dueDate) < new Date() && !loan.paid;

            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-xs text-blue-500 font-bold uppercase tracking-tighter mb-1">${loan.debtor}</p>
                        <p class="text-2xl font-black text-white">$ ${new Intl.NumberFormat('es-MX').format(loan.amount)}</p>
                    </div>
                    <button onclick="deleteExternalLoan('${loan.id}')" class="text-slate-600 hover:text-red-500 transition-colors">🗑️</button>
                </div>
                <p class="text-sm text-slate-400 mb-4 italic">"${loan.reason}"</p>
                <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span class="text-slate-600">Vence: ${loan.dueDate}</span>
                    <span class="${isOverdue ? 'text-red-500 animate-pulse' : 'text-emerald-500'}">${isOverdue ? 'Vencido' : 'En plazo'}</span>
                </div>
            `;
            externalLoansList.appendChild(card);
        });
    };

    const externalLoanForm = document.getElementById('external-loan-form');
    externalLoanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const debtor = document.getElementById('ext-debtor').value;
        const reason = document.getElementById('ext-reason').value;
        const amount = parseFloat(document.getElementById('ext-amount').value);
        const dueDate = document.getElementById('ext-due-date').value;

        try {
            await db.collection('external_loans').add({
                owner: currentUser,
                debtor,
                reason,
                amount,
                dueDate,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            externalLoanForm.reset();
            showToast("Préstamo externo guardado");
        } catch (error) {
            console.error("Error guardando externo:", error);
            showToast("Error al guardar", true);
        }
    });

    window.deleteExternalLoan = async (id) => {
        if (confirm("¿Marcar este préstamo como cobrado y eliminar de la lista?")) {
            try {
                await db.collection('external_loans').doc(id).delete();
                showToast("Préstamo eliminado");
            } catch (error) {
                showToast("Error al eliminar", true);
            }
        }
    };

    // --- MANEJO DEL FORMULARIO (AGREGAR/EDITAR) ---
    loanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loanId = loanIdInput.value;
        const client = document.getElementById('client-name').value;
        const amount = parseFloat(document.getElementById('loan-amount').value);
        const loanDate = new Date().toISOString().split('T')[0]; // Fecha automática al guardar
        const details = document.getElementById('loan-details').value;

        if (!client) {
            showToast("Selecciona un hermano primero", true);
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
            // Obtener datos existentes si es edición buscando en globalData (que tiene todos los préstamos)
            const existingLoan = loanId ? globalData.find(l => l.id === loanId) : null;
            const existingStatuses = existingLoan ? (existingLoan.statuses || {}) : {};

            // Inicializar estados para deudores
            const statuses = {};
            selectedBrothers.forEach(name => {
                // Si ya tenía un estado y el hermano sigue asignado, lo mantenemos; si es nuevo, pending
                statuses[name] = existingStatuses[name] || 'pending';
            });

            const loanData = { client, amount, details, owner: currentUser, statuses };

            if (loanId) { // Actualizar
                await db.collection('loans').doc(loanId).update({ client, amount, details, statuses });
            } else { // Crear
                loanData.loanDate = loanDate;
                loanData.payments = [];
                await db.collection('loans').add(loanData);
            }

            showToast(loanId ? "Préstamo actualizado" : "Préstamo guardado correctamente");
        } catch (error) {
            console.error("❌ ERROR AL GUARDAR:", error);
            alert(`⚠️ Error al guardar:\n${error.message}`);
        } finally {
            saveBtn.disabled = false;
            history.back();
        }
    });

    const clearForm = () => {
        loanForm.reset();
        loanIdInput.value = '';
        saveBtn.textContent = 'Guardar Préstamo';
        saveBtn.classList.remove('hidden');
        cancelEditBtn.classList.add('hidden');
        cancelEditBtn.textContent = 'Cancelar Edición';
        
        const formInputs = loanForm.querySelectorAll('input, textarea');
        formInputs.forEach(input => input.disabled = false);
        document.getElementById('form-brothers-container').classList.remove('pointer-events-none', 'opacity-50');

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
            new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(getLoanBalance(loan).remaining),
            loan.loanDate,
            loan.details || ''
        ]);
        
        const total = filteredLoans.reduce((acc, loan) => acc + getLoanBalance(loan).remaining, 0);
        const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total);

        doc.autoTable({
            startY: 35,
            head: [['Cliente', 'Monto', 'Fecha', 'Detalles']],
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
