/**
 * export-pdf.js
 * LE STUDIO D'IMPRESSION A4 🖨️
 * Calcule l'espace disponible, applique les échelles (Synchronisées !), et génère 
 * des feuilles A4 parfaites selon le mode d'économie de papier choisi.
 */

let currentExportData = { emptyBoardSvg: "", cutoutsSvg: "", boardSvg: "", boardW: 0, boardH: 0, cutW: 0, cutH: 0 };

// 🎯 On stocke le mélange ici pour qu'il soit identique entre l'aperçu et le PDF
let exportShuffledPieces = []; 

function openPreview() {
    exportShuffledPieces = [...window.pieces].sort(() => Math.random() - 0.5);

    document.getElementById('preview-viewport').style.display = 'flex';
    let layoutSelect = document.getElementById('export-layout');
    let orientationSelect = document.getElementById('export-orientation');
    if(layoutSelect) layoutSelect.onchange = renderVectorPreview;
    if(orientationSelect) orientationSelect.onchange = renderVectorPreview;
    renderVectorPreview();
}

function closePreview() {
    document.getElementById('preview-viewport').style.display = 'none';
}

function generatePureSVG(p, targetX, targetY, isBlank = false) {
    let mergeCb = document.getElementById('inp-merge');
    let merge = mergeCb ? mergeCb.checked : true;
    let offset = merge && window.mode === 'domino' ? (parseInt(globalBorderWidth) || 4) : 0;
    
    let step = typeof CELL !== 'undefined' ? CELL : 80;

    let strokeW = parseFloat(p.width) || parseFloat(globalBorderWidth) || 4;
    let getTColor = (idx) => p.textColors ? p.textColors[idx] : globalTextColor;
    let getFSize = (idx) => p.fontSizes ? p.fontSizes[idx] : (p.fontSize || globalFontSize);
    let getSvgS = (idx) => p.svgScales ? parseFloat(p.svgScales[idx]) : (parseFloat(p.svgScale) || globalSvgScale || 1.0);
    let autoFit = document.getElementById('inp-auto-fit')?.checked ?? true;
    
    // 🎨 GESTION DES MATIÈRES
    let is3D = (typeof globalPieceStyle !== 'undefined' && globalPieceStyle === '3d');
    let isWood = (typeof globalPieceStyle !== 'undefined' && globalPieceStyle === 'wood');
    let isCristal = (typeof globalPieceStyle !== 'undefined' && globalPieceStyle === 'cristal');
    let isGradient = (typeof globalPieceStyle !== 'undefined' && globalPieceStyle === 'gradient');
    
    let filterAttr = "";
    if (!merge && !isBlank) {
        if (is3D) filterAttr = `filter="url(#shadow-3d)"`;
        else if (isWood) filterAttr = `filter="url(#shadow-wood)"`;
        else if (isCristal) filterAttr = `filter="url(#shadow-cristal)"`;
        else if (isGradient) filterAttr = `filter="url(#shadow-gradient)"`;
    }
    
    let getDynamicFSizePx = (textStr, basePx) => {
        if (!autoFit || !textStr || isBlank) return basePx;
        let s = String(textStr);
        if (s.includes('<svg') || s.includes('<img')) return basePx;
        let plain = s.replace(/<[^>]*>?/gm, '').trim();
        let len = plain.length;
        if (len <= 4) return basePx;
        let ratio = 4.2 / len;
        return Math.max(basePx * 0.35, basePx * Math.pow(ratio, 0.7));
    };

    function renderZone(content, tColor, fSizePx, svgScale, svgSizeBox, cx, cy, rot, oX, oY, mDir = 1, mU = 0) {
        if (!content) return "";
        oX = parseFloat(oX) || 0;
        oY = parseFloat(oY) || 0;
        
        let yOffset = mDir * mU; 
        
        if (content.includes('<svg')) {
            let match = content.match(/viewBox="([^"]+)"/);
            let vb = match ? match[1].split(/[ ,]+/) : [0, 0, 100, 100];
            let vbW = parseFloat(vb[2]) || 100; 
            let vbH = parseFloat(vb[3]) || 100;
            
            let innerContent = content.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
            innerContent = innerContent.replace(/dominant-baseline="central"/g, 'dy="0.35em"');
            innerContent = innerContent.replace(/font-family="inherit"/g, `font-family="Nunito"`);
            
            innerContent = innerContent.replace(/<text([^>]*)paint-order="stroke"([^>]*)>(.*?)<\/text>/gi, (match, p1, p2, textVal) => {
                let attrs = p1 + p2;
                let strokeAttrs = attrs.replace(/fill="[^"]*"/g, 'fill="none"');
                let fillAttrs = attrs.replace(/stroke="[^"]*"/g, '').replace(/stroke-width="[^"]*"/g, '');
                return `<text${strokeAttrs}>${textVal}</text><text${fillAttrs}>${textVal}</text>`;
            });

            innerContent = innerContent.replace(/font-weight="900"/g, 'font-weight="bold"');

            let isVis = content.match(/overflow\s*[:=]\s*["']?visible["']?/i);
            if (!isVis) {
                let clipId = 'clip-' + Math.random().toString(36).substr(2, 9);
                innerContent = `<defs><clipPath id="${clipId}"><rect x="0" y="0" width="${vbW}" height="${vbH}"/></clipPath></defs><g clip-path="url(#${clipId})">${innerContent}</g>`;
            }
            
            let targetSize = svgSizeBox * svgScale; 
            let scale = Math.min(targetSize / vbW, targetSize / vbH);
            if (isNaN(scale) || scale === Infinity) scale = 1;
            
            let cxInner = vbW / 2; let cyInner = vbH / 2;
            return `<g transform="translate(${cx}, ${cy}) rotate(${rot}) translate(${oX}, ${yOffset + oY}) scale(${scale}) translate(${-cxInner}, ${-cyInner})">${innerContent}</g>`;
        } else {
            let plain = content.replace(/<[^>]*>?/gm, '').trim();
            plain = plain.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); 
            return `<g transform="translate(${cx}, ${cy}) rotate(${rot})"><text x="${oX}" y="${yOffset + oY}" dy="0.35em" font-family="Nunito" font-size="${fSizePx.toFixed(2)}px" font-weight="bold" fill="${tColor}" text-anchor="middle">${plain}</text></g>`;
        }
    }

    let getZ = (idx) => isBlank ? "" : String(p.zones[idx] || "").replace(/currentColor/g, getTColor(idx));
    let z0 = getZ(0), z1 = getZ(1), z2 = getZ(2), z3 = getZ(3);
    let m = p.margin !== undefined ? parseFloat(p.margin) : globalMargin; 
    let oX = p.offsetX || [0,0,0,0]; let oY = p.offsetY || [0,0,0,0]; 

    let pBg = isBlank ? '#ffffff' : (p.bg || '#fff');

    if (p.type === 'domino') {
        let isH = (p.dir === 'hr' || p.dir === 'hl');
        let w = isH ? step * 2 + offset : step + offset; 
        let h = isH ? step + offset : step * 2 + offset;
        let rx = strokeW / 2;
        let rw = Math.max(1, w - strokeW);
        let rh = Math.max(1, h - strokeW);
        let rectRadius = merge ? 0 : 6; 
        
        let rect = `<rect x="${rx}" y="${rx}" width="${rw}" height="${rh}" rx="${rectRadius}" fill="${pBg}" stroke="${p.border || '#000'}" stroke-width="${strokeW}" ${filterAttr}/>`;
        
        let overlay = "";
        if (!isBlank) {
            if (is3D) overlay = `<rect x="${rx}" y="${rx}" width="${rw}" height="${rh}" rx="${rectRadius}" fill="url(#grad-3d)" pointer-events="none"/>`;
            if (isWood) overlay = `<rect x="${rx}" y="${rx}" width="${rw}" height="${rh}" rx="${rectRadius}" fill="url(#wood-pattern)" pointer-events="none"/><rect x="${rx}" y="${rx}" width="${rw}" height="${rh}" rx="${rectRadius}" fill="url(#wood-grad)" pointer-events="none"/>`;
            if (isCristal) overlay = `<rect x="${rx}" y="${rx}" width="${rw}" height="${rh}" rx="${rectRadius}" fill="url(#grad-cristal)" pointer-events="none"/>`;
            if (isGradient) overlay = `<rect x="${rx}" y="${rx}" width="${rw}" height="${rh}" rx="${rectRadius}" fill="url(#grad-overlay)" pointer-events="none"/>`;
        }

        // 🎯 Ligne pointillée parfaitement alignée
        let cLineW = isH ? step + (offset/2) - (strokeW/2) : step + (offset/2) - (strokeW/2);
        let line = isH ? `<line x1="${cLineW}" y1="${strokeW/2}" x2="${cLineW}" y2="${h - strokeW/2}" stroke="${p.border}" stroke-width="${strokeW}" stroke-dasharray="4,4"/>` : 
                         `<line x1="${strokeW/2}" y1="${cLineW}" x2="${w - strokeW/2}" y2="${cLineW}" stroke="${p.border}" stroke-width="${strokeW}" stroke-dasharray="4,4"/>`;
        
        let rot = p.contentRotation || 0;
        let cx0 = isH ? (step + offset/2)/2 : (step + offset)/2; 
        let cy0 = isH ? (step + offset)/2 : (step + offset/2)/2;
        let cx1 = isH ? step + offset/2 + (step + offset/2)/2 : (step + offset)/2; 
        let cy1 = isH ? (step + offset)/2 : step + offset/2 + (step + offset/2)/2;
        
        let basePx0 = parseFloat(getFSize(0)) * 16 * (globalBaseSize / 80) || 16;
        let basePx1 = parseFloat(getFSize(1)) * 16 * (globalBaseSize / 80) || 16;
        
        let t0 = renderZone(z0, getTColor(0), getDynamicFSizePx(z0, basePx0), getSvgS(0), step, cx0, cy0, rot, oX[0], oY[0], 0, 0);
        let t1 = renderZone(z1, getTColor(1), getDynamicFSizePx(z1, basePx1), getSvgS(1), step, cx1, cy1, rot, oX[1], oY[1], 0, 0);
        
        return `<g transform="translate(${targetX}, ${targetY})">${rect}${overlay}${line}${t0}${t1}</g>`;
    } 
    else if (p.type === 'triomino') {
        let isUp = (Math.round(p.q) + Math.round(p.r)) % 2 === 0; 
        let points = isUp ? "50,0 0,86.6025 100,86.6025" : "0,0 100,0 50,86.6025";
        let poly = `<polygon points="${points}" fill="${pBg}" stroke="${p.border}" stroke-width="${strokeW}" stroke-linejoin="round" ${filterAttr}/>`;
        
        let overlay = "";
        if (!isBlank) {
            if (is3D) overlay = `<polygon points="${points}" fill="url(#grad-3d)" pointer-events="none"/>`;
            if (isWood) overlay = `<polygon points="${points}" fill="url(#wood-pattern)" pointer-events="none"/><polygon points="${points}" fill="url(#wood-grad)" pointer-events="none"/>`;
            if (isCristal) overlay = `<polygon points="${points}" fill="url(#grad-cristal)" pointer-events="none"/>`;
            if (isGradient) overlay = `<polygon points="${points}" fill="url(#grad-overlay)" pointer-events="none"/>`;
        }

        let sX = T_W / 100; 
        let mU = m; // 🎯 PLUS DE DIVISION ICI
        let basePx0 = parseFloat(getFSize(0)) * 16 || 16; let fS0 = getDynamicFSizePx(z0, basePx0);
        let basePx1 = parseFloat(getFSize(1)) * 16 || 16; let fS1 = getDynamicFSizePx(z1, basePx1);
        let basePx2 = parseFloat(getFSize(2)) * 16 || 16; let fS2 = getDynamicFSizePx(z2, basePx2);
        
        let t0, t1, t2;
        if (isUp) {
            // 🎯 PLUS AUCUNE DIVISION DANS LES ARGUMENTS
            t0 = renderZone(z0, getTColor(0), fS0, getSvgS(0), 80, 50, 86.6, 0, oX[0], oY[0], -1, mU);
            t1 = renderZone(z1, getTColor(1), fS1, getSvgS(1), 80, 25, 43.3, 120, oX[1], oY[1], -1, mU);
            t2 = renderZone(z2, getTColor(2), fS2, getSvgS(2), 80, 75, 43.3, -120, oX[2], oY[2], -1, mU);
        } else {
            t0 = renderZone(z0, getTColor(0), fS0, getSvgS(0), 80, 50, 0, 180, oX[0], oY[0], -1, mU);
            t1 = renderZone(z1, getTColor(1), fS1, getSvgS(1), 80, 25, 43.3, 60, oX[1], oY[1], -1, mU);
            t2 = renderZone(z2, getTColor(2), fS2, getSvgS(2), 80, 75, 43.3, -60, oX[2], oY[2], -1, mU);
        }
        return `<g transform="translate(${targetX}, ${targetY}) scale(${sX})">${poly}${overlay}${t0}${t1}${t2}</g>`;
    }
    else if (p.type === 'square') {
        let sqW = Math.max(1, C_S);
        let rect = `<rect x="0" y="0" width="100" height="100" fill="${pBg}" stroke="${p.border}" stroke-width="${strokeW}" ${filterAttr}/>`;
        
        let overlay = "";
        if (!isBlank) {
            if (is3D) overlay = `<rect x="0" y="0" width="100" height="100" fill="url(#grad-3d)" pointer-events="none"/>`;
            if (isWood) overlay = `<rect x="0" y="0" width="100" height="100" fill="url(#wood-pattern)" pointer-events="none"/><rect x="0" y="0" width="100" height="100" fill="url(#wood-grad)" pointer-events="none"/>`;
            if (isCristal) overlay = `<rect x="0" y="0" width="100" height="100" fill="url(#grad-cristal)" pointer-events="none"/>`;
            if (isGradient) overlay = `<rect x="0" y="0" width="100" height="100" fill="url(#grad-overlay)" pointer-events="none"/>`;
        }

        let lines = `<line x1="0" y1="0" x2="100" y2="100" stroke="${p.border}" stroke-width="${strokeW / 2}" stroke-dasharray="4,4" opacity="0.5" /><line x1="0" y1="100" x2="100" y2="0" stroke="${p.border}" stroke-width="${strokeW / 2}" stroke-dasharray="4,4" opacity="0.5" />`;
        let sX = sqW / 100; 
        let mU = m; // 🎯 PLUS DE DIVISION ICI
        let dist = 50 - mU;
        
        let basePx0 = parseFloat(getFSize(0)) * 16 || 16; let fS0 = getDynamicFSizePx(z0, basePx0);
        let basePx1 = parseFloat(getFSize(1)) * 16 || 16; let fS1 = getDynamicFSizePx(z1, basePx1);
        let basePx2 = parseFloat(getFSize(2)) * 16 || 16; let fS2 = getDynamicFSizePx(z2, basePx2);
        let basePx3 = parseFloat(getFSize(3)) * 16 || 16; let fS3 = getDynamicFSizePx(z3, basePx3);
        
        // 🎯 PLUS AUCUNE DIVISION DANS LES ARGUMENTS
        let t0 = renderZone(z0, getTColor(0), fS0, getSvgS(0), 80, 50, 50, 180, oX[0], oY[0], 1, dist);
        let t1 = renderZone(z1, getTColor(1), fS1, getSvgS(1), 80, 50, 50, -90, oX[1], oY[1], 1, dist);
        let t2 = renderZone(z2, getTColor(2), fS2, getSvgS(2), 80, 50, 50, 0, oX[2], oY[2], 1, dist);
        let t3 = renderZone(z3, getTColor(3), fS3, getSvgS(3), 80, 50, 50, 90, oX[3], oY[3], 1, dist);        
        return `<g transform="translate(${targetX}, ${targetY}) scale(${sX})">${rect}${overlay}${lines}${t0}${t1}${t2}${t3}</g>`;
    }
}

