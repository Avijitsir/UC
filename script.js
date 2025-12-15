// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyDwGzTPmFg-gjoYtNWNJM47p22NfBugYFA",
    authDomain: "mock-test-1eea6.firebaseapp.com",
    databaseURL: "https://mock-test-1eea6-default-rtdb.firebaseio.com",
    projectId: "mock-test-1eea6",
    storageBucket: "mock-test-1eea6.firebaseapp.com",
    messagingSenderId: "111849173136",
    appId: "1:111849173136:web:8b211f58d854119e88a815",
    measurementId: "G-5RLWPTP8YD"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Globals
let questions=[], currentIdx=0, status, userAnswers, isSubmitted=false, currentLang='bn', timerInterval, timeLeft=90*60, isPaused=false, filteredIndices=[], currentQuizId="default";
let studentName="", studentMobile="", generatedOTP="";

// --- Login & OTP ---
document.addEventListener('DOMContentLoaded', () => {
    const qId = new URLSearchParams(window.location.search).get('id');
    if(qId) currentQuizId = qId;
    
    const sName = localStorage.getItem("uc_student_name");
    const sMobile = localStorage.getItem("uc_student_mobile");
    
    if (sName && sMobile) {
        studentName = sName; studentMobile = sMobile;
        showApp();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
    }
});

document.getElementById('sendOtpBtn').addEventListener('click', () => {
    const n = document.getElementById('studentName').value.trim();
    const m = document.getElementById('studentMobile').value.trim();
    if(!n || m.length!==10) { alert("নাম এবং ১০ সংখ্যার মোবাইল নম্বর দিন"); return; }
    
    generatedOTP = Math.floor(1000 + Math.random() * 9000);
    alert("আপনার OTP হলো: " + generatedOTP); 
    document.getElementById('otpSection').style.display='block';
    document.getElementById('sendOtpBtn').style.display='none';
    document.getElementById('verifyOtpBtn').style.display='block';
});

document.getElementById('verifyOtpBtn').addEventListener('click', () => {
    if(document.getElementById('otpInput').value == generatedOTP) {
        studentName = document.getElementById('studentName').value.trim();
        studentMobile = document.getElementById('studentMobile').value.trim();
        localStorage.setItem("uc_student_name", studentName);
        localStorage.setItem("uc_student_mobile", studentMobile);
        showApp();
    } else alert("ভুল OTP");
});

function showApp() {
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('instructionScreen').style.display='flex';
    document.getElementById('userNameDisplay').innerText = studentName;
    document.getElementById('userAvatar').innerText = studentName.charAt(0).toUpperCase();
    loadQuiz();
}

// --- Quiz Load ---
function loadQuiz() {
    database.ref('quizzes/'+currentQuizId).once('value').then(s => {
        const d = s.val();
        if(d && d.questions) {
            // Shuffle Options Only
            let temp = JSON.parse(JSON.stringify(d.questions));
            temp.forEach(q => {
                let idx = [0,1,2,3].sort(()=>Math.random()-0.5);
                let bn=[], en=[], c=0;
                idx.forEach((old, newI) => {
                    bn.push(q.options[old]); en.push(q.options[old]); // Assuming one lang input
                    if(old === q.options.indexOf(q.answer)) c=newI;
                });
                q.q_bn = q.question; q.q_en = q.question;
                q.o_bn = bn; q.o_en = en; q.cor = c;
            });
            questions = temp;
            status = new Array(questions.length).fill(0);
            userAnswers = new Array(questions.length).fill(null);
            document.getElementById('instTitle').innerText = d.title || "Instructions";
            updateInstructions('en');
        } else {
            alert("কুইজ পাওয়া যায়নি!");
        }
    });
}

// --- App Logic ---
const trans = { en: {t:"Instructions", c:"<p>1. 90 Mins</p><p>2. +1 Correct, -0.33 Wrong</p>", b:"Start"}, bn: {t:"নির্দেশাবলী", c:"<p>১. ৯০ মিনিট</p><p>২. +১ সঠিক, -০.৩৩ ভুল</p>", b:"শুরু করুন"} };
document.getElementById('langSelector').addEventListener('change', e=>updateInstructions(e.target.value));
function updateInstructions(l) { 
    const t=trans[l]; document.getElementById('instContent').innerHTML=t.c; document.getElementById('startTestBtn').innerText=t.b; 
}
document.getElementById('agreeCheck').addEventListener('change', e=>document.getElementById('startTestBtn').disabled=!e.target.checked);
document.getElementById('startTestBtn').addEventListener('click', ()=>{
    document.getElementById('instructionScreen').style.display='none';
    document.getElementById('quizMainArea').style.display='block';
    loadQ(0); startTimer();
});

