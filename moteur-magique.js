/**
 * moteur-magique.js
 * Gère l'algorithme de génération de paires mathématiques
 * avec MÉMOIRE ANTI-DOUBLONS pour des dominos 100% uniques !
 */

function toSup(val) {
    const chars = {'0':'⁰', '1':'¹', '2':'²', '3':'³', '4':'⁴', '5':'⁵', '6':'⁶', '7':'⁷', '8':'⁸', '9':'⁹', '-': '⁻'};
    return String(val).split('').map(c => chars[c] || c).join('');
}

function getPairsList(numNeeded, type) {
    let pairs = [];
    
    // 🛡️ BOUCLIER ANTI-DOUBLONS
    let usedQuestions = new Set();
    let usedAnswers = new Set();
    let attempts = 0; // Sécurité anti-boucle infinie

    function addPair(q, a) {
        let qStr = String(q).trim();
        let aStr = String(a).trim();
        
        // On vérifie que la question ET la réponse sont strictement inédites !
        if (!usedQuestions.has(qStr) && !usedAnswers.has(aStr)) {
            usedQuestions.add(qStr);
            usedAnswers.add(aStr);
            pairs.push({ q: qStr, a: aStr });
        }
    }

    // ... la suite de ton code (if type === 'calcul' etc...)
    
    // --- 🔢 NUMÉRIQUE & ARITHMÉTIQUE ---
    if (type === 'numerique') {
        let formats = [];
        if(document.getElementById('cb-num-puiss') && document.getElementById('cb-num-puiss').checked) formats.push('puiss');
        if(document.getElementById('cb-num-pct') && document.getElementById('cb-num-pct').checked) formats.push('pct');
        if(document.getElementById('cb-num-arith') && document.getElementById('cb-num-arith').checked) formats.push('arith');
        if(formats.length === 0) formats = ['puiss'];

        while(pairs.length < numNeeded) {
            let f = formats[Math.floor(Math.random()*formats.length)];
            if(f === 'puiss') {
                if (Math.random() > 0.5) { 
                    let p1 = Math.floor(Math.random()*15)-7; let p2 = Math.floor(Math.random()*15)-7;
                    addPair(`10${toSup(p1)} × 10${toSup(p2)}`, `10${toSup(p1+p2)}`);
                } else { 
                    let a = Math.floor(Math.random()*90 + 10) / 10; let p = Math.floor(Math.random()*4)+2;
                    let val = Math.round(a * Math.pow(10, p));
                    addPair(`${a.toString().replace('.',',')} × 10${toSup(p)}`, val);
                }
            } else if (f === 'pct') {
                let pcts = [10, 20, 25, 30, 40, 50, 75]; let pct = pcts[Math.floor(Math.random()*pcts.length)];
                let val = Math.floor(Math.random()*15 + 2)*10;
                addPair(`${pct}% de ${val}`, (pct*val)/100);
            } else if (f === 'arith') {
                if (Math.random() > 0.5) { 
                    let gcd = Math.floor(Math.random()*12)+2; let m1 = Math.floor(Math.random()*7)+2; let m2 = Math.floor(Math.random()*7)+2;
                    while(m1===m2 || m1%m2===0 || m2%m1===0 || (m1%2===0 && m2%2===0)) { m1 = Math.floor(Math.random()*7)+2; m2 = Math.floor(Math.random()*7)+2; }
                    addPair(`PGCD(${gcd*m1}; ${gcd*m2})`, gcd);
                } else { 
                    let bases = [2, 3, 5, 7]; let count = Math.random() > 0.5 ? 2 : 3;
                    let selectedBases = [...bases].sort(()=>Math.random()-0.5).slice(0, count).sort((a,b)=>a-b);
                    let val = 1; let parts = [];
                    selectedBases.forEach(b => { let p = Math.floor(Math.random()*2)+1; val *= Math.pow(b, p); if (p > 1) parts.push(`${b}${toSup(p)}`); else parts.push(`${b}`); });
                    addPair(`Décomp. de ${val}`, parts.join(' × '));
                }
            }
        }
    }
    // --- 🔠 ALGÈBRE ---
    else if (type === 'algebre') {
        let formats = [];
        if(document.getElementById('cb-alg-dev') && document.getElementById('cb-alg-dev').checked) formats.push('dev');
        if(document.getElementById('cb-alg-rac') && document.getElementById('cb-alg-rac').checked) formats.push('rac');
        if(formats.length === 0) formats = ['dev'];

        while(pairs.length < numNeeded) {
            let f = formats[Math.floor(Math.random()*formats.length)];
            if(f === 'dev') {
                if(Math.random() > 0.5) { 
                    let k = Math.floor(Math.random()*8)+2; let a = Math.floor(Math.random()*8)+2; let sign = Math.random() > 0.5 ? '+' : '-';
                    let ans = sign==='+' ? `${k}x + ${k*a}` : `${k}x - ${k*a}`;
                    addPair(`${k}(x ${sign} ${a})`, ans);
                } else { 
                    let a = Math.floor(Math.random()*5)+1; let b = Math.floor(Math.random()*5)+1;
                    addPair(`(x + ${a})(x + ${b})`, `x² + ${a+b}x + ${a*b}`);
                }
            } else if(f === 'rac') {
                let perfs = [4, 9, 16, 25, 36, 49, 64, 81, 100]; let rest = [2, 3, 5, 6, 7];
                let p = perfs[Math.floor(Math.random()*perfs.length)]; let r = rest[Math.floor(Math.random()*rest.length)];
                let coeff = Math.sqrt(p); let coeffStr = coeff === 1 ? '' : coeff;
                addPair(generateRootSvg('', p*r), generateRootSvg(coeffStr, r));
            }
        }
    }
    // --- 📏 FIGURES, AIRES, PYTHAGORE & REPÉRAGE (SVG) ---
    else if (type === 'figures') {
        let formats = [];
        if(document.getElementById('cb-geo-rect')?.checked) formats.push('rect');
        if(document.getElementById('cb-geo-tri')?.checked) formats.push('tri');
        if(document.getElementById('cb-geo-circ')?.checked) formats.push('circ');
        if(document.getElementById('cb-geo-los')?.checked) formats.push('los');
        if(document.getElementById('cb-geo-para')?.checked) formats.push('para');
        if(document.getElementById('cb-geo-pyth')?.checked) formats.push('pyth');
        if(document.getElementById('cb-geo-rep')?.checked) formats.push('rep');

        if(formats.length === 0) formats = ['rect'];

        while(pairs.length < numNeeded) {
            let f = formats[Math.floor(Math.random()*formats.length)];
            
            if (f === 'rect') {
                let w = Math.floor(Math.random()*8)+3;
                let h = Math.random() > 0.7 ? w : Math.floor(Math.random()*5)+2;
                addPair(generateAreaSvg('rect', w, h), `Aire = ${w*h}`);
            } else if (f === 'tri') {
                let b = Math.floor(Math.random()*8)+4; let h = Math.floor(Math.random()*6)+3;
                if(b%2 !== 0 && h%2 !== 0) b++; 
                addPair(generateAreaSvg('tri', b, h), `Aire = ${(b*h)/2}`);
            } else if (f === 'circ') {
                let r = Math.floor(Math.random()*8)+2;
                addPair(generateAreaSvg('circ', r, null), `Aire = ${r*r}π`);
            } else if (f === 'los') {
                let d1 = Math.floor(Math.random()*6)+3; let d2 = Math.floor(Math.random()*6)+3;
                if(d1%2 !== 0 && d2%2 !== 0) d1++;
                addPair(generateAreaSvg('los', d1, d2), `Aire = ${(d1*d2)/2}`);
            } else if (f === 'para') {
                let b = Math.floor(Math.random()*8)+3; let h = Math.floor(Math.random()*5)+2;
                addPair(generateAreaSvg('para', b, h), `Aire = ${b*h}`);
            } else if (f === 'pyth') {
                let triplets = [[3,4,5], [6,8,10], [5,12,13], [9,12,15], [8,15,17], [12,16,20], [7,24,25]];
                let t = triplets[Math.floor(Math.random()*triplets.length)];
                let ask = Math.floor(Math.random()*3); 
                addPair(generatePythagoreSvg(t[0], t[1], t[2], ask), t[ask]);
            } else if (f === 'rep') {
                let x = Math.floor(Math.random()*9)-4; let y = Math.floor(Math.random()*9)-4;
                addPair(generateRepereSvg(x, y), `(${x} ; ${y})`);
            }
        }
    }
    // --- 🧠 CALCUL MENTAL (AVEC BORNAGE MIN/MAX) ---
    else if (type === 'calcul') {
        let ops = [];
        if(document.getElementById('cb-calc-add')?.checked) ops.push('add');
        if(document.getElementById('cb-calc-mul')?.checked) ops.push('mul');
        if(document.getElementById('cb-calc-p9')?.checked) ops.push('p9');
        if(document.getElementById('cb-calc-m9')?.checked) ops.push('m9');
        if(ops.length === 0) ops = ['add']; 
        
        let minVal = parseInt(document.getElementById('inp-calc-min')?.value) || 10;
        let maxVal = parseInt(document.getElementById('inp-calc-max')?.value) || 50;
        if (minVal > maxVal) { let tmp = minVal; minVal = maxVal; maxVal = tmp; }
        
        while(pairs.length < numNeeded) {
            let op = ops[Math.floor(Math.random()*ops.length)];
            let a, b, ans, qStr;
            
            if (op === 'add') {
                a = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal; 
                b = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
                ans = a + b; qStr = `${a} + ${b}`;
            } else if (op === 'mul') {
                let limit = Math.min(maxVal, 15); 
                let start = Math.max(minVal, 2);
                a = Math.floor(Math.random() * (limit - start + 1)) + start; 
                b = Math.floor(Math.random() * (limit - start + 1)) + start;
                ans = a * b; qStr = `${a} × ${b}`;
            } else if (op === 'p9') {
                let is99 = Math.random() > 0.5;
                a = Math.floor(Math.random() * (maxVal*10 - minVal + 1)) + minVal; 
                b = is99 ? 99 : 9;
                ans = a + b; qStr = `${a} + ${b}`;
            } else if (op === 'm9') {
                let is99 = Math.random() > 0.5;
                b = is99 ? 99 : 9;
                a = Math.floor(Math.random() * (maxVal*10 - 100 + 1)) + 100; 
                ans = a - b; qStr = `${a} - ${b}`;
            }
            addPair(qStr, ans);
        }
    }
    // --- EQUATIONS ---
    else if (type === 'equations') {
        let lvls = [];
        if(document.getElementById('cb-eq-1')?.checked) lvls.push(1);
        if(document.getElementById('cb-eq-2')?.checked) lvls.push(2);
        if(document.getElementById('cb-eq-3')?.checked) lvls.push(3);
        if(lvls.length === 0) lvls = [1]; 
        
        while(pairs.length < numNeeded) {
            let lvl = lvls[Math.floor(Math.random()*lvls.length)];
            let ans, eqStr;
            
            if (lvl === 1) { 
                let a = Math.floor(Math.random() * 20) + 1; ans = Math.floor(Math.random() * 20) + 1;
                if (Math.random() > 0.5) eqStr = `x + ${a} = ${ans + a}`; else eqStr = `x - ${a} = ${ans - a}`;
            } else if (lvl === 2) { 
                let a = Math.floor(Math.random() * 9) + 2; ans = Math.floor(Math.random() * 11) + 2; 
                eqStr = `${a}x = ${a * ans}`;
            } else if (lvl === 3) { 
                let a = Math.floor(Math.random() * 5) + 2; ans = Math.floor(Math.random() * 10) + 1; let b = Math.floor(Math.random() * 20) + 1;
                eqStr = `${a}x + ${b} = ${a * ans + b}`;
            }
            addPair(eqStr, `x=${ans}`);
        }
    }
    // --- ⚡ PRIORITÉS OPÉRATOIRES ---
  // --- ⚡ PRIORITÉS OPÉRATOIRES ---
    else if (type === 'priorites') {
        let hasSans = document.getElementById('cb-prio-sans')?.checked;
        let hasAvec = document.getElementById('cb-prio-avec')?.checked;
        let hasNiv1 = document.getElementById('cb-prio-niv1')?.checked;
        let hasNiv2 = document.getElementById('cb-prio-niv2')?.checked;

        // Sécurité : si le prof décoche tout, on remet une option par défaut
        if (!hasSans && !hasAvec) hasSans = true;
        if (!hasNiv1 && !hasNiv2) hasNiv1 = true;

        let minVal = parseInt(document.getElementById('inp-prio-min')?.value) || 2;
        let maxVal = parseInt(document.getElementById('inp-prio-max')?.value) || 12;
        if (minVal > maxVal) { let tmp = minVal; minVal = maxVal; maxVal = tmp; }
        let getRnd = () => Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;

        // On prépare la liste des structures autorisées
        let pool = [];
        if (hasNiv1 && hasSans) pool.push('1_sans');
        if (hasNiv1 && hasAvec) pool.push('1_avec');
        if (hasNiv2 && hasSans) pool.push('2_sans');
        if (hasNiv2 && hasAvec) pool.push('2_avec');

        while(pairs.length < numNeeded && attempts < 2000) {
            attempts++;
            let choice = pool[Math.floor(Math.random() * pool.length)];
            let a = getRnd(), b = getRnd(), c = getRnd(), d = getRnd();
            let qStr = "", ans = 0;

            if (choice === '1_sans') {
                let sub = Math.floor(Math.random() * 6);
                if (sub===0) { qStr=`${a} + ${b} × ${c}`; ans = a + b*c; }
                else if (sub===1) { qStr=`${a} × ${b} + ${c}`; ans = a*b + c; }
                else if (sub===2) { if (a <= b*c) a = b*c + getRnd(); qStr=`${a} - ${b} × ${c}`; ans = a - b*c; }
                else if (sub===3) { if (a*b <= c) c = Math.max(1, a*b - getRnd()); qStr=`${a} × ${b} - ${c}`; ans = a*b - c; }
                else if (sub===4) { if (a+b <= c) c = Math.max(1, a+b - getRnd()); qStr=`${a} + ${b} - ${c}`; ans = a+b - c; }
                else if (sub===5) { if (a <= b+c) a = b+c + getRnd(); qStr=`${a} - ${b} - ${c}`; ans = a - b - c; }
            }
            else if (choice === '1_avec') {
                let sub = Math.floor(Math.random() * 4);
                if (sub===0) { qStr=`(${a} + ${b}) × ${c}`; ans = (a+b)*c; }
                else if (sub===1) { qStr=`${a} × (${b} + ${c})`; ans = a*(b+c); }
                else if (sub===2) { if(a <= b) a = b + getRnd(); qStr=`(${a} - ${b}) × ${c}`; ans = (a-b)*c; }
                else if (sub===3) { if(b <= c) b = c + getRnd(); qStr=`${a} × (${b} - ${c})`; ans = a*(b-c); }
            }
            else if (choice === '2_sans') {
                let sub = Math.floor(Math.random() * 4);
                if (sub===0) { qStr=`${a} + ${b} × ${c} + ${d}`; ans = a + b*c + d; }
                else if (sub===1) { if(a+b*c <= d) d = Math.max(1, a+b*c - getRnd()); qStr=`${a} + ${b} × ${c} - ${d}`; ans = a+b*c - d; }
                else if (sub===2) { qStr=`${a} × ${b} + ${c} × ${d}`; ans = a*b + c*d; }
                else if (sub===3) { 
                    if(a*b <= c*d) { let t=a; a=c; c=t; t=b; b=d; d=t; } 
                    if(a*b <= c*d) a += getRnd(); 
                    qStr=`${a} × ${b} - ${c} × ${d}`; ans = a*b - c*d; 
                }
            }
            else if (choice === '2_avec') {
                let sub = Math.floor(Math.random() * 4);
                if (sub===0) { qStr=`(${a} + ${b}) × (${c} + ${d})`; ans = (a+b)*(c+d); }
                else if (sub===1) { if(a<=b) a = b + getRnd(); qStr=`(${a} - ${b}) × (${c} + ${d})`; ans = (a-b)*(c+d); }
                else if (sub===2) { if(c<=d) c = d + getRnd(); qStr=`(${a} + ${b}) × (${c} - ${d})`; ans = (a+b)*(c-d); }
                else if (sub===3) { if(a*(b+c) <= d) d = Math.max(1, a*(b+c) - getRnd()); qStr=`${a} × (${b} + ${c}) - ${d}`; ans = a*(b+c) - d; }
            }
            
            addPair(qStr, ans);
        }
    }
    // --- NOMBRES RELATIFS ---
    else if (type === 'relatifs') {
        let ops = [];
        if(document.getElementById('cb-add')?.checked) ops.push('+');
        if(document.getElementById('cb-sub')?.checked) ops.push('-');
        if(document.getElementById('cb-mul')?.checked) ops.push('×');
        if(ops.length === 0) ops = ['+']; 
        let max = parseInt(document.getElementById('inp-rel-max').value) || 10;
        
        while(pairs.length < numNeeded) {
            let op = ops[Math.floor(Math.random()*ops.length)];
            let a = Math.floor(Math.random()*(max*2+1)) - max; let b = Math.floor(Math.random()*(max*2+1)) - max;
            let strB = b < 0 ? `(${b})` : b; 
            let ans = op === '+' ? a+b : (op === '-' ? a-b : a*b);
            addPair(`${a} ${op} ${strB}`, ans);
        }
    } 
    // --- ANGLES & GÉOMÉTRIE ---
    else if (type === 'angles') {
        let formats = [];
        if(document.getElementById('cb-ang-opp')?.checked) formats.push('oppose');
        if(document.getElementById('cb-ang-alt')?.checked) formats.push('alterne');
        if(document.getElementById('cb-ang-cor')?.checked) formats.push('corresp');
        if(document.getElementById('cb-ang-comp')?.checked) formats.push('comp');
        if(document.getElementById('cb-ang-supp')?.checked) formats.push('supp');
        if(document.getElementById('cb-ang-tri')?.checked) formats.push('tri_equi', 'tri_iso', 'tri_iso', 'tri_iso', 'tri_iso', 'tri_quel', 'tri_quel', 'tri_quel', 'tri_quel'); 
        if(document.getElementById('cb-ang-plein')?.checked) formats.push('plein');

        if (formats.length === 0) formats = ['oppose'];

        while(pairs.length < numNeeded) {
            let f = formats[Math.floor(Math.random() * formats.length)];
            let val, ans;
            let randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

            if(f === 'oppose' || f === 'alterne' || f === 'corresp') {
                val = randInt(35, 125); ans = val;
            } else if(f === 'comp') {
                val = randInt(20, 70); ans = 90 - val;
            } else if(f === 'supp') {
                val = randInt(30, 150); ans = 180 - val;
            } else if(f === 'tri_equi') {
                val = 60; ans = 60; 
            } else if(f === 'tri_iso') {
                if (Math.random() > 0.5) { 
                    let v = randInt(40, 110); if (v % 2 !== 0) v++; 
                    ans = (180 - v) / 2; val = `V,${v}`; 
                } else { 
                    let b = randInt(35, 65); ans = 180 - (b * 2); val = `B,${b}`; 
                }
            } else if(f === 'tri_quel') {
                let a1 = randInt(40, 80); let a2 = randInt(40, 80);
                val = `${a1},${a2}`; ans = 180 - a1 - a2;
            } else if(f === 'plein') {
                val = randInt(60, 200); ans = 360 - 90 - val; 
            }
            
            let svg = generateAdvancedAngle(val, f);
            addPair(svg, `${ans}°`);
        }
    } 
    // --- FRACTIONS ---
    else if (type === 'fractions') {
        let formats = [];
        if(document.getElementById('cb-frac-txt')?.checked) formats.push('txt');
        if(document.getElementById('cb-frac-pct')?.checked) formats.push('pct');
        if(document.getElementById('cb-frac-pie')?.checked) formats.push('pie');
        if(document.getElementById('cb-frac-bar')?.checked) formats.push('bar');
        if(document.getElementById('cb-frac-axis')?.checked) formats.push('axis');
        if (formats.length === 0) formats = ['txt']; 

        let pool = [ {n: 1, d: 2, pct: '50%'}, {n: 1, d: 4, pct: '25%'}, {n: 3, d: 4, pct: '75%'}, {n: 1, d: 5, pct: '20%'}, {n: 2, d: 5, pct: '40%'}, {n: 3, d: 5, pct: '60%'}, {n: 4, d: 5, pct: '80%'}, {n: 1, d: 10, pct: '10%'}, {n: 3, d: 10, pct: '30%'}, {n: 7, d: 10, pct: '70%'}, {n: 1, d: 20, pct: '5%'} ];
        let renderFormat = (format, num, den, pct) => {
            if (format === 'txt') return generateFractionSvg(num, den);
            if (format === 'pct') return pct;
            if (format === 'pie') return generatePieSvg(num, den);
            if (format === 'bar') return generateBarSvg(num, den);
            if (format === 'axis') return generateAxisSvg(num, den);
        };

        while(pairs.length < numNeeded) {
            let p = pool[Math.floor(Math.random() * pool.length)];
            let f1 = formats[Math.floor(Math.random() * formats.length)];
            let availableF2 = formats.filter(f => f !== f1);
            let f2 = availableF2.length > 0 ? availableF2[Math.floor(Math.random() * availableF2.length)] : f1;
            addPair(renderFormat(f1, p.n, p.d, p.pct), renderFormat(f2, p.n, p.d, p.pct));
        }
    } 
    // --- CONVERSIONS ---
    else if (type === 'conversions') {
        let convEl = document.querySelector('input[name="conv-type"]:checked');
        let convType = convEl ? convEl.value : 'len';
        let units = convType === 'len' ? ['mm', 'cm', 'm', 'km'] : ['mg', 'g', 'kg', 't'];
        let powers = convType === 'len' ? {'mm':0, 'cm':1, 'm':3, 'km':6} : {'mg':0, 'g':3, 'kg':6, 't':9};
        let bases = [1, 1.5, 2, 2.5, 3, 4.5, 5, 10, 15, 25, 50, 100];
        
        while(pairs.length < numNeeded) {
            let u1, u2, diff;
            do {
                u1 = units[Math.floor(Math.random()*units.length)];
                u2 = units[Math.floor(Math.random()*units.length)];
                diff = Math.abs(powers[u1] - powers[u2]);
            } while (u1 === u2 || diff > 3); 
            
            let base = bases[Math.floor(Math.random()*bases.length)];
            let actualDiff = powers[u1] - powers[u2];
            let val2 = parseFloat((base * Math.pow(10, actualDiff)).toPrecision(7));
            addPair(`${base} ${u1}`, `${val2} ${u2}`);
        }
    }
    // --- 🌍 VOCABULAIRE & TRADUCTION ---
    else if (type === 'vocabulaire') {
        let theme = document.getElementById('lang-vocab-theme')?.value || 'animaux';
        let data = [];
        if (theme === 'animaux') data = [['Chien', 'Dog'], ['Chat', 'Cat'], ['Cheval', 'Horse'], ['Oiseau', 'Bird'], ['Poisson', 'Fish'], ['Vache', 'Cow'], ['Singe', 'Monkey'], ['Lapin', 'Rabbit'], ['Loup', 'Wolf'], ['Ours', 'Bear'], ['Lion', 'Lion'], ['Tigre', 'Tiger'], ['Serpent', 'Snake'], ['Éléphant', 'Elephant'], ['Girafe', 'Giraffe']];
        else if (theme === 'couleurs') data = [['Rouge', 'Red'], ['Bleu', 'Blue'], ['Vert', 'Green'], ['Jaune', 'Yellow'], ['Noir', 'Black'], ['Blanc', 'White'], ['Gris', 'Gray'], ['Marron', 'Brown'], ['Rose', 'Pink'], ['Violet', 'Purple'], ['Orange', 'Orange']];
        else if (theme === 'maison') data = [['Maison', 'House'], ['Porte', 'Door'], ['Fenêtre', 'Window'], ['Chaise', 'Chair'], ['Table', 'Table'], ['Lit', 'Bed'], ['Cuisine', 'Kitchen'], ['Chambre', 'Bedroom'], ['Salle de bain', 'Bathroom'], ['Jardin', 'Garden']];
        else if (theme === 'metiers') data = [['Professeur', 'Teacher'], ['Docteur', 'Doctor'], ['Infirmière', 'Nurse'], ['Pompier', 'Firefighter'], ['Boulanger', 'Baker'], ['Policier', 'Police officer'], ['Cuisinier', 'Chef'], ['Facteur', 'Postman'], ['Avocat', 'Lawyer'], ['Ingénieur', 'Engineer']];
        
        data = data.sort(() => Math.random() - 0.5);
        for(let i=0; i<data.length && pairs.length<numNeeded; i++) { addPair(data[i][0], data[i][1]); }
        while(pairs.length < numNeeded) { addPair(data[Math.floor(Math.random()*data.length)][0], data[Math.floor(Math.random()*data.length)][1]); }
    }
    // --- 📖 CONJUGAISON ---
    else if (type === 'conjugaison') {
        let temps = document.getElementById('lang-conj-temps')?.value || 'present';
        let data = [];
        if (temps === 'present') data = [['Je (Manger)', 'mange'], ['Tu (Parler)', 'parles'], ['Il (Prendre)', 'prend'], ['Nous (Aller)', 'allons'], ['Vous (Faire)', 'faites'], ['Ils (Dire)', 'disent'], ['Je (Vouloir)', 'veux'], ['Tu (Pouvoir)', 'peux'], ['Elle (Voir)', 'voit'], ['Nous (Venir)', 'venons'], ['Vous (Savoir)', 'savez'], ['Ils (Avoir)', 'ont'], ['Je (Être)', 'suis']];
        else if (temps === 'imparfait') data = [['Je (Chanter)', 'chantais'], ['Tu (Finir)', 'finissais'], ['Il (Prendre)', 'prenait'], ['Nous (Aller)', 'allions'], ['Vous (Faire)', 'faisiez'], ['Ils (Dire)', 'disaient'], ['Je (Avoir)', 'avais'], ['Tu (Être)', 'étais'], ['Elle (Voir)', 'voyait']];
        else if (temps === 'futur') data = [['Je (Manger)', 'mangerai'], ['Tu (Parler)', 'parleras'], ['Il (Prendre)', 'prendra'], ['Nous (Aller)', 'irons'], ['Vous (Faire)', 'ferez'], ['Ils (Dire)', 'diront'], ['Je (Vouloir)', 'voudrai'], ['Tu (Pouvoir)', 'pourras'], ['Elle (Voir)', 'verra']];
        
        data = data.sort(() => Math.random() - 0.5);
        for(let i=0; i<data.length && pairs.length<numNeeded; i++) { addPair(data[i][0], data[i][1]); }
        while(pairs.length < numNeeded) { addPair(data[Math.floor(Math.random()*data.length)][0], data[Math.floor(Math.random()*data.length)][1]); }
    }
    // --- 🔤 SYNONYMES ET ANTONYMES ---
    else if (type === 'syno-anto') {
        let sType = document.getElementById('lang-syn-type')?.value || 'synonymes';
        let data = [];
        if (sType === 'synonymes') data = [['Heureux', 'Joyeux'], ['Rapide', 'Véloce'], ['Grand', 'Vaste'], ['Joli', 'Beau'], ['Triste', 'Malheureux'], ['Froid', 'Glacé'], ['Chaud', 'Brûlant'], ['Calme', 'Paisible'], ['Fort', 'Puissant'], ['Intelligent', 'Malin'], ['Fatigué', 'Épuisé'], ['Drôle', 'Amusant']];
        else data = [['Grand', 'Petit'], ['Chaud', 'Froid'], ['Jour', 'Nuit'], ['Heureux', 'Triste'], ['Vite', 'Lentement'], ['Fort', 'Faible'], ['Jeune', 'Vieux'], ['Beau', 'Laid'], ['Gentil', 'Méchant'], ['Riche', 'Pauvre'], ['Plein', 'Vide']];
        
        data = data.sort(() => Math.random() - 0.5);
        for(let i=0; i<data.length && pairs.length<numNeeded; i++) { addPair(data[i][0], data[i][1]); }
        while(pairs.length < numNeeded) { addPair(data[Math.floor(Math.random()*data.length)][0], data[Math.floor(Math.random()*data.length)][1]); }
    }
    // --- 🌍 GEOGRAPHIE ---
    else if (type === 'geo') {
        let data = [['France', 'Paris'], ['Espagne', 'Madrid'], ['Italie', 'Rome'], ['Allemagne', 'Berlin'], ['Royaume-Uni', 'Londres'], ['Belgique', 'Bruxelles'], ['Suisse', 'Berne'], ['Portugal', 'Lisbonne'], ['Pays-Bas', 'Amsterdam'], ['Grèce', 'Athènes'], ['Suède', 'Stockholm'], ['Norvège', 'Oslo'], ['Finlande', 'Helsinki'], ['Irlande', 'Dublin'], ['Autriche', 'Vienne']];
        
        data = data.sort(() => Math.random() - 0.5);
        for(let i=0; i<data.length && pairs.length<numNeeded; i++) { addPair(data[i][0], data[i][1]); }
        while(pairs.length < numNeeded) { addPair(data[Math.floor(Math.random()*data.length)][0], data[Math.floor(Math.random()*data.length)][1]); }
    }
    // --- 📊 IMPORT EXCEL / CSV ---
    else if (type === 'import') {
        let text = document.getElementById('gen-import-text').value;
        let lines = text.split('\n');
        let data = [];
        lines.forEach(l => {
            let parts = l.split('\t'); 
            if(parts.length < 2) parts = l.split(';'); 
            if(parts.length >= 2 && parts[0].trim() !== '') {
                data.push([parts[0].trim(), parts[1].trim()]);
            }
        });
        if (data.length === 0) { showAlert("⚠️ Import vide", "Copiez-collez deux colonnes depuis Excel (ou séparez vos mots par une tabulation) !"); return null; }
        
        data = data.sort(() => Math.random() - 0.5);
        for(let i=0; i<data.length && pairs.length<numNeeded; i++) { addPair(data[i][0], data[i][1]); }
        while(pairs.length < numNeeded) { addPair(data[Math.floor(Math.random()*data.length)][0], data[Math.floor(Math.random()*data.length)][1]); }
    }
    // --- CUSTOM MANUEL ---
    else if(type === 'custom') { 
        let lines = document.getElementById('gen-custom-text').value.split('\n'); 
        lines.forEach(l => { let parts = l.split('='); if(parts.length===2) pairs.push({q: parts[0].trim(), a: parts[1].trim()}); }); 
        if(pairs.length === 0) { showAlert("⚠️ Liste vide", "Veuillez entrer au moins une association (ex: Chien = Dog)."); return null; } 
        while(pairs.length < numNeeded) { pairs = pairs.concat([...pairs]); } 
        return pairs.slice(0, numNeeded).sort(() => Math.random() - 0.5); 
    }
    
    return pairs; 
}