function generateVectorData() {
    if (window.pieces.length === 0) return;
    let mergeCb = document.getElementById('inp-merge');
    let merge = mergeCb ? mergeCb.checked : true;
    let step = typeof CELL !== 'undefined' ? CELL : 80;
    let offset = merge && window.mode === 'domino' ? (parseInt(globalBorderWidth) || 4) : 0;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    window.pieces.forEach(p => {
        let pos = getPiecePos(p);
        let w = p.type === 'domino' ? (p.dir === 'hr' || p.dir === 'hl' ? step*2 + offset : step + offset) : (p.type === 'square' ? C_S : T_W);
        let h = p.type === 'domino' ? (p.dir === 'vd' || p.dir === 'vu' ? step*2 + offset : step + offset) : (p.type === 'square' ? C_S : T_H);
        if(!isNaN(pos.x)) minX = Math.min(minX, pos.x); 
        if(!isNaN(pos.y)) minY = Math.min(minY, pos.y);
        if(!isNaN(pos.x) && !isNaN(w)) maxX = Math.max(maxX, pos.x + w); 
        if(!isNaN(pos.y) && !isNaN(h)) maxY = Math.max(maxY, pos.y + h);
    });

    if (minX === Infinity) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

    let boardW = Math.max(1, maxX - minX); 
    let boardH = Math.max(1, maxY - minY); 
    
    let boardSvgContent = ""; let emptyBoardSvgContent = "";

    window.pieces.forEach(p => {
        let pos = getPiecePos(p);
        let targetX = (pos.x - minX) || 0; 
        let targetY = (pos.y - minY) || 0;
        boardSvgContent += generatePureSVG(p, targetX, targetY, false); 
        emptyBoardSvgContent += generatePureSVG(p, targetX, targetY, true); 
    });

    let shuffled = exportShuffledPieces.length === window.pieces.length ? exportShuffledPieces : window.pieces;
    let cutMaxWidth = 0; let cutMaxHeight = 0; let cutoutsContent = "";

    if (window.mode === 'domino') {
        // 🎯 MAGIE : 4 colonnes en Portrait, 6 colonnes en Paysage pour écraser la hauteur !
        let orientation = document.getElementById('export-orientation')?.value || 'portrait';
        let cols = orientation === 'portrait' ? 4 : 6; 
        
        shuffled.forEach((p, i) => {
            let r = Math.floor(i / cols); let c = i % cols;
            let pClone = JSON.parse(JSON.stringify(p));
            pClone.dir = 'hr'; 
            if (document.getElementById('inp-keep-dir')?.checked && (p.dir === 'vd' || p.dir === 'vu')) pClone.contentRotation = -90;
            
            let strokeW = parseFloat(p.width) || parseFloat(globalBorderWidth) || 4;
            
            let spaceX = step * 2;
            let spaceY = step;
            
            if (!merge) {
                spaceX -= strokeW;
                spaceY -= strokeW;
            }
            
            let px = c * spaceX; 
            let py = r * spaceY;
            
            cutoutsContent += generatePureSVG(pClone, px, py, false);
            cutMaxWidth = Math.max(cutMaxWidth, px + step * 2 + offset); 
            cutMaxHeight = Math.max(cutMaxHeight, py + step + offset);
        });
    }
    else if (window.mode === 'triomino') {
        let cols = 8; 
        shuffled.forEach((p, i) => {
            let r = Math.floor(i / cols); let c = i % cols;
            let pClone = JSON.parse(JSON.stringify(p));
            pClone.q = c; pClone.r = r;
            let px = c * (T_W / 2); let py = r * T_H;
            
            cutoutsContent += generatePureSVG(pClone, px, py, false);
            cutMaxWidth = Math.max(cutMaxWidth, px + T_W); 
            cutMaxHeight = Math.max(cutMaxHeight, py + T_H);
        });
    }
    else if (window.mode === 'square') {
        let cols = 4;
        shuffled.forEach((p, i) => {
            let r = Math.floor(i / cols); let c = i % cols;
            let pClone = JSON.parse(JSON.stringify(p));
            
            let strokeW = parseFloat(p.width) || parseFloat(globalBorderWidth) || 4;
            let space = C_S - strokeW; // 🎯 Les carrés partagent toujours leur bordure pour la découpe !
            
            let px = c * space; let py = r * space;
            cutoutsContent += generatePureSVG(pClone, px, py, false);
            cutMaxWidth = Math.max(cutMaxWidth, px + C_S); cutMaxHeight = Math.max(cutMaxHeight, py + C_S);
        });
    }

    currentExportData = {
        boardSvg: boardSvgContent, emptyBoardSvg: emptyBoardSvgContent, cutoutsSvg: cutoutsContent,
        boardW: boardW, boardH: boardH, cutW: Math.max(1, cutMaxWidth), cutH: Math.max(1, cutMaxHeight)
    };
}