// Quiz
document.getElementById('quizLangSelect').addEventListener('change', e=>{currentLang=e.target.value; loadQ(currentIdx);});
function loadQ(i) {
    if(status[i]===0) status[i]=1; currentIdx=i;
    document.getElementById('currentQNum').innerText = i+1;
    const q=questions[i];
    document.getElementById('questionTextBox').innerText = currentLang==='bn'?q.q_bn:q.q_en;
    const con=document.getElementById('optionsContainer'); con.innerHTML='';
    (currentLang==='bn'?q.o_bn:q.o_en).forEach((o, idx)=>{
        const r=document.createElement('div'); r.className='option-row';
        if(userAnswers[i]===idx) r.classList.add('selected');
        r.innerHTML=`<div class="radio-circle"></div><div class="opt-text">${o}</div>`;
        r.onclick=()=>{if(!isPaused){document.querySelectorAll('.option-row').forEach(e=>e.classList.remove('selected')); r.classList.add('selected');}};
        con.appendChild(r);
    });
}
function getSel(){const s=document.querySelector('.option-row.selected'); return s?Array.from(s.parentNode.children).indexOf(s):null;}
document.getElementById('saveNextBtn').addEventListener('click', ()=>{
    if(isPaused)return; const i=getSel();
    if(i!==null){userAnswers[currentIdx]=i; status[currentIdx]=2;} else status[currentIdx]=1;
    if(currentIdx<questions.length-1) loadQ(currentIdx+1); else openDrawer();
});
document.getElementById('markReviewBtn').addEventListener('click', ()=>{
    if(isPaused)return; const i=getSel();
    if(i!==null){userAnswers[currentIdx]=i; status[currentIdx]=4;} else status[currentIdx]=3;
    nextQ();
});
document.getElementById('clearResponseBtn').addEventListener('click', ()=>{
    if(isPaused)return; document.querySelectorAll('.option-row').forEach(e=>e.classList.remove('selected')); userAnswers[currentIdx]=null; status[currentIdx]=1;
});
function nextQ(){if(currentIdx<questions.length-1) loadQ(currentIdx+1); else openDrawer();}

// Drawer & Timer
const dr=document.getElementById('paletteSheet');
function openDrawer(){renderPal(); dr.classList.add('open'); document.getElementById('sheetOverlay').style.display='block';}
document.querySelector('.menu-icon').addEventListener('click', openDrawer);
function closeDrawer(){dr.classList.remove('open'); setTimeout(()=>document.getElementById('sheetOverlay').style.display='none',300);}
document.getElementById('closeSheetBtn').addEventListener('click', closeDrawer);
document.getElementById('sheetOverlay').addEventListener('click', closeDrawer);
function renderPal(){
    const g=document.getElementById('paletteGrid'); g.innerHTML='';
    status.forEach((s,i)=>{
        const b=document.createElement('div'); b.className='p-btn'; b.innerText=i+1;
        if(s===2)b.classList.add('answered'); else if(s===1)b.classList.add('not-answered');
        else if(s===3)b.classList.add('marked'); else if(s===4)b.classList.add('marked-ans');
        if(i===currentIdx)b.classList.add('current');
        b.onclick=()=>{if(!isPaused){loadQ(i); closeDrawer();}}; g.appendChild(b);
    });
}
const pMsg=document.createElement('div'); pMsg.innerText="Paused"; pMsg.style.cssText="position:absolute;top:50%;left:50%;display:none;"; document.body.appendChild(pMsg);
function startTimer(){
    clearInterval(timerInterval);
    timerInterval=setInterval(()=>{
        if(timeLeft<=0){clearInterval(timerInterval); submitTest(); return;}
        let m=parseInt(timeLeft/60), s=parseInt(timeLeft%60);
        document.getElementById('timerDisplay').innerText=`${m}:${s<10?'0'+s:s}`; timeLeft--;
    },1000);
}
document.getElementById('pauseBtn').addEventListener('click', ()=>{
    const ca=document.querySelector('.content-area'); const b=document.getElementById('pauseBtn');
    if(!isPaused){clearInterval(timerInterval); isPaused=true; b.innerText="Resume"; ca.style.opacity='0'; pMsg.style.display='block';}
    else{startTimer(); isPaused=false; b.innerText="Pause"; ca.style.opacity='1'; pMsg.style.display='none';}
});

