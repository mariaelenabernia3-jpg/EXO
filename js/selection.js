document.addEventListener('DOMContentLoaded', () => {
    const PLANET_DATA = {
        xylos: { id: "xylos", name: "Xylos", normal_resources: ["Biomasa", "Fibra de Carbono", "Polímeros", "Agua"], unique_resources: ["Espora Psiónica", "Cristal de Vida"] },
        krypton_prime: { id: "krypton_prime", name: "Krypton Prime", normal_resources: ["Gas Helio-3", "Partículas de Plasma", "Hidrógeno", "Amoníaco"], unique_resources: ["Cristal de Kyber", "Fragmento Estelar"] },
        helion_iv: { id: "helion_iv", name: "Helion IV", normal_resources: ["Hierro", "Titanio", "Cobre", "Silicio"], unique_resources: ["Isótopo Solar", "Magma Solidificado"] },
        aquea: { id: "aquea", name: "Aquea", normal_resources: ["Agua Pesada", "Litio", "Sal", "Algas"], unique_resources: ["Perla Abisal", "Corazón de Coral"] },
        cygnus_x1: { id: "cygnus_x1", name: "Cygnus X-1", normal_resources: ["Hielo de Metano", "Nitrógeno", "Xenón", "Minerales Raros"], unique_resources: ["Fragmento de Vacío", "Materia Oscura"] },
    };

    const planetGrid = document.getElementById('planet-selection-grid');
    const modal = { overlay: document.getElementById('info-modal'), content: document.getElementById('info-modal').querySelector('.modal-content') };

    if (!sessionStorage.getItem('exoUser')) {
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

    const openModal = (htmlContent) => {
        modal.content.innerHTML = htmlContent;
        modal.overlay.classList.remove('hidden');
    };
    const closeModal = () => {
        modal.overlay.classList.add('hidden');
    };

    planetGrid.addEventListener('click', (e) => {
        const target = e.target;
        const card = target.closest('.planet-card');
        if (!card) return;
        const planetId = card.dataset.planetId;
        const planetInfo = PLANET_DATA[planetId];
        if (target.closest('.card-button')) {
            sessionStorage.setItem('exoChosenPlanet', JSON.stringify(planetInfo));
            window.location.href = 'base.html';
        }
        if (target.closest('.card-info-btn')) {
            let normalResourcesHTML = planetInfo.normal_resources.map(res => `<li><i class='bx bx-chip'></i>${res}</li>`).join('');
            let uniqueResourcesHTML = planetInfo.unique_resources.map(res => `<li class="resource-unique"><i class='bx bxs-diamond'></i><strong>${res}</strong></li>`).join('');
            const modalHTML = `
                <button class="modal-close" id="modalCloseButton">&times;</button>
                <h2 class="modal-title">${planetInfo.name}</h2>
                <div class="resource-list">
                    <h3>Recursos Normales</h3>
                    <ul>${normalResourcesHTML}</ul>
                    <h3>Recursos Únicos</h3>
                    <ul>${uniqueResourcesHTML}</ul>
                </div>`;
            openModal(modalHTML);
        }
    });

    document.addEventListener('click', (e) => { if (e.target.id === 'modalCloseButton' || e.target === modal.overlay) { closeModal(); } });
    document.addEventListener('keydown', (e) => { if (e.key === "Escape" && !modal.overlay.classList.contains('hidden')) { closeModal(); } });
});