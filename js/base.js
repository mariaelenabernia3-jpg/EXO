import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- BLUEPRINTS ---
    const ICONS = { credits: 'bxs-coin-stack', iron: 'bxs-cube-alt', titanium: 'bxs-layer', silicio: 'bxs-chip', agua: 'bxs-droplet', biomasa: 'bxs-leaf', 'gas_helio-3': 'bxs-cloud', 'fibra_de_carbono': 'bxs-grid-alt', polímeros: 'bxs-vial', hidrógeno: 'bxs-flame', amoníaco: 'bxs-bong', 'agua_pesada': 'bxs-battery', litio: 'bxs-car-battery', sal: 'bxs-invader', algas: 'bxs-bug-alt', 'hielo_de_metano': 'bxs-cube', nitrógeno: 'bxs-wind', xenón: 'bxs-meteor', 'minerales_raros': 'bxs-component', piezas_de_chatarra: 'bxs-wrench', default: 'bxs-diamond' };
    const BLUEPRINTS = {
        buildings: {
            mine: { name: "Mina de Oro", upgrades: [ { level: 1, cost: {}, prod: 20 }, { level: 2, cost: { credits: 400 }, prod: 50 }, { level: 3, cost: { credits: 1200, iron: 20 }, prod: 120 } ] },
            storage_credits: { name: "Almacén de Créditos", upgrades: [ { level: 1, cost: { credits: 200 }, cap: 5000 }, { level: 2, cost: { credits: 1000 }, cap: 20000 }, { level: 3, cost: { credits: 3000, iron: 100 }, cap: 100000 } ] },
            storage_resources: { name: "Almacén de Recursos", upgrades: [ { level: 1, cost: { credits: 800 }, cap: 1000 }, { level: 2, cost: { credits: 2500, iron: 250 }, cap: 5000 } ] },
            workshop: { name: "Taller de Naves", upgrades: [ { level: 1, cost: { credits: 2000, iron: 150 } }, { level: 2, cost: { credits: 10000, titanium: 50 } } ] },
            marketplace: { name: "Mercado Galáctico", upgrades: [ { level: 1, cost: { credits: 1500 } } ] },
            recycler: { name: "Planta de Reciclaje", upgrades: [ { level: 1, cost: { credits: 750, iron: 25 } } ] },
            simulator: { name: "Simulador de Combate" },
            extractor: { name: "Extractor", upgrades: [ { level: 1, cost: { credits: 300 }, prod: 10 }, { level: 2, cost: { credits: 900, iron: 20 }, prod: 25 } ] }
        },
        market: { scrap_value: 15 }
    };

    let gameState = {};
    let currentUser = null;
    const DOM = {
        resourceBar: document.getElementById('resource-bar'),
        baseGrid: document.getElementById('base-grid'),
        infoPanel: document.getElementById('info-panel'),
        planetName: document.getElementById('planet-name-display'),
        gameModal: {
            overlay: document.getElementById('game-modal-overlay'),
            content: document.getElementById('game-modal-content'),
        }
    };
    
    const formatResName = (name) => name.toLowerCase().replace(/ /g, '_');
    const getIcon = (resName) => ICONS[formatResName(resName)] || 'bxs-package';
    const canAfford = (cost) => Object.keys(cost).every(res => gameState.resources[formatResName(res)] >= cost[res]);
    const spendResources = (cost) => Object.keys(cost).forEach(res => { gameState.resources[formatResName(res)] -= cost[res]; });
    const closeModal = () => { DOM.gameModal.overlay.classList.add('hidden'); DOM.gameModal.content.innerHTML = ''; };
    const saveGame = async () => { if (gameState && currentUser) { await setDoc(doc(db, 'games', currentUser.uid), gameState, { merge: true }); } };

    function renderAll() {
        renderResources();
        renderBaseGrid();
        renderInfoPanel();
    }
    
    function renderResources() {
        if (!gameState.player) return;
        let html = `<div class="resource-item" title="Presidente"><i class='bx bxs-user-circle'></i><span>${gameState.player.name}</span></div>`;
        const creditStorage = gameState.buildings.find(b => b.type === 'storage_credits');
        const creditCap = creditStorage ? BLUEPRINTS.buildings.storage_credits.upgrades[creditStorage.level - 1].cap : 1000;
        html += `<div class="resource-item" title="Créditos"><i class='bx ${getIcon('credits')}'></i><span>${Math.floor(gameState.resources.credits)} / ${creditCap}</span></div>`;
        const resourceStorage = gameState.buildings.find(b => b.type === 'storage_resources');
        const resourceCap = resourceStorage ? BLUEPRINTS.buildings.storage_resources.upgrades[resourceStorage.level - 1].cap : 500;
        let totalResources = 0;
        const otherResources = {};
        Object.keys(gameState.resources).forEach(res => {
            if (res !== 'credits' && res !== 'piezas_de_chatarra') {
                totalResources += gameState.resources[res];
                otherResources[res] = gameState.resources[res];
            }
        });
        html += `<div class="resource-item" title="Almacén de Recursos"><i class='bx bxs-box'></i><span>${Math.floor(totalResources)} / ${resourceCap}</span></div>`;
        Object.keys(otherResources).forEach(res => {
             html += `<div class="resource-item" title="${res}"><i class='bx ${getIcon(res)}'></i><span>${Math.floor(otherResources[res])}</span></div>`;
        });
        html += `<div class="resource-item" title="Piezas de Chatarra"><i class='bx ${getIcon('piezas_de_chatarra')}'></i><span>${Math.floor(gameState.resources.piezas_de_chatarra)}</span></div>`;
        DOM.resourceBar.innerHTML = html;
    }
    
    function renderBaseGrid() {
        if (!gameState.buildings) return;
        DOM.baseGrid.innerHTML = '';
        gameState.buildings.forEach(plot => {
            let content = '';
            let classes = `build-plot type-${plot.type}`;
            if (plot.type !== 'empty') {
                const blueprint = BLUEPRINTS.buildings[plot.type];
                const title = blueprint ? `${blueprint.name} Nv. ${plot.level}` : '';
                const iconMap = { mine: 'bxs-cog', storage_credits: 'bxs-bank', storage_resources: 'bxs-box', workshop: 'bxs-wrench', recycler: 'bxs-recycle' };
                const icon = plot.type === 'extractor' ? getIcon(plot.resource) : iconMap[plot.type];
                const buildingClass = `building-${plot.type}`;
                content = `<i class='bx ${icon} building-icon ${buildingClass}' title="${title}"></i>`;
            } else if (plot.resourceDeposit) {
                content = `<i class='bx ${getIcon(plot.resourceDeposit)} deposit-icon' title="Depósito de ${plot.resourceDeposit}"></i>`;
            }
            DOM.baseGrid.innerHTML += `<div class="${classes}" data-plot-id="${plot.id}">${content}</div>`;
        });
    }

    function renderInfoPanel(plotId) {
        if (!plotId) { DOM.infoPanel.innerHTML = `<h2 class="panel-title">${gameState.planetName}</h2><p class="panel-description">Selecciona un edificio o solar.</p>`; return; }
        const plot = gameState.buildings.find(p => p.id === plotId);
        const blueprintName = plot.type.startsWith('extractor') ? 'extractor' : plot.type;
        const blueprint = BLUEPRINTS.buildings[blueprintName];
        let title = plot.type === 'empty' ? (plot.resourceDeposit ? `Depósito de ${plot.resourceDeposit}` : "Solar Vacío") : blueprint.name;
        if (plot.type === 'extractor') title = `Extractor de ${plot.resource}`;
        let statsHTML = '', actionsHTML = '';
        if (plot.type === 'empty') {
            if (plot.resourceDeposit) {
                const cost = BLUEPRINTS.buildings.extractor.upgrades[0].cost;
                actionsHTML = `<button class="btn" data-action="build" data-plot-id="${plot.id}" data-building-type="extractor" ${!canAfford(cost) ? 'disabled' : ''}>Construir Extractor (${cost.credits} C)</button>`;
            } else {
                const buildOptions = ['storage_credits', 'storage_resources', 'workshop', 'recycler'];
                actionsHTML = buildOptions.map(bType => {
                    if (!gameState.buildings.some(b => b.type === bType)) {
                        const cost = BLUEPRINTS.buildings[bType].upgrades[0].cost;
                        return `<button class="btn" data-action="build" data-plot-id="${plot.id}" data-building-type="${bType}" ${!canAfford(cost) ? 'disabled' : ''}>Construir ${BLUEPRINTS.buildings[bType].name} (${Object.keys(cost).map(c=>`${cost[c]} ${c}`).join(' + ')})</button>`;
                    }
                    return '';
                }).join('');
            }
        } else {
            const currentLevelInfo = blueprint.upgrades[plot.level - 1];
            const nextLevelInfo = blueprint.upgrades[plot.level];
            statsHTML += `<li><span>Nivel:</span><strong>${plot.level}</strong></li>`;
            if (currentLevelInfo.prod) statsHTML += `<li><span>Producción:</span><strong class="production">+${currentLevelInfo.prod} / min</strong></li>`;
            if (currentLevelInfo.cap) statsHTML += `<li><span>Capacidad:</span><strong class="capacity">${currentLevelInfo.cap}</strong></li>`;
            if (plot.type === 'workshop' || plot.type === 'recycler') actionsHTML = `<button class="btn" data-action="open_station" data-station-type="${plot.type}">Abrir Interfaz</button>`;
            if (nextLevelInfo) {
                let costText = Object.keys(nextLevelInfo.cost).map(res => `${nextLevelInfo.cost[res]} ${res}`).join(' + ');
                actionsHTML += `<button class="btn" data-action="upgrade" data-plot-id="${plot.id}" ${!canAfford(nextLevelInfo.cost) ? 'disabled' : ''}>Mejorar (${costText})</button>`;
            } else if (plot.type !== 'workshop' && plot.type !== 'recycler') {
                actionsHTML += `<p style="text-align: center;">Nivel Máximo</p>`;
            }
        }
        DOM.infoPanel.innerHTML = `<h2 class="panel-title">${title}</h2><ul class="panel-stats">${statsHTML}</ul><div class="panel-actions">${actionsHTML}</div>`;
    }
    
    function upgradeBuilding(plotId) {
        const plot = gameState.buildings.find(p => p.id === plotId);
        const blueprint = BLUEPRINTS.buildings[plot.type];
        if (!blueprint.upgrades[plot.level]) return;
        const cost = blueprint.upgrades[plot.level].cost;
        if (canAfford(cost)) {
            spendResources(cost);
            plot.level++;
            saveGame();
            renderAll();
            renderInfoPanel(plotId);
        }
    }
    
    function buildBuilding(plotId, buildingType) {
        const plot = gameState.buildings.find(p => p.id === plotId);
        const cost = BLUEPRINTS.buildings[buildingType].upgrades[0].cost;
        if (canAfford(cost)) {
            spendResources(cost);
            plot.type = buildingType;
            plot.level = 1;
            if (buildingType === 'extractor') {
                plot.resource = plot.resourceDeposit;
                delete plot.resourceDeposit;
            }
            saveGame();
            renderAll();
            renderInfoPanel(plotId);
        }
    }
    
    function openGameModal(stationType) {
        if (stationType === 'simulator') {
            launchMinigame();
            return;
        }
        
        const station = gameState.buildings.find(b => b.type === stationType);
        const blueprint = BLUEPRINTS.buildings[stationType];
        let body = '', title = blueprint.name;

        if (stationType === 'recycler') {
            body = `<div class="station-section"><h3>Reciclaje de Chatarra</h3><div class="offer-item"><span>Tienes ${Math.floor(gameState.resources.piezas_de_chatarra)} piezas</span><button class="btn btn-small" data-action="sell_scrap" ${gameState.resources.piezas_de_chatarra < 1 ? 'disabled':''}>Vender Todo por ${Math.floor(gameState.resources.piezas_de_chatarra * BLUEPRINTS.market.scrap_value)} C</button></div></div>`;
        }
        
        DOM.gameModal.content.innerHTML = `<div class="game-modal-header"><h2 class="game-modal-title">${title} (Nivel ${station.level})</h2><button class="modal-close-btn" data-action="close_modal">&times;</button></div><div class="game-modal-body">${body}</div>`;
        DOM.gameModal.overlay.classList.remove('hidden');
    }
    
    const sellScrap = () => {
        const earnings = Math.floor(gameState.resources.piezas_de_chatarra * BLUEPRINTS.market.scrap_value);
        gameState.resources.credits += earnings;
        gameState.resources.piezas_de_chatarra = 0;
        saveGame();
        renderAll();
        openGameModal('recycler');
    };

    class Minigame {
        constructor(canvas, playerImg, enemyImg, onGameEndCallback) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.playerImg = playerImg;
            this.enemyImg = enemyImg;
            this.onGameEnd = onGameEndCallback;
            this.init();
            this.start();
        }

        init() {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            this.score = 0;
            this.timer = 60;
            this.gameOver = false;
            this.gameLoopId = null;
            this.fireCooldown = 0;
            this.player = { x: this.canvas.width / 2, y: this.canvas.height - 60, width: 50, height: 50, speed: 7 };
            this.projectiles = [];
            this.enemies = [];
            this.enemyProjectiles = [];
            this.scoreUI = DOM.gameModal.content.querySelector('#mg-score');
            this.timerUI = DOM.gameModal.content.querySelector('#mg-timer');
        }

        start() {
            this.enemyInterval = setInterval(() => this.spawnEnemy(), 1000);
            this.enemyShootInterval = setInterval(() => this.enemyShoot(), 1300);
            this.timerInterval = setInterval(() => {
                if(this.gameOver) return;
                this.timer--;
                this.timerUI.innerText = `Tiempo: ${this.timer}`;
                if (this.timer <= 0) this.endGame("Simulación Terminada");
            }, 1000);

            this.touchMoveHandler = (e) => {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX || e.touches[0].clientX) - rect.left;
                this.player.x = Math.max(this.player.width/2, Math.min(this.canvas.width - this.player.width/2, x));
            };
            this.canvas.addEventListener('mousemove', this.touchMoveHandler);
            this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });

            this.gameLoop();
        }

        stop() {
            this.gameOver = true;
            clearInterval(this.enemyInterval);
            clearInterval(this.enemyShootInterval);
            clearInterval(this.timerInterval);
            cancelAnimationFrame(this.gameLoopId);
            this.canvas.removeEventListener('mousemove', this.touchMoveHandler);
            this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
        }

        endGame(message) {
            if(this.gameOver) return;
            this.stop();
            const msgEl = DOM.gameModal.content.querySelector('#mg-message');
            const earnings = this.score * BLUEPRINTS.market.scrap_value;
            msgEl.innerHTML = `<h2>${message}</h2>
                <p>Recolectaste <span>${this.score} piezas</span> de chatarra.</p>
                <p>Valor total: <span>${earnings} créditos</span>.</p>
                <div class="btn-group">
                    <button data-action="sell_scrap_from_game" data-pieces="${this.score}" data-earnings="${earnings}">Vender y Salir</button>
                    <button data-action="keep_scrap_from_game" data-pieces="${this.score}">Guardar y Salir</button>
                </div>`;
            msgEl.classList.remove('hidden');
        }
        
        spawnEnemy() { if(!this.gameOver) this.enemies.push({x: Math.random() * (this.canvas.width - 40) + 20, y: -20, width: 40, height: 40, speed: Math.random() * 2 + 1}); }
        enemyShoot() { if(!this.gameOver && this.enemies.length > 0){ const randomEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)]; this.enemyProjectiles.push({x: randomEnemy.x, y: randomEnemy.y + randomEnemy.height/2}); } }

        gameLoop = () => {
            if (this.gameOver) return;
            if (this.fireCooldown > 0) this.fireCooldown--;
            if (this.fireCooldown === 0) { this.projectiles.push({x: this.player.x, y: this.player.y - this.player.height/2}); this.fireCooldown = 15; }
            this.projectiles.forEach((p, pi) => { p.y -= 8; if(p.y < 0) this.projectiles.splice(pi, 1); });
            this.enemyProjectiles.forEach((p, pi) => { p.y += 6; if(p.y > this.canvas.height) this.enemyProjectiles.splice(pi, 1); });
            this.enemies.forEach((e, ei) => { e.y += e.speed; if(e.y > this.canvas.height) this.enemies.splice(ei, 1); });

            for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
                const p = this.projectiles[pi];
                for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
                    const e = this.enemies[ei];
                    if(p.x > e.x - e.width/2 && p.x < e.x + e.width/2 && p.y > e.y - e.height/2 && p.y < e.y + e.height/2) {
                        this.projectiles.splice(pi, 1); this.enemies.splice(ei, 1); this.score++; this.scoreUI.innerText = `Piezas: ${this.score}`; break; 
                    }
                }
            }
            
            this.enemies.forEach((e) => { if (e.x - e.width/2 < this.player.x + this.player.width/2 && e.x + e.width/2 > this.player.x - this.player.width/2 && e.y + e.height/2 > this.player.y - this.player.height/2 && e.y - e.height/2 < this.player.y + this.player.height/2) { this.endGame("¡Colisión Directa!"); } });
            this.enemyProjectiles.forEach((p) => { if (p.x > this.player.x - this.player.width/2 && p.x < this.player.x + this.player.width/2 && p.y > this.player.y - this.player.height/2 && p.y < this.player.y + this.player.height/2) { this.endGame("¡Nave Destruida!"); } });
            
            this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.playerImg, this.player.x - this.player.width/2, this.player.y - this.player.height/2, this.player.width, this.player.height);
            this.projectiles.forEach(p => { this.ctx.fillStyle = '#00BFFF'; this.ctx.fillRect(p.x-2, p.y, 4, 10); });
            this.enemyProjectiles.forEach(p => { this.ctx.fillStyle = '#ff4d4d'; this.ctx.fillRect(p.x-1, p.y, 2, 8); });
            this.enemies.forEach(e => this.ctx.drawImage(this.enemyImg, e.x-e.width/2, e.y-e.height/2, e.width, e.height));
            this.gameLoopId = requestAnimationFrame(this.gameLoop);
        }
    }
    
    function launchMinigame() {
        DOM.gameModal.content.innerHTML = `<div class="game-modal-header"><h2 class="game-modal-title">Simulador de Combate</h2><button class="modal-close-btn" data-action="close_modal">&times;</button></div><div class="game-modal-body"><canvas id="minigame-canvas"></canvas><div class="minigame-ui"><span id="mg-score">Piezas: 0</span><span id="mg-timer">Tiempo: 60</span></div><div id="mg-message" class="minigame-message hidden"></div></div>`;
        DOM.gameModal.overlay.classList.remove('hidden');
        
        setTimeout(() => {
            const canvas = document.getElementById('minigame-canvas');
            if (!canvas) return;
            const playerImg = new Image();
            const enemyImg = new Image();
            let loadedImages = 0;
            const startGame = () => { new Minigame(canvas, playerImg, enemyImg); };
            playerImg.onload = () => { loadedImages++; if(loadedImages === 2) startGame(); };
            enemyImg.onload = () => { loadedImages++; if(loadedImages === 2) startGame(); };
            playerImg.src = '../assets/images/nave.png';
            enemyImg.src = '../assets/images/Enemy.png';
        }, 50);
    }
    
    const init = async () => {
        let player, savedData;
        try {
            const userString = localStorage.getItem('exoUser');
            if (!userString) { window.location.href = 'menu.html'; return; }
            player = JSON.parse(userString);
            const saveDataString = localStorage.getItem('exoSaveData_' + player.name);
            savedData = saveDataString ? JSON.parse(saveDataString) : null;
        } catch (e) { window.location.href = 'menu.html'; return; }

        if (savedData && savedData.chosenPlanet) {
            gameState = savedData;
        } else {
            // Si no hay partida guardada, se crea una nueva (simplificado)
            const chosenPlanetString = sessionStorage.getItem('exoChosenPlanet');
            if(!chosenPlanetString){
                alert("Error: No se encontró partida. Por favor, selecciona un planeta.");
                window.location.href = 'selection.html';
                return;
            }
            const chosenPlanet = JSON.parse(chosenPlanetString);
            gameState = {
                player,
                planetName: chosenPlanet.name,
                resources: { credits: 500, piezas_de_chatarra: 0 },
                buildings: [ { id: 1, type: "mine", level: 1 } ],
                fleet: {},
                game_speed: 1000,
            };
            let buildingIdCounter = 2;
            [...chosenPlanet.resources, ...(chosenPlanet.unique_resources || [])].forEach(res => { gameState.resources[formatResName(res)] = 0; });
            chosenPlanet.resources.forEach(res => {
                gameState.buildings.push({ id: buildingIdCounter++, type: 'empty', resourceDeposit: formatResName(res) });
            });
            while(gameState.buildings.length < 9) {
                gameState.buildings.push({id: buildingIdCounter++, type: 'empty'});
            }
        }
        
        DOM.planetName.textContent = gameState.planetName;
        renderAll();
        
        setInterval(() => {
            if (!gameState.buildings) return;
            gameState.buildings.forEach(plot => {
                const blueprintName = plot.type.startsWith('extractor') ? 'extractor' : plot.type;
                const blueprint = BLUEPRINTS.buildings[blueprintName];
                if (!blueprint || !blueprint.upgrades || !blueprint.upgrades[plot.level - 1]) return;
                const levelInfo = blueprint.upgrades[plot.level - 1];
                if (plot.type === 'mine') {
                    const storage = gameState.buildings.find(b => b.type === 'storage_credits');
                    const capacity = storage ? BLUEPRINTS.buildings.storage_credits.upgrades[storage.level - 1].cap : 1000;
                    if (gameState.resources.credits < capacity) gameState.resources.credits = Math.min(capacity, gameState.resources.credits + levelInfo.prod / 60);
                } else if (plot.type === 'extractor') {
                    const storage = gameState.buildings.find(b => b.type === 'storage_resources');
                    const capacity = storage ? BLUEPRINTS.buildings.storage_resources.upgrades[storage.level - 1].cap : 500;
                    let totalResources = 0; Object.keys(gameState.resources).forEach(r => {if(r !== 'credits' && r !== 'piezas_de_chatarra') totalResources += gameState.resources[r];});
                    if (totalResources < capacity) gameState.resources[plot.resource] += levelInfo.prod / 60;
                }
            });
            renderResources();
        }, gameState.game_speed);

        setInterval(saveGame, 5000);

        document.body.addEventListener('click', e => {
            const target = e.target;
            const actionButton = target.closest('button[data-action]');
            const plotElement = target.closest('.build-plot');
            if (plotElement && !actionButton) renderInfoPanel(parseInt(plotElement.dataset.plotId));
            if (actionButton) {
                e.preventDefault();
                const action = actionButton.dataset.action;
                if (action === 'upgrade') upgradeBuilding(parseInt(actionButton.dataset.plotId));
                if (action === 'build') buildBuilding(parseInt(actionButton.dataset.plotId), actionButton.dataset.buildingType);
                if (action === 'open_station') openGameModal(actionButton.dataset.stationType);
                if (action === 'close_modal' || action === 'close_modal_from_game') closeModal();
                if (action === 'sell_scrap_from_game') { const pieces = parseInt(actionButton.dataset.pieces); const earnings = parseInt(actionButton.dataset.earnings); gameState.resources.credits += earnings; saveGame(); renderAll(); closeModal(); }
                if (action === 'keep_scrap_from_game') { const pieces = parseInt(actionButton.dataset.pieces); gameState.resources.piezas_de_chatarra += pieces; saveGame(); renderAll(); closeModal(); }
            }
        });
    };
    
    init();
});