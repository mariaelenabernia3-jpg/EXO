import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, setDoc, collection, onSnapshot, runTransaction } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- BASE DE DATOS DE PLANETAS ---
    const PLANET_DATA = {
        xylos: { id: "xylos", name: "Xylos", resources: ["Biomasa", "Agua", "Sal"] },
        krypton_prime: { id: "krypton_prime", name: "Krypton Prime", resources: ["Biomasa", "Hierro", "Hierro"] },
        helion_iv: { id: "helion_iv", name: "Helion IV", resources: ["Hierro", "Titanio", "Titanio"] },
        aquea: { id: "aquea", name: "Aquea", resources: ["Agua", "Sal", "Titanio"] },
        cygnus_x1: { id: "cygnus_x1", name: "Cygnus X-1", resources: ["Nitrógeno", "Nitrógeno", "Nitrógeno"] },
    };

    const planetGrid = document.getElementById('planet-selection-grid');
    const modal = {
        overlay: document.getElementById('info-modal'),
        content: document.getElementById('info-modal').querySelector('.modal-content')
    };
    let currentUser = null;

    onAuthStateChanged(auth, user => {
        if (!user) {
            alert("Error de sesión. Debes conectarte primero.");
            window.location.href = 'menu.html';
            return;
        }
        currentUser = user;

        // Escucha en tiempo real los cambios en la colección de planetas
        const planetsRef = collection(db, "planets");
        onSnapshot(planetsRef, (snapshot) => {
            planetGrid.innerHTML = ''; // Limpia la grilla para redibujar
            const planetsStatus = {};
            snapshot.forEach(doc => {
                planetsStatus[doc.id] = doc.data();
            });
            
            Object.values(PLANET_DATA).forEach(planet => {
                const status = planetsStatus[planet.id];
                const isTaken = status ? status.isTaken : false;
                planetGrid.innerHTML += `
                    <div class="planet-card ${isTaken ? 'taken' : ''}" data-planet-id="${planet.id}">
                        ${isTaken ? `<div class="taken-overlay">OCUPADO</div>` : ''}
                        <button class="card-info-btn" title="Ver Información"><i class='bx bx-info-circle'></i></button>
                        <i class='bx bxs-planet card-icon'></i>
                        <h2 class="card-title">${planet.name}</h2>
                        <button class="card-button" ${isTaken ? 'disabled' : ''}>Establecer Colonia</button>
                    </div>`;
            });
        });
    });
    
    const openModal = (htmlContent) => {
        modal.content.innerHTML = htmlContent;
        modal.overlay.classList.remove('hidden');
    };
    const closeModal = () => {
        modal.overlay.classList.add('hidden');
    };

    planetGrid.addEventListener('click', async (e) => {
        const target = e.target;
        const card = target.closest('.planet-card');
        if (!card || !currentUser) return;

        const planetId = card.dataset.planetId;
        const planetInfo = PLANET_DATA[planetId];

        if (target.closest('.card-button') && !card.classList.contains('taken')) {
            const planetDocRef = doc(db, "planets", planetId);
            try {
                // USA UNA TRANSACCIÓN PARA EVITAR QUE DOS JUGADORES TOMEN EL PLANETA A LA VEZ
                await runTransaction(db, async (transaction) => {
                    const planetDoc = await transaction.get(planetDocRef);
                    if (!planetDoc.exists() || planetDoc.data().isTaken) {
                        throw "¡Este planeta acaba de ser tomado por otro presidente!";
                    }
                    
                    // Si el planeta está libre, lo tomamos y creamos la partida
                    transaction.update(planetDocRef, { isTaken: true, ownerId: currentUser.uid });
                    
                    const gameDocRef = doc(db, 'games', currentUser.uid);
                    const newGameData = createNewGame(currentUser, planetInfo);
                    transaction.set(gameDocRef, newGameData);
                });
                
                // Si la transacción fue exitosa, redirigir
                window.location.href = 'base.html';

            } catch (error) {
                alert(error);
                console.error("Error en la transacción: ", error);
            }
        }
        
        if (target.closest('.card-info-btn')) {
            const resourceCounts = planetInfo.resources.reduce((acc, res) => {
                acc[res] = (acc[res] || 0) + 1;
                return acc;
            }, {});

            let resourcesHTML = Object.entries(resourceCounts).map(([res, count]) => `<li><i class='bx bx-chip'></i>${res}${count > 1 ? ` (x${count})` : ''}</li>`).join('');
            
            const modalHTML = `
                <button class="modal-close" id="modalCloseButton">&times;</button>
                <h2 class="modal-title">${planetInfo.name}</h2>
                <div class="resource-list">
                    <h3>Recursos Disponibles</h3>
                    <ul>${resourcesHTML}</ul>
                </div>`;
            openModal(modalHTML);
        }
    });

    document.addEventListener('click', (e) => { if (e.target.id === 'modalCloseButton' || e.target === modal.overlay) { closeModal(); } });
    
    const createNewGame = (player, chosenPlanet) => {
        const formatResName = (name) => name.toLowerCase().replace(/ /g, '_');
        
        const gameState = {
            player: { name: player.displayName, uid: player.uid },
            planetName: chosenPlanet.name,
            resources: { credits: 500, piezas_de_chatarra: 0 },
            buildings: [ { id: 1, type: "mine", level: 1 } ],
            fleet: {},
            game_speed: 1000,
        };

        let buildingIdCounter = 2;
        
        chosenPlanet.resources.forEach(res => {
            gameState.resources[formatResName(res)] = 0;
        });
        
        chosenPlanet.resources.forEach(res => {
            gameState.buildings.push({ id: buildingIdCounter++, type: 'empty', resourceDeposit: formatResName(res) });
        });
        
        while(gameState.buildings.length < 9) {
            gameState.buildings.push({id: buildingIdCounter++, type: 'empty'});
        }
        return gameState;
    };
});