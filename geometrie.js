/**
 * geometrie.js
 * Moteur de dessin SVG, gestion de la grille et des dimensions.
 */

var SQRT3_2 = 0.86602540378; 
var globalBg = '#dfe6e9';
var globalBorderColor = '#b2bec3';
var globalBorderWidth = 4;
var globalTextColor = '#2d3436'; 
var globalBaseSize = 80; 
var globalFontSize = 1.1;           
var globalFontFamily = 'Nunito';    
var globalMargin = 15;      
var globalSvgScale = 1.0;   
var globalPieceStyle = 'flat';      
var globalColorFigures = true;      

// 🎯 Palettes enrichies avec 7 nuances de couleurs pour plus de profondeur !
const THEMES = {
    pastel: ['#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1', '#c8d6e5', '#54a0ff'],
    ocean: ['#00a8ff', '#0097e6', '#48dbfb', '#0abde3', '#c7ecee', '#81ecec', '#00cec9'],
    automne: ['#ff9f43', '#ff7f50', '#e1b12c', '#f39c12', '#d35400', '#e84118', '#c23616'],
    neon: ['#ff4757', '#ff6b81', '#2ed573', '#7bed9f', '#eccc68', '#1e90ff', '#5352ed'],
    monochrome: ['#f8f9fa', '#f1f2f6', '#dfe6e9', '#ced6e0', '#dcdde1', '#b2bec3', '#a4b0be'],
    jungle: ['#2ecc71', '#27ae60', '#16a085', '#1abc9c', '#f1c40f', '#b8e994', '#78e08f'], 
    vintage: ['#e17055', '#fab1a0', '#ffeaa7', '#a29bfe', '#81ecec', '#fdcb6e', '#dff9fb'], 
    sunset: ['#ff7675', '#ff9f43', '#f368e0', '#8395a7', '#54a0ff', '#ff6b6b', '#ff4757'],
    galaxie: ['#8e44ad', '#9b59b6', '#34495e', '#2c3e50', '#e056fd', '#686de0', '#30336b'],
    macaron: ['#ffb8b8', '#ffcccc', '#ffda79', '#f8efba', '#55efc4', '#81ecec', '#a29bfe'],
    terracotta: ['#d35400', '#e67e22', '#d1ccc0', '#a4b0be', '#cc8e35', '#b33939', '#cd6133'],
    arcenciel: ['#ff3838', '#ff9f1a', '#fff200', '#32ff7e', '#17c0eb', '#7158e2', '#cd84f1']
};

function getThemeColors() {
    let sel = document.getElementById('inp-fig-theme');
    let t = sel ? sel.value : 'pastel';
    return THEMES[t] || THEMES.pastel;
}

var CELL = 80, T_W = 112, T_H = 97, C_S = 120; 
var clusterOffsetX = 0, clusterOffsetY = 0;

function updateGridSize() {
    let mergeCb = document.getElementById('inp-merge');
    let merge = mergeCb ? mergeCb.checked : true;
    let offset = merge ? parseInt(globalBorderWidth) : 0;
    
    let canvas = document.getElementById('canvas-content');
    if (canvas) {
        if (merge) { canvas.classList.add('canvas-merged'); } 
        else { canvas.classList.remove('canvas-merged'); }
    }
    
    CELL = globalBaseSize; 
    let sizeVal = document.getElementById('size-val');
    if (sizeVal) sizeVal.innerText = CELL; 
    
    let step = CELL; 
    T_W = Math.round(CELL * 1.4); 
    T_H = T_W * SQRT3_2; 
    C_S = Math.round(CELL * 1.5); 
    
    document.documentElement.style.setProperty('--cell', `${CELL}px`); 
    document.documentElement.style.setProperty('--step', `${step}px`); 
    document.documentElement.style.setProperty('--tw', `${T_W}px`); 
    document.documentElement.style.setProperty('--th', `${T_H}px`); 
    document.documentElement.style.setProperty('--cs', `${C_S}px`); 
    
    let cssOffset = (merge && window.mode === 'domino') ? offset : 0;
    document.documentElement.style.setProperty('--merge-offset', `${cssOffset}px`);
}

function getPiecePos(p) {
    let step = CELL; 
    if (p.type === 'domino') { 
        let x = Math.round(p.x) * step; 
        let y = Math.round(p.y) * step; 
        if (p.dir === 'hl') x -= step; 
        if (p.dir === 'vu') y -= step; 
        return { x: x, y: y };
    } else if (p.type === 'triomino') { 
        return { x: Math.round(p.q) * (T_W / 2), y: Math.round(p.r) * T_H }; 
    } else if (p.type === 'square') { 
        return { x: Math.round(p.x) * C_S, y: Math.round(p.y) * C_S }; 
    }
}