// --- SUBMIT (SILENT SAVE) & RESULT ---
function submitTest() {
    if(isSubmitted) return; isSubmitted = true; clearInterval(timerInterval);
    let s=0, c=0, w=0, sk=0;
    questions.forEach((q, i) => { if(userAnswers[i]!==null) { if(userAnswers[i]===q.cor) {s++; c++;} else {s-=0.33; w++;} } else sk++; });
    
    // Silent Save
    database.ref('results/'+currentQuizId+'/'+studentMobile).set({
        name: studentName, mobile: studentMobile, score: s.toFixed(2), correct: c, wrong: w, timestamp: new Date().toString()
    });

    document.getElementById('resScore').innerText = s.toFixed(2);
    document.getElementById('resCorrect').innerText = c;
    document.getElementById('resWrong').innerText = w;
    document.getElementById('resSkip').innerText = sk;
    document.getElementById('resultModal').style.display = 'flex';
    applyFilter('all');
}

// Result View
function applyFilter(t){
    filteredIndices=[]; questions.forEach((q,i)=>{
        const u=userAnswers[i]; let s='skipped'; if(u!==null) s=(u===q.cor)?'correct':'wrong';
        if(t==='all'||t===s) filteredIndices.push(i);
    });
    renderResPal();
    if(filteredIndices.length>0) loadResQ(filteredIndices[0]);
    else {document.getElementById('resContentArea').style.display='none'; document.getElementById('resEmptyMsg').style.display='flex';}
}
function renderResPal(){
    const c=document.getElementById('resPaletteContainer'); c.innerHTML='';
    filteredIndices.forEach(idx=>{
        const b=document.createElement('div'); b.className='rp-btn'; b.innerText=idx+1;
        const u=userAnswers[idx], q=questions[idx];
        if(u===null)b.classList.add('skipped'); else if(u===q.cor)b.classList.add('correct'); else b.classList.add('wrong');
        b.onclick=()=>loadResQ(idx); c.appendChild(b);
    });
}
function loadResQ(ri){
    document.getElementById('resContentArea').style.display='flex'; document.getElementById('resEmptyMsg').style.display='none';
    const ni=filteredIndices.indexOf(ri);
    document.querySelectorAll('.rp-btn').forEach(b=>b.classList.remove('active'));
    if(document.querySelectorAll('.rp-btn')[ni]) document.querySelectorAll('.rp-btn')[ni].classList.add('active');
    
    document.getElementById('resCurrentQNum').innerText=ri+1;
    const u=userAnswers[ri], q=questions[ri], cor=q.cor;
    const bdg=document.getElementById('resQStatusBadge');
    if(u===null){bdg.innerText="Skipped";bdg.style.background="#ffc107";bdg.style.color="#333";}
    else if(u===cor){bdg.innerText="Correct";bdg.style.background="#26a745";bdg.style.color="fff";}
    else{bdg.innerText="Wrong";bdg.style.background="#dc3545";bdg.style.color="fff";}
    
    document.getElementById('resQuestionText').innerText = currentLang==='bn'?q.q_bn:q.q_en;
    const con=document.getElementById('resOptionsContainer'); con.innerHTML='';
    (currentLang==='bn'?q.o_bn:q.o_en).forEach((o,i)=>{
        let cls='res-opt-row'; if(i===cor)cls+=' correct-ans'; if(u===i && u!==cor)cls+=' user-wrong';
        con.innerHTML+=`<div class="${cls}"><div class="res-circle"></div><div class="res-opt-text">${o}</div></div>`;
    });
    document.getElementById('resPrevBtn').onclick=()=>{if(ni>0)loadResQ(filteredIndices[ni-1]);};
    document.getElementById('resNextBtn').onclick=()=>{if(ni<filteredIndices.length-1)loadResQ(filteredIndices[ni+1]);};
}
window.addEventListener('beforeunload',(e)=>{if(!isSubmitted){e.preventDefault();e.returnValue='';}});
