/**
 * app.js
 * Le chef d'orchestre : gère l'état global, les interactions (clic, drag, zoom),
 * LE MODE JEU (Rack Dynamique, Magnétisme intelligent) et le SYSTÈME UNDO/REDO.
 */

window.mode = 'domino'; 
window.pieces = []; 
window.selectedIndex = null;      
window.selectedZoneIndex = null;  
window.editingPieceId = null; 
window.editingZoneIndex = null;
window.panX = 0; window.panY = 0; window.scale = 1;

window.isTextMoveMode = false;
let isDraggingText = false, dragTextPieceId = null, dragTextZoneIdx = null, startTextOffsetX = 0, startTextOffsetY = 0;

window.isGameMode = false;
let isDraggingSinglePiece = false;
let draggedSinglePieceId = null;

window.isBrushMode = false;
let isBrushing = false;
let brushPath = [];

let isPanning = false, isDraggingPiece = false, hasMoved = false; 
let startX = 0, startY = 0, startPanX = 0, startPanY = 0;

let viewport, canvasContent, editor;

// ==========================================
// 🛠️ FONCTIONS UTILITAIRES DE BASE
// ==========================================

function getFreshStyle() { 
    return { 
        bg: typeof globalBg !== 'undefined' ? globalBg : '#dfe6e9', 
        border: typeof globalBorderColor !== 'undefined' ? globalBorderColor : '#b2bec3', 
        width: typeof globalBorderWidth !== 'undefined' ? globalBorderWidth : 4, 
        fontSizes: [globalFontSize, globalFontSize, globalFontSize, globalFontSize], 
        fontFamilies: [globalFontFamily, globalFontFamily, globalFontFamily, globalFontFamily], 
        svgScales: [globalSvgScale, globalSvgScale, globalSvgScale, globalSvgScale], 
        textColors: [globalTextColor, globalTextColor, globalTextColor, globalTextColor], 
        margin: typeof globalMargin !== 'undefined' ? globalMargin : 15, 
        offsetX: [0, 0, 0, 0], 
        offsetY: [0, 0, 0, 0] 
    }; 
}

function getOccupiedSet() { 
    let occ = new Set(); 
    window.pieces.forEach(p => { 
        if(p.type === 'domino') { 
            let rx = Math.round(p.x), ry = Math.round(p.y); 
            occ.add(`${rx},${ry}`); 
            if(p.dir === 'hr') occ.add(`${rx+1},${ry}`); 
            if(p.dir === 'hl') occ.add(`${rx-1},${ry}`); 
            if(p.dir === 'vd') occ.add(`${rx},${ry+1}`); 
            if(p.dir === 'vu') occ.add(`${rx},${ry-1}`); 
        } else if (p.type === 'triomino') { 
            occ.add(`${Math.round(p.q)},${Math.round(p.r)}`); 
        } else if (p.type === 'square') { 
            occ.add(`${Math.round(p.x)},${Math.round(p.y)}`); 
        }
    }); 
    return occ; 
}


// ==========================================
// 🖼️ LA BANQUE D'IMAGES (100% HORS-LIGNE - PACK INTÉGRAL)
// ==========================================
const SVG_BANK = {
    // 🐾 ANIMAUX
    chat: `<svg viewBox="0 0 100 100"><polygon points="20,20 40,40 20,50" fill="#e67e22"/><polygon points="80,20 60,40 80,50" fill="#e67e22"/><circle cx="50" cy="60" r="35" fill="#e67e22"/><circle cx="35" cy="55" r="5" fill="#fff"/><circle cx="65" cy="55" r="5" fill="#fff"/><path d="M 45 70 Q 50 75 55 70" stroke="#000" stroke-width="3" fill="none"/></svg>`,
    chien: `<svg viewBox="0 0 100 100"><path d="M30 40 Q50 20 70 40 L80 60 Q80 80 50 80 Q20 80 20 60 Z" fill="#d35400"/><circle cx="40" cy="50" r="5" fill="#fff"/><circle cx="60" cy="50" r="5" fill="#fff"/><circle cx="50" cy="65" r="8" fill="#2d3436"/></svg>`,
    souris: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="60" rx="30" ry="20" fill="#95a5a6"/><circle cx="30" cy="40" r="12" fill="#7f8c8d"/><circle cx="55" cy="40" r="12" fill="#7f8c8d"/><path d="M 80 60 Q 95 60 90 40" fill="none" stroke="#2d3436" stroke-width="3"/><circle cx="25" cy="62" r="4" fill="#2d3436"/></svg>`,
    grenouille: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="60" rx="40" ry="25" fill="#2ecc71"/><circle cx="35" cy="35" r="14" fill="#2ecc71"/><circle cx="65" cy="35" r="14" fill="#2ecc71"/><circle cx="35" cy="35" r="6" fill="#fff"/><circle cx="65" cy="35" r="6" fill="#fff"/><circle cx="35" cy="35" r="3" fill="#000"/><circle cx="65" cy="35" r="3" fill="#000"/><path d="M 35 65 Q 50 75 65 65" fill="none" stroke="#27ae60" stroke-width="4" stroke-linecap="round"/></svg>`,
    cochon: `<svg viewBox="0 0 100 100"><circle cx="50" cy="55" r="35" fill="#ff9ff3"/><polygon points="25,30 35,10 45,30" fill="#f368e0"/><polygon points="75,30 65,10 55,30" fill="#f368e0"/><ellipse cx="50" cy="60" rx="15" ry="10" fill="#f368e0"/><circle cx="45" cy="60" r="3" fill="#ff9ff3"/><circle cx="55" cy="60" r="3" fill="#ff9ff3"/><circle cx="35" cy="45" r="5" fill="#2d3436"/><circle cx="65" cy="45" r="5" fill="#2d3436"/></svg>`,
    oiseau: `<svg viewBox="0 0 100 100"><path d="M20 50 Q50 20 80 50 Q50 80 20 50" fill="#3498db"/><circle cx="70" cy="45" r="4" fill="#fff"/><polygon points="80,50 95,45 80,55" fill="#f1c40f"/></svg>`,
    poisson: `<svg viewBox="0 0 100 100"><path d="M20 50 Q50 20 80 50 Q50 80 20 50" fill="#e67e22"/><polygon points="20,50 5,35 5,65" fill="#e67e22"/><circle cx="65" cy="45" r="4" fill="#fff"/></svg>`,
    papillon: `<svg viewBox="0 0 100 100"><ellipse cx="40" cy="40" rx="15" ry="20" fill="#a29bfe" transform="rotate(-45 40 40)"/><ellipse cx="60" cy="40" rx="15" ry="20" fill="#a29bfe" transform="rotate(45 60 40)"/><ellipse cx="40" cy="60" rx="15" ry="15" fill="#74b9ff" transform="rotate(45 40 60)"/><ellipse cx="60" cy="60" rx="15" ry="15" fill="#74b9ff" transform="rotate(-45 60 60)"/><rect x="47" y="30" width="6" height="40" rx="3" fill="#2d3436"/><path d="M 50 30 Q 40 10 35 20 M 50 30 Q 60 10 65 20" stroke="#2d3436" stroke-width="2" fill="none"/></svg>`,

    // 🌤️ MÉTÉO & NATURE
    soleil: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="22" fill="#f1c40f"/><path d="M50 10 L50 20 M50 90 L50 80 M10 50 L20 50 M90 50 L80 50 M22 22 L29 29 M78 78 L71 71 M22 78 L29 71 M78 22 L71 29" stroke="#f39c12" stroke-width="6" stroke-linecap="round"/></svg>`,
    lune: `<svg viewBox="0 0 100 100"><path d="M60 20 A30 30 0 1 0 80 80 A40 40 0 1 1 60 20" fill="#f1c40f"/></svg>`,
    nuage: `<svg viewBox="0 0 100 100"><path d="M 30 65 A 15 15 0 0 1 30 35 A 20 20 0 0 1 70 35 A 15 15 0 0 1 70 65 Z" fill="#c8d6e5"/></svg>`,
    pluie: `<svg viewBox="0 0 100 100"><path d="M 30 50 A 15 15 0 0 1 30 20 A 20 20 0 0 1 70 20 A 15 15 0 0 1 70 50 Z" fill="#7f8c8d"/><line x1="40" y1="60" x2="35" y2="80" stroke="#3498db" stroke-width="4" stroke-linecap="round"/><line x1="60" y1="60" x2="55" y2="80" stroke="#3498db" stroke-width="4" stroke-linecap="round"/></svg>`,
    eclair: `<svg viewBox="0 0 100 100"><polygon points="60,10 30,55 50,55 40,90 70,45 50,45" fill="#f1c40f"/></svg>`,
    flocon: `<svg viewBox="0 0 100 100"><g stroke="#74b9ff" stroke-width="6" stroke-linecap="round"><line x1="50" y1="15" x2="50" y2="85"/><line x1="20" y1="32" x2="80" y2="68"/><line x1="20" y1="68" x2="80" y2="32"/><circle cx="50" cy="50" r="12" fill="#74b9ff"/></g></svg>`,
    feuille: `<svg viewBox="0 0 100 100"><path d="M50 90 C 20 90, 10 50, 50 10 C 90 50, 80 90, 50 90 Z" fill="#2ecc71"/><line x1="50" y1="15" x2="50" y2="90" stroke="#27ae60" stroke-width="3"/><line x1="50" y1="50" x2="35" y2="40" stroke="#27ae60" stroke-width="3"/><line x1="50" y1="70" x2="65" y2="60" stroke="#27ae60" stroke-width="3"/></svg>`,
    arbre: `<svg viewBox="0 0 100 100"><rect x="42" y="60" width="16" height="30" fill="#e67e22"/><circle cx="50" cy="40" r="30" fill="#2ecc71"/><circle cx="35" cy="30" r="15" fill="#27ae60"/><circle cx="65" cy="50" r="15" fill="#27ae60"/></svg>`,
    fleur: `<svg viewBox="0 0 100 100"><line x1="50" y1="50" x2="50" y2="90" stroke="#27ae60" stroke-width="6"/><circle cx="50" cy="50" r="12" fill="#f1c40f"/><circle cx="50" cy="30" r="12" fill="#ff9ff3"/><circle cx="50" cy="70" r="12" fill="#ff9ff3"/><circle cx="70" cy="50" r="12" fill="#ff9ff3"/><circle cx="30" cy="50" r="12" fill="#ff9ff3"/></svg>`,
    etoile: `<svg viewBox="0 0 100 100"><polygon points="50,10 61,39 92,39 67,57 76,86 50,68 24,86 33,57 8,39 39,39" fill="#f1c40f"/></svg>`,

    // 🍎 NOURRITURE
    pomme: `<svg viewBox="0 0 100 100"><circle cx="40" cy="60" r="25" fill="#e74c3c"/><circle cx="60" cy="60" r="25" fill="#e74c3c"/><path d="M50 45 Q50 85 50 85" stroke="#c0392b" stroke-width="4"/><path d="M50 40 Q65 15 75 25 Q65 35 50 40 Z" fill="#27ae60"/></svg>`,
    banane: `<svg viewBox="0 0 100 100"><path d="M20 20 Q40 80 80 80 Q60 40 20 20" fill="#f1c40f" stroke="#e67e22" stroke-width="2"/></svg>`,
    carotte: `<svg viewBox="0 0 100 100"><polygon points="35,35 65,35 50,90" fill="#e67e22"/><path d="M40 35 Q30 15 50 25 Q70 15 60 35 Z" fill="#2ecc71"/><line x1="45" y1="50" x2="55" y2="50" stroke="#d35400" stroke-width="3"/><line x1="48" y1="65" x2="58" y2="65" stroke="#d35400" stroke-width="3"/></svg>`,
    lait: `<svg viewBox="0 0 100 100"><rect x="30" y="30" width="40" height="60" rx="5" fill="#ecf0f1"/><polygon points="30,30 70,30 60,10 40,10" fill="#3498db"/><rect x="45" y="5" width="10" height="5" fill="#e74c3c"/><path d="M35 50 Q50 60 65 50" fill="none" stroke="#3498db" stroke-width="4"/></svg>`,
    glace: `<svg viewBox="0 0 100 100"><polygon points="30,50 70,50 50,90" fill="#e67e22"/><circle cx="50" cy="40" r="20" fill="#ff9ff3"/><circle cx="50" cy="20" r="8" fill="#e74c3c"/></svg>`,
    bonbon: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="#e74c3c"/><polygon points="32,50 15,35 15,65" fill="#e74c3c"/><polygon points="68,50 85,35 85,65" fill="#e74c3c"/></svg>`,

    // 🚗 VÉHICULES & BÂTIMENTS
    voiture: `<svg viewBox="0 0 100 100"><path d="M 20 60 L 20 40 L 40 30 L 70 30 L 80 40 L 80 60 Z" fill="#3498db"/><circle cx="35" cy="60" r="12" fill="#2d3436"/><circle cx="65" cy="60" r="12" fill="#2d3436"/></svg>`,
    velo: `<svg viewBox="0 0 100 100"><circle cx="25" cy="70" r="15" stroke="#2d3436" stroke-width="4" fill="none"/><circle cx="75" cy="70" r="15" stroke="#2d3436" stroke-width="4" fill="none"/><polyline points="25,70 40,40 75,70" stroke="#e74c3c" stroke-width="4" fill="none"/><line x1="40" y1="40" x2="35" y2="30" stroke="#2d3436" stroke-width="4"/><line x1="75" y1="70" x2="65" y2="35" stroke="#e74c3c" stroke-width="4"/><line x1="60" y1="35" x2="75" y2="35" stroke="#2d3436" stroke-width="4"/></svg>`,
    bateau: `<svg viewBox="0 0 100 100"><polygon points="20,60 80,60 70,80 30,80" fill="#e67e22"/><polygon points="50,15 50,55 80,55" fill="#ecf0f1"/><line x1="50" y1="10" x2="50" y2="60" stroke="#8e44ad" stroke-width="4"/></svg>`,
    avion: `<svg viewBox="0 0 100 100"><polygon points="10,50 90,20 60,90 50,60" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="4" stroke-linejoin="round"/><polygon points="10,50 50,60 40,80" fill="#bdc3c7" stroke="#95a5a6" stroke-width="2" stroke-linejoin="round"/></svg>`,
    fusee: `<svg viewBox="0 0 100 100"><path d="M50 10 Q70 30 70 60 L30 60 Q30 30 50 10 Z" fill="#ecf0f1"/><polygon points="30,60 15,80 35,70" fill="#e74c3c"/><polygon points="70,60 85,80 65,70" fill="#e74c3c"/><circle cx="50" cy="40" r="10" fill="#3498db" stroke="#2d3436" stroke-width="4"/><polygon points="40,60 60,60 50,85" fill="#f1c40f"/></svg>`,
    maison: `<svg viewBox="0 0 100 100"><polygon points="50,15 90,55 10,55" fill="#e74c3c"/><rect x="20" y="55" width="60" height="35" fill="#ecf0f1"/><rect x="40" y="60" width="20" height="30" fill="#95a5a6"/></svg>`,

    // 🎒 ÉCOLE & OBJETS
    livre: `<svg viewBox="0 0 100 100"><path d="M 50 80 L 15 90 L 15 30 L 50 20 Z" fill="#3498db"/><path d="M 50 80 L 85 90 L 85 30 L 50 20 Z" fill="#2980b9"/><path d="M 50 80 L 15 90 L 15 85 L 50 75 Z" fill="#ecf0f1"/><path d="M 50 80 L 85 90 L 85 85 L 50 75 Z" fill="#bdc3c7"/></svg>`,
    cartable: `<svg viewBox="0 0 100 100"><rect x="20" y="35" width="60" height="50" rx="5" fill="#3498db"/><path d="M20 45 Q50 20 80 45 Z" fill="#2980b9"/><rect x="35" y="45" width="30" height="10" rx="3" fill="#f1c40f"/><path d="M40 35 L40 20 Q50 10 60 20 L60 35" fill="none" stroke="#2980b9" stroke-width="6" stroke-linecap="round"/></svg>`,
    ciseaux: `<svg viewBox="0 0 100 100"><circle cx="30" cy="75" r="15" stroke="#e74c3c" stroke-width="8" fill="none"/><circle cx="70" cy="75" r="15" stroke="#e74c3c" stroke-width="8" fill="none"/><line x1="35" y1="60" x2="80" y2="10" stroke="#bdc3c7" stroke-width="8" stroke-linecap="round"/><line x1="65" y1="60" x2="20" y2="10" stroke="#bdc3c7" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="43" r="4" fill="#7f8c8d"/></svg>`,
    crayon: `<svg viewBox="0 0 100 100"><polygon points="20,80 15,95 30,90" fill="#2d3436"/><polygon points="20,80 30,90 85,35 75,25" fill="#f1c40f"/><polygon points="85,35 75,25 90,10 100,20" fill="#e74c3c"/></svg>`,
    palette: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="40" ry="30" fill="#e67e22"/><circle cx="70" cy="50" r="8" fill="#fff"/><circle cx="30" cy="40" r="6" fill="#e74c3c"/><circle cx="50" cy="30" r="6" fill="#f1c40f"/><circle cx="30" cy="60" r="6" fill="#3498db"/><circle cx="50" cy="70" r="6" fill="#2ecc71"/></svg>`,
    ampoule: `<svg viewBox="0 0 100 100"><path d="M35 40 A20 20 0 1 1 65 40 Q65 60 55 70 L45 70 Q35 60 35 40 Z" fill="#f1c40f"/><rect x="42" y="72" width="16" height="10" rx="2" fill="#95a5a6"/><path d="M45 85 L55 85" stroke="#7f8c8d" stroke-width="4" stroke-linecap="round"/></svg>`,
    cadeau: `<svg viewBox="0 0 100 100"><rect x="20" y="40" width="60" height="50" fill="#9b59b6"/><rect x="15" y="30" width="70" height="15" fill="#8e44ad"/><rect x="45" y="30" width="10" height="60" fill="#f1c40f"/><path d="M50 30 Q30 10 40 30" fill="none" stroke="#f1c40f" stroke-width="6"/><path d="M50 30 Q70 10 60 30" fill="none" stroke="#f1c40f" stroke-width="6"/></svg>`,
    coeur: `<svg viewBox="0 0 100 100"><path d="M50 85 L20 55 A 20 20 0 0 1 50 30 A 20 20 0 0 1 80 55 Z" fill="#e74c3c"/></svg>`,
    couronne: `<svg viewBox="0 0 100 100"><polygon points="15,40 25,80 75,80 85,40 65,60 50,30 35,60" fill="#f1c40f"/><circle cx="15" cy="35" r="5" fill="#e74c3c"/><circle cx="50" cy="20" r="6" fill="#e74c3c"/><circle cx="85" cy="35" r="5" fill="#e74c3c"/><circle cx="35" cy="70" r="3" fill="#16a085"/><circle cx="65" cy="70" r="3" fill="#16a085"/></svg>`,
    cloche: `<svg viewBox="0 0 100 100"><path d="M25 70 Q25 30 50 30 Q75 30 75 70 Z" fill="#f1c40f"/><rect x="15" y="70" width="70" height="10" rx="5" fill="#f39c12"/><circle cx="50" cy="85" r="8" fill="#e67e22"/><path d="M45 30 L45 15 A5 5 0 0 1 55 15 L55 30" fill="none" stroke="#e67e22" stroke-width="6"/></svg>`,
    de_jeu: `<svg viewBox="0 0 100 100"><rect x="15" y="15" width="70" height="70" rx="10" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="4"/><circle cx="30" cy="30" r="8" fill="#e74c3c"/><circle cx="70" cy="70" r="8" fill="#e74c3c"/><circle cx="30" cy="70" r="8" fill="#e74c3c"/><circle cx="70" cy="30" r="8" fill="#e74c3c"/><circle cx="50" cy="50" r="8" fill="#e74c3c"/></svg>`,

    // ✔️ SYMBOLES & CORRECTION
    valider: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#2ecc71"/><polyline points="30,50 45,65 70,35" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    erreur: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#e74c3c"/><line x1="35" y1="35" x2="65" y2="65" stroke="#fff" stroke-width="8" stroke-linecap="round"/><line x1="65" y1="35" x2="35" y2="65" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>`,
    smiley_content: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#f1c40f"/><circle cx="35" cy="40" r="6" fill="#2d3436"/><circle cx="65" cy="40" r="6" fill="#2d3436"/><path d="M30 60 Q50 80 70 60" stroke="#2d3436" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    smiley_triste: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#f1c40f"/><circle cx="35" cy="40" r="6" fill="#2d3436"/><circle cx="65" cy="40" r="6" fill="#2d3436"/><path d="M30 75 Q50 55 70 75" stroke="#2d3436" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`
};