function createPieceElement(p, isInteractive = true, isBlank = false) {
    let div = document.createElement('div'); 
    
    let classes = `piece ${p.type} ${p.id === window.selectedIndex && isInteractive ? 'selected' : ''}`; 
    if (globalPieceStyle === '3d') classes += ' style-3d';
    if (globalPieceStyle === 'wood') classes += ' style-wood';
    if (globalPieceStyle === 'cristal') classes += ' style-cristal'; // 💎 Nouveau
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
        let finalSize = baseSize * softRatio; 
        return Math.max(0.35, finalSize).toFixed(3); 
    };
    
    let margin = p.margin !== undefined ? p.margin : globalMargin; 
    let oX = p.offsetX || [0, 0, 0, 0]; 
    let oY = p.offsetY || [0, 0, 0, 0]; 
    let renderZone = (z, idx) => { 
        if (isBlank) return ""; 
        let str = String(z || ""); 
        return str.replace(/currentColor/g, getTColor(idx)); 
    };

    let z0 = renderZone(p.zones[0], 0); 
    let z1 = renderZone(p.zones[1], 1); 
    let z2 = renderZone(p.zones[2], 2); 
    let z3 = renderZone(p.zones[3], 3);
    let pos = getPiecePos(p);

    if (isInteractive) {
        if (window.isGameMode && !p.isSnapped) {
            div.style.left = `${p.gameX}px`; div.style.top = `${p.gameY}px`; div.style.transform = `rotate(${p.gameRot || 0}deg)`; div.style.zIndex = "50";
        } else {
            let finalPos = pos;
            if (window.isGameMode && p.isSnapped && p.currentSlotId !== null) { 
                let slot = window.pieces.find(s => s.id === p.currentSlotId); 
                if (slot) finalPos = getPiecePos(slot); 
            }
            div.style.left = `${finalPos.x + clusterOffsetX}px`; div.style.top = `${finalPos.y + clusterOffsetY}px`; div.style.transform = `rotate(0deg)`;
            if (window.isGameMode && p.isSnapped) div.style.zIndex = "10";
        }
    } else {
        div.style.position = 'absolute'; div.style.left = `${pos.x + clusterOffsetX}px`; div.style.top = `${pos.y + clusterOffsetY}px`;
    }

    let checkForHTML = (str) => String(str).includes('<img') || String(str).includes('<svg');

    if (p.type === 'domino') {
        div.classList.add(p.dir); 
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

// -----------------------------------------------------
// OUTILS GRAPHIQUES : FRACTIONS
// -----------------------------------------------------

function generateFractionSvg(num, den) { 
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:100%; height:100%;">
        <text x="50" y="30" font-family="inherit" font-size="38" font-weight="900" fill="currentColor" text-anchor="middle" dominant-baseline="central">${num}</text>
        <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
        <text x="50" y="70" font-family="inherit" font-size="38" font-weight="900" fill="currentColor" text-anchor="middle" dominant-baseline="central">${den}</text>
    </svg>`; 
}

function generatePieSvg(numsArray, den, fillColor = null) { 
    if (!Array.isArray(numsArray)) numsArray = [numsArray]; 
    let cx = 50, cy = 50, r = 45; 
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">`; 
    let colorEmpty = 'white'; let strokeColor = 'currentColor'; 
    let cols = getThemeColors();
    let fillC = fillColor || cols[0];

    if (den <= 0) return ''; 
    if (den === 1) { 
        let fill = numsArray[0] >= 1 ? fillC : colorEmpty; 
        return svg + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${strokeColor}" stroke-width="3" /></svg>`; 
    } 
    let angleStep = (Math.PI * 2) / den; 
    let startAngle = -Math.PI / 2; 
    for (let i = 0; i < den; i++) { 
        let endAngle = startAngle + angleStep; 
        let x1 = cx + r * Math.cos(startAngle); let y1 = cy + r * Math.sin(startAngle); 
        let x2 = cx + r * Math.cos(endAngle); let y2 = cy + r * Math.sin(endAngle); 
        let largeArcFlag = angleStep > Math.PI ? 1 : 0; 
        let fill = colorEmpty; let partsCounted = 0; 
        for (let c = 0; c < numsArray.length; c++) { 
            partsCounted += numsArray[c]; 
            if (i < partsCounted) { fill = numsArray.length === 1 ? fillC : cols[c % cols.length]; break; } 
        } 
        let path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`; 
        svg += `<path d="${path}" fill="${fill}" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round" />`; 
        startAngle = endAngle; 
    } 
    return svg + `</svg>`;
}

function generateBarSvg(numsArray, den, fillColor = null) { 
    if (!Array.isArray(numsArray)) numsArray = [numsArray]; 
    if (den <= 0) return ''; 
    let cols = getThemeColors(); let fillC = fillColor || cols[0];
    let totalNum = numsArray.reduce((sum, n) => sum + n, 0); 
    let maxVal = Math.max(1, Math.ceil(totalNum / den)); 
    let w = 240, h = 60, pad = 10; 
    let barW = (w - 2 * pad); 
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${maxVal * h + 20}" style="width:100%; height:100%; overflow:visible;">`; 
    for (let b = 0; b < maxVal; b++) { 
        let startY = pad + b * h; let barH = h - 15; let stepW = barW / den; 
        svg += `<rect x="${pad}" y="${startY}" width="${barW}" height="${barH}" fill="white" stroke="currentColor" stroke-width="3" rx="4"/>`; 
        for (let i = 0; i < den; i++) { 
            let partIndex = b * den + i; let fill = "transparent"; let partsCounted = 0; 
            for (let c = 0; c < numsArray.length; c++) { 
                partsCounted += numsArray[c]; 
                if (partIndex < partsCounted) { fill = numsArray.length === 1 ? fillC : cols[c % cols.length]; break; } 
            } 
            svg += `<rect x="${pad + i * stepW}" y="${startY}" width="${stepW}" height="${barH}" fill="${fill}" stroke="currentColor" stroke-width="3" />`; 
        } 
    } 
    return svg + `</svg>`;
}

function generateAxisSvg(numsArray, den, fillColor = null) { 
    if (!Array.isArray(numsArray)) numsArray = [numsArray]; 
    if (den <= 0) return ''; 
    let cols = getThemeColors(); let pointColor = fillColor || cols[3]; 

    let totalNum = numsArray.reduce((sum, n) => sum + n, 0); 
    let minVal = Math.floor(totalNum / den); 
    if (minVal > 0 && totalNum % den === 0) minVal -= 1; 
    let w = 260, h = 100, pad = 30; 
    let lineW = w - 2 * pad; 
    let step = lineW / den; 
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="width:100%; height:100%; overflow:visible;">`; 
    svg += `<line x1="${pad - 10}" y1="${h/2}" x2="${w-pad + 20}" y2="${h/2}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`; 
    svg += `<polygon points="${w-pad + 20},${h/2 - 6} ${w-pad + 30},${h/2} ${w-pad + 20},${h/2 + 6}" fill="currentColor"/>`; 
    for (let i = 0; i <= den; i++) { 
        let x = pad + i * step; let isMajor = (i === 0 || i === den); let tickH = isMajor ? 12 : 6; let strokeW = isMajor ? 4 : 2; 
        svg += `<line x1="${x}" y1="${h/2 - tickH}" x2="${x}" y2="${h/2 + tickH}" stroke="currentColor" stroke-width="${strokeW}" stroke-linecap="round"/>`; 
        if (isMajor) { 
            let val = minVal + (i / den); 
            svg += `<text x="${x}" y="${h/2 + 28}" font-family="inherit" font-size="20" font-weight="900" fill="currentColor" text-anchor="middle">${val}</text>`; 
        } 
    } 
    let remain = totalNum - (minVal * den); 
    let valX = pad + remain * step; 
    
    svg += `<circle cx="${valX}" cy="${h/2}" r="6" fill="${pointColor}" />`; 
    let arrowTipY = h/2 - 10; 
    svg += `<polygon points="${valX},${arrowTipY} ${valX - 6},${arrowTipY - 8} ${valX + 6},${arrowTipY - 8}" fill="${pointColor}" />`; 
    svg += `<line x1="${valX}" y1="${arrowTipY - 8}" x2="${valX}" y2="${arrowTipY - 24}" stroke="${pointColor}" stroke-width="4" stroke-linecap="round"/>`; 
    return svg + `</svg>`; 
}

// -----------------------------------------------------
// 🌟 OUTILS GRAPHIQUES : AIRES, PYTHAGORE, RACINES
// -----------------------------------------------------

function generateRootSvg(coeff, radicand) {
    let strokeC = 'currentColor';
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">`;
    let coeffStr = (coeff && coeff != '1') ? coeff : '';
    
    let textWidth = radicand.toString().length * 16; 
    let endX = 46 + textWidth; 
    
    let totalW = (coeffStr ? coeffStr.toString().length * 15 : 0) + (endX - 32);
    let shiftX = 50 - (32 + totalW/2);
    if(shiftX > 5) shiftX = 5; 

    let radixPath = `M ${32+shiftX} 52 L ${38+shiftX} 65 L ${46+shiftX} 30 L ${endX+shiftX} 30`; 
    svg += `<path d="${radixPath}" fill="none" stroke="${strokeC}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    svg += `<text x="${46 + textWidth/2 + shiftX}" y="52" font-family="inherit" font-size="28" font-weight="900" fill="${strokeC}" text-anchor="middle" dominant-baseline="central">${radicand}</text>`;
    if (coeffStr) {
        svg += `<text x="${30+shiftX}" y="52" font-family="inherit" font-size="26" font-weight="900" fill="${strokeC}" text-anchor="end" dominant-baseline="central">${coeffStr}</text>`;
    }
    return svg + `</svg>`;
}

function generateAreaSvg(shape, val1, val2) {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">`;
    let strokeC = 'currentColor';
    let cols = getThemeColors();
    let cBlue = cols[0], cGreen = cols[1], cYellow = cols[2], cRed = cols[3], cPurple = cols[4];
    
    let opac = (typeof globalColorFigures !== 'undefined' && globalColorFigures === false) ? "0" : "0.25";

    function getTick(x1, y1, x2, y2, count) {
        let mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        let dx = x2 - x1, dy = y2 - y1;
        let len = Math.sqrt(dx*dx + dy*dy);
        let nx = -dy / len, ny = dx / len; 
        let tickLen = 4, gap = 3.5, res = '';
        for(let i=0; i<count; i++) {
            let offset = (i - (count-1)/2) * gap;
            let tx = mx + (dx/len) * offset, ty = my + (dy/len) * offset;
            res += `<line x1="${tx - nx*tickLen}" y1="${ty - ny*tickLen}" x2="${tx + nx*tickLen}" y2="${ty + ny*tickLen}" stroke="${strokeC}" stroke-width="2.5" stroke-linecap="round"/>`;
        }
        return res;
    }

    if (shape === 'rect') {
        let isSquare = val1 === val2;
        
        let vW = val1; let vH = val2;
        if (vW / vH > 1.5) vH = vW / 1.5;
        if (vH / vW > 1.5) vW = vH / 1.5;

        let scale = Math.min(50/vW, 45/vH);
        let w = vW * scale, h = vH * scale;
        let x = 50 - w/2, y = 50 - h/2;
        
        svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cGreen}" fill-opacity="${opac}" stroke="${strokeC}" stroke-width="2.5" stroke-linejoin="round"/>`;
        
        let s = 6;
        svg += `<polyline points="${x+s},${y} ${x+s},${y+s} ${x},${y+s}" fill="none" stroke="${strokeC}" stroke-width="1.5"/>`;
        svg += `<polyline points="${x+w-s},${y} ${x+w-s},${y+s} ${x+w},${y+s}" fill="none" stroke="${strokeC}" stroke-width="1.5"/>`;
        svg += `<polyline points="${x+s},${y+h} ${x+s},${y+h-s} ${x},${y+h-s}" fill="none" stroke="${strokeC}" stroke-width="1.5"/>`;
        svg += `<polyline points="${x+w-s},${y+h} ${x+w-s},${y+h-s} ${x+w},${y+h-s}" fill="none" stroke="${strokeC}" stroke-width="1.5"/>`;
        
        if (isSquare) {
            svg += getTick(x,y, x+w,y, 2) + getTick(x,y+h, x+w,y+h, 2) + getTick(x,y, x,y+h, 2) + getTick(x+w,y, x+w,y+h, 2);
        } else {
            svg += getTick(x,y, x+w,y, 1) + getTick(x,y+h, x+w,y+h, 1);
            svg += getTick(x,y, x,y+h, 2) + getTick(x+w,y, x+w,y+h, 2);
        }
        
        svg += `<text x="50" y="${y + h + 14}" font-family="inherit" font-size="14" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${val1}</text>`;
        if (!isSquare) {
            svg += `<text x="${x + w + 14}" y="50" font-family="inherit" font-size="14" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${val2}</text>`;
        }
    } 
    else if (shape === 'tri') {
        let vB = val1; let vH = val2;
        if (vB / vH > 1.5) vH = vB / 1.5;
        if (vH / vB > 1.5) vB = vH / 1.5;

        let scale = Math.min(50/vB, 40/vH);
        let w = vB * scale, h = vH * scale;
        let x = 50 - w/2, y = 50 + h/2;
        let topX = x + w * 0.3; 
        
        svg += `<polygon points="${x},${y} ${x+w},${y} ${topX},${y-h}" fill="${cBlue}" fill-opacity="${opac}" stroke="${strokeC}" stroke-width="2.5" stroke-linejoin="round"/>`;
        svg += `<line x1="${topX}" y1="${y}" x2="${topX}" y2="${y-h}" stroke="${strokeC}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
        
        let s = Math.sign(topX - x) >= 0 ? 1 : -1;
        svg += `<rect x="${topX}" y="${y-8}" width="${s*8}" height="8" fill="none" stroke="${strokeC}" stroke-width="1.5"/>`;
        
        svg += `<text x="50" y="${y + 12}" font-family="inherit" font-size="14" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${val1}</text>`;
        svg += `<text x="${topX + 12}" y="${y - h/2}" font-family="inherit" font-size="14" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${val2}</text>`;
    }
    else if (shape === 'circ') {
        let r = 32;
        svg += `<circle cx="50" cy="50" r="${r}" fill="${cRed}" fill-opacity="${opac}" stroke="${strokeC}" stroke-width="2.5"/>`;
        svg += `<circle cx="50" cy="50" r="2.5" fill="${strokeC}"/>`; 
        svg += `<line x1="50" y1="50" x2="${50+r}" y2="50" stroke="${strokeC}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
        svg += `<text x="${50 + r/2}" y="42" font-family="inherit" font-size="14" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">R=${val1}</text>`;
    }
    else if (shape === 'los') {
        let vD1 = val1; let vD2 = val2;
        if (vD1 / vD2 > 1.5) vD2 = vD1 / 1.5;
        if (vD2 / vD1 > 1.5) vD1 = vD2 / 1.5;

        // 🎯 ECHELLE AGRANDIE : Le losange occupe tout l'espace disponible
        let scale = Math.min(46/vD1, 46/vD2);
        let w = vD1 * scale, h = vD2 * scale;
        let pts = `50,${50-h/2} ${50+w/2},50 50,${50+h/2} ${50-w/2},50`;
        
        svg += `<polygon points="${pts}" fill="${cPurple}" fill-opacity="${opac}" stroke="${strokeC}" stroke-width="2.5" stroke-linejoin="round"/>`;
        svg += `<line x1="50" y1="${50-h/2}" x2="50" y2="${50+h/2}" stroke="${strokeC}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
        svg += `<line x1="${50-w/2}" y1="50" x2="${50+w/2}" y2="50" stroke="${strokeC}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
        svg += `<polyline points="50,44 56,44 56,50" fill="none" stroke="${strokeC}" stroke-width="1.5"/>`;
        svg += getTick(50,50-h/2, 50+w/2,50, 2) + getTick(50+w/2,50, 50,50+h/2, 2) + getTick(50,50+h/2, 50-w/2,50, 2) + getTick(50-w/2,50, 50,50-h/2, 2);
        
        let maxD = Math.max(val1, val2); let minD = Math.min(val1, val2);
        let textV = maxD, textH = minD;
        if (vD1 > vD2) { textH = maxD; textV = minD; }

        // 🎯 FLÈCHES COLLÉES & FINES (8px de la figure seulement)
        let arrowY_H = 50 - h/2 - 8; 
        svg += `<line x1="${50-w/2}" y1="${arrowY_H}" x2="${50+w/2}" y2="${arrowY_H}" stroke="${strokeC}" stroke-width="1.5"/>`;
        svg += `<polyline points="${50-w/2+4},${arrowY_H-3} ${50-w/2},${arrowY_H} ${50-w/2+4},${arrowY_H+3}" fill="none" stroke="${strokeC}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        svg += `<polyline points="${50+w/2-4},${arrowY_H-3} ${50+w/2},${arrowY_H} ${50+w/2-4},${arrowY_H+3}" fill="none" stroke="${strokeC}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        svg += `<text x="50" y="${arrowY_H - 10}" font-family="inherit" font-size="14" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${textH}</text>`;

        let arrowX_V = 50 + w/2 + 8; 
        svg += `<line x1="${arrowX_V}" y1="${50-h/2}" x2="${arrowX_V}" y2="${50+h/2}" stroke="${strokeC}" stroke-width="1.5"/>`;
        svg += `<polyline points="${arrowX_V-3},${50-h/2+4} ${arrowX_V},${50-h/2} ${arrowX_V+3},${50-h/2+4}" fill="none" stroke="${strokeC}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        svg += `<polyline points="${arrowX_V-3},${50+h/2-4} ${arrowX_V},${50+h/2} ${arrowX_V+3},${50+h/2-4}" fill="none" stroke="${strokeC}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        svg += `<text x="${arrowX_V + 8}" y="50" font-family="inherit" font-size="14" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="start" dominant-baseline="central">${textV}</text>`;
    }
    else if (shape === 'para') {
        let vB = val1; let vH = val2;
        if (vB / vH > 1.5) vH = vB / 1.5;
        if (vH / vB > 1.5) vB = vH / 1.5;

        let scale = Math.min(55/vB, 40/vH);
        let b = vB * scale, h = vH * scale;
        let shift = 15;
        let x = 50 - (b+shift)/2, y = 50 + h/2;
        let pts = `${x},${y} ${x+b},${y} ${x+b+shift},${y-h} ${x+shift},${y-h}`;
        
        svg += `<polygon points="${pts}" fill="${cYellow}" fill-opacity="${opac}" stroke="${strokeC}" stroke-width="2.5" stroke-linejoin="round"/>`;
        svg += `<line x1="${x+shift}" y1="${y}" x2="${x+shift}" y2="${y-h}" stroke="${strokeC}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
        svg += `<polyline points="${x+shift},${y-6} ${x+shift+6},${y-6} ${x+shift+6},${y}" fill="none" stroke="${strokeC}" stroke-width="1.5"/>`;
        
        svg += getTick(x,y, x+b,y, 1) + getTick(x+shift,y-h, x+b+shift,y-h, 1);
        svg += getTick(x,y, x+shift,y-h, 2) + getTick(x+b,y, x+b+shift,y-h, 2);
        
        svg += `<text x="${x+b/2 + shift/2}" y="${y+12}" font-family="inherit" font-size="14" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${val1}</text>`;
        svg += `<text x="${x+shift - 12}" y="${y-h/2}" font-family="inherit" font-size="14" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${val2}</text>`;
    }
    
    return svg + `</svg>`;
}

function generatePythagoreSvg(a, b, hyp, askIndex) {
    let cols = getThemeColors();
    let cYellow = cols[2]; let cRed = cols[3];
    let opac = (typeof globalColorFigures !== 'undefined' && globalColorFigures === false) ? "0" : "0.25";

    let scale = Math.min(45/a, 45/b);
    let w = a * scale; let h = b * scale;
    let x = 50 - w/2; let y = 50 + h/2;
    let strokeC = 'currentColor';
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">`;
    
    svg += `<polygon points="${x},${y} ${x+w},${y} ${x},${y-h}" fill="${cYellow}" fill-opacity="${opac}" stroke="${strokeC}" stroke-width="2.5" stroke-linejoin="round"/>`;
    svg += `<rect x="${x}" y="${y-8}" width="8" height="8" fill="none" stroke="${strokeC}" stroke-width="1.5"/>`; 
    
    let labelA = askIndex === 0 ? '?' : a;
    let labelB = askIndex === 1 ? '?' : b;
    let labelC = askIndex === 2 ? '?' : hyp;

    let colorA = askIndex === 0 ? cRed : strokeC;
    let colorB = askIndex === 1 ? cRed : strokeC;
    let colorC = askIndex === 2 ? cRed : strokeC;

    let sizeA = askIndex === 0 ? 18 : 14;
    let sizeB = askIndex === 1 ? 18 : 14;
    let sizeC = askIndex === 2 ? 18 : 14;
    
    svg += `<text x="${x + w/2}" y="${y + 14}" font-family="inherit" font-size="${sizeA}" font-weight="900" fill="${colorA}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${labelA}</text>`;
    svg += `<text x="${x - 14}" y="${y - h/2}" font-family="inherit" font-size="${sizeB}" font-weight="900" fill="${colorB}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${labelB}</text>`;
    svg += `<text x="${x + w/2 + 12}" y="${y - h/2 - 12}" font-family="inherit" font-size="${sizeC}" font-weight="900" fill="${colorC}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">${labelC}</text>`;
    
    return svg + `</svg>`;
}

function generateRepereSvg(px, py) {
    let cols = getThemeColors();
    let cRed = cols[3];
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:100%; height:100%; overflow:hidden;">`;
    let strokeC = 'currentColor';
    
    for(let i=10; i<=90; i+=10) {
        svg += `<line x1="${i}" y1="10" x2="${i}" y2="90" stroke="#b2bec3" stroke-width="0.5"/>`;
        svg += `<line x1="10" y1="${i}" x2="90" y2="${i}" stroke="#b2bec3" stroke-width="0.5"/>`;
    }
    svg += `<line x1="5" y1="50" x2="95" y2="50" stroke="${strokeC}" stroke-width="2"/>`;
    svg += `<line x1="50" y1="5" x2="50" y2="95" stroke="${strokeC}" stroke-width="2"/>`;
    
    svg += `<line x1="60" y1="48" x2="60" y2="52" stroke="${strokeC}" stroke-width="1.5"/>`;
    svg += `<text x="60" y="58" font-family="inherit" font-size="9" font-weight="900" fill="${strokeC}" text-anchor="middle">1</text>`;
    svg += `<line x1="48" y1="40" x2="52" y2="40" stroke="${strokeC}" stroke-width="1.5"/>`;
    svg += `<text x="44" y="40" font-family="inherit" font-size="9" font-weight="900" fill="${strokeC}" text-anchor="middle" dominant-baseline="central">1</text>`;
    
    let pointX = 50 + px*10; let pointY = 50 - py*10;
    svg += `<circle cx="${pointX}" cy="${pointY}" r="3" fill="${cRed}"/>`;
    svg += `<text x="${pointX + 8}" y="${pointY - 8}" font-family="inherit" font-size="14" font-weight="900" fill="${cRed}" paint-order="stroke" stroke="#ffffff" stroke-width="3" text-anchor="middle" dominant-baseline="central">A</text>`;
    
    return svg + `</svg>`;
}

// -----------------------------------------------------
// OUTILS GRAPHIQUES : ANGLES TRIGONOMÉTRIQUES
// -----------------------------------------------------

function generateAdvancedAngle(valString, type) {
    let cols = getThemeColors();
    let cBlue = cols[0], cGreen = cols[1], cYellow = cols[2], cRed = cols[3];
    let opac = (typeof globalColorFigures !== 'undefined' && globalColorFigures === false) ? "0" : "0.25";

    let vals = String(valString).split(',').map(v => parseInt(v));
    let degrees = Math.max(5, Math.min(vals[0], 355));
    let isTriangle = type.startsWith('tri');
    let overflowStyle = isTriangle ? 'visible' : 'hidden';

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:100%; height:100%; overflow:${overflowStyle};">`;
    let strokeC = 'currentColor'; 
    let strokeW = 2.5;
    let rad = (a) => a * Math.PI / 180;
    
    function drawArcInternal(cx, cy, r, aStart, aEnd, color, label) {
        if (!label) return ""; 
        let p1 = { x: cx + r * Math.cos(rad(aStart)), y: cy - r * Math.sin(rad(aStart)) };
        let p2 = { x: cx + r * Math.cos(rad(aEnd)), y: cy - r * Math.sin(rad(aEnd)) };
        let largeArc = Math.abs(aEnd - aStart) > 180 ? 1 : 0;
        let path = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 0 ${p2.x} ${p2.y} Z`;
        if (aStart > aEnd) { path = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`; }
        let angleDiff = Math.abs(aEnd - aStart); let midA = aStart + (aEnd - aStart) / 2;
        let dText = r + 10;
        if (angleDiff < 45) dText += 4; 
        if (angleDiff < 25) dText += 6;
        let pT = { x: cx + dText * Math.cos(rad(midA)), y: cy - dText * Math.sin(rad(midA)) };
        let fSize = label === '?' ? 18 : 13;
        return `<path d="${path}" fill="${color}" fill-opacity="${opac}" stroke="${strokeC}" stroke-width="1.2" stroke-linejoin="round"/>` + 
               `<text x="${pT.x}" y="${pT.y}" font-family="inherit" font-size="${fSize}" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central">${label}</text>`;
    }

    if (type === 'oppose') {
        let cx = 50, cy = 50; let a1 = 20, a2 = a1 + degrees; 
        let getP = (a, len) => ({ x: cx + len * Math.cos(rad(a)), y: cy - len * Math.sin(rad(a)) });
        let l1a = getP(a1, 100), l1b = getP(a1 + 180, 100); let l2a = getP(a2, 100), l2b = getP(a2 + 180, 100);
        svg += drawArcInternal(cx, cy, 22, a1, a2, cBlue, `${degrees}°`);
        svg += drawArcInternal(cx, cy, 22, a1 + 180, a2 + 180, cYellow, '?');
        svg += `<line x1="${l1a.x}" y1="${l1a.y}" x2="${l1b.x}" y2="${l1b.y}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
        svg += `<line x1="${l2a.x}" y1="${l2a.y}" x2="${l2b.x}" y2="${l2b.y}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
    }
    else if (type === 'alterne' || type === 'corresp') {
        let y1 = 32, y2 = 68; 
        let tAng = Math.max(35, Math.min(degrees, 145)); 
        let tanT = Math.tan(rad(tAng));
        let ix1 = 50 - (y1 - 50) / tanT; let ix2 = 50 - (y2 - 50) / tanT;
        if (type === 'alterne') {
            svg += drawArcInternal(ix1, y1, 14, 180, 180 + tAng, cBlue, `${degrees}°`);
            svg += drawArcInternal(ix2, y2, 14, 0, tAng, cYellow, '?');
        } else { 
            svg += drawArcInternal(ix1, y1, 14, 0, tAng, cBlue, `${degrees}°`);
            svg += drawArcInternal(ix2, y2, 14, 0, tAng, cYellow, '?');
        }
        svg += `<line x1="-20" y1="${y1}" x2="120" y2="${y1}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
        svg += `<line x1="-20" y1="${y2}" x2="120" y2="${y2}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
        let getP = (a, len) => ({ x: 50 + len * Math.cos(rad(a)), y: 50 - len * Math.sin(rad(a)) });
        let ta = getP(tAng, 100), tb = getP(tAng + 180, 100);
        svg += `<line x1="${ta.x}" y1="${ta.y}" x2="${tb.x}" y2="${tb.y}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
    }
    else if (type === 'comp') {
        degrees = Math.min(degrees, 85); let cx = 15, cy = 85;
        svg += drawArcInternal(cx, cy, 35, 0, degrees, cBlue, `${degrees}°`);
        svg += drawArcInternal(cx, cy, 45, degrees, 90, cYellow, '?');
        svg += `<line x1="${cx}" y1="${cy}" x2="120" y2="${cy}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
        svg += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="-20" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
        svg += `<rect x="${cx}" y="${cy-12}" width="12" height="12" fill="none" stroke="${strokeC}" stroke-width="2"/>`; 
        let pR = { x: cx + 120 * Math.cos(rad(degrees)), y: cy - 120 * Math.sin(rad(degrees)) };
        svg += `<line x1="${cx}" y1="${cy}" x2="${pR.x}" y2="${pR.y}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
    }
    else if (type === 'supp') {
        degrees = Math.min(degrees, 175); let cx = 50, cy = 85;
        svg += drawArcInternal(cx, cy, 28, 0, degrees, cBlue, `${degrees}°`);
        svg += drawArcInternal(cx, cy, 38, degrees, 180, cRed, '?');
        svg += `<line x1="-20" y1="${cy}" x2="120" y2="${cy}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
        let pR = { x: cx + 100 * Math.cos(rad(degrees)), y: cy - 100 * Math.sin(rad(degrees)) };
        svg += `<line x1="${cx}" y1="${cy}" x2="${pR.x}" y2="${pR.y}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
    }
    else if (isTriangle) {
        let A, B, C; let labelA = "", labelB = "", labelC = "";
        let drawTicks = false; let tickType = '';

        if (type === 'tri_equi') { 
            A = 60; B = 60; C = 60; 
            labelA = '?'; labelB = ''; labelC = ''; 
            drawTicks = true; tickType = 'equi';
        } else if (type === 'tri_iso') { 
            let parts = String(valString).split(','); drawTicks = true; tickType = 'iso';
            if (parts[0] === 'V') { C = parseInt(parts[1]); A = (180 - C)/2; B = A; labelC = `${C}°`; labelA = `?`; labelB = ``; 
            } else if (parts[0] === 'B') { A = parseInt(parts[1]); B = A; C = 180 - 2*A; labelA = `${A}°`; labelB = ``; labelC = `?`; 
            } else { A = parseInt(parts[0]); B = A; C = 180 - 2*A; labelA = `${A}°`; labelB = ``; labelC = `?`; }
        } else { 
            let parts = String(valString).split(','); A = parseInt(parts[0]); B = parseInt(parts[1]) || 60; C = 180 - A - B;
            labelA = `${A}°`; labelB = `${B}°`; labelC = `?`; 
        }
        
        let c_unscaled = 100;
        let b_unscaled = c_unscaled * Math.sin(rad(B)) / Math.sin(rad(C));
        let cx_u = b_unscaled * Math.cos(rad(A)); let cy_u = b_unscaled * Math.sin(rad(A)); 

        let minX = Math.min(0, c_unscaled, cx_u); let maxX = Math.max(0, c_unscaled, cx_u);
        let w_u = maxX - minX; let h_u = cy_u; 

        let scale = Math.min(50 / w_u, 40 / h_u);
        let f_c = c_unscaled * scale; let f_cx = cx_u * scale; let f_cy = cy_u * scale;
        let f_w = w_u * scale; let f_h = h_u * scale;

        let startX = 50 - f_w/2 - (minX * scale); let startY = 50 + f_h/2 + 5; 
        let ax = startX, ay = startY; let bx = startX + f_c, by = startY;
        let cxC = startX + f_cx, cyC = startY - f_cy; 

        let centroidX = (ax + bx + cxC) / 3; let centroidY = (ay + by + cyC) / 3;

        function getOutwardPos(vx, vy, dist) {
            let dx = vx - centroidX; let dy = vy - centroidY;
            let len = Math.sqrt(dx*dx + dy*dy);
            return { x: vx + (dx/len) * dist, y: vy + (dy/len) * dist };
        }

        function drawArcExternalText(cx, cy, r, aStart, aEnd, color, label) {
            if (!label) return ""; 
            let p1 = { x: cx + r * Math.cos(rad(aStart)), y: cy - r * Math.sin(rad(aStart)) };
            let p2 = { x: cx + r * Math.cos(rad(aEnd)), y: cy - r * Math.sin(rad(aEnd)) };
            let largeArc = Math.abs(aEnd - aStart) > 180 ? 1 : 0;
            let path = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 0 ${p2.x} ${p2.y} Z`;
            if (aStart > aEnd) { path = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`; }
            
            let res = `<path d="${path}" fill="${color}" fill-opacity="${opac}" stroke="${strokeC}" stroke-width="1.2" stroke-linejoin="round"/>`;
            let pOut = getOutwardPos(cx, cy, 14); 
            let fSize = label === '?' ? 18 : 13;
            res += `<text x="${pOut.x}" y="${pOut.y}" font-family="inherit" font-size="${fSize}" font-weight="900" fill="${strokeC}" paint-order="stroke" stroke="#ffffff" stroke-width="4" text-anchor="middle" dominant-baseline="central">${label}</text>`;
            return res;
        }

        function getTick(x1, y1, x2, y2, count) {
            let mx = (x1 + x2) / 2; let my = (y1 + y2) / 2;
            let dx = x2 - x1; let dy = y2 - y1; let len = Math.sqrt(dx*dx + dy*dy);
            let nx = -dy / len; let ny = dx / len; let tickLen = 4; let gap = 3.5; let res = '';
            for(let i=0; i<count; i++) {
                let offset = (i - (count-1)/2) * gap; let tx = mx + (dx/len) * offset; let ty = my + (dy/len) * offset;
                res += `<line x1="${tx - nx*tickLen}" y1="${ty - ny*tickLen}" x2="${tx + nx*tickLen}" y2="${ty + ny*tickLen}" stroke="${strokeC}" stroke-width="2.5" stroke-linecap="round"/>`;
            }
            return res;
        }

        let rA = 12, rB = 12, rC = 12; 
        if (labelA !== false) svg += drawArcExternalText(ax, ay, rA, 0, A, cBlue, labelA);
        if (labelB !== false) svg += drawArcExternalText(bx, by, rB, 180-B, 180, cGreen, labelB);
        if (labelC !== false) svg += drawArcExternalText(cxC, cyC, rC, 180+A, 180+A+C, cRed, labelC);

        svg += `<polygon points="${ax},${ay} ${bx},${by} ${cxC},${cyC}" fill="none" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linejoin="round"/>`;
        if (drawTicks) {
            if (tickType === 'equi') svg += getTick(ax, ay, bx, by, 1) + getTick(bx, by, cxC, cyC, 1) + getTick(cxC, cyC, ax, ay, 1);
            else if (tickType === 'iso') svg += getTick(ax, ay, cxC, cyC, 2) + getTick(bx, by, cxC, cyC, 2);
        }
    }
    else if (type === 'plein') {
        let cx = 50, cy = 50; degrees = Math.min(degrees, 250);
        let a1 = 0, a2 = degrees, a3 = degrees + 90;
        svg += drawArcInternal(cx, cy, 18, a1, a2, cBlue, `${degrees}°`);
        svg += drawArcInternal(cx, cy, 25, a2, a3, cGreen, `90°`);
        svg += drawArcInternal(cx, cy, 32, a3, 360, cYellow, '?');

        let getP = (a) => ({ x: cx + 40 * Math.cos(rad(a)), y: cy - 40 * Math.sin(rad(a)) });
        let p1 = getP(a1), p2 = getP(a2), p3 = getP(a3);
        svg += `<line x1="${cx}" y1="${cy}" x2="${p1.x}" y2="${p1.y}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
        svg += `<line x1="${cx}" y1="${cy}" x2="${p2.x}" y2="${p2.y}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
        svg += `<line x1="${cx}" y1="${cy}" x2="${p3.x}" y2="${p3.y}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
    }

    return svg + `</svg>`;
}