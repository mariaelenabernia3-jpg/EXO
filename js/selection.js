document.addEventListener('DOMContentLoaded', () => {
    const PLANET_DATA = {
        xylos: { id: "xylos", name: "Xylos", resources: ["Biomasa", "Agua", "Sal"] },
        krypton_prime: { id: "krypton_prime", name: "Krypton Prime", resources: ["Biomasa", "Hierro", "Hierro"] },
        helion_iv: { id: "helion_iv", name: "Helion IV", resources: ["Hierro", "Titanio", "Titanio"] },
        aquea: { id: "aquea", name: "Aquea", resources: ["Agua", "Sal", "Titanio"] },
        cygnus_x1: { id: "cygnus_x1", name: "Cygnus X-1", resources: ["Nitrógeno", "Nitrógeno", "Nitrógeno"] },
    };

    const planetGrid = document.getElementById('planet-selection-grid');
    const modal = { overlay: document.getElementById('info-modal'), content: document.getElementById('info-modal').querySelector('.modal-content') };

    if (!localStorage.getItem('exoUser')) {
        alert("Error de sesión. Debes conectarte primero.");
        window.location.href = 'menu.html';
        return;
    }

    Object.values(PLANET_DATA).forEach(planet => {
        planetGrid.innerHTML += `
            <div class="planet-card" data-planet-id="${planet.id}">
                <button class="card-info-btn" title="Ver Información"><i class='bx bx-info-circle'></i></button>
                <i class='bx bxs-planet card-icon'></i>
                <h2 class="card-title">${planet.name}</h2>
                <button class="card-button">Establecer Colonia</button>
            </div>`;
    });

    const openModal = (htmlContent) => { modal.content.innerHTML = htmlContent; modal.overlay.classList.remove('hidden'); };
    const closeModal = () => { modal.overlay.classList.add('hidden'); };

    planetGrid.addEventListener('click', (e) => {
        const target = e.target;
        const card = target.closest('.planet-card');
        if (!card) return;
        const planetId = card.dataset.planetId;
        const planetInfo = PLANET_DATA[planetId];
        if (target.closest('.card-button')) {
            const user = JSON.parse(localStorage.getItem('exoUser'));
            const saveData = {
                chosenPlanet: planetInfo
            };
            localStorage.setItem('exoSaveData_' + user.name, JSON.stringify(saveData));
            window.location.href = 'base.html';
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
    document.addEventListener('keydown', (e) => { if (e.key === "Escape" && !modal.overlay.classList.contains('hidden')) { closeModal(); } });
});