// ==========================================
// 🖼️ LA BANQUE D'IMAGES (AVEC STOCKAGE LOCAL)
// ==========================================
let customMediaBank = [];

// 1. Charger la mémoire locale au démarrage
function loadCustomMedia() {
    try {
        let stored = localStorage.getItem('atelier_pro_media');
        if (stored) customMediaBank = JSON.parse(stored);
    } catch(e) { console.error("Erreur de lecture du LocalStorage", e); }
}

// 2. Sauvegarder dans la mémoire locale
function saveCustomMedia() {
    try {
        localStorage.setItem('atelier_pro_media', JSON.stringify(customMediaBank));
    } catch(e) {
        showAlert("⚠️ Mémoire pleine !", "Le stockage du navigateur (5 Mo max) est saturé. Supprimez quelques photos (les SVG prennent moins de place) pour en ajouter de nouvelles.");
    }
}

// 3. Construction de l'interface
function initMediaPanel() {
    loadCustomMedia(); 
    
    let grid = document.getElementById('media-grid-basic');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Création invisible du lecteur de fichiers (permet la multi-sélection !)
    if (!document.getElementById('media-upload-input')) {
        let fileInp = document.createElement('input');
        fileInp.type = 'file';
        fileInp.id = 'media-upload-input';
        fileInp.multiple = true; 
        fileInp.accept = "image/png, image/jpeg, image/svg+xml";
        fileInp.style.display = 'none';
        fileInp.onchange = (e) => handleMediaBankUpload(e.target);
        document.body.appendChild(fileInp);
    }

    // Le gros bouton d'import (+)
    let importBtn = document.createElement('div');
    importBtn.className = 'media-item import-btn';
    importBtn.style.border = '2px dashed var(--primary)';
    importBtn.style.background = 'rgba(9, 132, 227, 0.05)';
    importBtn.innerHTML = `<span style="font-size:28px; color:var(--primary); pointer-events:none;">+</span>`;
    importBtn.title = "Importer dans la bibliothèque";
    importBtn.onclick = () => document.getElementById('media-upload-input').click();
    grid.appendChild(importBtn);

    // Affichage des images de l'utilisateur (depuis la mémoire)
    customMediaBank.forEach(media => {
        let item = document.createElement('div');
        item.className = 'media-item custom-media';
        item.setAttribute('draggable', 'true');
        
        // Bouton supprimer (✖)
        let delBtn = document.createElement('button');
        delBtn.className = 'btn-delete-media';
        delBtn.innerHTML = '✖';
        delBtn.title = "Supprimer de la bibliothèque";
        delBtn.onclick = (e) => { e.stopPropagation(); deleteCustomMedia(media.id); };
        item.appendChild(delBtn);
        
        // Construction du contenu (brut pour SVG, balise img pour PNG/JPG)
        let contentHTML = media.isSvg ? media.content : `<img src="${media.content}">`;
        
        let wrapper = document.createElement('div');
        wrapper.style.width = '65%'; wrapper.style.height = '65%';
        wrapper.style.pointerEvents = 'none';
        wrapper.innerHTML = contentHTML;
        
        if (!media.isSvg) {
            let img = wrapper.querySelector('img');
            if(img) { img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain'; }
        }
        item.appendChild(wrapper);
        
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', contentHTML);
            e.dataTransfer.effectAllowed = 'copy';
        });
        grid.appendChild(item);
    });

    // Affichage des icônes de base (Le fameux SVG_BANK)
    for (let key in SVG_BANK) {
        let item = document.createElement('div');
        item.className = 'media-item';
        item.setAttribute('draggable', 'true');
        item.setAttribute('title', key); 
        item.innerHTML = SVG_BANK[key];
        
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', SVG_BANK[key]);
            e.dataTransfer.effectAllowed = 'copy';
        });
        grid.appendChild(item);
    }
}

// 4. Traitement des fichiers importés
function handleMediaBankUpload(input) {
    if (!input.files || input.files.length === 0) return;
    
    Array.from(input.files).forEach(file => {
        let reader = new FileReader();
        let isSvg = file.type === 'image/svg+xml';
        
        reader.onload = function(e) {
            customMediaBank.unshift({
                id: 'm_' + Date.now() + Math.floor(Math.random() * 1000),
                isSvg: isSvg,
                content: e.target.result
            });
            saveCustomMedia();
            initMediaPanel();
        };
        
        // La vraie magie est ici : on traite le SVG comme du texte pur pour le PDF,
        // et les autres comme de la data image !
        if (isSvg) {
            reader.readAsText(file); 
        } else {
            if (file.size > 1.5 * 1024 * 1024) { 
                showAlert("⚠️ Image trop lourde", `Le fichier "${file.name}" dépasse 1.5 Mo. Le stockage local étant limité, veuillez réduire sa taille avant import.`);
                return;
            }
            reader.readAsDataURL(file); 
        }
    });
    input.value = ''; 
}

function deleteCustomMedia(id) {
    customMediaBank = customMediaBank.filter(m => m.id !== id);
    saveCustomMedia();
    initMediaPanel();
}


let lastHighlightedZone = null;
function setupDragAndDrop() {
    if (!viewport) return;

    viewport.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'copy';
        
        let targetZone = e.target.closest('.zone') || e.target.closest('.svg-zone');
        if (targetZone !== lastHighlightedZone) {
            if (lastHighlightedZone) lastHighlightedZone.classList.remove('drag-over-zone');
            if (targetZone) targetZone.classList.add('drag-over-zone');
            lastHighlightedZone = targetZone;
        }
    });

    viewport.addEventListener('dragleave', (e) => {
        let targetZone = e.target.closest('.zone') || e.target.closest('.svg-zone');
        if (!targetZone && lastHighlightedZone) {
            lastHighlightedZone.classList.remove('drag-over-zone');
            lastHighlightedZone = null;
        }
    });

    viewport.addEventListener('drop', (e) => {
        e.preventDefault();
        if (lastHighlightedZone) {
            lastHighlightedZone.classList.remove('drag-over-zone');
            lastHighlightedZone = null;
        }
        
        let targetZone = e.target.closest('.zone') || e.target.closest('.svg-zone');
        if (targetZone) {
            let pId = parseInt(targetZone.getAttribute('data-piece'));
            let zId = parseInt(targetZone.getAttribute('data-zone'));
            let p = window.pieces.find(x => x.id === pId);
            
            if (!p) return;

            // 🎯 NOUVEAUTÉ : GESTION DES FICHIERS DEPUIS L'ORDINATEUR (Glisser-Déposer de PNG/JPG)
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                let file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    let reader = new FileReader();
                    reader.onload = function(evt) {
                        // On injecte l'image base64 directement dans la case !
                        p.zones[zId] = `<img src="${evt.target.result}">`;
                        renderAll();
                        saveState();
                    };
                    reader.readAsDataURL(file);
                } else {
                    showAlert("⚠️ Fichier non supporté", "Veuillez glisser une image (PNG, JPG, SVG).");
                }
                return; // On arrête là pour ne pas exécuter le code des icônes de la banque
            }

            // 🎯 ANCIEN CODE : GESTION DES ICÔNES DE LA BANQUE SVG
            let svgContent = e.dataTransfer.getData('text/plain');
            if (svgContent) {
                p.zones[zId] = svgContent;
                renderAll();
                saveState();
            }
        }
    });
}

// ==========================================
// 🎨 COLORISATION DES FIGURES ET DOMINOS
// ==========================================
function randomizeFigureColors() {
    if (window.pieces.length === 0) return;
    let cols = typeof getThemeColors === 'function' ? getThemeColors() : ['#74b9ff', '#55efc4', '#ffeaa7', '#ff7675', '#a29bfe'];
    let cb = document.getElementById('inp-color-figures');
    if (cb && !cb.checked) {
        cb.checked = true;
        if (typeof globalColorFigures !== 'undefined') globalColorFigures = true;
    }
    document.body.classList.remove('no-figure-colors');

    window.pieces.forEach(p => {
        p.zones = p.zones.map(z => {
            if (String(z).includes('<svg')) {
                let zNew = String(z).replace(/fill="#([a-fA-F0-9]{6})"/gi, (match, hex) => {
                    let h = hex.toLowerCase();
                    if (h === 'ffffff' || h === '2d3436' || h === '000000') return match; 
                    let newColor = cols[Math.floor(Math.random() * cols.length)];
                    return `fill="${newColor}"`;
                });
                zNew = zNew.replace(/fill-opacity="[0-9.]+"/g, `fill-opacity="0.25"`);
                return zNew;
            }
            return z;
        });
    });
    
    renderAll();
    saveState();
}