function buildA4Pages() {
    generateVectorData();
    
    let orientation = document.getElementById('export-orientation').value;
    let layout = document.getElementById('export-layout').value;
    let title = document.getElementById('export-title').value.trim();

    let pdfW = orientation === 'portrait' ? 595.28 : 841.89;
    let pdfH = orientation === 'portrait' ? 841.89 : 595.28;
    let margin = 40;
    let usableW = pdfW - margin * 2;
    let usableH = pdfH - margin * 2;
    
    let titleSpace = title ? 40 : 0;
    let contentY = margin + titleSpace;
    let contentH = usableH - titleSpace;

    let { boardW, boardH, cutW, cutH, emptyBoardSvg, cutoutsSvg, boardSvg } = currentExportData;
    let pages = [];

    let defs = `
        <defs>
            <filter id="shadow-3d" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.2"/>
            </filter>
            <filter id="shadow-wood" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.25"/>
            </filter>
            <filter id="shadow-cristal" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.15"/>
            </filter>
            <filter id="shadow-gradient" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.15"/>
            </filter>

            <linearGradient id="grad-3d" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7"/>
                <stop offset="25%" stop-color="#ffffff" stop-opacity="0.1"/>
                <stop offset="75%" stop-color="#000000" stop-opacity="0.0"/>
                <stop offset="100%" stop-color="#000000" stop-opacity="0.25"/>
            </linearGradient>
            
            <linearGradient id="wood-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#000000" stop-opacity="0.25"/>
            </linearGradient>
            
            <linearGradient id="grad-cristal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </linearGradient>

            <linearGradient id="grad-overlay" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
                <stop offset="40%" stop-color="#ffffff" stop-opacity="0"/>
                <stop offset="60%" stop-color="#000000" stop-opacity="0.05"/>
                <stop offset="100%" stop-color="#000000" stop-opacity="0.2"/>
            </linearGradient>

            <pattern id="wood-pattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#000000" stroke-width="1.5" stroke-opacity="0.05"/>
                <line x1="4" y1="0" x2="4" y2="12" stroke="#000000" stroke-width="0.5" stroke-opacity="0.03"/>
                <line x1="8" y1="0" x2="8" y2="12" stroke="#000000" stroke-width="2" stroke-opacity="0.04"/>
            </pattern>
        </defs>
    `;

    function createPage(innerContent, pageNum, totalPages, pageTitle) {
        let header = title ? `<text x="${pdfW/2}" y="${margin + 10}" font-family="Nunito" font-size="20px" font-weight="bold" fill="#2d3436" text-anchor="middle">${title}${pageTitle ? ' - ' + pageTitle : ''}</text>` : '';
        let footer = `<text x="${pdfW/2}" y="${pdfH - 15}" font-family="Nunito" font-size="10px" font-weight="bold" fill="#b2bec3" text-anchor="middle">Généré avec L'Atelier Pro - Page ${pageNum}/${totalPages}</text>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${pdfW}" height="${pdfH}" viewBox="0 0 ${pdfW} ${pdfH}" style="background:white; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border-radius: 4px; max-width:100%; height:auto;">
            ${defs}
            <rect x="0" y="0" width="${pdfW}" height="${pdfH}" fill="white"/>
            ${header}
            ${innerContent}
            ${footer}
        </svg>`;
    }

 if (layout === 'compact') {
        let maxW = Math.max(boardW, cutW);
        
        // 🎯 CORRECTION : On compte 80 pixels incompressibles pour les 2 textes de titre et les marges !
        let paddingY = 80; 
        let totalH = boardH + cutH + paddingY; 
        
        let scale = Math.min(usableW / maxW, contentH / totalH);
        let bScaledH = boardH * scale; 
        let cScaledH = cutH * scale;
        
        // On centre parfaitement le bloc avec les nouveaux calculs
        let startY = contentY + (contentH - (bScaledH + paddingY + cScaledH)) / 2;

        let inner = "";
        inner += `<text x="${pdfW/2}" y="${startY}" font-family="Nunito" font-size="14px" font-weight="bold" fill="#636e72" text-anchor="middle">1. Plateau de collage</text>`;
        inner += `<g transform="translate(${(pdfW - boardW * scale) / 2}, ${startY + 15}) scale(${scale})">${emptyBoardSvg}</g>`;
        
        let cutY = startY + 15 + bScaledH + 35; // Espace entre le labyrinthe et le 2ème titre
        
        inner += `<text x="${pdfW/2}" y="${cutY}" font-family="Nunito" font-size="14px" font-weight="bold" fill="#636e72" text-anchor="middle">2. Pièces à découper</text>`;
        inner += `<g transform="translate(${(pdfW - cutW * scale) / 2}, ${cutY + 15}) scale(${scale})">${cutoutsSvg}</g>`;
        
        pages.push(createPage(inner, 1, 2, "Fiche Élève"));
        
        let sScale = Math.min(usableW / boardW, contentH / boardH);
        let sX = (pdfW - boardW * sScale) / 2; let sY = contentY + (contentH - boardH * sScale) / 2;
        pages.push(createPage(`<g transform="translate(${sX}, ${sY}) scale(${sScale})">${boardSvg}</g>`, 2, 2, "Solution"));

    }
    
    else if (layout === 'eco') {
        let sGlobal = Math.min(usableW / boardW, contentH / boardH, usableW / cutW, contentH / cutH);

        let x1 = (pdfW - boardW * sGlobal) / 2; let y1 = contentY + (contentH - boardH * sGlobal) / 2;
        pages.push(createPage(`<g transform="translate(${x1}, ${y1}) scale(${sGlobal})">${emptyBoardSvg}</g>`, 1, 3, "Plateau de jeu"));

        let cScaledH = cutH * sGlobal;
        let count = Math.max(1, Math.floor(contentH / (cScaledH + 20))); 
        let startY = contentY + (contentH - (count * cScaledH + (count-1)*20)) / 2;
        let inner2 = "";
        for(let i=0; i<count; i++) {
            let y = startY + i * (cScaledH + 20);
            inner2 += `<g transform="translate(${(pdfW - cutW * sGlobal) / 2}, ${y}) scale(${sGlobal})">${cutoutsSvg}</g>`;
            if(i < count - 1) inner2 += `<line x1="${margin}" y1="${y + cScaledH + 10}" x2="${pdfW-margin}" y2="${y + cScaledH + 10}" stroke="#b2bec3" stroke-width="1" stroke-dasharray="5,5"/>`;
        }
        pages.push(createPage(inner2, 2, 3, `Pièces à découper (x${count})`));

        let x3 = (pdfW - boardW * sGlobal) / 2; let y3 = contentY + (contentH - boardH * sGlobal) / 2;
        pages.push(createPage(`<g transform="translate(${x3}, ${y3}) scale(${sGlobal})">${boardSvg}</g>`, 3, 3, "Solution"));

    } else {
        let sGlobal = Math.min(usableW / boardW, contentH / boardH, usableW / cutW, contentH / cutH);

        let x1 = (pdfW - boardW * sGlobal) / 2; let y1 = contentY + (contentH - boardH * sGlobal) / 2;
        pages.push(createPage(`<g transform="translate(${x1}, ${y1}) scale(${sGlobal})">${emptyBoardSvg}</g>`, 1, 3, "Plateau de jeu"));

        let x2 = (pdfW - cutW * sGlobal) / 2; let y2 = contentY + (contentH - cutH * sGlobal) / 2;
        pages.push(createPage(`<g transform="translate(${x2}, ${y2}) scale(${sGlobal})">${cutoutsSvg}</g>`, 2, 3, "Pièces à découper"));

        let x3 = (pdfW - boardW * sGlobal) / 2; let y3 = contentY + (contentH - boardH * sGlobal) / 2;
        pages.push(createPage(`<g transform="translate(${x3}, ${y3}) scale(${sGlobal})">${boardSvg}</g>`, 3, 3, "Solution"));
    }

    return pages;
}