function applyGenerator(type) {
    if (window.pieces.length < 2) { 
        showAlert("⚠️ Oups", "Dessinez au moins 2 pièces reliées pour utiliser ce générateur !"); 
        return; 
    }

    if (window.mode === 'domino') {
        let zones = [];
        window.pieces.forEach(p => {
            let rx = Math.round(p.x), ry = Math.round(p.y);
            let z0 = { id: `${p.id}-0`, p: p, z: 0 };
            let z1 = { id: `${p.id}-1`, p: p, z: 1 };
            
            if (p.dir === 'hr') { z0.x = rx; z0.y = ry; z1.x = rx + 1; z1.y = ry; } 
            else if (p.dir === 'hl') { z0.x = rx - 1; z0.y = ry; z1.x = rx; z1.y = ry; } 
            else if (p.dir === 'vd') { z0.x = rx; z0.y = ry; z1.x = rx; z1.y = ry + 1; } 
            else if (p.dir === 'vu') { z0.x = rx; z0.y = ry - 1; z1.x = rx; z1.y = ry; }
            zones.push(z0, z1);
        });

        let adj = {}; zones.forEach(z => adj[z.id] = []);

        for(let i=0; i<zones.length; i++) {
            for(let j=i+1; j<zones.length; j++) {
                let zA = zones[i], zB = zones[j];
                if (zA.p.id !== zB.p.id) { 
                    let dx = Math.abs(zA.x - zB.x), dy = Math.abs(zA.y - zB.y);
                    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                        adj[zA.id].push(zB.id); adj[zB.id].push(zA.id);
                    }
                }
            }
        }

        let visited = new Set(); let components = [];
        zones.forEach(z => {
            if (!visited.has(z.id)) {
                let comp = []; let q = [z.id]; visited.add(z.id);
                while(q.length > 0) {
                    let currId = q.shift(); comp.push(currId);
                    adj[currId].forEach(neighbor => {
                        if (!visited.has(neighbor)) { visited.add(neighbor); q.push(neighbor); }
                    });
                }
                components.push(comp);
            }
        });

        let joints = components.filter(c => c.length > 1);
        let outers = components.filter(c => c.length === 1);

        let pairs = getPairsList(joints.length, type);
        if (!pairs) return;

        window.pieces.forEach(p => { p.zones = ['', '']; });
        let zoneMap = {}; zones.forEach(z => zoneMap[z.id] = z);

        joints.forEach((comp, i) => {
            let pair = pairs[i];
            let shuffledComp = [...comp].sort(() => Math.random() - 0.5);
            let qZoneId = shuffledComp[0];
            zoneMap[qZoneId].p.zones[zoneMap[qZoneId].z] = pair.q;
            
            for(let j=1; j<shuffledComp.length; j++) {
                let aZoneId = shuffledComp[j];
                zoneMap[aZoneId].p.zones[zoneMap[aZoneId].z] = pair.a;
            }
        });

        outers.forEach((comp, i) => {
            let zId = comp[0]; let zObj = zoneMap[zId];
            if (i === 0) { zObj.p.zones[zObj.z] = "DÉBUT"; } 
            else if (i === outers.length - 1) { zObj.p.zones[zObj.z] = "FIN"; } 
            else {
                let randomPair = pairs[Math.floor(Math.random() * pairs.length)];
                zObj.p.zones[zObj.z] = Math.random() > 0.5 ? randomPair.q : randomPair.a;
            }
        });

    } else if (window.mode === 'triomino' || window.mode === 'square') {
        let edges = []; let outerFaces = []; let grid = {}; 
        
        window.pieces.forEach(p => {
            if(window.mode === 'triomino') grid[`${Math.round(p.q)},${Math.round(p.r)}`] = p;
            else grid[`${Math.round(p.x)},${Math.round(p.y)}`] = p;
        });
        
        window.pieces.forEach(pA => {
            let neighborsData = [];
            if (window.mode === 'triomino') {
                let isUp = (Math.round(pA.q) + Math.round(pA.r)) % 2 === 0; 
                neighborsData = isUp ? 
                    [ { z: 0, dx: 0, dy: 1, nZ: 0 }, { z: 1, dx: -1, dy: 0, nZ: 2 }, { z: 2, dx: 1, dy: 0, nZ: 1 } ] : 
                    [ { z: 0, dx: 0, dy: -1, nZ: 0 }, { z: 1, dx: -1, dy: 0, nZ: 2 }, { z: 2, dx: 1, dy: 0, nZ: 1 } ];
            } else {
                neighborsData = [ 
                    { z: 0, dx: 0, dy: -1, nZ: 2 }, { z: 1, dx: 1, dy: 0, nZ: 3 }, 
                    { z: 2, dx: 0, dy: 1, nZ: 0 }, { z: 3, dx: -1, dy: 0, nZ: 1 }  
                ];
            }
            
            neighborsData.forEach(nd => { 
                let key = window.mode === 'triomino' ? `${Math.round(pA.q) + nd.dx},${Math.round(pA.r) + nd.dy}` : `${Math.round(pA.x) + nd.dx},${Math.round(pA.y) + nd.dy}`;
                let pB = grid[key]; 
                if (pB) { if (pA.id < pB.id) edges.push({ pA: pA, zA: nd.z, pB: pB, zB: nd.nZ }); } 
                else { outerFaces.push({ p: pA, z: nd.z }); } 
            });
        });
        
        let pairs = getPairsList(edges.length, type); if (!pairs) return; 
        
        if(window.mode === 'triomino') {
            window.pieces.forEach(p => { p.zones = ['', '', '']; p.qCount = 0; p.aCount = 0; });
        } else {
            window.pieces.forEach(p => { p.zones = ['', '', '', '']; p.qCount = 0; p.aCount = 0; });
        }
        
        edges.forEach((edge, i) => { 
            let pA = edge.pA; let pB = edge.pB;
            let assignQtoA = false;
            
            if (pA.qCount < pB.qCount) assignQtoA = true;
            else if (pA.qCount > pB.qCount) assignQtoA = false;
            else if (pA.aCount > pB.aCount) assignQtoA = true;
            else if (pA.aCount < pB.aCount) assignQtoA = false;
            else assignQtoA = Math.random() > 0.5;

            if (assignQtoA) {
                pA.zones[edge.zA] = pairs[i].q; pA.qCount++;
                pB.zones[edge.zB] = pairs[i].a; pB.aCount++;
            } else {
                pA.zones[edge.zA] = pairs[i].a; pA.aCount++;
                pB.zones[edge.zB] = pairs[i].q; pB.qCount++;
            }
        });
        
        let decoyPairs = getPairsList(outerFaces.length, type) || pairs; 
        
        outerFaces.forEach((face, i) => { 
            let decoy = decoyPairs[i % decoyPairs.length];
            face.p.zones[face.z] = Math.random() > 0.5 ? decoy.q : decoy.a;
        });
    } 
    
    renderAll(); 
    if (typeof saveState === 'function') saveState();
}