function randomizePieceColors() {
    if (window.pieces.length === 0) return;
    let cols = typeof getThemeColors === 'function' ? getThemeColors() : ['#74b9ff', '#55efc4', '#ffeaa7', '#ff7675', '#a29bfe'];
    window.pieces.forEach(p => { p.bg = cols[Math.floor(Math.random() * cols.length)]; });
    renderAll();
    saveState();
}

// ==========================================
// ⏪ SYSTÈME UNDO / REDO
// ==========================================
let history = [];
let historyIndex = -1;

function saveState() {
    if (historyIndex < history.length - 1) { history = history.slice(0, historyIndex + 1); }
    let snapshot = { mode: window.mode, pieces: JSON.parse(JSON.stringify(window.pieces)) };
    history.push(snapshot);
    if (history.length > 30) history.shift(); else historyIndex++;
    updateHistoryButtons();
}

function undo() { if (historyIndex > 0) { closeEditor(true); historyIndex--; restoreState(history[historyIndex]); } }
function redo() { if (historyIndex < history.length - 1) { closeEditor(true); historyIndex++; restoreState(history[historyIndex]); } }

function restoreState(snapshot) {
    if (window.mode !== snapshot.mode) {
        window.mode = snapshot.mode;
        ['domino', 'triomino', 'square'].forEach(id => document.getElementById('btn-'+id)?.classList.remove('active'));
        document.getElementById(`btn-${window.mode}`)?.classList.add('active'); 
        updateTemplatePanel();
    }
    window.pieces = JSON.parse(JSON.stringify(snapshot.pieces));
    window.selectedIndex = null; window.selectedZoneIndex = null;
    updateHistoryButtons(); updateToolbarUI(); renderAll();
}

function updateHistoryButtons() {
    let btnUndo = document.getElementById('btn-undo'); let btnRedo = document.getElementById('btn-redo');
    if(btnUndo) btnUndo.disabled = (historyIndex <= 0);
    if(btnRedo) btnRedo.disabled = (historyIndex >= history.length - 1);
}

window.addEventListener('keydown', e => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    
    if (window.editingPieceId === null || window.editingZoneIndex === null) return;
    if (e.altKey) { 
        let step = e.shiftKey ? 10 : 2; 
        switch(e.key) { 
            case 'ArrowUp': e.preventDefault(); nudgeContent(0, -step); break; 
            case 'ArrowDown': e.preventDefault(); nudgeContent(0, step); break; 
            case 'ArrowLeft': e.preventDefault(); nudgeContent(-step, 0); break; 
            case 'ArrowRight': e.preventDefault(); nudgeContent(step, 0); break; 
        } 
    }
});

