import { auth, db } from './firebase-init.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    const userAuthCorner = document.getElementById('user-auth-corner');
    const modal = {
        overlay: document.getElementById('modal'),
        content: document.getElementById('modal-content')
    };

    const updateAuthUI = (user) => {
        if (user) {
            currentUser = {
                name: user.displayName || user.email.split('@')[0],
                uid: user.uid
            };
            userAuthCorner.innerHTML = `<div id="user-info"><i class='bx bxs-user-circle'></i><a href="#" data-action="change-name" title="Cambiar Nombre">${currentUser.name}</a></div><button data-action="logout"><i class='bx bx-log-out'></i> Abdicar</button>`;
        } else {
            currentUser = null;
            userAuthCorner.innerHTML = `<button data-action="auth"><i class='bx bx-user-plus'></i> Conectar</button>`;
        }
    };

    const handleRegister = async (form) => {
        const username = form.querySelector('#reg-username').value.trim();
        const email = `${username}@exo.game`; // Usamos un email falso para el sistema
        const password = form.querySelector('#reg-password').value;

        if (!username || password.length < 6) {
            alert("Nombre inválido o clave demasiado corta (mín. 6 caracteres).");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, {
                displayName: username
            });
            // onAuthStateChanged se encargará de actualizar la UI y cerrar la modal
            closeModal();
        } catch (error) {
            alert(`Error al registrar: ${error.code === 'auth/email-already-in-use' ? 'Ese nombre de presidente ya existe.' : error.message}`);
        }
    };

    const handleLogin = async (form) => {
        const username = form.querySelector('#login-username').value.trim();
        const email = `${username}@exo.game`;
        const password = form.querySelector('#login-password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged se encargará de actualizar la UI y cerrar la modal
            closeModal();
        } catch (error) {
            alert(`Error de conexión: Nombre o clave incorrectos.`);
        }
    };

    const handleLogout = () => {
        if (confirm("¿Estás seguro de que quieres desconectar? Tu progreso se guardará.")) {
            signOut(auth);
        }
    };

    onAuthStateChanged(auth, user => {
        updateAuthUI(user);
    });

    const handleNewGame = async () => {
        if (currentUser) {
            const gameDocRef = doc(db, "games", currentUser.uid);
            const docSnap = await getDoc(gameDocRef);
            if (docSnap.exists()) {
                window.location.href = 'base.html';
            } else {
                window.location.href = 'selection.html';
            }
        } else {
            alert('Debes conectarte para empezar a gobernar.');
            openModal('auth');
        }
    };

    const openModal = (type) => {
        let contentHTML = '';
        const closeButton = `<button class="modal-close" id="modalCloseButton">&times;</button>`;
        switch (type) {
            case 'auth':
                contentHTML = `${closeButton}
                    <div id="loginFormContainer">
                        <form id="loginFormModal" class="auth-form"><h1>Conexión Presidencial</h1><div class="input-box"><input type="text" id="login-username" placeholder="Nombre de Presidente" required value="DZM"><i class='bx bxs-user-circle'></i></div><div class="input-box"><input type="password" id="login-password" placeholder="Clave" required value="12345"><i class='bx bxs-key'></i></div><button type="submit" class="btn">Asumir el Mando</button><div class="form-switcher"><p>¿Sin registro? <a href="#" data-form-switcher="register">Crear nuevo Perfil</a></p></div></form>
                    </div>
                    <div id="registerFormContainer" class="hidden">
                        <form id="registerFormModal" class="auth-form"><h1>Crear Perfil</h1><div class="input-box"><input type="text" id="reg-username" placeholder="Elige tu Nombre" required><i class='bx bxs-user-circle'></i></div><div class="input-box"><input type="password" id="reg-password" placeholder="Define una Clave (mín. 6 caracteres)" required><i class='bx bxs-key'></i></div><button type="submit" class="btn">Registrar</button><div class="form-switcher"><p>¿Ya tienes un Perfil? <a href="#" data-form-switcher="login">Conectar</a></p></div></form>
                    </div>`;
                break;
            case 'change-name':
                contentHTML = `${closeButton}<h2 class="modal-title">Cambiar Nombre</h2><p class="modal-body">Esta función no está disponible en la versión actual.</p>`;
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

    const closeModal = () => {
        modal.overlay.classList.add('hidden');
    };

    document.addEventListener('click', (e) => {
        const target = e.target;
        const actionTarget = target.closest('[data-action]');
        const formSwitcher = target.closest('[data-form-switcher]');

        if (actionTarget) {
            e.preventDefault();
            const action = actionTarget.dataset.action;
            if (action === 'new-game') {
                handleNewGame();
            } else if (action === 'logout') {
                handleLogout();
            } else {
                openModal(action);
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

        if (target.id === 'modalCloseButton' || target === modal.overlay) {
            closeModal();
        }
    });

    modal.content.addEventListener('submit', (e) => {
        e.preventDefault();
        if (e.target.id === 'loginFormModal') {
            handleLogin(e.target);
        }
        if (e.target.id === 'registerFormModal') {
            handleRegister(e.target);
        }
    });
});