function renderVectorPreview() {
    let pages = buildA4Pages();
    const container = document.getElementById('vector-preview-container');
    container.innerHTML = "";
    pages.forEach((p, i) => {
        container.innerHTML += `
            <div style="display:flex; flex-direction:column; align-items:center; gap: 10px;">
                <span style="color:#dfe6e9; font-weight:bold; text-transform:uppercase; letter-spacing:2px; font-size:12px;">📄 PAGE ${i+1} / ${pages.length}</span>
                ${p}
            </div>
        `;
    });
}

function triggerDownload(content, fileName, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
}

function svgToHighResPng(svgString, w, h, scale, callback) {
    const canvas = document.createElement("canvas");
    canvas.width = w * scale; canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = function() {
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        callback(canvas.toDataURL("image/png", 1.0));
    };
    img.src = url;
}

async function downloadVector(format) {
    let pages = buildA4Pages();
    let title = document.getElementById('export-title').value.trim() || `Atelier_${window.mode}`;
    let orientation = document.getElementById('export-orientation').value;
    let pdfW = orientation === 'portrait' ? 595.28 : 841.89;
    let pdfH = orientation === 'portrait' ? 841.89 : 595.28;

    if (format === 'svg') {
        pages.forEach((p, i) => {
            setTimeout(() => triggerDownload(p, `${title}_Page_${i+1}.svg`, "image/svg+xml"), i * 300);
        });
    } 
    else if (format === 'png') {
        pages.forEach((p, i) => {
            setTimeout(() => {
                svgToHighResPng(p, pdfW, pdfH, 2, (dataUrl) => {
                    let a = document.createElement('a'); a.href = dataUrl; a.download = `${title}_Page_${i+1}.png`; a.click();
                });
            }, i * 400);
        });
    } 
    else if (format === 'pdf') {
        let btn = document.getElementById('btn-export-pdf');
        let oldText = btn.innerHTML;
        btn.innerHTML = "⏳ Génération PDF..."; btn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: orientation, unit: "pt", format: "a4" });
            
            try {
                const fontUrl = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nunito/Nunito-Bold.ttf";
                const fontResponse = await fetch(fontUrl);
                
                if (fontResponse.ok) {
                    const fontBuffer = await fontResponse.arrayBuffer();
                    let binary = ''; const bytes = new Uint8Array(fontBuffer);
                    for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
                    const base64Font = window.btoa(binary);

                    doc.addFileToVFS("Nunito-Bold.ttf", base64Font);
                    doc.addFont("Nunito-Bold.ttf", "Nunito", "bold");
                    doc.addFont("Nunito-Bold.ttf", "Nunito", "normal");
                }
            } catch(e) {
                console.warn("Erreur chargement police PDF :", e);
            }
            
            for(let i=0; i<pages.length; i++) {
                if (i > 0) doc.addPage();
                
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(pages[i], "image/svg+xml");
                if (xmlDoc.getElementsByTagName("parsererror").length > 0) throw new Error("SVG invalide");
                
                let svgEl = xmlDoc.documentElement;
                let options = { x: 0, y: 0, width: pdfW, height: pdfH };
                
                if (typeof doc.svg === "function") {
                    await doc.svg(svgEl, options);
                } else if (window.svg2pdf) {
                    let svgFunc = typeof window.svg2pdf === "function" ? window.svg2pdf : window.svg2pdf.svg2pdf;
                    await svgFunc(svgEl, doc, options);
                } else {
                    throw new Error("Moteur PDF introuvable.");
                }
            }
            
            doc.save(`${title}.pdf`);
            btn.innerHTML = oldText; btn.disabled = false;

        } catch (e) {
            console.error("Erreur PDF :", e);
            showAlert("⚠️ Erreur PDF", "Impossible de générer le fichier vectoriel. Veuillez utiliser l'export PNG en attendant.");
            btn.innerHTML = oldText; btn.disabled = false;
        }
    }
}