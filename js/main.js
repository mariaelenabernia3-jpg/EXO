document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    const userAuthCorner = document.getElementById('user-auth-corner');
    const modal = { overlay: document.getElementById('modal'), content: document.getElementById('modal-content') };

    const updateAuthUI = () => {
        if (currentUser) {
            userAuthCorner.innerHTML = `<div id="user-info"><i class='bx bxs-user-circle'></i><a href="#" data-action="change-name" title="Cambiar Nombre">${currentUser.name}</a></div><button data-action="logout"><i class='bx bx-log-out'></i> Abdicar</button>`;
        } else {
            userAuthCorner.innerHTML = `<button data-action="auth"><i class='bx bx-user-plus'></i> Conectar</button>`;
        }
    };

    const handleLogin = (form) => {
        const username = form.querySelector('input[type="text"]').value.trim();
        if (!username) { alert("Por favor, introduce un nombre."); return; }
        currentUser = { name: username };
        sessionStorage.setItem('exoUser', JSON.stringify(currentUser));
        updateAuthUI();
        closeModal();
    };

    const handleLogout = () => {
        currentUser = null;
        sessionStorage.removeItem('exoUser');
        sessionStorage.removeItem('exoChosenPlanet');
        updateAuthUI();
    };

    const handleNewGame = () => {
        if (currentUser) {
            if (sessionStorage.getItem('exoChosenPlanet')) {
                window.location.href = 'base.html';
            } else {
                window.location.href = 'selection.html';
            }
        } else {
            alert('Debes conectarte para empezar a gobernar.');
            openModal('auth');
        }
    };

    const handleChangeName = (form) => {
        const newName = form.querySelector('input[type="text"]').value.trim();
        if (!newName) return;
        currentUser.name = newName;
        sessionStorage.setItem('exoUser', JSON.stringify(currentUser));
        updateAuthUI();
        closeModal();
    };

    const openModal = (type) => {
        let contentHTML = '';
        const closeButton = `<button class="modal-close" id="modalCloseButton">&times;</button>`;
        switch (type) {
            case 'auth':
                contentHTML = `${closeButton}
                    <div id="loginFormContainer">
                        <form id="loginFormModal" class="auth-form"><h1>Conexión Presidencial</h1><div class="input-box"><input type="text" placeholder="Nombre de Presidente" required value="DZM"><i class='bx bxs-user-circle'></i></div><div class="input-box"><input type="password" placeholder="Clave" required value="12345"><i class='bx bxs-key'></i></div><button type="submit" class="btn">Asumir el Mando</button><div class="form-switcher"><p>¿Sin registro? <a href="#" data-form-switcher="register">Crear nuevo Perfil</a></p></div></form>
                    </div>
                    <div id="registerFormContainer" class="hidden">
                        <form id="registerFormModal" class="auth-form"><h1>Crear Perfil</h1><div class="input-box"><input type="text" placeholder="Elige tu Nombre" required><i class='bx bxs-user-circle'></i></div><div class="input-box"><input type="password" placeholder="Define una Clave" required><i class='bx bxs-key'></i></div><button type="submit" class="btn">Registrar</button><div class="form-switcher"><p>¿Ya tienes un Perfil? <a href="#" data-form-switcher="login">Conectar</a></p></div></form>
                    </div>`;
                break;
            case 'change-name':
                contentHTML = `${closeButton}<form id="changeNameFormModal" class="auth-form"><h1>Cambiar Nombre</h1><div class="input-box"><input type="text" placeholder="Nuevo Nombre" required value="${currentUser.name}"><i class='bx bxs-user-check'></i></div><button type="submit" class="btn">Confirmar</button></form>`;
                break;
            case 'options':
                contentHTML = `${closeButton}<h2 class="modal-title">Opciones del Juego</h2><div class="modal-body"><p>Ajustes de sonido, gráficos y jugabilidad estarán disponibles aquí.</p></div>`;
                break;
            case 'credits':
                contentHTML = `${closeButton}<h2 class="modal-title">Créditos</h2><div class="modal-body"><p>Juego creado por:</p><p class="credits-studio">DZM Studios</p></div>`;
                break;
        }
        modal.content.innerHTML = contentHTML;
        modal.overlay.classList.remove('hidden');
    };

    const closeModal = () => { modal.overlay.classList.add('hidden'); };

    document.addEventListener('click', (e) => {
        const target = e.target;
        const actionTarget = target.closest('[data-action]');
        const formSwitcher = target.closest('[data-form-switcher]');
        if (actionTarget) {
            e.preventDefault();
            const action = actionTarget.dataset.action;
            switch (action) {
                case 'new-game': handleNewGame(); break;
                case 'options': openModal('options'); break;
                case 'credits': openModal('credits'); break;
                case 'auth': openModal('auth'); break;
                case 'logout': handleLogout(); break;
                case 'change-name': openModal('change-name'); break;
            }
        }
        if (formSwitcher) {
            e.preventDefault();
            const switchTo = formSwitcher.dataset.formSwitcher;
            const loginContainer = modal.content.querySelector('#loginFormContainer');
            const registerContainer = modal.content.querySelector('#registerFormContainer');
            if (switchTo === 'register') {
                loginContainer.classList.add('hidden');
                registerContainer.classList.remove('hidden');
            } else {
                loginContainer.classList.remove('hidden');
                registerContainer.classList.add('hidden');
            }
        }
        if (target.id === 'modalCloseButton' || target === modal.overlay) { closeModal(); }
    });

    modal.content.addEventListener('submit', (e) => {
        e.preventDefault();
        if (e.target.id === 'loginFormModal' || e.target.id === 'registerFormModal') {
            handleLogin(e.target);
        } else if (e.target.id === 'changeNameFormModal') {
            handleChangeName(e.target);
        }
    });

    document.addEventListener('keydown', (e) => { if (e.key === "Escape" && !modal.overlay.classList.contains('hidden')) { closeModal(); } });
    
    const checkSession = () => {
        try {
            const userString = sessionStorage.getItem('exoUser');
            if (userString) { currentUser = JSON.parse(userString); }
        } catch (error) { sessionStorage.removeItem('exoUser'); currentUser = null; }
        updateAuthUI();
    };
    checkSession();
});