// ==========================================
// 🛠️ CRÉATION DES ÉLÉMENTS DOM
// ==========================================
function createPieceElement(p, isInteractive = true, isBlank = false) {
    let div = document.createElement('div'); 
    
    let classes = `piece ${p.type}`;
    if (p.type === 'domino') classes += ` domino ${p.dir}`;
    if (p.id === window.selectedIndex && isInteractive) classes += ' selected';
    
    if (typeof globalPieceStyle !== 'undefined') {
        if (globalPieceStyle === '3d') classes += ' style-3d';
        else if (globalPieceStyle === 'wood') classes += ' style-wood';
        else if (globalPieceStyle === 'cristal') classes += ' style-cristal';
        else if (globalPieceStyle === 'gradient') classes += ' style-gradient';
    }

    div.className = classes;
    div.id = isInteractive ? `piece-${p.id}` : `pdf-piece-${p.id}`; 
    
    div.style.setProperty('--bg-color', p.bg); 
    div.style.setProperty('--border-color', p.border); 
    div.style.setProperty('--border-width', `${p.width}px`);
    
    let getFSize = (idx) => p.fontSizes ? p.fontSizes[idx] : (p.fontSize || globalFontSize);
    let getFFam  = (idx) => p.fontFamilies ? p.fontFamilies[idx] : (p.fontFamily || globalFontFamily);
    let getSvgS  = (idx) => p.svgScales ? p.svgScales[idx] : (p.svgScale || globalSvgScale);
    let getTColor = (idx) => p.textColors ? p.textColors[idx] : globalTextColor; 
    
    let fitEl = document.getElementById('inp-auto-fit');
    let autoFit = fitEl ? fitEl.checked : true;
    
    let getDynamicFSize = (idx, textStr, type) => {
        let baseSize = parseFloat(getFSize(idx)) || globalFontSize;
        if (!autoFit || !textStr || isBlank) return baseSize;
        let s = String(textStr); 
        if (s.includes('<svg') || s.includes('<img')) return baseSize; 
        let plainText = s.replace(/<[^>]*>?/gm, '').trim(); 
        let len = plainText.length; 
        if (len <= 4) return baseSize;
        let ratio = 4.2 / len; 
        let softRatio = Math.pow(ratio, 0.7); 
        return Math.max(0.35, baseSize * softRatio).toFixed(3); 
    };
    
    let margin = p.margin !== undefined ? p.margin : globalMargin; 
    let oX = p.offsetX || [0, 0, 0, 0]; 
    let oY = p.offsetY || [0, 0, 0, 0]; 
    let renderZone = (z, idx) => { if (isBlank) return ""; return String(z || "").replace(/currentColor/g, getTColor(idx)); };

    let z0 = renderZone(p.zones[0], 0); let z1 = renderZone(p.zones[1], 1); let z2 = renderZone(p.zones[2], 2); let z3 = renderZone(p.zones[3], 3);
    let pos = getPiecePos(p);

    if (isInteractive) {
        div.style.position = 'absolute'; 
        if (window.isGameMode && !p.isSnapped) {
            div.style.left = `${p.gameX}px`; div.style.top = `${p.gameY}px`; div.style.transform = `rotate(${p.gameRot || 0}deg)`; div.style.zIndex = "50";
        } else {
            let finalPos = pos;
            if (window.isGameMode && p.isSnapped && p.currentSlotId !== null) { let slot = window.pieces.find(s => s.id === p.currentSlotId); if (slot) finalPos = getPiecePos(slot); }
            div.style.left = `${finalPos.x + clusterOffsetX}px`; div.style.top = `${finalPos.y + clusterOffsetY}px`; div.style.transform = `rotate(0deg)`;
            if (window.isGameMode && p.isSnapped) div.style.zIndex = "10";
        }
    } else {
        div.style.position = 'absolute'; div.style.left = `${pos.x + clusterOffsetX}px`; div.style.top = `${pos.y + clusterOffsetY}px`;
    }

    let checkForHTML = (str) => String(str).includes('<img') || String(str).includes('<svg');

    if (p.type === 'domino') {
        let isH = (p.dir === 'hr' || p.dir === 'hl');
        let c0 = (window.selectedIndex === p.id && window.selectedZoneIndex === 0) ? "zone selected-zone" : "zone";
        let c1 = (window.selectedIndex === p.id && window.selectedZoneIndex === 1) ? "zone selected-zone" : "zone";
        let rot = p.contentRotation || 0;

        div.innerHTML = `
            <div class="${c0}" style="--img-scale: ${getSvgS(0)}" ${isInteractive ? `data-piece="${p.id}" data-zone="0"` : ''}>
                <div class="zone-content" style="font-family: '${getFFam(0)}', sans-serif; font-size: ${getDynamicFSize(0, z0, p.type)}rem; color: ${getTColor(0)}; transform: translate(${oX[0]}px, ${oY[0]}px) rotate(${rot}deg); white-space: nowrap !important; line-height: 1 !important;">${z0}</div>
            </div>
            <div class="${c1}" style="--img-scale: ${getSvgS(1)}" ${isInteractive ? `data-piece="${p.id}" data-zone="1"` : ''}>
                <div class="zone-content" style="font-family: '${getFFam(1)}', sans-serif; font-size: ${getDynamicFSize(1, z1, p.type)}rem; color: ${getTColor(1)}; transform: translate(${oX[1]}px, ${oY[1]}px) rotate(${rot}deg); white-space: nowrap !important; line-height: 1 !important;">${z1}</div>
            </div>
        `;
    } 
    else if (p.type === 'triomino') {
        let isUp = (Math.round(p.q) + Math.round(p.r)) % 2 === 0; 
        let points = isUp ? "50,0 0,86.6025 100,86.6025" : "0,0 100,0 50,86.6025";

        let createTriZone = (z, zIdx, cx, cy, rot, mDir) => {
            let isHTML = checkForHTML(z);
            let cClass = (window.selectedIndex === p.id && window.selectedZoneIndex === zIdx) ? "svg-zone selected-zone" : "svg-zone";
            let attr = isInteractive ? `data-piece="${p.id}" data-zone="${zIdx}"` : '';
            let yOffset = mDir * margin; 
            let content = isHTML ?
                `<foreignObject x="${-40 + oX[zIdx]}" y="${yOffset - 40 + oY[zIdx]}" width="80" height="80"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center; color: ${getTColor(zIdx)}; --img-scale: ${getSvgS(zIdx)}; white-space: nowrap !important;" class="${cClass}" ${attr}>${z}</div></foreignObject>` :
                `<text x="${oX[zIdx]}" y="${yOffset + oY[zIdx]}" font-family="${getFFam(zIdx)}" font-size="${getDynamicFSize(zIdx, z, p.type)}rem" fill="${getTColor(zIdx)}" text-anchor="middle" dominant-baseline="central" class="${cClass}" ${attr}>${z}</text>`;
            return `<g transform="translate(${cx}, ${cy}) rotate(${rot})">${content}</g>`;
        };

        let t0, t1, t2;
        if (isUp) { 
            t0 = createTriZone(z0, 0, 50, 86.6, 0, -1); t1 = createTriZone(z1, 1, 25, 43.3, 120, -1); t2 = createTriZone(z2, 2, 75, 43.3, -120, -1); 
        } else { 
            t0 = createTriZone(z0, 0, 50, 0, 180, -1); t1 = createTriZone(z1, 1, 25, 43.3, 60, -1); t2 = createTriZone(z2, 2, 75, 43.3, -60, -1); 
        }
        div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 86.6025" style="overflow:visible;"><polygon points="${points}" fill="${p.bg}" stroke="${p.border}" stroke-width="${p.width}" stroke-linejoin="round" />${t0} ${t1} ${t2}</svg>`;
    }
    else if (p.type === 'square') {
        let createSquareZone = (z, zIdx, rot) => {
            let isHTML = checkForHTML(z);
            let cClass = (window.selectedIndex === p.id && window.selectedZoneIndex === zIdx) ? "svg-zone selected-zone" : "svg-zone";
            let attr = isInteractive ? `data-piece="${p.id}" data-zone="${zIdx}"` : '';
            let content = isHTML ?
                `<foreignObject x="${10 + oX[zIdx]}" y="${100 - margin - 40 + oY[zIdx]}" width="80" height="80"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center; color: ${getTColor(zIdx)}; --img-scale: ${getSvgS(zIdx)}; white-space: nowrap !important;" class="${cClass}" ${attr}>${z}</div></foreignObject>` :
                `<text x="${50 + oX[zIdx]}" y="${100 - margin + oY[zIdx]}" font-family="${getFFam(zIdx)}" font-size="${getDynamicFSize(zIdx, z, p.type)}rem" fill="${getTColor(zIdx)}" text-anchor="middle" dominant-baseline="central" class="${cClass}" ${attr}>${z}</text>`;
            return `<g transform="rotate(${rot} 50 50)">${content}</g>`;
        };
        let t0 = createSquareZone(z0, 0, 180); let t1 = createSquareZone(z1, 1, -90); let t2 = createSquareZone(z2, 2, 0); let t3 = createSquareZone(z3, 3, 90);
        div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="overflow:visible;"><rect x="0" y="0" width="100" height="100" fill="${p.bg}" stroke="${p.border}" stroke-width="${p.width}" /><line x1="0" y1="0" x2="100" y2="100" stroke="${p.border}" stroke-width="${p.width / 2}" stroke-dasharray="4,4" opacity="0.5" /><line x1="0" y1="100" x2="100" y2="0" stroke="${p.border}" stroke-width="${p.width / 2}" stroke-dasharray="4,4" opacity="0.5" />${t0} ${t1} ${t2} ${t3}</svg>`;
    }
    return div;
}

// ==========================================
// 🛠️ OUTILS DE CADRAGE, ZOOM ET BOUTONS
// ==========================================
function getVisibleViewport() {
    if (!viewport) return { width: 800, height: 600, centerX: 400, centerY: 300 };
    const rect = viewport.getBoundingClientRect();
    const leftPanel = document.getElementById('tools-panel');
    const rightPanel = document.getElementById('style-toolbar');
    
    let leftOffset = 55;
    if (leftPanel && !leftPanel.classList.contains('collapsed')) leftOffset += 300;
    
    let rightOffset = 0;
    if (rightPanel && !rightPanel.classList.contains('collapsed')) rightOffset += 300;
    
    let w = rect.width - leftOffset - rightOffset;
    let h = rect.height;
    return { width: w > 0 ? w : rect.width, height: h, centerX: leftOffset + (w > 0 ? w / 2 : rect.width / 2), centerY: h / 2 };
}

function fitViewToPieces() {
    if (!viewport || window.pieces.length === 0) { resetView(); return; }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    window.pieces.forEach(p => {
        let pos = getPiecePos(p);
        let w = p.type === 'domino' ? (p.dir === 'hr' || p.dir === 'hl' ? CELL*2 : CELL) : (p.type === 'square' ? C_S : T_W);
        let h = p.type === 'domino' ? (p.dir === 'vd' || p.dir === 'vu' ? CELL*2 : CELL) : (p.type === 'square' ? C_S : T_H);
        minX = Math.min(minX, pos.x); minY = Math.min(minY, pos.y); 
        maxX = Math.max(maxX, pos.x + w); maxY = Math.max(maxY, pos.y + h);
    });
    
    let totalW = maxX - minX; let totalH = maxY - minY;
    let vis = getVisibleViewport(); let padding = 120;
    let scaleX = (vis.width - padding) / totalW; let scaleY = (vis.height - padding) / totalH;
    
    window.scale = Math.min(scaleX, scaleY, 1.2); 
    window.panX = Math.round(vis.centerX - (((minX + maxX) / 2) * window.scale));
    window.panY = Math.round(vis.centerY - (((minY + maxY) / 2) * window.scale));
    applyTransform();
}

function adjustZoom(delta) {
    let newScale = Math.max(0.3, Math.min(window.scale + delta, 3)); 
    let vis = getVisibleViewport();
    window.panX = Math.round(vis.centerX - (vis.centerX - window.panX) * (newScale / window.scale)); 
    window.panY = Math.round(vis.centerY - (vis.centerY - window.panY) * (newScale / window.scale)); 
    window.scale = newScale; 
    applyTransform(); 
}

function toggleTextMoveMode() {
    if (window.isGameMode || window.isBrushMode) return;
    window.isTextMoveMode = !window.isTextMoveMode;
    let btn = document.getElementById('btn-text-move');
    if (window.isTextMoveMode) {
        if(btn) btn.classList.add('is-active');
        document.body.classList.add('text-move-mode'); closeEditor(true); window.selectedIndex = null; window.selectedZoneIndex = null; updateSelectionUI();
    } else { 
        if(btn) btn.classList.remove('is-active'); document.body.classList.remove('text-move-mode'); 
    }
}

function resetView() { 
    let vis = getVisibleViewport();
    window.panX = vis.centerX; 
    window.panY = vis.centerY; 
    applyTransform(); 
}

function showAlert(title, msg) { 
    let t = document.getElementById('alert-title');
    let m = document.getElementById('alert-msg');
    let mod = document.getElementById('modal-alert');
    if (t && m && mod) { t.innerHTML = title; m.innerHTML = msg; mod.style.display = 'flex'; }
}

function renderAll() { 
    if (!canvasContent) return;
    let ghost = document.getElementById('game-ghost-board');
    if(ghost) canvasContent.removeChild(ghost);
    canvasContent.innerHTML = ''; 
    if(ghost) canvasContent.appendChild(ghost);
    window.pieces.forEach(p => canvasContent.appendChild(createPieceElement(p, true))); 
    if(!window.isGameMode && !window.isBrushMode) renderGhosts(); 
    updateSelectionUI(); 
}

function createGhostBtn(x, y, onClick) { 
    if(!canvasContent) return; 
    let btn = document.createElement('div'); btn.className = 'ghost-btn'; btn.innerHTML = '+'; btn.style.left = `${x}px`; btn.style.top = `${y}px`; btn.onclick = onClick; canvasContent.appendChild(btn); 
}

function addPiece(data) { 
    let newId = window.pieces.length > 0 ? Math.max(...window.pieces.map(p => p.id)) + 1 : 0; 
    let nouvellePiece = { id: newId, ...getFreshStyle() };
    if(window.mode === 'domino') { nouvellePiece.type = 'domino'; nouvellePiece.x = data.x; nouvellePiece.y = data.y; nouvellePiece.dir = data.dir; nouvellePiece.zones = ['?', '?']; } else if (window.mode === 'triomino') { nouvellePiece.type = 'triomino'; nouvellePiece.q = data.q; nouvellePiece.r = data.r; nouvellePiece.zones = ['?', '?', '?']; } else if (window.mode === 'square') { nouvellePiece.type = 'square'; nouvellePiece.x = data.x; nouvellePiece.y = data.y; nouvellePiece.zones = ['?', '?', '?', '?']; }
    window.pieces.push(nouvellePiece); window.selectedIndex = newId; window.selectedZoneIndex = null; updateSelectionUI(); renderAll(); saveState(); 
}

function renderGhosts() {
    document.querySelectorAll('.ghost-btn').forEach(btn => btn.remove());
    let occupied = getOccupiedSet(); let sel = window.pieces.find(p => p.id === window.selectedIndex); if(!sel) return; 

    if(window.mode === 'domino') { 
        let rx = Math.round(sel.x), ry = Math.round(sel.y); let tail = {x: rx, y: ry}; let head = {x: rx + (sel.dir === 'hr'?1:sel.dir==='hl'?-1:0), y: ry + (sel.dir === 'vd'?1:sel.dir==='vu'?-1:0)}; let directions = [ { dx: 1, dy: 0, dir: 'hr' }, { dx: -1, dy: 0, dir: 'hl' }, { dx: 0, dy: 1, dir: 'vd' }, { dx: 0, dy: -1, dir: 'vu' } ]; let candidates = []; 
        [tail, head].forEach(origin => { directions.forEach(d => { let c1X = origin.x + d.dx, c1Y = origin.y + d.dy, c2X = origin.x + (d.dx * 2), c2Y = origin.y + (d.dy * 2); if((c1X !== tail.x || c1Y !== tail.y) && (c1X !== head.x || c1Y !== head.y)) { candidates.push({ x: c1X, y: c1Y, dir: d.dir, check1: `${c1X},${c1Y}`, check2: `${c2X},${c2Y}`}); } }); }); 
        let seen = new Set(); candidates.forEach(c => { if(!occupied.has(c.check1) && !occupied.has(c.check2) && !seen.has(c.check1)) { seen.add(c.check1); let px = c.x * CELL + CELL/2 + clusterOffsetX; let py = c.y * CELL + CELL/2 + clusterOffsetY; createGhostBtn(px, py, () => addPiece({ x: c.x, y: c.y, dir: c.dir })); } }); 
    } 
    else if(window.mode === 'triomino') { 
        let rq = Math.round(sel.q), rr = Math.round(sel.r); let isUp = (rq + rr) % 2 === 0; let neighbors = isUp ? [ {q: rq+1, r: rr}, {q: rq-1, r: rr}, {q: rq, r: rr+1} ] : [ {q: rq+1, r: rr}, {q: rq-1, r: rr}, {q: rq, r: rr-1} ]; 
        neighbors.forEach(n => { if(!occupied.has(`${n.q},${n.r}`)) { let isNUp = (n.q + n.r) % 2 === 0; let pos = getPiecePos({type: 'triomino', q: n.q, r: n.r}); createGhostBtn(pos.x + (T_W / 2) + clusterOffsetX, pos.y + (isNUp ? T_H*0.666 : T_H*0.333) + clusterOffsetY, () => addPiece({ q: n.q, r: n.r })); } }); 
    } 
    else if(window.mode === 'square') { 
        let rx = Math.round(sel.x), ry = Math.round(sel.y); let neighbors = [ {x: rx+1, y: ry}, {x: rx-1, y: ry}, {x: rx, y: ry+1}, {x: rx, y: ry-1} ]; 
        neighbors.forEach(n => { if(!occupied.has(`${n.x},${n.y}`)) { let pos = getPiecePos({type: 'square', x: n.x, y: n.y}); createGhostBtn(pos.x + (C_S / 2) + clusterOffsetX, pos.y + (C_S / 2) + clusterOffsetY, () => addPiece({ x: n.x, y: n.y })); } }); 
    } 
}

function updateSelectionUI() { 
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('selected')); document.querySelectorAll('.zone').forEach(z => z.classList.remove('selected-zone')); document.querySelectorAll('.svg-zone').forEach(z => z.classList.remove('selected-zone'));
    if (window.selectedIndex !== null && !window.isGameMode && !window.isBrushMode) { 
        let el = document.getElementById('piece-' + window.selectedIndex); 
        if (el) { el.classList.add('selected'); if (window.selectedZoneIndex !== null) { let zoneEl = el.querySelector(`[data-zone="${window.selectedZoneIndex}"]`); if (zoneEl) zoneEl.classList.add('selected-zone'); } }
    } 
    if (typeof updateToolbarUI === 'function') updateToolbarUI(); if(!window.isGameMode && !window.isBrushMode) renderGhosts(); 
}

// ==========================================
// 🖱️ FONCTIONS D'ÉVÉNEMENTS SOURIS DIRECTES
// ==========================================
function handleMouseDown(e) { 
    let vp = document.getElementById('viewport');
    if (window.isBrushMode) {
        if(e.target.closest('.ghost-btn') || e.target.closest('#style-toolbar') || e.target.closest('#floating-editor') || e.target.closest('.modal-overlay') || e.target.closest('#modal-alert') || e.target.closest('header')) return; 
        e.preventDefault(); isBrushing = true; brushPath = []; let cell = getCellFromEvent(e); let occ = getOccupiedSet(); if (!occ.has(`${cell.x},${cell.y}`)) { brushPath.push(cell); renderBrushPath(); } return;
    }
    if(e.target.closest('.ghost-btn') || e.target.closest('#style-toolbar') || e.target.closest('#floating-editor') || e.target.closest('.modal-overlay') || e.target.closest('#modal-alert') || e.target.closest('header')) return; 
    let zoneEl = e.target.closest('.zone') || e.target.closest('.svg-zone'); let pieceEl = e.target.closest('.piece'); 
    
    if (window.isTextMoveMode && zoneEl) {
        isDraggingText = true; dragTextPieceId = parseInt(zoneEl.getAttribute('data-piece')); dragTextZoneIdx = parseInt(zoneEl.getAttribute('data-zone')); let p = window.pieces.find(p => p.id === dragTextPieceId);
        if (!p.offsetX) p.offsetX = [0,0,0,0]; if (!p.offsetY) p.offsetY = [0,0,0,0]; startTextOffsetX = p.offsetX[dragTextZoneIdx]; startTextOffsetY = p.offsetY[dragTextZoneIdx]; startX = e.clientX; startY = e.clientY; return; 
    }
    if (window.isGameMode && pieceEl) {
        let pId = parseInt(pieceEl.id.replace('piece-', '')); let p = window.pieces.find(x => x.id === pId);
        if (p) { isDraggingSinglePiece = true; draggedSinglePieceId = pId; startX = e.clientX; startY = e.clientY; pieceEl.style.zIndex = 1000; p.isSnapped = false; p.currentSlotId = null; return; }
    }
    if (pieceEl && !window.isGameMode) { 
        isDraggingPiece = true; hasMoved = false; closeEditor(true); document.body.classList.add('is-dragging-piece'); window.selectedIndex = parseInt(pieceEl.id.replace('piece-', '')); window.selectedZoneIndex = zoneEl ? parseInt(zoneEl.getAttribute('data-zone')) : null; updateSelectionUI();
    } else { 
        window.selectedIndex = null; window.selectedZoneIndex = null; updateSelectionUI(); isPanning = true; if(vp) vp.classList.add('panning'); closeEditor(true); startPanX = window.panX; startPanY = window.panY; 
    } 
    startX = e.clientX; startY = e.clientY; 
}

function handleMouseMove(e) { 
    if (isBrushing) {
        e.preventDefault(); let cell = getCellFromEvent(e); let occ = getOccupiedSet();
        if (brushPath.length === 1) {
            let last = brushPath[0]; let dist = Math.abs(cell.x - last.x) + Math.abs(cell.y - last.y);
            if (dist === 1 && !occ.has(`${cell.x},${cell.y}`)) {
                let dir = ''; if (cell.x > last.x) dir = 'hr'; else if (cell.x < last.x) dir = 'hl'; else if (cell.y > last.y) dir = 'vd'; else if (cell.y < last.y) dir = 'vu';
                let newId = window.pieces.length > 0 ? Math.max(...window.pieces.map(p => p.id)) + 1 : 0;
                window.pieces.push({ ...getFreshStyle(), id: newId, type: 'domino', x: Math.min(last.x, cell.x), y: Math.min(last.y, cell.y), dir: dir, zones: ['?', '?'] }); brushPath = []; renderAll(); renderBrushPath();
            }
        } else if (brushPath.length === 0) { if (!occ.has(`${cell.x},${cell.y}`)) { brushPath.push(cell); renderBrushPath(); } }
        return;
    }
    if (isDraggingText) {
        let dx = (e.clientX - startX) / window.scale; let dy = (e.clientY - startY) / window.scale; let p = window.pieces.find(p => p.id === dragTextPieceId); let angle = 0;
        if (p.type === 'triomino') { let isUp = (Math.round(p.q) + Math.round(p.r)) % 2 === 0; if (isUp) { if (dragTextZoneIdx === 1) angle = 120; if (dragTextZoneIdx === 2) angle = -120; } else { if (dragTextZoneIdx === 0) angle = 180; if (dragTextZoneIdx === 1) angle = 60; if (dragTextZoneIdx === 2) angle = -60; } } else if (p.type === 'square') { if (dragTextZoneIdx === 0) angle = 180; if (dragTextZoneIdx === 1) angle = -90; if (dragTextZoneIdx === 2) angle = 0; if (dragTextZoneIdx === 3) angle = 90; }
        let rad = -angle * Math.PI / 180; let localDx = dx * Math.cos(rad) - dy * Math.sin(rad); let localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
        p.offsetX[dragTextZoneIdx] = startTextOffsetX + localDx; p.offsetY[dragTextZoneIdx] = startTextOffsetY + localDy; renderAll(); return;
    }
    if (isDraggingSinglePiece) {
        let dx = (e.clientX - startX) / window.scale; let dy = (e.clientY - startY) / window.scale; let p = window.pieces.find(x => x.id === draggedSinglePieceId);
        p.gameX += dx; p.gameY += dy; startX = e.clientX; startY = e.clientY; let el = document.getElementById('piece-' + p.id); if (el) { el.style.left = `${p.gameX}px`; el.style.top = `${p.gameY}px`; } return;
    }
    if (isPanning) { 
        let vp = document.getElementById('viewport');
        if (vp) { window.panX = Math.round(startPanX + (e.clientX - startX)); window.panY = Math.round(startPanY + (e.clientY - startY)); applyTransform(); }
    } 
    else if (isDraggingPiece && !window.isGameMode) { 
        let dx = e.clientX - startX, dy = e.clientY - startY; if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true; 
        if (hasMoved) { let sDx = dx / window.scale, sDy = dy / window.scale; window.pieces.forEach(p => { let el = document.getElementById('piece-' + p.id); if (el) el.style.transform = `translate(${sDx}px, ${sDy}px)`; }); document.querySelectorAll('.ghost-btn').forEach(btn => btn.style.display = 'none'); } 
    } 
}

function handleMouseUp(e) { 
    if (isBrushing) { isBrushing = false; brushPath = []; renderBrushPath(); saveState(); return; }
    if (isDraggingText) { isDraggingText = false; saveState(); return; }

   if (isDraggingSinglePiece) {
        let p = window.pieces.find(x => x.id === draggedSinglePieceId); 
        let bestSlot = null; let minDist = Infinity;

        window.pieces.forEach(slot => {
            // On vérifie si la place est libre et si c'est la même forme (ex: domino vertical vs horizontal)
            let isOccupied = window.pieces.some(other => other.isSnapped && other.currentSlotId === slot.id && other.id !== p.id);
            if (!isOccupied && isSameShape(p, slot)) {
                let sPos = getPiecePos(slot); 
                let targetX = sPos.x + clusterOffsetX; 
                let targetY = sPos.y + clusterOffsetY; 
                let dist = Math.sqrt(Math.pow(p.gameX - targetX, 2) + Math.pow(p.gameY - targetY, 2));
                if (dist < minDist) { minDist = dist; bestSlot = {x: targetX, y: targetY, id: slot.id}; }
            }
        });

        // La puissance de l'aimant s'adapte à la taille de la grille (CELL)
        let magnetForce = typeof CELL !== 'undefined' ? CELL * 1.5 : 120;
        
        if (minDist < magnetForce && bestSlot) { 
            p.gameX = bestSlot.x; p.gameY = bestSlot.y; 
            p.isSnapped = true; p.currentSlotId = bestSlot.id; 
            let el = document.getElementById('piece-' + p.id); 
            if (el) { el.classList.add('snapped-anim'); setTimeout(() => el.classList.remove('snapped-anim'), 600); }
            
            let allSnapped = window.pieces.every(x => x.isSnapped);
            if (allSnapped) {
                let uniqueSlots = new Set(window.pieces.map(x => x.currentSlotId));
                if (uniqueSlots.size === window.pieces.length) { 
                    let exactMatch = window.pieces.every(x => x.currentSlotId === x.id);
                    if (exactMatch) { setTimeout(() => { showAlert("🎉 INCROYABLE !", "Le labyrinthe est parfaitement reconstitué ! Vous avez la solution parfaite !"); createConfetti(); }, 400); } 
                    else { setTimeout(() => { showAlert("🧐 Intéressant...", "Le plateau est entièrement rempli !<br><br>Mais êtes-vous sûr que <b>toutes les correspondances</b> sont exactes ? Vérifiez bien avant de valider !"); }, 400); }
                }
            }
        } else { 
            p.isSnapped = false; p.currentSlotId = null; 
        }

        isDraggingSinglePiece = false; draggedSinglePieceId = null; renderAll(); return;
    }

    if (isPanning) { 
        let vp = document.getElementById('viewport');
        if (vp) { isPanning = false; vp.classList.remove('panning'); }
    } 
    if (isDraggingPiece) { 
        isDraggingPiece = false; document.body.classList.remove('is-dragging-piece'); 
        if (hasMoved) { let dx = (e.clientX - startX) / window.scale, dy = (e.clientY - startY) / window.scale; clusterOffsetX = Math.round(clusterOffsetX + dx); clusterOffsetY = Math.round(clusterOffsetY + dy); renderAll(); saveState(); } else { document.querySelectorAll('.ghost-btn').forEach(btn => btn.style.display = 'flex'); } 
    } 
}

function handleWheel(e) { 
    e.preventDefault(); closeEditor(true); 
    let vp = document.getElementById('viewport');
    if (!vp) return;
    let newScale = Math.max(0.3, Math.min(window.scale * Math.exp(-e.deltaY * 0.0015), 3)); 
    const rect = vp.getBoundingClientRect(); const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top; 
    window.panX = Math.round(mouseX - (mouseX - window.panX) * (newScale / window.scale)); window.panY = Math.round(mouseY - (mouseY - window.panY) * (newScale / window.scale)); 
    window.scale = newScale; applyTransform(); 
}

function handleDoubleClick(e) {
    if (window.isGameMode || window.isTextMoveMode || window.isBrushMode) return; 
    if(e.target.closest('.ghost-btn') || e.target.closest('#style-toolbar') || e.target.closest('#floating-editor') || e.target.closest('.modal-overlay') || e.target.closest('#modal-alert') || e.target.closest('header')) return; 
    let zEl = e.target.closest('.zone') || e.target.closest('.svg-zone'); 
    if (zEl) { let pId = parseInt(zEl.getAttribute('data-piece')); let zId = parseInt(zEl.getAttribute('data-zone')); openEditor(pId, zId, zEl); }
}

function applyTransform() { 
    let cvs = document.getElementById('canvas-content');
    let vp = document.getElementById('viewport');
    if (!cvs || !vp) return;
    cvs.style.transform = `translate(${window.panX}px, ${window.panY}px) scale(${window.scale})`; 
    let baseCell = (typeof CELL !== 'undefined' ? CELL : 80) * window.scale;
    let bgX = (window.panX + clusterOffsetX * window.scale) % baseCell;
    let bgY = (window.panY + clusterOffsetY * window.scale) % baseCell;
    vp.style.backgroundPosition = `${bgX}px ${bgY}px`; 
    vp.style.backgroundSize = `${baseCell}px ${baseCell}px`; 
}

// Édition...
function openEditor(pieceId, zoneIndex, htmlElement) { window.selectedIndex = pieceId; window.selectedZoneIndex = zoneIndex; updateSelectionUI(); window.editingPieceId = pieceId; window.editingZoneIndex = zoneIndex; let p = window.pieces.find(p => p.id === pieceId); let content = String(p.zones[zoneIndex] || ""); let colorPicker = document.getElementById('editor-text-color'); if (colorPicker) { colorPicker.value = p.textColors ? p.textColors[zoneIndex] : globalTextColor; } let isSvgOrImg = content.includes('<svg') || content.includes('<img'); if (isSvgOrImg) { document.getElementById('text-size-btns').style.display = 'none'; document.getElementById('svg-size-btns').style.display = 'flex'; document.getElementById('editor-input').value = content.includes('<img') ? '[ Image ]' : ''; } else { document.getElementById('text-size-btns').style.display = 'flex'; document.getElementById('svg-size-btns').style.display = 'none'; document.getElementById('editor-input').value = content; } let rect = htmlElement.getBoundingClientRect(); let ed = document.getElementById('floating-editor'); if(ed) { ed.style.display = 'flex'; ed.style.left = `${rect.left + rect.width / 2}px`; ed.style.top = `${rect.top - 15}px`; setTimeout(() => { let input = document.getElementById('editor-input'); if(input){ input.focus(); input.select(); } }, 50); } }

function closeEditor(skipSave = false) { 
    let ed = document.getElementById('floating-editor');
    if (ed) ed.style.display = 'none'; 
    if (!skipSave && window.editingPieceId !== null) { saveState(); }
    window.editingPieceId = null; window.editingZoneIndex = null; 
}

function updateZoneLive(val) { if (window.editingPieceId === null) return; window.pieces.find(p => p.id === window.editingPieceId).zones[window.editingZoneIndex] = val; renderAll(); }
function updateTextColorLive(colorVal) { if (window.editingPieceId === null || window.editingZoneIndex === null) return; let p = window.pieces.find(p => p.id === window.editingPieceId); if (!p.textColors) p.textColors = [globalTextColor, globalTextColor, globalTextColor, globalTextColor]; p.textColors[window.editingZoneIndex] = colorVal; let tbColor = document.getElementById('inp-text-color'); if(tbColor) tbColor.value = colorVal; renderAll(); }
function adjustFontSize(delta) { if (window.editingPieceId === null || window.editingZoneIndex === null) return; let p = window.pieces.find(p => p.id === window.editingPieceId); if (!p.fontSizes) p.fontSizes = [globalFontSize, globalFontSize, globalFontSize, globalFontSize]; p.fontSizes[window.editingZoneIndex] += (delta * 0.1); if (p.fontSizes[window.editingZoneIndex] < 0.5) p.fontSizes[window.editingZoneIndex] = 0.5; if (p.fontSizes[window.editingZoneIndex] > 3.0) p.fontSizes[window.editingZoneIndex] = 3.0; renderAll(); }
function adjustSvgScale(delta) { if (window.editingPieceId === null || window.editingZoneIndex === null) return; let p = window.pieces.find(p => p.id === window.editingPieceId); if (!p.svgScales) p.svgScales = [globalSvgScale, globalSvgScale, globalSvgScale, globalSvgScale]; p.svgScales[window.editingZoneIndex] += (delta * 0.1); if (p.svgScales[window.editingZoneIndex] < 0.3) p.svgScales[window.editingZoneIndex] = 0.3; if (p.svgScales[window.editingZoneIndex] > 3.0) p.svgScales[window.editingZoneIndex] = 3.0; renderAll(); }
function nudgeContent(dx, dy) { if (window.editingPieceId === null || window.editingZoneIndex === null) return; let p = window.pieces.find(p => p.id === window.editingPieceId); if (!p.offsetX) p.offsetX = [0, 0, 0, 0]; if (!p.offsetY) p.offsetY = [0, 0, 0, 0]; p.offsetX[window.editingZoneIndex] += dx; p.offsetY[window.editingZoneIndex] += dy; renderAll(); }

function handleImageUpload(input) { if(!input.files || !input.files[0]) return; const reader = new FileReader(); reader.onload = function(e) { updateZoneLive(`<img src="${e.target.result}">`); document.getElementById('editor-input').value = '[ Image ]'; }; reader.readAsDataURL(input.files[0]); input.value = ''; }
function injectFraction() { let input = document.getElementById('editor-input').value.trim(); if(!input.includes('/')) { showAlert("🧮 Astuce Fraction", "Écrivez simplement votre fraction dans la bulle (ex : <b>3/5</b>), puis cliquez sur ce bouton !"); return; } let parts = input.split('/'); let num = parts[0].trim(); let den = parts[1].trim(); updateZoneLive(generateFractionSvg(num, den)); document.getElementById('editor-input').value = '[ Texte Fraction ]'; }

function insertAdvancedFraction() {
    if (window.selectedIndex === null || window.selectedZoneIndex === null) { showAlert("⚠️ Cible requise", "Cliquez une fois sur la case que vous voulez modifier !"); return; }
    let val = document.getElementById('inp-frac-val').value.trim(); let type = document.getElementById('inp-frac-type').value; let color = document.getElementById('inp-frac-color').value;
    if (!val.includes('/')) { showAlert("⚠️ Format", "Veuillez entrer une fraction simple (ex : 3/5)."); return; }
    let parts = val.split('/'); let num = parseInt(parts[0].trim()); let den = parseInt(parts[1].trim());
    if (isNaN(num) || isNaN(den) || den <= 0) { showAlert("⚠️ Erreur", "La fraction n'est pas lisible."); return; }
    let svgDraw = "";
    if (type === 'pie') svgDraw = generatePieSvg(num, den, color); else if (type === 'bar') svgDraw = generateBarSvg(num, den, color); else if (type === 'axis') svgDraw = generateAxisSvg(num, den, color); else if (type === 'text') svgDraw = generateFractionSvg(num, den);
    window.pieces.find(p => p.id === window.selectedIndex).zones[window.selectedZoneIndex] = svgDraw; renderAll(); saveState(); 
}

function insertAdvancedAngle() {
    if (window.selectedIndex === null || window.selectedZoneIndex === null) { showAlert("⚠️ Cible requise", "Cliquez une fois sur la case que vous voulez modifier !"); return; }
    let deg = parseInt(document.getElementById('lib-angle-val').value); let type = document.getElementById('lib-angle-type').value;
    if (isNaN(deg)) { showAlert("⚠️ Erreur", "Saisissez un angle."); return; }
    let svgDraw = generateAdvancedAngle(deg, type); window.pieces.find(p => p.id === window.selectedIndex).zones[window.selectedZoneIndex] = svgDraw; renderAll(); saveState(); 
}

function deleteSelectedPiece() {
    let idToDel = window.editingPieceId !== null ? window.editingPieceId : window.selectedIndex;
    if (idToDel === null) return;
    if (window.pieces.length <= 1) { showAlert("⚠️ Impossible", "Vous devez garder au moins une pièce sur le plateau. Utilisez le bouton Vider (🗑️) en haut pour tout recommencer."); return; }
    window.pieces = window.pieces.filter(p => p.id !== idToDel);
    closeEditor(true); window.selectedIndex = null; window.selectedZoneIndex = null; updateToolbarUI(); renderAll(); saveState(); 
}

function saveProject() {
    let pStyle = typeof globalPieceStyle !== 'undefined' ? globalPieceStyle : 'flat';
    let cFig = typeof globalColorFigures !== 'undefined' ? globalColorFigures : true;
    let bStyle = document.getElementById('inp-bg-style') ? document.getElementById('inp-bg-style').value : 'uni';

    const projectData = { 
        mode: window.mode, 
        pieces: window.pieces, 
        globals: { 
            globalBg, globalBorderColor, globalBorderWidth, globalTextColor, globalBaseSize, 
            globalFontSize, globalFontFamily, globalMargin, globalSvgScale,
            globalPieceStyle: pStyle, globalColorFigures: cFig, globalBgStyle: bStyle
        } 
    };
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `mon-labyrinthe-${window.mode}.atelier`; a.click(); URL.revokeObjectURL(url);
}

function triggerLoadProject() { document.getElementById('file-load-project').click(); }

function loadProject(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            if (projectData.mode && projectData.pieces) {
                if (projectData.globals) { 
                    globalBg = projectData.globals.globalBg || '#dfe6e9'; 
                    globalBorderColor = projectData.globals.globalBorderColor || '#b2bec3'; 
                    globalBorderWidth = projectData.globals.globalBorderWidth || 4; 
                    globalTextColor = projectData.globals.globalTextColor || '#2d3436'; 
                    globalBaseSize = projectData.globals.globalBaseSize || 80; 
                    globalFontSize = projectData.globals.globalFontSize || 1.1; 
                    globalFontFamily = projectData.globals.globalFontFamily || 'Nunito'; 
                    globalMargin = projectData.globals.globalMargin || 15; 
                    globalSvgScale = projectData.globals.globalSvgScale || 1.0; 
                    
                    if (typeof globalPieceStyle !== 'undefined') globalPieceStyle = projectData.globals.globalPieceStyle || 'flat';
                    if (typeof globalColorFigures !== 'undefined') globalColorFigures = projectData.globals.globalColorFigures !== false;
                    
                    if (projectData.globals.globalBgStyle) {
                        let bgSel = document.getElementById('inp-bg-style');
                        if(bgSel) { bgSel.value = projectData.globals.globalBgStyle; updateStyleFromToolbar('inp-bg-style'); }
                    }
                }
                window.mode = projectData.mode;
                ['domino', 'triomino', 'square'].forEach(id => document.getElementById('btn-'+id)?.classList.remove('active')); document.getElementById(`btn-${window.mode}`).classList.add('active'); updateTemplatePanel();
                window.pieces = projectData.pieces; window.selectedIndex = null; window.selectedZoneIndex = null; closeEditor(true); updateGridSize(); updateToolbarUI(); fitViewToPieces(); renderAll();
                history = []; historyIndex = -1; saveState();
            } else { showAlert("⚠️ Erreur", "Le fichier sélectionné ne semble pas être un projet de L'Atelier Pro valide."); }
        } catch (err) { showAlert("⚠️ Erreur", "Impossible de lire le fichier. Il est peut-être corrompu."); }
    };
    reader.readAsText(file); event.target.value = ''; 
}

function updateTemplatePanel() {
    let tD = document.getElementById('tpl-domino'); let tT = document.getElementById('tpl-triomino'); let tS = document.getElementById('tpl-square');
    if (tD) tD.style.display = window.mode === 'domino' ? 'flex' : 'none'; if (tT) tT.style.display = window.mode === 'triomino' ? 'flex' : 'none'; if (tS) tS.style.display = window.mode === 'square' ? 'flex' : 'none';
}

function switchMode(newMode) { 
    window.mode = newMode; closeEditor(true); 
    ['domino', 'triomino', 'square'].forEach(id => document.getElementById('btn-'+id)?.classList.remove('active'));
    let btn = document.getElementById(`btn-${window.mode}`);
    if(btn) btn.classList.add('active'); 
    updateTemplatePanel(); clearBoard(); 
}

function generateTemplate(type) {
    window.pieces = []; closeEditor(true); updateGridSize(); clusterOffsetX = 0; clusterOffsetY = 0;
    let addP = (obj) => { let newId = window.pieces.length; window.pieces.push({ ...getFreshStyle(), id: newId, ...obj }); };

    // ==========================================
    // 🟦 MODE DOMINOS
    // ==========================================
    if (type === 'domino-snake-auto') { 
        window.mode = 'domino'; 
        let count = parseInt(document.getElementById('inp-domino-snake-count')?.value) || 18;
        let x = 0, y = 0, dir = 1, maxW = 10; 
        for(let i=0; i<count; i++) {
            if (i === count - 1) { 
                addP({ type: 'domino', x: x, y: y, dir: dir===1 ? 'hr' : 'hl', zones: ['?', '?'] });
            } else if ( (dir === 1 && x >= maxW) || (dir === -1 && x <= 0) ) { 
                addP({ type: 'domino', x: x, y: y, dir: 'vd', zones: ['?', '?'] });
                y += 2; dir *= -1;
            } else { 
                addP({ type: 'domino', x: x, y: y, dir: dir===1 ? 'hr' : 'hl', zones: ['?', '?'] });
                x += dir * 2;
            }
        }
    }
    else if (type === 'domino-grid-auto') {
        window.mode = 'domino';
        let cols = parseInt(document.getElementById('inp-domino-grid-c')?.value) || 3;
        let rows = parseInt(document.getElementById('inp-domino-grid-r')?.value) || 4;
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) { addP({ type: 'domino', x: c*2.5, y: r*1.5, dir: 'hr', zones: ['?', '?'] }); }
        }
    }
    else if (type === 'domino-snake-horiz') { window.mode = 'domino'; const path = [ {x:0, y:0, dir:'hr'}, {x:2, y:0, dir:'hr'}, {x:4, y:0, dir:'hr'}, {x:6, y:0, dir:'hr'}, {x:8, y:0, dir:'vd'}, {x:8, y:2, dir:'hl'}, {x:6, y:2, dir:'hl'}, {x:4, y:2, dir:'hl'}, {x:2, y:2, dir:'hl'}, {x:0, y:2, dir:'vd'}, {x:0, y:4, dir:'hr'}, {x:2, y:4, dir:'hr'}, {x:4, y:4, dir:'hr'}, {x:6, y:4, dir:'hr'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); } 
    else if (type === 'domino-snake') { window.mode = 'domino'; const path = [ {x:0, y:0, dir:'hr'}, {x:2, y:0, dir:'hr'}, {x:4, y:0, dir:'vd'}, {x:4, y:2, dir:'hl'}, {x:2, y:2, dir:'hl'}, {x:0, y:2, dir:'vd'}, {x:0, y:4, dir:'hr'}, {x:2, y:4, dir:'hr'}, {x:4, y:4, dir:'vd'}, {x:4, y:6, dir:'hl'}, {x:2, y:6, dir:'hl'}, {x:0, y:6, dir:'vd'}, {x:0, y:8, dir:'hr'}, {x:2, y:8, dir:'hr'}, {x:4, y:8, dir:'hr'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); } 
    else if (type === 'domino-escalier') { window.mode = 'domino'; const path = [ {x:0, y:0, dir:'hr'}, {x:2, y:0, dir:'vd'}, {x:2, y:2, dir:'hr'}, {x:4, y:2, dir:'vd'}, {x:4, y:4, dir:'hr'}, {x:6, y:4, dir:'vd'}, {x:6, y:6, dir:'hr'}, {x:8, y:6, dir:'vd'}, {x:8, y:8, dir:'hr'}, {x:10, y:8, dir:'vd'}, {x:10, y:10, dir:'hr'}, {x:12, y:10, dir:'vd'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); }
    else if (type === 'domino-carre') { window.mode = 'domino'; const path = [ {x:0, y:0, dir:'hr'}, {x:2, y:0, dir:'hr'}, {x:4, y:0, dir:'hr'}, {x:6, y:0, dir:'hr'}, {x:8, y:0, dir:'vd'}, {x:8, y:2, dir:'vd'}, {x:8, y:4, dir:'vd'}, {x:8, y:6, dir:'vd'}, {x:8, y:8, dir:'hl'}, {x:6, y:8, dir:'hl'}, {x:4, y:8, dir:'hl'}, {x:2, y:8, dir:'hl'}, {x:0, y:8, dir:'vu'}, {x:0, y:6, dir:'vu'}, {x:0, y:4, dir:'vu'}, {x:0, y:2, dir:'vu'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); }
    else if (type === 'domino-boucle-mini') { window.mode = 'domino'; const path = [ {x:0, y:0, dir:'hr'}, {x:2, y:0, dir:'hr'}, {x:4, y:0, dir:'vd'}, {x:4, y:2, dir:'vd'}, {x:4, y:4, dir:'hl'}, {x:2, y:4, dir:'hl'}, {x:0, y:4, dir:'vu'}, {x:0, y:2, dir:'vu'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); }
    else if (type === 'domino-loop') { window.mode = 'domino'; const path = [ {x:1, y:0, dir:'hr'}, {x:3, y:0, dir:'hr'}, {x:5, y:0, dir:'hr'}, {x:7, y:0, dir:'vd'}, {x:7, y:2, dir:'vd'}, {x:7, y:4, dir:'vd'}, {x:7, y:6, dir:'hl'}, {x:5, y:6, dir:'hl'}, {x:3, y:6, dir:'hl'}, {x:1, y:6, dir:'hl'}, {x:0, y:5, dir:'vu'}, {x:0, y:3, dir:'vu'}, {x:0, y:1, dir:'vu'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); }
    else if (type === 'domino-creneau') { window.mode = 'domino'; const path = [ {x:0,y:2,dir:'vu'}, {x:0,y:0,dir:'hr'}, {x:2,y:0,dir:'vd'}, {x:2,y:2,dir:'hr'}, {x:4,y:2,dir:'vu'}, {x:4,y:0,dir:'hr'}, {x:6,y:0,dir:'vd'}, {x:6,y:2,dir:'hr'}, {x:8,y:2,dir:'vu'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); }
    else if (type === 'domino-spiral') { window.mode = 'domino'; const path = [ {x:0, y:0, dir:'hr'}, {x:2, y:0, dir:'hr'}, {x:4, y:0, dir:'hr'}, {x:6, y:0, dir:'vd'}, {x:6, y:2, dir:'vd'}, {x:6, y:4, dir:'hl'}, {x:4, y:4, dir:'hl'}, {x:2, y:4, dir:'hl'}, {x:0, y:4, dir:'vu'}, {x:0, y:2, dir:'hr'}, {x:2, y:2, dir:'hr'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); }
    else if (type === 'domino-hollow-square') { window.mode = 'domino'; const path = [ {x:0,y:0,dir:'hr'}, {x:2,y:0,dir:'hr'}, {x:4,y:0,dir:'hr'}, {x:6,y:0,dir:'vd'}, {x:6,y:2,dir:'vd'}, {x:6,y:4,dir:'vd'}, {x:6,y:6,dir:'hl'}, {x:4,y:6,dir:'hl'}, {x:2,y:6,dir:'hl'}, {x:0,y:6,dir:'vu'}, {x:0,y:4,dir:'vu'}, {x:0,y:2,dir:'vu'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); }
    else if (type === 'domino-u') { window.mode = 'domino'; const path = [ {x:0,y:0,dir:'vd'}, {x:0,y:2,dir:'vd'}, {x:0,y:4,dir:'vd'}, {x:0,y:6,dir:'hr'}, {x:2,y:6,dir:'hr'}, {x:4,y:6,dir:'hr'}, {x:6,y:6,dir:'vu'}, {x:6,y:4,dir:'vu'}, {x:6,y:2,dir:'vu'} ]; path.forEach(p => addP({ type: 'domino', x: p.x, y: p.y, dir: p.dir, zones: ['?', '?'] })); }

    // ==========================================
    // 🔺 MODE TRIOMINOS
    // ==========================================
    else if (type === 'trio-triangle-auto') {
        window.mode = 'triomino';
        let layers = parseInt(document.getElementById('inp-trio-layers')?.value) || 4;
        for(let r=0; r<layers; r++) {
            for(let q=-r; q<=r; q++) { addP({ type: 'triomino', q: q, r: r, zones: ['?','?','?'] }); }
        }
    }
    else if (type === 'trio-grid') { 
        window.mode = 'triomino'; 
        let cols = parseInt(document.getElementById('inp-trio-grid-cols')?.value) || 6; 
        let rows = parseInt(document.getElementById('inp-trio-grid-rows')?.value) || 2; 
        for(let r=0; r<rows; r++) { 
            for(let q=0; q<cols; q++) { addP({ type: 'triomino', q: q, r: r, zones: ['?', '?', '?'] }); } 
        } 
    }
    else if (type === 'trio-custom') { // Rétrocompatibilité au cas où
        window.mode = 'triomino'; 
        let rows = parseInt(document.getElementById('inp-trio-rows')?.value) || 4; 
        for(let r=0; r<rows; r++) { 
            for(let q=-r; q<=r; q++) { addP({ type: 'triomino', q: q, r: r, zones: ['?', '?', '?'] }); } 
        } 
    }
    else if (type === 'trio-star') { window.mode = 'triomino'; const path = [ {q:0, r:0}, {q:1, r:0}, {q:2, r:0}, {q:-1, r:1}, {q:0, r:1}, {q:1, r:1}, {q:2, r:1}, {q:3, r:1}, {q:0, r:2}, {q:1, r:2}, {q:2, r:2} ]; path.forEach(p => addP({ type: 'triomino', q: p.q, r: p.r, zones: ['?', '?', '?'] })); }
    else if (type === 'trio-triangle') { window.mode = 'triomino'; const path = [ {q:0, r:0}, {q:-1, r:1}, {q:0, r:1}, {q:1, r:1}, {q:-2, r:2}, {q:-1, r:2}, {q:0, r:2}, {q:1, r:2}, {q:2, r:2} ]; path.forEach(p => addP({ type: 'triomino', q: p.q, r: p.r, zones: ['?', '?', '?'] })); }
    else if (type === 'trio-hexa') { window.mode = 'triomino'; const path = [ {q:0, r:0}, {q:1, r:0}, {q:2, r:0}, {q:0, r:1}, {q:1, r:1}, {q:2, r:1} ]; path.forEach(p => addP({ type: 'triomino', q: p.q, r: p.r, zones: ['?', '?', '?'] })); }
    else if (type === 'trio-wave') { window.mode = 'triomino'; const path = [ {q:0, r:0}, {q:1, r:0}, {q:2, r:0}, {q:2, r:-1}, {q:3, r:-1}, {q:4, r:-1}, {q:4, r:0}, {q:5, r:0}, {q:6, r:0} ]; path.forEach(p => addP({ type: 'triomino', q: p.q, r: p.r, zones: ['?', '?', '?'] })); }
    else if (type === 'trio-line') { window.mode = 'triomino'; for(let i=0; i<10; i++) { addP({ type: 'triomino', q: i, r: 0, zones: ['?', '?', '?'] }); } }

    // ==========================================
    // 🟩 MODE CARRÉS
    // ==========================================
    else if (type === 'square-pyramid') {
        window.mode = 'square';
        let base = parseInt(document.getElementById('inp-sq-pyramid')?.value) || 5;
        for(let r=0; r<base; r++) {
            for(let c=0; c<base-r; c++) { addP({ type: 'square', x: c + (r*0.5), y: base - r, zones: ['?','?','?','?'] }); }
        }
    }
    else if (type === 'square-frame-auto') {
        window.mode = 'square';
        let w = parseInt(document.getElementById('inp-sq-frame-w')?.value) || 5;
        let h = parseInt(document.getElementById('inp-sq-frame-h')?.value) || 4;
        for(let x=0; x<w; x++) { addP({ type: 'square', x: x, y: 0, zones: ['?','?','?','?'] }); if (h > 1) addP({ type: 'square', x: x, y: h-1, zones: ['?','?','?','?'] }); }
        for(let y=1; y<h-1; y++) { addP({ type: 'square', x: 0, y: y, zones: ['?','?','?','?'] }); if (w > 1) addP({ type: 'square', x: w-1, y: y, zones: ['?','?','?','?'] }); }
    }
    else if (type === 'square-custom') { 
        window.mode = 'square'; 
        let cols = parseInt(document.getElementById('inp-sq-cols')?.value) || 4; 
        let rows = parseInt(document.getElementById('inp-sq-rows')?.value) || 4; 
        for(let y=0; y<rows; y++) { 
            for(let x=0; x<cols; x++) { addP({ type: 'square', x: x*1.2, y: y*1.2, zones: ['?', '?', '?', '?'] }); } 
        } 
    }
    else if (type === 'square-cross') { window.mode = 'square'; const path = [ {x:2,y:0}, {x:2,y:1}, {x:0,y:2}, {x:1,y:2}, {x:2,y:2}, {x:3,y:2}, {x:4,y:2}, {x:2,y:3}, {x:2,y:4} ]; path.forEach(p => addP({ type: 'square', x: p.x, y: p.y, zones: ['?', '?', '?', '?'] })); }
    else if (type === 'square-grid3x3') { window.mode = 'square'; for(let y=0; y<3; y++) { for(let x=0; x<3; x++) { addP({ type: 'square', x: x, y: y, zones: ['?', '?', '?', '?'] }); } } }
    else if (type === 'square-bloc') { window.mode = 'square'; for(let y=0; y<3; y++) { for(let x=0; x<4; x++) { addP({ type: 'square', x: x, y: y, zones: ['?', '?', '?', '?'] }); } } }
    else if (type === 'square-frame') { window.mode = 'square'; const path = [ {x:0, y:0}, {x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:3, y:1}, {x:3, y:2}, {x:3, y:3}, {x:2, y:3}, {x:1, y:3}, {x:0, y:3}, {x:0, y:2}, {x:0, y:1} ]; path.forEach(p => addP({ type: 'square', x: p.x, y: p.y, zones: ['?', '?', '?', '?'] })); }

    // 🔄 Mise à jour de l'interface
    ['domino', 'triomino', 'square'].forEach(id => document.getElementById('btn-'+id)?.classList.remove('active'));
    let btn = document.getElementById(`btn-${window.mode}`);
    if(btn) btn.classList.add('active'); 

    window.selectedIndex = null; window.selectedZoneIndex = null; updateToolbarUI(); updateTemplatePanel();
    fitViewToPieces(); renderAll(); saveState(); 
}

function clearBoard() { 
    window.pieces = []; closeEditor(true); updateGridSize(); clusterOffsetX = 0; clusterOffsetY = 0; 
    if(window.mode === 'domino') { window.pieces.push({ ...getFreshStyle(), type: 'domino', id: 0, x: 0, y: 0, dir: 'hr', zones: ['?', '?'] }); } 
    else if (window.mode === 'triomino') { window.pieces.push({ ...getFreshStyle(), type: 'triomino', id: 0, q: 0, r: 0, zones: ['?', '?', '?'] }); } 
    else if (window.mode === 'square') { window.pieces.push({ ...getFreshStyle(), type: 'square', id: 0, x: 0, y: 0, zones: ['?', '?', '?', '?'] }); }
    window.selectedIndex = null; window.selectedZoneIndex = null; updateToolbarUI(); resetView(); renderAll(); 
    history = []; historyIndex = -1; saveState();
}

function loadDemo() {
    globalBaseSize = 80; globalBorderWidth = 4; globalMargin = 15; globalSvgScale = 1.0; globalFontSize = 1.1; globalTextColor = '#2d3436';
    updateGridSize(); clusterOffsetX = 0; clusterOffsetY = 0;
    if (window.mode === 'domino') {
        window.pieces = [ { ...getFreshStyle(), type: 'domino', id: 0, x: 0, y: 0, dir: 'hr', zones: ['DÉBUT', 'Chat'] }, { ...getFreshStyle(), type: 'domino', id: 1, x: 2, y: 0, dir: 'vd', zones: ['Cat', 'Chien'] }, { ...getFreshStyle(), type: 'domino', id: 2, x: 2, y: 2, dir: 'hl', zones: ['Dog', 'Oiseau'] }, { ...getFreshStyle(), type: 'domino', id: 3, x: 0, y: 2, dir: 'vu', zones: ['Bird', 'FIN'] } ];
    } 
    window.selectedIndex = null; window.selectedZoneIndex = null; updateToolbarUI(); fitViewToPieces(); renderAll(); saveState();
}

function toggleStyleToolbar() { 
    let tb = document.getElementById('style-toolbar');
    if (tb) tb.classList.toggle('collapsed');
    setTimeout(fitViewToPieces, 350);
}

function updateToolbarUI() { 
    const label = document.getElementById('toolbar-label'); 
    const btnApplyAll = document.getElementById('btn-apply-all'); 
    const btnDelete = document.getElementById('btn-delete-piece');
    
    let inpStyle = document.getElementById('inp-piece-style'); 
    if(inpStyle && typeof globalPieceStyle !== 'undefined') inpStyle.value = globalPieceStyle;
    
    let inpColorFig = document.getElementById('inp-color-figures'); 
    if(inpColorFig && typeof globalColorFigures !== 'undefined') inpColorFig.checked = globalColorFigures;
    
    if (window.selectedIndex === null) { 
        if(label) { label.innerHTML = "🖌️ Couleurs (Individuel)"; label.style.color = "var(--text-dark)"; }
        if(btnApplyAll) btnApplyAll.style.display = 'none'; 
        if (btnDelete) btnDelete.style.display = 'none';
        
        let inpTextColor = document.getElementById('inp-text-color'); if(inpTextColor) inpTextColor.value = globalTextColor;
        let inpBg = document.getElementById('inp-bg'); if(inpBg) inpBg.value = globalBg;
        let inpBorder = document.getElementById('inp-border'); if(inpBorder) inpBorder.value = globalBorderColor;
        let inpWidth = document.getElementById('inp-width'); if(inpWidth) inpWidth.value = globalBorderWidth;
        let widthVal = document.getElementById('width-val'); if(widthVal) widthVal.innerText = globalBorderWidth;
        
        let inpSize = document.getElementById('inp-size'); if(inpSize) inpSize.value = globalBaseSize;
        let inpFontSize = document.getElementById('inp-font-size'); if(inpFontSize) inpFontSize.value = globalFontSize;
        let fontSizeVal = document.getElementById('font-size-val'); if(fontSizeVal) fontSizeVal.innerText = globalFontSize.toFixed(1);
        let inpFontFamily = document.getElementById('inp-font-family'); if(inpFontFamily) inpFontFamily.value = globalFontFamily;
        let inpMargin = document.getElementById('inp-margin'); if(inpMargin) inpMargin.value = globalMargin;
        let marginVal = document.getElementById('margin-val'); if(marginVal) marginVal.innerText = globalMargin;
        let inpSvgScale = document.getElementById('inp-svg-scale'); if(inpSvgScale) inpSvgScale.value = globalSvgScale;
        let svgScaleVal = document.getElementById('svg-scale-val'); if(svgScaleVal) svgScaleVal.innerText = globalSvgScale.toFixed(1);
    } else { 
        let p = window.pieces.find(p => p.id === window.selectedIndex); 
        if (!p) return;
        if(label) { label.innerHTML = `✨ Pièce Sélectionnée`; label.style.color = "#e17055"; }
        if(btnApplyAll) btnApplyAll.style.display = 'block'; 
        if (btnDelete) btnDelete.style.display = 'block';
        
        let zIdx = window.selectedZoneIndex !== null ? window.selectedZoneIndex : 0;
        let tColor = p.textColors ? p.textColors[zIdx] : globalTextColor; 
        let inpTextColor = document.getElementById('inp-text-color'); if(inpTextColor) inpTextColor.value = tColor;
        let inpBg = document.getElementById('inp-bg'); if(inpBg) inpBg.value = p.bg;
        let inpBorder = document.getElementById('inp-border'); if(inpBorder) inpBorder.value = p.border;
        let inpWidth = document.getElementById('inp-width'); if(inpWidth) inpWidth.value = p.width;
        let widthVal = document.getElementById('width-val'); if(widthVal) widthVal.innerText = p.width;
        
        let fSize = p.fontSizes ? p.fontSizes[zIdx] : (p.fontSize || globalFontSize); 
        let fFam = p.fontFamilies ? p.fontFamilies[zIdx] : (p.fontFamily || globalFontFamily); 
        let pMargin = p.margin !== undefined ? p.margin : globalMargin; 
        let pSvgScale = p.svgScales ? p.svgScales[zIdx] : (p.svgScale || globalSvgScale);
        
        let inpFontSize = document.getElementById('inp-font-size'); if(inpFontSize) inpFontSize.value = fSize;
        let fontSizeVal = document.getElementById('font-size-val'); if(fontSizeVal) fontSizeVal.innerText = fSize.toFixed(1);
        let inpFontFamily = document.getElementById('inp-font-family'); if(inpFontFamily) inpFontFamily.value = fFam;
        let inpMarginDoc = document.getElementById('inp-margin'); if(inpMarginDoc) inpMarginDoc.value = pMargin;
        let marginVal = document.getElementById('margin-val'); if(marginVal) marginVal.innerText = pMargin;
        let inpSvgScaleDoc = document.getElementById('inp-svg-scale'); if(inpSvgScaleDoc) inpSvgScaleDoc.value = pSvgScale;
        let svgScaleVal = document.getElementById('svg-scale-val'); if(svgScaleVal) svgScaleVal.innerText = pSvgScale.toFixed(1);
    } 
}

function updateStyleFromToolbar(sourceId = null) { 
    const inpTextColor = document.getElementById('inp-text-color').value; 
    const inpBg = document.getElementById('inp-bg').value; 
    const inpBorder = document.getElementById('inp-border').value; 
    const inpWidth = parseInt(document.getElementById('inp-width').value); 
    globalBaseSize = parseInt(document.getElementById('inp-size').value); 
    const inpFontSize = parseFloat(document.getElementById('inp-font-size').value); 
    const inpFontFamily = document.getElementById('inp-font-family').value; 
    const inpMargin = parseInt(document.getElementById('inp-margin').value); 
    const inpSvgScale = parseFloat(document.getElementById('inp-svg-scale').value);
    
    let inpStyle = document.getElementById('inp-piece-style') ? document.getElementById('inp-piece-style').value : 'flat';
    let inpColorFig = document.getElementById('inp-color-figures') ? document.getElementById('inp-color-figures').checked : true;
    let bgStyleSel = document.getElementById('inp-bg-style');
    let bgStyle = bgStyleSel ? bgStyleSel.value : 'uni';

    let widthVal = document.getElementById('width-val'); if(widthVal) widthVal.innerText = inpWidth;
    let fontVal = document.getElementById('font-size-val'); if(fontVal) fontVal.innerText = inpFontSize.toFixed(1);
    let mrgVal = document.getElementById('margin-val'); if(mrgVal) mrgVal.innerText = inpMargin;
    let svgVal = document.getElementById('svg-scale-val'); if(svgVal) svgVal.innerText = inpSvgScale.toFixed(1);

    if (viewport) {
        viewport.classList.remove('bg-aube', 'bg-nuit', 'bg-abysses', 'bg-foret');
        if (bgStyle !== 'uni') viewport.classList.add('bg-' + bgStyle);
    }

    if (window.selectedIndex === null) { 
        globalBg = inpBg; globalBorderColor = inpBorder; globalMargin = inpMargin; globalFontSize = inpFontSize; globalFontFamily = inpFontFamily; globalSvgScale = inpSvgScale; globalTextColor = inpTextColor; globalBorderWidth = inpWidth; 
        globalPieceStyle = inpStyle;
        globalColorFigures = inpColorFig;
        
        if (globalColorFigures) document.body.classList.remove('no-figure-colors');
        else document.body.classList.add('no-figure-colors');

        document.querySelectorAll('.piece').forEach(el => {
            el.classList.remove('style-3d', 'style-wood', 'style-cristal', 'style-gradient');
            if (globalPieceStyle === '3d') el.classList.add('style-3d');
            else if (globalPieceStyle === 'wood') el.classList.add('style-wood');
            else if (globalPieceStyle === 'cristal') el.classList.add('style-cristal');
            else if (globalPieceStyle === 'gradient') el.classList.add('style-gradient');
        });

        window.pieces.forEach(p => { 
            p.bg = globalBg; 
            p.border = globalBorderColor;
            p.width = globalBorderWidth;
            p.margin = globalMargin; 
            p.fontSizes = [globalFontSize, globalFontSize, globalFontSize, globalFontSize]; 
            p.fontFamilies = [globalFontFamily, globalFontFamily, globalFontFamily, globalFontFamily]; 
            p.svgScales = [globalSvgScale, globalSvgScale, globalSvgScale, globalSvgScale]; 
            p.textColors = [globalTextColor, globalTextColor, globalTextColor, globalTextColor]; 
        });
    } else { 
        let p = window.pieces.find(p => p.id === window.selectedIndex); 
        p.bg = inpBg; p.border = inpBorder; p.margin = inpMargin; if (p.width !== inpWidth) p.width = inpWidth; 
        if (!p.fontSizes) p.fontSizes = [globalFontSize, globalFontSize, globalFontSize, globalFontSize]; if (!p.fontFamilies) p.fontFamilies = [globalFontFamily, globalFontFamily, globalFontFamily, globalFontFamily]; if (!p.svgScales) p.svgScales = [globalSvgScale, globalSvgScale, globalSvgScale, globalSvgScale]; if (!p.textColors) p.textColors = [globalTextColor, globalTextColor, globalTextColor, globalTextColor]; 

        if (window.selectedZoneIndex !== null) { 
            p.fontSizes[window.selectedZoneIndex] = inpFontSize; p.fontFamilies[window.selectedZoneIndex] = inpFontFamily; p.svgScales[window.selectedZoneIndex] = inpSvgScale; p.textColors[window.selectedZoneIndex] = inpTextColor; 
        } else { 
            p.fontSizes = [inpFontSize, inpFontSize, inpFontSize, inpFontSize]; p.fontFamilies = [inpFontFamily, inpFontFamily, inpFontFamily, inpFontFamily]; p.svgScales = [inpSvgScale, inpSvgScale, inpSvgScale, inpSvgScale]; p.textColors = [inpTextColor, inpTextColor, inpTextColor, inpTextColor]; 
        }
    } 
    updateGridSize(); renderAll(); saveState(); 
}

function applyStyleToAll() { 
    if (window.selectedIndex !== null) { 
        let p = window.pieces.find(p => p.id === window.selectedIndex); let zIdx = window.selectedZoneIndex !== null ? window.selectedZoneIndex : 0;
        globalBg = p.bg; globalBorderColor = p.border; globalBorderWidth = p.width; globalMargin = p.margin; globalFontSize = p.fontSizes ? p.fontSizes[zIdx] : globalFontSize; globalFontFamily = p.fontFamilies ? p.fontFamilies[zIdx] : globalFontFamily; globalSvgScale = p.svgScales ? p.svgScales[zIdx] : globalSvgScale; globalTextColor = p.textColors ? p.textColors[zIdx] : globalTextColor;
        window.pieces.forEach(piece => { piece.bg = globalBg; piece.border = globalBorderColor; piece.width = globalBorderWidth; piece.margin = globalMargin; piece.fontSizes = [globalFontSize, globalFontSize, globalFontSize, globalFontSize]; piece.fontFamilies = [globalFontFamily, globalFontFamily, globalFontFamily, globalFontFamily]; piece.svgScales = [globalSvgScale, globalSvgScale, globalSvgScale, globalSvgScale]; piece.textColors = [globalTextColor, globalTextColor, globalTextColor, globalTextColor]; }); 
        updateGridSize(); renderAll(); saveState(); 
    } 
}

function toggleLeftPanel(panelId) {
    const panel = document.getElementById('tools-panel'); 
    const sections = document.querySelectorAll('.panel-section'); 
    const btns = document.querySelectorAll('.rail-btn'); 
    let targetSection = document.getElementById('panel-' + panelId); 
    let targetBtn = document.getElementById('rail-btn-' + panelId);
    
    let isActive = targetBtn ? targetBtn.classList.contains('active') : false;
    
    if (isActive && panel && !panel.classList.contains('collapsed')) { 
        panel.classList.add('collapsed'); 
        if(targetBtn) targetBtn.classList.remove('active'); 
        setTimeout(fitViewToPieces, 350);
        return; 
    }
    
    if(panel) panel.classList.remove('collapsed'); 
    btns.forEach(btn => btn.classList.remove('active')); 
    sections.forEach(sec => sec.style.display = 'none');
    
    if(targetBtn) targetBtn.classList.add('active'); 
    if(targetSection) targetSection.style.display = 'block';
    
    setTimeout(fitViewToPieces, 350);
}

function toggleAccordion(element) { element.parentElement.classList.toggle('open'); }

window.onload = () => { 
    viewport = document.getElementById('viewport'); 
    canvasContent = document.getElementById('canvas-content'); 
    editor = document.getElementById('floating-editor');
    
    if(viewport) {
        viewport.addEventListener('mousedown', handleMouseDown);
        viewport.addEventListener('wheel', handleWheel, { passive: false });
        viewport.addEventListener('dblclick', handleDoubleClick);
        setupDragAndDrop();
    }
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    initMediaPanel();
    updateTemplatePanel(); 
    updateGridSize(); 
    clearBoard(); 
};

// ==========================================
// 🎥 MOTEUR D'ENREGISTREMENT D'ÉCRAN (WEBM)
// ==========================================
let mediaRecorder;
let recordedChunks = [];
let screenStream;

async function toggleRecording() {
    const btn = document.getElementById('btn-record');
    
    // Si on enregistre déjà, on coupe
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        if (screenStream) screenStream.getTracks().forEach(track => track.stop());
        btn.classList.remove('is-recording');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>REC`;
        
        // On quitte le plein écran à la fin de la vidéo
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
        return;
    }

    try {
        // 1. On demande l'autorisation de filmer EN PREMIER (la popup Chrome s'ouvre ici)
        screenStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { cursor: "always" }, 
            audio: false 
        });
        
        // 2. Une fois que l'utilisateur a cliqué sur "Partager", on passe en plein écran
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
            // 3. On fait une petite pause de 500ms pour que l'animation du plein écran se termine
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 4. SEULEMENT MAINTENANT on prépare et on lance le moteur vidéo ! (La vidéo sera impeccable)
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(screenStream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Demo_Atelier_Pro_${window.mode}.webm`;
            a.click();
            URL.revokeObjectURL(url);
        };

        screenStream.getVideoTracks()[0].onended = () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
            btn.classList.remove('is-recording');
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>REC`;
        };

        // ACTION ! Le clapet de tournage se baisse ici.
        mediaRecorder.start();
        
        btn.classList.add('is-recording');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" ry="2" fill="currentColor"></rect></svg>STOP`;
        
    } catch (err) {
        console.error("Erreur d'enregistrement :", err);
        showAlert("⚠️ Action annulée", "L'enregistrement a été annulé ou votre navigateur bloque la capture.");
    }
}

