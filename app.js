// Lista de hermanos autorizados
const BROTHERS = {
    'Fabio': {},
    'Juan Carlos': {},
    'Ronald': {},
    'Luis': {}
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 RZBRO$ v62 Iniciando...");
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
        // En realidad, según tu index.html, el contenedor de la lista de préstamos general no estaba definido, 
        // usaremos una lógica coherente con tu estructura de "Estado de Préstamos" y "Administrar".
        
        // Cobros: Préstamos que yo otorgué (soy el dueño)
        const receivables = allData.filter(l => l.owner === currentUser);
        // Pagos: Préstamos donde yo soy el cliente
        const payables = allData.filter(l => l.client && l.client.split(',').map(s => s.trim()).includes(currentUser));

        // Solo sumamos al total lo que NO ha sido rechazado
        const totalReceivables = receivables.reduce((acc, loan) => {
            const isFullyRejected = Object.values(loan.statuses || {}).every(s => s === 'rejected');
            if (isFullyRejected) return acc;
            return acc + getLoanBalance(loan).remaining;
        }, 0);

        const totalPayables = payables.reduce((acc, loan) => acc + getLoanBalance(loan).remaining, 0);

        totalAmountDisplay.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalReceivables);
        if (totalToPayDisplay) {
            totalToPayDisplay.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPayables);
        }

        allLoans = receivables; // Mantenemos Cobros para la gestión de la lista y exportación

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
    };

    const renderBrotherDetail = (brotherName) => {
        brotherDetailTitle.textContent = `Estado con ${brotherName}`;
        brotherLoansList.innerHTML = '';

        const collections = globalData.filter(l => l.owner === currentUser && l.client && l.client.includes(brotherName));
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
                card.className = `p-3 border rounded-xl bg-slate-900 shadow-sm ${isCollection ? 'border-blue-500/30' : 'border-rose-500/30'}`;
                card.innerHTML = `
                    <p class="text-[9px] font-bold uppercase ${isCollection ? 'text-blue-400' : 'text-rose-400'} mb-1">${isCollection ? 'Cobro' : 'Deuda'}</p>
                    <p class="text-white font-bold text-sm">$ ${new Intl.NumberFormat('es-MX').format(remaining)}</p>
                    ${paid > 0 ? `<p class="text-[9px] text-slate-500 italic">De $${new Intl.NumberFormat('es-MX').format(original)}</p>` : ''}
                    <p class="text-[9px] text-slate-600 mt-1">${loan.loanDate}</p>
                `;
                container.appendChild(card);
            });
            return container;
        };

        // Encabezado de Balance Neto
        const summaryCard = document.createElement('div');
        summaryCard.className = `mb-6 p-4 rounded-2xl border ${balance >= 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-rose-500/10 border-rose-500/30'} text-center`;
        summaryCard.innerHTML = `
            <p class="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Balance Neto</p>
            <p class="text-3xl font-black ${balance >= 0 ? 'text-blue-400' : 'text-rose-400'}">
                ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.abs(balance))}
            </p>
            <p class="text-[10px] uppercase font-bold mt-1 ${balance >= 0 ? 'text-blue-500/60' : 'text-rose-500/60'}">
                ${balance >= 0 ? `Te debe ${brotherName}` : `Le debes a ${brotherName}`}
            </p>
            <button onclick="liquidateAccounts('${brotherName}')" class="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase rounded-xl transition-all border border-slate-700 active:scale-95">
                Liquidar Cuentas
            </button>
        `;

        brotherLoansList.appendChild(summaryCard);

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-3';
        
        const col1 = document.createElement('div');
        col1.innerHTML = `<h4 class="text-[10px] uppercase text-blue-500 font-bold mb-2 text-center">Cobros</h4>`;
        col1.appendChild(renderColumn(collections, true));

        const col2 = document.createElement('div');
        col2.innerHTML = `<h4 class="text-[10px] uppercase text-rose-500 font-bold mb-2 text-center">Deudas</h4>`;
        col2.appendChild(renderColumn(debts, false));

        grid.appendChild(col1);
        grid.appendChild(col2);
        brotherLoansList.appendChild(grid);
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
            const { original, remaining, paid } = getLoanBalance(loan);
            const isLocked = loan.statuses && Object.values(loan.statuses).includes('accepted');
            
            // Obtener el estado específico de este hermano (brotherName)
            const status = (loan.statuses && loan.statuses[brotherName]) || 'pending';
            let statusBadge = '';
            if (status === 'rejected') {
                statusBadge = `<p class="text-red-500 font-bold text-[10px] uppercase tracking-widest mb-2 animate-pulse">⚠️ Préstamo Rechazado</p>`;
            } else if (status === 'pending') {
                statusBadge = `<p class="text-amber-500 font-bold text-[10px] uppercase tracking-widest mb-2">⏳ Pendiente de revisión</p>`;
            }

            const card = document.createElement('div');
            card.className = 'p-6 border border-slate-800 rounded-3xl bg-slate-900 shadow-xl mb-6';
            card.innerHTML = `
                <div class="mb-4 text-center">
                    ${statusBadge}
                    <p class="text-blue-400 font-bold uppercase text-xs tracking-widest mb-1">${loan.client}</p>
                    <p class="text-5xl font-black text-white leading-none">$ ${new Intl.NumberFormat('es-MX').format(remaining)}</p>
                    ${paid > 0 ? `<p class="text-slate-500 text-xs mt-2 uppercase font-bold tracking-widest">Original: $${new Intl.NumberFormat('es-MX').format(original)}</p>` : ''}
                    <p class="text-slate-600 text-[10px] mt-1">${loan.loanDate}</p>
                </div>
                ${paid > 0 ? `
                    <div class="mb-4 bg-slate-800/30 rounded-xl p-3">
                        <p class="text-[10px] text-slate-500 font-bold uppercase mb-2">Historial de Abonos</p>
                        ${loan.payments.map(p => `<div class="flex justify-between text-xs py-1 border-b border-slate-800/50 text-slate-400"><span>${p.date}</span><span class="font-bold text-emerald-500">+$${p.amount}</span></div>`).join('')}
                    </div>
                ` : ''}
                ${loan.details ? `<p class="bg-slate-800/50 p-3 rounded-xl text-slate-300 text-sm mb-4 text-center italic">"${loan.details}"</p>` : ''}
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="editLoan('${loan.id}')" class="bg-amber-600/20 text-amber-500 border border-amber-600/40 py-3 rounded-2xl font-bold uppercase text-xs hover:bg-amber-600 hover:text-white transition-all">
                        ${isLocked ? 'Ver' : 'Editar'}
                    </button>
                    ${isLocked ? 
                        `<button disabled class="bg-slate-800 text-slate-600 py-3 rounded-2xl font-bold uppercase text-xs cursor-not-allowed opacity-50">Aceptado</button>` :
                        `<button onclick="deleteLoan('${loan.id}')" class="bg-red-600 text-white py-3 rounded-2xl font-bold uppercase text-xs shadow-lg shadow-red-900/20">Pagado</button>`
                    }
                </div>
                ${isLocked ? `
                    <button onclick="addPaymentPrompt('${loan.id}')" class="w-full mt-3 bg-emerald-600/20 text-emerald-500 border border-emerald-600/40 py-3 rounded-2xl font-bold uppercase text-xs hover:bg-emerald-600 hover:text-white transition-all">
                        Registrar Abono
                    </button>
                ` : ''}
            `;
            adminLoansList.appendChild(card);
        });
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
        if (!confirm("⚠️ ATENCIÓN: Vas a borrar todos los datos de RZBRO$ en todos los dispositivos. ¿Continuar?")) return;
        
        try {
            showToast("Iniciando limpieza total...");
            const snapshot = await db.collection('loans').get();
            const batch = db.batch();
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                // Borrar imagen si existe
                if (data.receiptURL) {
                    try {
                        const imageRef = storage.refFromURL(data.receiptURL);
                        await imageRef.delete().catch(() => {});
                    } catch (e) {}
                }
                batch.delete(doc.ref);
            }

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
                    if (loan.receiptURL) {
                        try {
                            const imageRef = storage.refFromURL(loan.receiptURL);
                            await imageRef.delete().catch(() => {});
                        } catch (e) {}
                    }
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
            document.getElementById('start-camera-btn').classList.toggle('hidden', isLocked);
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

        const isLocked = loan.statuses && Object.values(loan.statuses).includes('accepted');
        if (isLocked) {
            showToast("No se puede eliminar una deuda aceptada", true);
            return;
        }

        if (confirm('¿Seguro que quieres marcar este préstamo como pagado?')) {
            try {
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
                    console.log("✅ Datos sincronizados v62.");
                    globalData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                    renderLoans(globalData);
                    checkNewNotifications(globalData);
                    
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
            // Inicializamos 'payments' como array vacío
            const loanData = { client, amount, loanDate, details, receiptURL, owner: currentUser, statuses, payments: [] };

            if (loanId) { // Actualizar
                delete loanData.payments; // No resetear pagos al editar
                await db.collection('loans').doc(loanId).update({ client, amount, details, receiptURL, statuses });
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
        saveBtn.classList.remove('hidden');
        document.getElementById('start-camera-btn').classList.remove('hidden');
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