// ==========================================
// 🖥️ GESTION DU PLEIN ÉCRAN
// ==========================================
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        // On demande au navigateur de mettre toute la page (documentElement) en plein écran
        document.documentElement.requestFullscreen().catch(err => {
            showAlert("⚠️ Erreur", `Le plein écran a été bloqué par votre navigateur.`);
        });
    } else {
        // On quitte le plein écran
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Un écouteur pour changer l'icône si l'utilisateur appuie sur "Echap"
document.addEventListener('fullscreenchange', () => {
    const iconEnter = document.getElementById('icon-fs-enter');
    const iconExit = document.getElementById('icon-fs-exit');
    
    if (document.fullscreenElement) {
        if (iconEnter) iconEnter.style.display = 'none';
        if (iconExit) iconExit.style.display = 'block';
    } else {
        if (iconEnter) iconEnter.style.display = 'block';
        if (iconExit) iconExit.style.display = 'none';
    }
    
    // On recadre automatiquement la vue pour que ça prenne tout l'écran proprement !
    setTimeout(fitViewToPieces, 200);
});

// ==========================================
// 🎯 INJECTION INDIVIDUELLE (SYSTÈME Q/R)
// ==========================================
let lastGeneratedSinglePair = null;
let lastGeneratedSingleType = null;

function injectSingle(type, part) {
    if (window.selectedIndex === null || window.selectedZoneIndex === null) {
        showAlert("⚠️ Cible requise", "Cliquez d'abord sur la case vide d'un domino sur le plateau !");
        return;
    }
    
    let p = window.pieces.find(x => x.id === window.selectedIndex);
    if (!p) return;

    // Si le prof demande la réponse de la question qu'il vient JUSTE de poser
    if (part === 'a' && lastGeneratedSinglePair && lastGeneratedSingleType === type) {
        p.zones[window.selectedZoneIndex] = lastGeneratedSinglePair.a;
        lastGeneratedSinglePair = null; // On réinitialise après avoir posé la réponse !
    } else {
        // Sinon, on génère une nouvelle paire de calcul/équation unique
        let pairs = getPairsList(1, type);
        if (pairs && pairs.length > 0) {
            lastGeneratedSinglePair = pairs[0];
            lastGeneratedSingleType = type;
            p.zones[window.selectedZoneIndex] = part === 'q' ? lastGeneratedSinglePair.q : lastGeneratedSinglePair.a;
        }
    }
    
    renderAll();
    saveState();
}

// ==========================================
// 📐 INJECTEUR GÉOMÉTRIQUE (Aires & Pythagore)
// ==========================================
function updateGeoInjectorUI() {
    let typeSelect = document.getElementById('inj-geo-type');
    let fields = document.getElementById('inj-geo-fields');
    if(!typeSelect || !fields) return;
    
    let type = typeSelect.value;
    let html = '';
    
    // Champs pour les Aires simples
    if (type === 'rect' || type === 'tri' || type === 'para') {
        html = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:11px; font-weight:800; color:var(--text-dark);">Base (px)</label>
                <input type="number" id="inj-geo-w" value="6" style="width:50px; text-align:center; padding:4px; border:2px solid #dfe6e9; border-radius:4px; font-family:Nunito; font-weight:900; font-size:12px;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:11px; font-weight:800; color:var(--text-dark);">Hauteur (px)</label>
                <input type="number" id="inj-geo-h" value="4" style="width:50px; text-align:center; padding:4px; border:2px solid #dfe6e9; border-radius:4px; font-family:Nunito; font-weight:900; font-size:12px;">
            </div>
        `;
    } 
    // Champs pour le Losange
    else if (type === 'los') {
        html = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:11px; font-weight:800; color:var(--text-dark);">Diagonale 1</label>
                <input type="number" id="inj-geo-w" value="6" style="width:50px; text-align:center; padding:4px; border:2px solid #dfe6e9; border-radius:4px; font-family:Nunito; font-weight:900; font-size:12px;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:11px; font-weight:800; color:var(--text-dark);">Diagonale 2</label>
                <input type="number" id="inj-geo-h" value="4" style="width:50px; text-align:center; padding:4px; border:2px solid #dfe6e9; border-radius:4px; font-family:Nunito; font-weight:900; font-size:12px;">
            </div>
        `;
    }
    // Champs pour Pythagore
    else if (type === 'pyth') {
        html = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:11px; font-weight:800; color:var(--text-dark);">Côté 1</label>
                <input type="number" id="inj-geo-w" value="3" style="width:50px; text-align:center; padding:4px; border:2px solid #dfe6e9; border-radius:4px; font-family:Nunito; font-weight:900; font-size:12px;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:11px; font-weight:800; color:var(--text-dark);">Côté 2</label>
                <input type="number" id="inj-geo-h" value="4" style="width:50px; text-align:center; padding:4px; border:2px solid #dfe6e9; border-radius:4px; font-family:Nunito; font-weight:900; font-size:12px;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:11px; font-weight:800; color:var(--text-dark);">Inconnue (?)</label>
                <select id="inj-geo-ask" style="width:85px; font-size:10px; padding:4px; border:2px solid #dfe6e9; border-radius:4px; font-family:Nunito; font-weight:800;">
                    <option value="2">Hypoténuse</option>
                    <option value="0">Côté 1</option>
                    <option value="1">Côté 2</option>
                </select>
            </div>
        `;
    }
    fields.innerHTML = html;
}

// Initialiser le formulaire au chargement
setTimeout(updateGeoInjectorUI, 500);

function injectAdvancedGeo() {
    if (window.selectedIndex === null || window.selectedZoneIndex === null) {
        showAlert("⚠️ Cible requise", "Cliquez sur une case vide du plateau !"); 
        return;
    }
    let type = document.getElementById('inj-geo-type').value;
    let svg = '';
    let w = parseFloat(document.getElementById('inj-geo-w').value) || 0;
    let h = parseFloat(document.getElementById('inj-geo-h').value) || 0;

    if (type === 'rect' || type === 'tri' || type === 'para' || type === 'los') {
        svg = generateAreaSvg(type, w, h);
    } else if (type === 'pyth') {
        let ask = parseInt(document.getElementById('inj-geo-ask').value);
        let hyp = Math.sqrt(w*w + h*h).toFixed(1).replace('.0','');
        svg = generatePythagoreSvg(w, h, hyp, ask);
    }
    
    window.pieces.find(p => p.id === window.selectedIndex).zones[window.selectedZoneIndex] = svg;
    renderAll(); 
    saveState();
}

// ==========================================
// 🎮 GESTION DU MODE JEU (CHEVALET ET CONFETTIS)
// ==========================================

function toggleGameMode() {
    window.isGameMode = !window.isGameMode;
    const quitBtn = document.getElementById('btn-quit-game');
    const vp = getVisibleViewport();

    if (window.isGameMode) {
        closeEditor(true);
        window.selectedIndex = null;
        window.selectedZoneIndex = null;
        updateSelectionUI();
        
        document.body.classList.add('game-mode-active');
        if (quitBtn) quitBtn.style.display = 'block';
        
        // 1. Créer le calque "fantôme" (la solution)
        let ghostBoard = document.createElement('div');
        ghostBoard.id = 'game-ghost-board';
        window.pieces.forEach(p => {
            let ghost = createPieceElement(p, false, false); 
            ghostBoard.appendChild(ghost);
        });
        document.getElementById('canvas-content').appendChild(ghostBoard);
        
        // 2. Calculer l'espace brut du labyrinthe
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let step = typeof CELL !== 'undefined' ? CELL : 80;
        
        window.pieces.forEach(p => {
            let pos = getPiecePos(p);
            let trueX = pos.x + clusterOffsetX;
            let trueY = pos.y + clusterOffsetY;
            
            let w = p.type === 'domino' ? (p.dir === 'hr' || p.dir === 'hl' ? step*2 : step) : (p.type === 'square' ? C_S : T_W);
            let h = p.type === 'domino' ? (p.dir === 'vd' || p.dir === 'vu' ? step*2 : step) : (p.type === 'square' ? C_S : T_H);
            
            minX = Math.min(minX, trueX);
            maxX = Math.max(maxX, trueX + w);
            minY = Math.min(minY, trueY);
            maxY = Math.max(maxY, trueY + h);
        });

        // 3. LE CHEVALET INTELLIGENT (Recherche du zoom optimal)
        let spacingX = step * 2.8; 
        let spacingY = step * 2.2; 
        let gapY = step * 1.5; // Espace entre le plateau et les dominos
        let padding = 40; // Marge de l'écran

        let bestCols = 1;
        let maxZoom = 0;

        // 🎯 L'algorithme magique : teste toutes les combinaisons de colonnes possibles
        // et retient celle qui permet de zoomer le plus gros à l'écran !
        for (let c = 1; c <= window.pieces.length; c++) {
            let r = Math.ceil(window.pieces.length / c);
            let currentTotalW = Math.max(maxX - minX, c * spacingX);
            let currentTotalH = (maxY - minY) + gapY + (r * spacingY);
            
            let scaleX = (vp.width - padding) / currentTotalW;
            let scaleY = (vp.height - padding) / currentTotalH;
            let currentZoom = Math.min(scaleX, scaleY);
            
            if (currentZoom > maxZoom) {
                maxZoom = currentZoom;
                bestCols = c;
            }
        }

        // On applique la meilleure disposition trouvée
        let cols = bestCols;
        let startX = ((minX + maxX) / 2) - ((cols * spacingX) / 2) + (spacingX / 2);
        let startY = maxY + gapY; 
        
        window.pieces.forEach((p, index) => {
            p.isSnapped = false;
            p.currentSlotId = null;
            
            let row = Math.floor(index / cols);
            let col = index % cols;
            
            p.gameX = startX + (col * spacingX) + (Math.random() * 30 - 15);
            p.gameY = startY + (row * spacingY) + (Math.random() * 30 - 15);
            p.gameRot = 0; 
        });
        
        // 4. LA CAMÉRA DYNAMIQUE
        let totalW = Math.max(maxX - minX, cols * spacingX);
        let totalH = (maxY - minY) + gapY + Math.ceil(window.pieces.length / cols) * spacingY;
        
        window.scale = Math.min(maxZoom, 1.8); // On autorise un zoom très généreux
        let centerX = minX + totalW / 2;
        let centerY = minY + totalH / 2;
        
        window.panX = Math.round(vp.centerX - (centerX * window.scale));
        window.panY = Math.round(vp.centerY - (centerY * window.scale));
        applyTransform();

    } else {
        // Quitter le mode jeu
        document.body.classList.remove('game-mode-active');
        if (quitBtn) quitBtn.style.display = 'none';
        
        let ghostBoard = document.getElementById('game-ghost-board');
        if (ghostBoard) ghostBoard.remove();
        
        window.pieces.forEach(p => {
            p.isSnapped = false;
            p.currentSlotId = null;
            delete p.gameX;
            delete p.gameY;
            delete p.gameRot;
        });
        fitViewToPieces(); 
    }
    renderAll();
}

// Vérifie si deux formes sont emboîtables
function isSameShape(p1, p2) {
    if (p1.type !== p2.type) return false;
    if (p1.type === 'domino') return p1.dir === p2.dir;
    if (p1.type === 'triomino') {
        let isUp1 = (Math.round(p1.q) + Math.round(p1.r)) % 2 === 0;
        let isUp2 = (Math.round(p2.q) + Math.round(p2.r)) % 2 === 0;
        return isUp1 === isUp2;
    }
    return true; 
}

// Les confettis de la victoire
function createConfetti() {
    const colors = ['#0984e3', '#00b894', '#fdcb6e', '#d63031', '#6c5ce7'];
    for (let i = 0; i < 120; i++) {
        let conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = (Math.random() * 100) + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        conf.style.animationDelay = (Math.random() * 0.5) + 's';
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 5000);
    }
}

// Vérifie si deux formes sont emboîtables
function isSameShape(p1, p2) {
    if (p1.type !== p2.type) return false;
    if (p1.type === 'domino') return p1.dir === p2.dir;
    if (p1.type === 'triomino') {
        let isUp1 = (Math.round(p1.q) + Math.round(p1.r)) % 2 === 0;
        let isUp2 = (Math.round(p2.q) + Math.round(p2.r)) % 2 === 0;
        return isUp1 === isUp2;
    }
    return true; // Les carrés s'emboîtent toujours
}

// Les confettis de la victoire
function createConfetti() {
    const colors = ['#0984e3', '#00b894', '#fdcb6e', '#d63031', '#6c5ce7'];
    for (let i = 0; i < 120; i++) {
        let conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = (Math.random() * 100) + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        conf.style.animationDelay = (Math.random() * 0.5) + 's';
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 5000);
    }
}