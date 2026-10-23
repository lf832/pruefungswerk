const STORE='pruefungswerk.v1';
const template={examId:'ihk-2025-01',title:'Abschlussprüfung – Teil 1',year:2025,questions:[{id:'aufgabe-1',type:'single',prompt:'Fragetext hier eintragen',points:2,options:[{id:'a',text:'Antwort A'},{id:'b',text:'Antwort B'}],answerIds:['b'],solution:'Hier die Lösung und eine kurze Erklärung eintragen.'}]};
let data=loadData(),activeQuiz=null,toastTimer,wissen=null,wissenQuery='';
const $=s=>document.querySelector(s);
function loadData(){try{const d=JSON.parse(localStorage.getItem(STORE));if(d&&Array.isArray(d.profiles)&&Array.isArray(d.exams))return d}catch(e){}return{profiles:[{id:crypto.randomUUID(),name:'Lernprofil 1',stats:{sessions:0,answered:0,correct:0,byExam:{},history:[]}}],activeProfile:null,exams:[]}}
if(!data.activeProfile||!data.profiles.some(p=>p.id===data.activeProfile))data.activeProfile=data.profiles[0].id;
function save(){localStorage.setItem(STORE,JSON.stringify(data))}
function profile(){return data.profiles.find(p=>p.id===data.activeProfile)||data.profiles[0]}
function safeText(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function init(){save();tagExams();applySettings();render();$('#importButton').onclick=chooseExam;$('#emptyImportButton').onclick=chooseExam;$('#helpImportButton').onclick=()=>{$('#helpDialog').close();chooseExam()};$('#examFileInput').onchange=importExamFile;$('#profileMenuButton').onclick=openProfiles;$('#profileSelect').onchange=e=>{data.activeProfile=e.target.value;save();render()};$('#newProfileForm').onsubmit=createProfile;$('#exportExamsButton').onclick=exportExams;$('#importProgressButton').onclick=()=>{$('#progressFileInput').value='';$('#progressFileInput').click()};$('#exportProgressButton').onclick=exportProgress;$('#progressFileInput').onchange=importProgress;$('#helpButton').onclick=()=>$('#helpDialog').showModal();$('#downloadTemplateButton').onclick=downloadTemplate;$('#navExams').onclick=()=>document.querySelector('.exam-section').scrollIntoView({behavior:'smooth'});$('#navWissen').onclick=showWissen;$('#navStats').onclick=()=>document.querySelector('.stats-strip').scrollIntoView({behavior:'smooth'});document.querySelector('.mobile-nav a').onclick=e=>{e.preventDefault();if(!$('#wissenView').hidden)hideWissen();else if(!$('#diaryView').hidden)hideDiary();else window.scrollTo({top:0,behavior:'smooth'})};$('#continueButton').onclick=continueLearning;$('#navDiary').onclick=showDiary;$('#settingsButton').onclick=openSettings;$('#quickRandom').onclick=openRandom;$('#quickWrong').onclick=()=>startList('mix-fehler','Fehlerkorb · '+wrongList().length+' Fragen',wrongList());$('#quickMarked').onclick=()=>startList('mix-merk','Merkliste · '+markedList().length+' Fragen',markedList());const qsq=$('#qSearch');if(qsq)qsq.oninput=()=>{qQuery=qsq.value;renderSearch()};}
function render(){const p=profile(),s=p.stats||{sessions:0,answered:0,correct:0,byExam:{},history:[]};$('#profileSelect').innerHTML=data.profiles.map(x=>`<option value="${safeText(x.id)}" ${x.id===p.id?'selected':''}>${safeText(x.name)}</option>`).join('');$('#avatarInitial').textContent=(p.name||'L').trim().slice(0,1).toUpperCase();$('#statSessions').textContent=s.sessions||0;$('#statAnswered').textContent=s.answered||0;$('#statAccuracy').textContent=s.answered?`${Math.round((s.correct||0)/s.answered*100)}%`:'—';const grid=$('#examGrid'),empty=$('#emptyState');grid.innerHTML=data.exams.map((e,i)=>{const es=s.byExam[e.examId]||{answered:0,correct:0,sessions:0},pct=es.answered?Math.round(es.correct/es.answered*100):0;return `<article class="exam-card" data-exam="${safeText(e.examId)}" tabindex="0" role="button" aria-label="Prüfung öffnen: ${safeText(e.title)}"><div class="exam-card-top"><span class="exam-number">PRÜFUNG ${String(i+1).padStart(2,'0')}</span><span class="exam-arrow">↗</span></div><h3>${safeText(e.title)}</h3><div class="exam-meta">${e.year?safeText(e.year):'IHK'} · ${e.questions.length} ${e.questions.length===1?'Aufgabe':'Aufgaben'}</div><div class="exam-progress"><span style="width:${pct}%"></span></div><div class="exam-card-foot"><span>${es.sessions||0} Runden</span><span>${es.answered?pct+'% richtig':'NOCH OFFEN'}</span></div></article>`}).join('');grid.hidden=!data.exams.length;empty.hidden=!!data.exams.length;grid.querySelectorAll('.exam-card').forEach(el=>{el.onclick=()=>openExam(el.dataset.exam);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openExam(el.dataset.exam)}}});renderDiaryCard();renderResumeCard();renderQuick();renderReadiness();}
function chooseExam(){$('#examFileInput').value='';$('#examFileInput').click()}
function importExamFile(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const obj=JSON.parse(r.result),items=Array.isArray(obj)?obj:[obj];let count=0;for(const exam of items){validateExam(exam);const i=data.exams.findIndex(x=>x.examId===exam.examId);if(i>=0)data.exams[i]=exam;else data.exams.push(exam);count++}save();render();showToast(`${count} Prüfung${count===1?'':'en'} importiert`)}catch(err){showToast(`Import nicht möglich: ${err.message}`)}};r.readAsText(f)}
function validateExam(e){if(!e||typeof e!=='object'||!e.examId||!e.title||!Array.isArray(e.questions)||!e.questions.length)throw Error('examId, title und mindestens eine Frage werden benötigt.');for(const [i,q] of e.questions.entries()){if(!q.id||!q.prompt||!['single','multiple','text'].includes(q.type))throw Error(`Frage ${i+1}: id, prompt und gültiger type fehlen.`);if(q.type!=='text'&&(!Array.isArray(q.options)||q.options.length<2))throw Error(`Frage ${i+1}: mindestens zwei Antwortoptionen nötig.`);if(!Array.isArray(q.answerIds)||q.answerIds.some(a=>!q.options?.some(o=>o.id===a)))throw Error(`Frage ${i+1}: answerIds passen nicht zu den Antwortoptionen.`)} }
function openExam(id){const e=data.exams.find(x=>x.examId===id);if(!e)return;const dialog=document.createElement('dialog');dialog.className='modal';dialog.innerHTML=`<div class="modal-head"><div><p class="eyebrow muted">PRÜFUNG STARTEN</p><h2>${safeText(e.title)}</h2></div><button class="close-button" id="closeExamDialog" aria-label="Schließen">×</button></div><p>${e.questions.length} Aufgaben${e.year?` · ${safeText(e.year)}`:''}. Wähle, wie du üben möchtest.</p><div class="help-actions"><button type="button" class="button button-dark" data-mode="practice">Lernmodus</button><button type="button" class="button button-outline" data-mode="exam">Prüfungsmodus</button></div><p class="note-small"><b>Lernmodus:</b> Lösung und Erklärung nach jeder Antwort.<br><b>Prüfungsmodus:</b> Lösungen erst am Ende; Freitext bewertest du selbst.</p>`;document.body.append(dialog);dialog.querySelector('#closeExamDialog').onclick=()=>{dialog.close();dialog.remove()};dialog.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{const mode=b.dataset.mode;dialog.remove();startQuiz(e,mode)});dialog.showModal()}
function startQuiz(exam,mode,qs,startIndex){if(activeQuiz)logQuizSegment(activeQuiz);clearResume();const list=(Array.isArray(qs)&&qs.length)?qs:exam.questions;activeQuiz={exam,mode,qs:list,index:Math.max(0,Math.min(startIndex||0,list.length-1)),answers:[],revealed:false,graded:{},qTimes:[],qAcc:{},qStart:Date.now(),qLog:{},startedAt:Date.now(),segmentStart:Date.now(),ended:false,deadline:mode==='exam'?Date.now()+(settings().examMin||90)*60000:0};$('#homeView').hidden=true;$('#quizView').hidden=false;renderQuestion();window.scrollTo(0,0)}
function renderQuestion(){setTimeout(saveResume,0);if(activeQuiz&&!activeQuiz.qStart&&!activeQuiz.revealed)activeQuiz.qStart=Date.now();const qv=$('#quizView'),z=activeQuiz,q=z.qs[z.index],isText=q.type==='text',isMulti=q.type==='multiple',chosen=z.answers[z.index]||[];const progress=Math.round(z.index/z.qs.length*100);qv.innerHTML=`<div class="quiz-wrap"><div class="quiz-top"><button class="back-button" id="quitQuiz">← Übersicht</button><div class="quiz-title">${safeText(z.exam.title)}</div><span class="quiz-mode">${z.mode==='practice'?'LERNMODUS':'PRÜFUNG'}</span><span class="quiz-clock" id="quizClock">${quizClockText()}</span><span class="quiz-timer" id="quizTimer" hidden></span><button class="icon-mini" id="jumpButton" aria-label="Aufgabenübersicht">☰</button><button class="icon-mini" id="markButton" aria-label="Frage merken">${(profile().marked||{})[qkey(q._eid,q.id)]?'★':'☆'}</button></div><div class="quiz-progress"><span style="width:${progress}%"></span></div><p class="question-kicker">AUFGABE ${String(z.index+1).padStart(2,'0')} / ${String(z.qs.length).padStart(2,'0')} · ${safeText(q.type.toUpperCase())}</p>${q.topic?`<p class="question-topic">${safeText(q.topic)}</p>`:''}<h1 class="question-title">${safeText(q.prompt)}</h1>${q.note?`<div class="question-note"><b>Merksatz</b><span>${safeText(q.note)}</span></div>`:''}${isText?`<textarea class="answer-text" id="textAnswer" placeholder="Deine Antwort …">${safeText(chosen[0]||'')}</textarea>`:`<div class="answer-list">${q.options.map(o=>{const isRight=(q.answerIds||[]).includes(o.id),isPick=chosen.includes(o.id);let cls='answer-option';if(isPick)cls+=' selected';if(z.revealed&&!q.manualGrade&&!isText){if(isRight)cls+=' opt-correct';else if(isPick)cls+=' opt-wrong'}return `<label class="${cls}"><input type="${isMulti?'checkbox':'radio'}" name="answer" value="${safeText(o.id)}" ${isPick?'checked':''}><span>${safeText(o.text)}</span></label>`}).join('')}</div>`}<div class="quiz-controls"><span class="points-label">${q.points||1} ${q.points===1?'PUNKT':'PUNKTE'}</span>${z.index>0?'<button class="button button-outline" id="backQuestion">← Zurück</button>':''}<button class="button button-outline" id="skipQuestion">Überspringen ↷</button><button class="button button-dark" id="answerAction">${z.mode==='practice'&&!z.revealed?'Antwort prüfen':z.index===z.qs.length-1?'Auswertung ansehen':'Weiter'} <span aria-hidden="true">→</span></button></div><div id="solutionArea"></div></div>`;
qv.querySelector('#quitQuiz').onclick=()=>{const answered=z.answers.some(a=>a&&a.length&&String(a[0]).trim());if(!answered){leaveQuiz();return}const dlg=document.createElement('dialog');dlg.className='modal';dlg.innerHTML=`<div class="modal-head"><div><p class="eyebrow muted">RUNDE UNTERBRECHEN</p><h2>Zurück zur Übersicht?</h2></div></div><p>Du hast schon ${z.answers.filter(a=>a&&a.length&&String(a[0]).trim()).length} von ${z.exam.questions.length} Aufgaben beantwortet. Du kannst sie später genau hier fortsetzen.</p><div class="help-actions"><button type="button" class="button button-dark" id="stayBtn">Weitermachen</button><button type="button" class="button button-outline" id="saveLeaveBtn">Pause &amp; später weiter</button><button type="button" class="button button-outline" id="dropLeaveBtn">Runde verwerfen</button></div>`;document.body.append(dlg);dlg.querySelector('#stayBtn').onclick=()=>{dlg.close();dlg.remove()};dlg.querySelector('#saveLeaveBtn').onclick=()=>{dlg.remove();leaveQuiz(true)};dlg.querySelector('#dropLeaveBtn').onclick=()=>{dlg.remove();leaveQuiz(false)};dlg.showModal()};qv.querySelectorAll('input[name=answer]').forEach(inp=>inp.onchange=()=>{if(isMulti){const vals=[...qv.querySelectorAll('input[name=answer]:checked')].map(x=>x.value);z.answers[z.index]=vals;qv.querySelectorAll('.answer-option').forEach(el=>el.classList.toggle('selected',el.querySelector('input').checked))}else{z.answers[z.index]=[inp.value];qv.querySelectorAll('.answer-option').forEach(el=>el.classList.toggle('selected',el.querySelector('input').checked))}});qv.querySelector('#textAnswer')?.addEventListener('input',ev=>z.answers[z.index]=[ev.target.value]);qv.querySelector('#answerAction').onclick=()=>answerAction();if(z.mode==='practice'&&z.revealed)showSolution();}
function answerAction(){const z=activeQuiz,q=z.qs[z.index];if(z.mode==='practice'&&!z.revealed){const a=z.answers[z.index]||[];if(!a.length||!a[0]){showToast('Beantworte zuerst die Frage.');return}z.revealed=true;qStamp(z);renderQuestion();showSolution();return}if(z.index<z.qs.length-1){qStamp(z);z.index++;z.revealed=false;z.qStart=Date.now();renderQuestion();return}const open=z.qs.filter((q,i)=>!(z.answers[i]&&z.answers[i].length&&String(z.answers[i][0]).trim())).length;if(open>0&&z.mode!=='practice'){openJump(true);return}finishQuiz()}
function isCorrect(q,answer){if(q.manualGrade||q.type==='text'&&!(q.answerIds||[]).length)return Boolean(activeQuiz.graded[q.id]);if(q.type==='text'){const given=String((answer||[''])[0]||'').trim().toLowerCase().replace(/[\s.,€]/g,'');return (q.answerIds||[]).some(a=>String(a).trim().toLowerCase().replace(/[\s.,€]/g,'')===given)}const a=[...(answer||[])].sort(),b=[...(q.answerIds||[])].sort();return a.length===b.length&&a.every((x,i)=>x===b[i])}
function showSolution(){const z=activeQuiz,q=z.exam.questions[z.index],el=$('#solutionArea');if(!el)return;const manual=Boolean(q.manualGrade),correct=manual||q.type==='text'?null:isCorrect(q,z.answers[z.index]);if(!manual&&q.type!=='text'){if(correct)unmarkWrong(q);else markWrong(q)}const sourceLinks=(q.sourceNotes||[]).filter(x=>/^https:\/\//.test(x)).map(x=>`<div><a href="${safeText(x)}" target="_blank" rel="noopener noreferrer">Quelle öffnen ↗</a></div>`).join('');el.innerHTML=`<div class="solution-box ${manual||q.type==='text'?'neutral':(correct?'ok':'no')}"><strong>${manual?'SELBSTBEWERTUNG – LÖSUNG NICHT SICHER BESTÄTIGT':q.type==='text'?'MUSTERLÖSUNG':correct?'✓ RICHTIG':'✕ NOCH NICHT RICHTIG'}</strong>${q.type!=='text'&&!manual&&(q.answerIds||[]).length?`<div class="sol-answer">Richtige Antwort: <b>${q.answerIds.map(x=>String(x).toUpperCase()).join(', ')}</b></div>`:''}${q.type==='text'?`<div>Deine Antwort: ${safeText((z.answers[z.index]||[''])[0])||'—'}</div>`:''}<div>${safeText(q.solution||'Keine zusätzliche Erklärung hinterlegt.')}</div>${sourceLinks?`<div class="note-small" style="margin-top:8px">${sourceLinks}</div>`:''}${wissenLinks(q)}${manual||q.type==='text'?`<div class="self-grade"><button data-grade="true" class="${z.graded[q.id]===true?'chosen':''}">✓ Richtig</button><button data-grade="false" class="${z.graded[q.id]===false?'chosen':''}">↻ Noch üben</button></div>`:''}</div>`;el.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{z.graded[q.id]=b.dataset.grade==='true';showSolution()})}
function finishQuiz(){const z=activeQuiz;qStamp(z);let correct=0,scored=0;z.qs.forEach((q,i)=>{const manual=Boolean(q.manualGrade)||q.type==='text'&&!(q.answerIds||[]).length;if(manual&&z.graded[q.id]===undefined)return;scored++;if(isCorrect(q,z.answers[i])){correct++;if(q.type!=='text')unmarkWrong(q)}else if(q.type!=='text')markWrong(q)});const total=z.qs.length,p=profile(),s=p.stats||(p.stats={sessions:0,answered:0,correct:0,byExam:{},history:[]}),es=s.byExam[z.exam.examId]||(s.byExam[z.exam.examId]={sessions:0,answered:0,correct:0});s.sessions++;s.answered+=scored;s.correct+=correct;es.sessions++;es.answered+=scored;es.correct+=correct;s.history.push({examId:z.exam.examId,date:new Date().toISOString(),correct,scored,total,mode:z.mode});z.ended=true;logQuizSegment(z);logQuestionTimes(z);dailyStat().sessions++;clearResume();save();const rate=scored?Math.round(correct/scored*100):0;$('#quizView').innerHTML=`<div class="quiz-wrap"><div class="quiz-result"><p class="eyebrow">RUNDE ABGESCHLOSSEN</p><h2>${scored&&correct===scored?'Stark gemacht.':'Guter Lernschritt.'}</h2><p class="result-meta">${safeText(z.exam.title)} · ${scored} von ${total} Aufgaben bewertet</p><div class="result-score">${scored?`${correct}/${scored}`:'—'}</div><p class="result-meta">${scored?`${rate} % der bewerteten Antworten richtig.`:'Keine Antwort wurde automatisch bewertet.'} Nicht sicher bestätigte Aufgaben zählen erst nach deiner Selbstbewertung.</p><div class="result-actions"><button class="button button-light" id="reviewAnswers">Lösungen ansehen</button><button class="button button-outline" id="shareResult">Ergebnis teilen</button><button class="button button-outline" id="finishToHome">Zur Übersicht</button></div></div></div>`;$('#reviewAnswers').onclick=()=>reviewQuiz(z);$('#shareResult').onclick=()=>shareResult(z);$('#finishToHome').onclick=leaveQuiz;}
function reviewQuiz(z){const rows=z.qs.map((q,i)=>`<div class="solution-box"><strong>AUFGABE ${String(i+1).padStart(2,'0')} · ${isCorrect(q,z.answers[i])?'RICHTIG':'NOCH ÜBEN'}</strong><div>${safeText(q.prompt)}</div><div style="margin-top:8px">${safeText(q.solution||'Keine Erklärung hinterlegt.')}</div></div>`).join('');$('#quizView').innerHTML=`<div class="quiz-wrap"><div class="quiz-top"><button class="back-button" id="reviewBack">← Ergebnis</button><div class="quiz-title">Lösungsübersicht</div><span class="quiz-mode">${safeText(z.exam.title)}</span></div>${rows}<button class="button button-dark" style="margin-top:18px" id="reviewHome">Zur Übersicht</button></div>`;$('#reviewBack').onclick=()=>finishDisplay(z);$('#reviewHome').onclick=leaveQuiz;}
function finishDisplay(z){const total=z.qs.length,correct=z.qs.filter((q,i)=>isCorrect(q,z.answers[i])).length;$('#quizView').innerHTML=`<div class="quiz-wrap"><div class="quiz-result"><p class="eyebrow">RUNDE ABGESCHLOSSEN</p><h2>Dein Ergebnis</h2><p class="result-meta">${safeText(z.exam.title)}</p><div class="result-score">${correct}/${total}</div><div class="result-actions"><button class="button button-light" id="reviewAnswers">Lösungen ansehen</button><button class="button button-outline" id="shareResult">Ergebnis teilen</button><button class="button button-outline" id="finishToHome">Zur Übersicht</button></div></div></div>`;$('#reviewAnswers').onclick=()=>reviewQuiz(z);$('#shareResult').onclick=()=>shareResult(z);$('#finishToHome').onclick=leaveQuiz;}
function leaveQuiz(keep){if(activeQuiz){const z=activeQuiz;qStamp(activeQuiz);logQuizSegment(z);logQuestionTimes(z);if(keep){saveResume();let correct=0,scored=0;z.qs.forEach((q,i)=>{const ans=z.answers[i];const has=ans&&ans.length&&String(ans[0]).trim();if(!has)return;const manual=Boolean(q.manualGrade)||q.type==='text'&&!(q.answerIds||[]).length;if(manual&&z.graded[q.id]===undefined)return;scored++;if(isCorrect(q,ans)){correct++;if(q.type!=='text')unmarkWrong(q)}else if(q.type!=='text')markWrong(q)});if(scored>0){const p=profile(),s=p.stats||(p.stats={sessions:0,answered:0,correct:0,byExam:{},history:[]}),es=s.byExam[z.exam.examId]||(s.byExam[z.exam.examId]={sessions:0,answered:0,correct:0});s.answered+=scored;s.correct+=correct;es.answered+=scored;es.correct+=correct;s.history.push({examId:z.exam.examId,date:new Date().toISOString(),correct,scored,total:z.qs.length,mode:z.mode,partial:true});save()}}else clearResume()}activeQuiz=null;$('#quizView').hidden=true;$('#homeView').hidden=false;render();window.scrollTo(0,0)}
function continueLearning(){if(resumable()){resumeQuiz();return}if(!data.exams.length){document.querySelector('.exam-section').scrollIntoView({behavior:'smooth'});showToast('Importiere zuerst eine Prüfung.');return}openExam(data.exams[0].examId)}
function openProfiles(){renderProfiles();$('#profileDialog').showModal()}
function renderProfiles(){$('#profileList').innerHTML=data.profiles.map(p=>`<div class="profile-row"><span class="profile-dot">${safeText(p.name.trim().slice(0,1).toUpperCase())}</span><div><strong>${safeText(p.name)}</strong><small>${p.stats?.sessions||0} Quizrunden · eigener Lernstand</small></div>${p.id===data.activeProfile?'<span class="points-label">AKTIV</span>':`<button class="button button-outline" data-use="${safeText(p.id)}">Wechseln</button>`}</div>`).join('');$('#profileList').querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{data.activeProfile=b.dataset.use;save();$('#profileDialog').close();render()})}
function createProfile(e){e.preventDefault();const name=$('#newProfileName').value.trim();if(!name)return;if(data.profiles.some(p=>p.name.toLowerCase()===name.toLowerCase())){showToast('Dieser Profilname ist bereits vergeben.');return}const p={id:crypto.randomUUID(),name,stats:{sessions:0,answered:0,correct:0,byExam:{},history:[]}};data.profiles.push(p);data.activeProfile=p.id;save();$('#newProfileName').value='';renderProfiles();render();showToast(`Profil „${name}“ erstellt`)}
function download(name,content,type='application/json'){const blob=new Blob([content],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportExams(){if(!data.exams.length){showToast('Es gibt noch keine importierten Prüfungen.');return}download('pruefungswerk-pruefungen.json',JSON.stringify(data.exams,null,2));showToast('Prüfungen exportiert')}
function exportProgress(){download(`lernstand-${profile().name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.json`,JSON.stringify({format:'pruefungswerk-progress-v1',profile:profile()},null,2));showToast('Lernstand exportiert')}
function importProgress(){const f=$('#progressFileInput').files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result),p=x.profile;if(x.format!=='pruefungswerk-progress-v1'||!p?.name||!p?.stats)throw Error('Datei ist keine Prüfungswerk-Lernstandssicherung.');let name=p.name;if(data.profiles.some(a=>a.name.toLowerCase()===name.toLowerCase()))name+=` (Import)`;data.profiles.push({...p,id:crypto.randomUUID(),name});data.activeProfile=data.profiles[data.profiles.length-1].id;save();render();renderProfiles();showToast('Lernstand als eigenes Profil importiert')}catch(err){showToast(`Import nicht möglich: ${err.message}`)}};r.readAsText(f)}
function downloadTemplate(){download('pruefungswerk-vorlage.json',JSON.stringify(template,null,2));showToast('JSON-Vorlage heruntergeladen')}
function showToast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000)}
init();
const BUNDLED_VERSION=13;
if(location.protocol!=='file:')fetch('./skripte.json?v='+BUNDLED_VERSION,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(sk=>{if(Array.isArray(sk)){SKRIPTE=sk;try{window.renderSkriptCard&&window.renderSkriptCard()}catch(e){}}}).catch(()=>{});fetch('./pruefungen-quiz.json?v='+BUNDLED_VERSION,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(exams=>{if(!Array.isArray(exams))return;if(data.exams.length&&(data.bundledVersion||0)>=BUNDLED_VERSION){tagExams();renderResumeCard();return}exams.forEach(validateExam);const own=data.exams.filter(e=>!exams.some(x=>x.examId===e.examId));const had=data.exams.length>0;data.exams=[...exams,...own];data.bundledVersion=BUNDLED_VERSION;save();tagExams();render();showToast(had?'Prüfungsinhalte wurden aktualisiert':'Sechs Prüfungen wurden bereitgestellt')}).catch(()=>{});
if(location.protocol!=='file:')fetch('./wissen.json').then(r=>r.ok?r.json():null).then(s=>{if(Array.isArray(s))wissen=s}).catch(()=>{});
if('serviceWorker'in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>{
 let hatteController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.register('./sw.js').then(r=>{try{r.update()}catch(e){}}).catch(()=>{});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hatteController){hatteController=false;try{location.reload()}catch(e){}}});
});
async function hardRefresh(){const b=$('#updBtn');if(b){b.textContent='Lade neu …';b.disabled=true}try{if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()))}}catch(e){}try{location.reload()}catch(e){}}

function showWissen(){$('#homeView').hidden=true;$('#diaryView').hidden=true;$('#quizView').hidden=true;$('#wissenView').hidden=false;renderWissen();window.scrollTo(0,0)}
function hideWissen(){$('#wissenView').hidden=true;$('#homeView').hidden=false;render();window.scrollTo(0,0)}
function renderWissen(){const el=$('#wissenView');if(!el)return;if(!wissen||!wissen.length){el.innerHTML='<div class="quiz-wrap"><div class="quiz-top"><button class="back-button" id="wissenBack">\u2190 \u00dcbersicht</button><div class="quiz-title">Lernhilfe</div><span class="quiz-mode">PROXIMUS 5</span></div><p class="note-small">Die Lernhilfe wurde noch nicht geladen. Lade die App mit Internetverbindung einmal neu.</p></div>';el.querySelector('#wissenBack').onclick=hideWissen;return}const q=(wissenQuery||'').trim().toLowerCase();const list=wissen.filter(s=>!q||(s.title+' '+wBody(s)).toLowerCase().includes(q));el.innerHTML=`<div class="quiz-wrap"><div class="quiz-top"><button class="back-button" id="wissenBack">\u2190 \u00dcbersicht</button><div class="quiz-title">Lernhilfe \u00b7 Proximus 5</div><span class="quiz-mode">WISSEN</span></div><input class="wissen-search" id="wissenSearch" placeholder="Begriff suchen, z. B. \u00dcbersch\u00fcsse, R\u00fcckkaufswert, Bezugsrecht \u2026" value="${safeText(wissenQuery||'')}"><p class="note-small">${q?list.length+' von '+wissen.length+' Abschnitten':'Alle '+wissen.length+' Abschnitte \u2013 tippe zum Aufklappen'}</p><div class="wissen-list">${list.map(s=>`<details class="wissen-card"><summary>${safeText(s.title)}</summary>${(Array.isArray(s.body)?s.body:[]).map(l=>`<p>${safeText(l)}</p>`).join('')}</details>`).join('')}</div></div>`;el.querySelector('#wissenBack').onclick=hideWissen;const si=el.querySelector('#wissenSearch');si.oninput=()=>{wissenQuery=si.value;renderWissen();const n=$('#wissenSearch');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}}}

/* ===== Lerntagebuch & Tagesziel (v8) ===== */
let diaryEdit=null;
function dkey(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function diary(){const p=profile();if(!p.diary)p.diary={goalMin:120,entries:[],timerStart:null,timerTopic:''};if(!Array.isArray(p.diary.entries))p.diary.entries=[];if(!p.diary.goalMin)p.diary.goalMin=120;return p.diary}
function fmtMin(m){m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;return h?`${h} h${r?' '+r+' min':''}`:`${r} min`}
function runningMin(){const d=diary();return d.timerStart?Math.max(0,(Date.now()-d.timerStart)/60000):0}
function dayMin(key){const d=diary();let m=d.entries.filter(e=>e.date===key).reduce((s,e)=>s+(+e.min||0),0);if(key===dkey()&&d.timerStart)m+=runningMin();return m}
function streak(){const d=diary();let n=0,day=new Date();if(dayMin(dkey(day))<d.goalMin)day.setDate(day.getDate()-1);for(let i=0;i<730;i++){if(dayMin(dkey(day))>=d.goalMin){n++;day.setDate(day.getDate()-1)}else break}return n}
function weekDays(){const out=[],t=new Date(),wd=(t.getDay()+6)%7;for(let i=0;i<7;i++){const x=new Date(t);x.setDate(t.getDate()-wd+i);out.push(x)}return out}
function ringSvg(pct,size=118){const r=size/2-9,c=2*Math.PI*r,o=c*(1-Math.min(pct,1));return `<svg class="diary-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="9"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${pct>=1?'#d8f06a':'#e68362'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${o}" transform="rotate(-90 ${size/2} ${size/2})"/></svg>`}
function weekHtml(){const d=diary(),today=dkey(),names=['Mo','Di','Mi','Do','Fr','Sa','So'];return `<div class="diary-week">${weekDays().map((x,i)=>{const k=dkey(x),m=dayMin(k),pct=Math.min(m/d.goalMin,1),fut=k>today;return `<div class="dw-day ${k===today?'is-today':''} ${m>=d.goalMin?'is-done':''} ${fut?'is-future':''}" title="${k}: ${fmtMin(m)}"><div class="dw-bar"><span style="height:${Math.round(pct*100)}%"></span></div><b>${m>=d.goalMin?'✓':fut?'·':Math.round(m)||'–'}</b><small>${names[i]}</small></div>`}).join('')}</div>`}
function weekSum(){return weekDays().reduce((s,x)=>s+dayMin(dkey(x)),0)}
function allMin(){return diary().entries.reduce((s,e)=>s+(+e.min||0),0)}
function bestDay(){const d=diary();if(!d.entries.length)return null;const m={};d.entries.forEach(e=>m[e.date]=(m[e.date]||0)+(+e.min||0));const k=Object.keys(m).sort((x,y)=>m[y]-m[x])[0];return{k,m:m[k]}}
function renderDiaryCard(){const el=$('#diaryCard');if(!el)return;const d=diary(),m=dayMin(dkey()),pct=m/d.goalMin,done=pct>=1,st=streak(),rest=Math.max(0,d.goalMin-m);el.innerHTML=`<div class="diary-main"><div class="diary-ring-wrap">${ringSvg(pct)}<div class="diary-ring-label"><b>${Math.min(999,Math.round(pct*100))}%</b><small>HEUTE</small></div></div><div class="diary-copy"><p class="eyebrow">TAGESZIEL · ${fmtMin(d.goalMin).toUpperCase()}</p><h2>${done?'Ziel erreicht ✓':fmtMin(m)+' geschafft'}</h2><p class="diary-sub">${done?'Stark – heute ist abgehakt. Alles drüber ist Bonus.':'Noch '+fmtMin(rest)+' bis zum Ziel.'} ${st?`<span class="diary-streak">🔥 ${st} ${st===1?'Tag':'Tage'} in Folge</span>`:''}</p><div class="diary-actions"><button class="button button-light" id="dcTimer">${d.timerStart?'■ Timer stoppen · <span id="dcRun">'+fmtMin(runningMin())+'</span>':'▶ Lern-Timer starten'}</button><button class="button button-ghost" id="dcOpen">Tagebuch öffnen</button></div></div></div>${weekHtml()}<p class="diary-weeksum">Diese Woche: <b>${fmtMin(weekSum())}</b> von ${fmtMin(d.goalMin*7)}</p>`;$('#dcTimer').onclick=toggleTimer;$('#dcOpen').onclick=showDiary}
function toggleTimer(){const d=diary();if(d.timerStart){const min=runningMin();const start=new Date(d.timerStart);d.timerStart=null;if(min>=1){addEntry({date:dkey(start),min:Math.round(min),topic:d.timerTopic||'Lernzeit',note:'',src:'timer'});showToast(`${fmtMin(min)} eingetragen`)}else showToast('Unter 1 Minute – nicht gespeichert');d.timerTopic=''}else{d.timerStart=Date.now();showToast('Timer läuft – auch wenn du die App schließt')}save();render();if(!$('#diaryView').hidden)renderDiary()}
function addEntry(e){diary().entries.push({id:crypto.randomUUID(),created:new Date().toISOString(),...e})}
function quizMinutes(z=activeQuiz){if(!z||z.ended||!z.segmentStart)return 0;return Math.max(0,(Date.now()-z.segmentStart)/60000)}
function logQuizSegment(z){if(!z||z.ended||!z.segmentStart)return;let min=Math.round((Date.now()-z.segmentStart)/60000);z.segmentStart=Date.now();if(min<1)return;if(min>240)min=240;const d=diary();if(d.timerStart)return;addEntry({date:dkey(),min,topic:z.exam.title+(z.mode==='exam'?' · Prüfungsmodus':' · Lernmodus'),note:'',src:'quiz'})}
function quizClockText(){const z=activeQuiz;if(!z)return '';if(diary().timerStart)return '⏱ Lern-Timer läuft';const heute=dayMin(dkey());return '⏱ '+fmtMin(quizMinutes(z))+' · heute '+fmtMin(heute)}
setInterval(()=>{const d=data&&data.profiles&&diary();if(d&&d.timerStart){const r=$('#dcRun');if(r)r.textContent=fmtMin(runningMin());const r2=$('#dvRun');if(r2)r2.textContent=fmtMin(runningMin())}},20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#homeView')&&!$('#homeView').hidden)renderDiaryCard()});
function showDiary(){$('#homeView').hidden=true;$('#quizView').hidden=true;$('#wissenView').hidden=true;$('#diaryView').hidden=false;diaryEdit=null;renderDiary();window.scrollTo(0,0)}
function hideDiary(){$('#diaryView').hidden=true;$('#homeView').hidden=false;render();window.scrollTo(0,0)}
function renderDiary(){const el=$('#diaryView'),d=diary(),today=dkey(),m=dayMin(today),bd=bestDay();const byDay={};[...d.entries].sort((a,b)=>(b.date+(b.created||'')).localeCompare(a.date+(a.created||''))).forEach(e=>(byDay[e.date]=byDay[e.date]||[]).push(e));const days=Object.keys(byDay).sort().reverse();const ed=diaryEdit?d.entries.find(e=>e.id===diaryEdit):null;const gh=Math.floor(d.goalMin/60),gm=d.goalMin%60;
el.innerHTML=`<div class="quiz-wrap"><div class="quiz-top"><button class="back-button" id="diaryBack">← Übersicht</button><div class="quiz-title">Lerntagebuch</div><span class="quiz-mode">${fmtMin(m)} HEUTE</span></div>
<div class="dv-panel"><p class="eyebrow muted">MEIN TAGESZIEL</p><div class="dv-goal"><label>Stunden<input type="number" id="goalH" min="0" max="12" value="${gh}" inputmode="numeric"></label><label>Minuten<input type="number" id="goalM" min="0" max="55" step="5" value="${gm}" inputmode="numeric"></label><button class="button button-dark" id="goalSave">Ziel speichern</button></div><div class="dv-presets">${[60,90,120,180].map(x=>`<button class="chip ${d.goalMin===x?'chip-on':''}" data-goal="${x}">${fmtMin(x)}</button>`).join('')}</div></div>
<div class="dv-panel"><p class="eyebrow muted">LERN-TIMER</p>${d.timerStart?`<p class="dv-run">Läuft seit ${new Date(d.timerStart).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} · <b id="dvRun">${fmtMin(runningMin())}</b></p>`:''}<div class="dv-goal"><label class="grow">Thema (optional)<input id="timerTopic" maxlength="60" placeholder="z. B. Lebensversicherung, Prüfung V …" value="${safeText(d.timerTopic||'')}"></label><button class="button ${d.timerStart?'button-coral':'button-dark'}" id="dvTimer">${d.timerStart?'■ Stoppen & eintragen':'▶ Starten'}</button></div><p class="note-small">Quizrunden werden automatisch mit ihrer Dauer eingetragen (außer der Timer läuft schon – dann zählt nichts doppelt).</p></div>
<form class="dv-panel" id="entryForm"><p class="eyebrow muted">${ed?'EINTRAG BEARBEITEN':'LERNZEIT NACHTRAGEN'}</p><div class="dv-form"><label>Datum<input type="date" id="enDate" value="${ed?ed.date:today}" max="${today}" required></label><label>Dauer (Min.)<input type="number" id="enMin" min="1" max="720" value="${ed?ed.min:30}" inputmode="numeric" required></label><label class="full">Was hast du gelernt?<input id="enTopic" maxlength="80" placeholder="z. B. Prüfung III, Kapitel Haftpflicht" value="${ed?safeText(ed.topic||''):''}"></label><label class="full">Notiz / Erkenntnis<textarea id="enNote" maxlength="500" rows="3" placeholder="Was lief gut? Was muss ich wiederholen?">${ed?safeText(ed.note||''):''}</textarea></label></div><div class="help-actions"><button class="button button-dark" type="submit">${ed?'Änderung speichern':'Eintragen'}</button>${ed?'<button class="button button-outline" type="button" id="enCancel">Abbrechen</button>':''}</div></form>
<div class="dv-panel"><p class="eyebrow muted">DIESE WOCHE · ${fmtMin(weekSum())} / ${fmtMin(d.goalMin*7)}</p>${weekHtml()}</div>
<div class="dv-panel"><p class="eyebrow muted">GESAMTZEIT</p><div class="dv-stats"><div><b>${fmtMin(m)}</b><small>heute</small></div><div><b>${fmtMin(weekSum())}</b><small>diese Woche</small></div><div><b>${fmtMin(allMin())}</b><small>insgesamt</small></div><div><b>${bd?fmtMin(bd.m)+' · '+new Date(bd.k+'T12:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'—'}</b><small>bester Tag</small></div></div></div>
<div class="dv-panel"><p class="eyebrow muted">LERNVERLAUF · 14 TAGE</p><div class="dv-14">${last14().map(x=>`<div class="dw-day ${x.m>=d.goalMin?'is-done':''}" title="${x.k}: ${fmtMin(x.m)}"><div class="dw-bar"><span style="height:${Math.round(Math.min(x.m/d.goalMin,1)*100)}%"></span></div><small>${x.d}</small></div>`).join('')}</div><p class="note-small">Balken = Lernminuten pro Tag · grün = Tagesziel erreicht</p></div>
<div class="dv-panel"><p class="eyebrow muted">TREFFERQUOTE · ENTWICKLUNG</p>${sparkSvg()}</div>
<h3 class="dv-h">Einträge</h3>${days.length?days.map(k=>{const tot=byDay[k].reduce((s,e)=>s+(+e.min||0),0),ok=tot>=d.goalMin,dt=new Date(k+'T12:00');return `<div class="dv-day"><div class="dv-day-head"><span>${dt.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})} <em>· ${byDay[k].length} ${byDay[k].length===1?'Eintrag':'Einträge'}</em></span><span class="${ok?'ok':'no'}">${fmtMin(tot)} ${ok?'✓ Ziel':'· '+Math.round(tot/d.goalMin*100)+' %'}</span></div>${byDay[k].map(e=>`<div class="dv-entry"><div><strong>${safeText(e.topic||'Lernzeit')}</strong><small>${fmtMin(e.min)} · ${e.src==='quiz'?'Quiz automatisch':e.src==='timer'?'Timer':'manuell'}</small>${e.note?`<p>${safeText(e.note)}</p>`:''}</div><div class="dv-entry-act"><button data-edit="${e.id}" aria-label="Bearbeiten">✎</button><button data-del="${e.id}" aria-label="Löschen">×</button></div></div>`).join('')}</div>`}).join(''):'<p class="note-small">Noch keine Einträge. Starte den Timer oder trag deine erste Lerneinheit nach.</p>'}
<p class="privacy-note">Das Tagebuch gehört zu deinem Profil und wird nur auf diesem Gerät gespeichert. Mit „Lernstand sichern“ auf der Übersicht exportierst du es mit.</p></div>`;
const q=s=>el.querySelector(s);q('#diaryBack').onclick=hideDiary;
q('#goalSave').onclick=()=>{const v=(+q('#goalH').value||0)*60+(+q('#goalM').value||0);if(v<5){showToast('Ziel mindestens 5 Minuten');return}d.goalMin=Math.min(v,960);save();renderDiary();showToast('Tagesziel: '+fmtMin(d.goalMin))};
el.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{d.goalMin=+b.dataset.goal;save();renderDiary();showToast('Tagesziel: '+fmtMin(d.goalMin))});
q('#timerTopic').oninput=e=>{d.timerTopic=e.target.value;save()};
q('#dvTimer').onclick=()=>{d.timerTopic=q('#timerTopic').value.trim();toggleTimer()};
q('#entryForm').onsubmit=ev=>{ev.preventDefault();const date=q('#enDate').value,min=Math.round(+q('#enMin').value);if(!date||!(min>0)){showToast('Datum und Dauer angeben');return}const vals={date,min,topic:q('#enTopic').value.trim()||'Lernzeit',note:q('#enNote').value.trim()};if(ed)Object.assign(ed,vals);else addEntry({...vals,src:'manual'});diaryEdit=null;save();renderDiary();showToast(ed?'Eintrag aktualisiert':fmtMin(min)+' eingetragen')};
q('#enCancel')&&(q('#enCancel').onclick=()=>{diaryEdit=null;renderDiary()});
el.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{diaryEdit=b.dataset.edit;renderDiary();q('#entryForm').scrollIntoView({behavior:'smooth'})});
el.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('Eintrag löschen?'))return;d.entries=d.entries.filter(e=>e.id!==b.dataset.del);save();renderDiary()})}

/* ===== Pausierte Runde: robust speichern & fortsetzen (v10) ===== */
const RKEY='pruefungswerk.resume.v2';
let resumeTimer=null;
function saveResume(){const z=activeQuiz;if(!z)return;try{localStorage.setItem(RKEY,JSON.stringify({examId:z.exam.examId,examTitle:z.exam.title,total:z.qs.length,qkeys:z.qs.map(q=>q._eid+'|'+q.id),qTimes:z.qTimes||[],qLog:z.qLog||{},mode:z.mode,index:z.index,answers:z.answers,graded:z.graded,startedAt:z.startedAt,at:Date.now()}))}catch(e){}if(!resumeTimer)resumeTimer=setInterval(()=>{if(activeQuiz)saveResume()},10000)}
function loadResume(){try{const r=JSON.parse(localStorage.getItem(RKEY)||'null');if(r&&r.examId)return r}catch(e){}try{if(data.resume&&data.resume.examId){const old=data.resume;delete data.resume;save();return old}}catch(e){}return null}
function answeredCount(r){return ((r&&r.answers)||[]).filter(x=>x&&x.length&&String(x[0]).trim()).length}
function clearResume(){try{localStorage.removeItem(RKEY)}catch(e){}try{if(data.resume){delete data.resume;save()}}catch(e){}const el=$('#resumeCard');if(el){el.hidden=true;el.innerHTML=''}const cb=$('#continueButton');if(cb)cb.innerHTML='Weiterlernen <span aria-hidden="true">\u2197</span>'}
function resumable(){const r=loadResume();if(!r)return null;if(Date.now()-(r.at||0)>1209600000)return null;const done=answeredCount(r);if(!done)return null;return{r,e:data.exams.find(x=>x.examId===r.examId)||null,done}}
function resolveQkeys(r){if(!r||!Array.isArray(r.qkeys)||!r.qkeys.length)return null;const out=r.qkeys.map(findQ).filter(Boolean).map(x=>x.q);return out.length?out:null}
function resumeQuiz(){const x=resumable();if(!x){showToast('Keine pausierte Runde gefunden.');return}const r=x.r;const qs=resolveQkeys(r)||(x.e?x.e.questions:null);if(!qs||!qs.length){showToast('Runde wird noch geladen – bitte gleich nochmal tippen.');return}const e=x.e||{examId:r.examId,title:r.examTitle||'Pausierte Runde',questions:qs};if(activeQuiz)logQuizSegment(activeQuiz);activeQuiz={exam:e,mode:r.mode||'practice',qs:qs,index:Math.min(r.index||0,qs.length-1),answers:Array.isArray(r.answers)?r.answers:[],revealed:false,graded:r.graded||{},qTimes:Array.isArray(r.qTimes)?r.qTimes:[],qAcc:{},qStart:Date.now(),qLog:r.qLog||{},startedAt:r.startedAt||Date.now(),segmentStart:Date.now(),ended:false,deadline:r.mode==='exam'?Date.now()+(settings().examMin||90)*60000:0};$('#homeView').hidden=true;$('#quizView').hidden=false;renderQuestion();window.scrollTo(0,0);saveResume();showToast('Weiter bei Aufgabe '+(activeQuiz.index+1)+' von '+qs.length)}
function discardResume(){clearResume();render();showToast('Pausierte Runde verworfen')}
function renderResumeCard(){const el=$('#resumeCard'),cb=$('#continueButton'),x=resumable();if(!x){if(el){el.hidden=true;el.innerHTML=''}if(cb&&!/Weiterlernen/.test(cb.textContent))cb.innerHTML='Weiterlernen <span aria-hidden="true">\u2197</span>';return}const r=x.r,total=(x.e&&x.e.questions.length)||r.total||'?',pos=Math.min((r.index||0)+1,total||999);if(cb)cb.innerHTML='Fortsetzen \u00b7 Aufgabe '+pos+' <span aria-hidden="true">\u2192</span>';if(!el)return;const when=new Date(r.at||Date.now()).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});el.hidden=false;el.innerHTML=`<div><p class="eyebrow">PAUSIERTE RUNDE \u00b7 AUTO-GESPEICHERT</p><h3>${safeText((x.e&&x.e.title)||r.examTitle||'Deine Runde')}</h3><p class="note-small">Aufgabe ${pos} von ${total} \u00b7 ${x.done} beantwortet \u00b7 zuletzt ${when}</p></div><div class="resume-actions"><button class="button button-dark" id="resumeGo">Fortsetzen</button><button class="button button-outline" id="resumeDrop">Verwerfen</button></div>`;el.querySelector('#resumeGo').onclick=resumeQuiz;el.querySelector('#resumeDrop').onclick=discardResume}
document.addEventListener('change',e=>{if(activeQuiz&&e.target&&e.target.name==='answer')saveResume()});
document.addEventListener('input',e=>{if(activeQuiz&&e.target&&e.target.id==='textAnswer')saveResume()});
document.addEventListener('click',e=>{if(activeQuiz&&e.target&&e.target.dataset&&e.target.dataset.grade!==undefined)setTimeout(saveResume,0)});
window.addEventListener('pagehide',()=>{try{saveResume()}catch(e){}});
window.addEventListener('beforeunload',()=>{try{saveResume()}catch(e){}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){try{if(activeQuiz){qPause(activeQuiz);logQuizSegment(activeQuiz)}saveResume()}catch(e){}}else{if(activeQuiz&&!activeQuiz.ended){activeQuiz.segmentStart=Date.now();if(!activeQuiz.revealed)qResume(activeQuiz)}const el=$('#homeView');if(el&&!el.hidden){renderDiaryCard();renderResumeCard()}}});
setInterval(()=>{if(activeQuiz)saveResume()},5000);
setInterval(()=>{const c=$('#quizClock');if(c)c.textContent=quizClockText();if(activeQuiz&&!activeQuiz.ended)saveResume()},10000);

/* ===== v13 ===== */
function settings(){data.settings=data.settings||{};const s=data.settings;if(typeof s.fontScale!=='number')s.fontScale=0;if(!s.theme)s.theme='auto';if(!s.examMin)s.examMin=90;return s}
function applySettings(){const s=settings();let th=s.theme||'auto';if(th==='auto')th=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.setAttribute('data-theme',th);const h=document.documentElement;h.classList.remove('fs0','fs1','fs2');h.classList.add('fs'+(s.fontScale||0));const v=$('#appVersion');if(v)v.textContent='v24';const v2=$('#appVersion2');if(v2)v2.textContent='v24'}
function qkey(eid,qid){return String(eid)+'|'+String(qid)}
function tagExams(){data.exams.forEach(e=>e.questions.forEach(q=>{q._eid=e.examId}))}
function findQ(key){const i=String(key).indexOf('|');if(i<0)return null;const eid=String(key).slice(0,i),qid=String(key).slice(i+1);const e=data.exams.find(x=>x.examId===eid);const q=e&&e.questions.find(x=>x.id===qid);return e&&q?{e,q}:null}
function markWrong(q){if(!q||!q._eid)return;const p=profile();p.wrong=p.wrong||{};p.wrong[qkey(q._eid,q.id)]={at:Date.now()}}
function unmarkWrong(q){if(!q||!q._eid)return;const p=profile();if(p.wrong)delete p.wrong[qkey(q._eid,q.id)]}
function listOf(which){const p=profile();const src=which==='wrong'?(p.wrong||{}):(p.marked||{});return Object.keys(src).map(findQ).filter(Boolean).map(x=>x.q)}
function wrongList(){return listOf('wrong')}
function markedList(){return listOf('marked')}
function toggleMark(q){if(!q||!q._eid)return;const p=profile();p.marked=p.marked||{};const k=qkey(q._eid,q.id);if(p.marked[k]){delete p.marked[k];showToast('Aus der Merkliste entfernt')}else{p.marked[k]={at:Date.now()};showToast('Gemerkt – findest du in der Merkliste')}save();const b=$('#markButton');if(b)b.textContent=p.marked[k]?'★':'☆'}
function shuffle(x){for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=x[i];x[i]=x[j];x[j]=t}return x}
function allQuestions(){const out=[];data.exams.forEach(e=>e.questions.forEach(q=>out.push(q)));return out}
function startList(id,title,items,mode){const list=(items||[]).slice();if(!list.length){showToast('Diese Liste ist noch leer.');return}startQuiz({examId:id,title:title,questions:list},mode||'practice',list,0)}
function openRandom(){const dlg=document.createElement('dialog');dlg.className='modal';dlg.innerHTML=`<div class="modal-head"><div><p class="eyebrow muted">SCHNELLSTART</p><h2>Zufallsquiz</h2></div><button class="close-button" id="rndClose" aria-label="Schließen">×</button></div><p class="note-small">Fragen bunt gemischt aus allen ${data.exams.length} Prüfungen.</p><div class="help-actions">${[10,20,30,50].map(n=>`<button class="button button-dark" data-n="${n}">${n} Fragen</button>`).join('')}</div><p class="note-small">Prüfungsmodus-Zeit: ${settings().examMin} Minuten (änderbar in den Einstellungen).</p>`;document.body.append(dlg);dlg.querySelector('#rndClose').onclick=()=>{dlg.close();dlg.remove()};dlg.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{const n=+b.dataset.n;const pool=shuffle(allQuestions().slice()).slice(0,n);dlg.remove();startList('mix-zufall','Zufallsquiz · '+pool.length+' Fragen',pool)});dlg.showModal()}
function openSettings(){const s=settings();const d=$('#settingsDialog');if(!d)return;const i=$('#setExamMin');if(i)i.value=s.examMin;d.showModal()}
function openJump(warn){const z=activeQuiz;if(!z)return;const open=z.qs.filter((q,i)=>!(z.answers[i]&&z.answers[i].length&&String(z.answers[i][0]).trim())).length;const cells=z.qs.map((q,i)=>{const done=z.answers[i]&&z.answers[i].length&&String(z.answers[i][0]).trim();let cls='jump-cell';if(done)cls+=' done';if(i===z.index)cls+=' cur';if(done&&z.revealed&&q.type!=='text'&&!q.manualGrade)cls+=isCorrect(q,z.answers[i])?' ok':' no';return `<button class="${cls}" data-jump="${i}">${i+1}</button>`}).join('');const dlg=document.createElement('dialog');dlg.className='modal jump-modal';dlg.innerHTML=`<div class="modal-head"><div><p class="eyebrow muted">AUFGABEN-ÜBERSICHT</p><h2>${z.qs.length} Aufgaben</h2></div><button class="close-button" id="jumpClose" aria-label="Schließen">×</button></div><p class="note-small">${open?open+' noch offen':'Alle beantwortet'} · <b class="lg-ok">grün</b> = richtig · <b class="lg-no">coral</b> = falsch</p><div class="jump-grid">${cells}</div><div class="help-actions">${warn&&open?'<button class="button button-dark" id="jumpFinish">Trotzdem auswerten</button>':''}<button class="button button-outline" id="jumpStay">Weiter beantworten</button></div>`;document.body.append(dlg);dlg.querySelector('#jumpClose').onclick=()=>{dlg.close();dlg.remove()};dlg.querySelector('#jumpStay').onclick=()=>{dlg.close();dlg.remove()};const jf=dlg.querySelector('#jumpFinish');if(jf)jf.onclick=()=>{dlg.remove();finishQuiz()};dlg.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{const i=+b.dataset.jump;dlg.remove();qStamp(z);z.index=i;z.revealed=false;z.qStart=Date.now();renderQuestion();window.scrollTo(0,0)});dlg.showModal()}
let qQuery='';
function searchQuestions(t){t=(t||'').trim().toLowerCase();if(t.length<2)return [];const out=[];for(const e of data.exams){for(const q of e.questions){const hay=(q.prompt+' '+(q.options||[]).map(o=>o.text).join(' ')+' '+(q.solution||'')).toLowerCase();if(hay.indexOf(t)>=0)out.push({e,q});if(out.length>=60)return out}}return out}
function renderSearch(){const box=$('#qResults');if(!box)return;const t=(qQuery||'').trim();if(t.length<2){box.innerHTML='';return}const hits=searchQuestions(t);box.innerHTML=`<p class="note-small">${hits.length}${hits.length>=60?'+':''} Treffer</p>`+hits.map(h=>`<button class="search-hit" data-eid="${safeText(h.e.examId)}" data-qid="${safeText(h.q.id)}"><b>${safeText(h.e.title.replace('IHK-Prüfung ','P'))}</b><span>${safeText(h.q.prompt.slice(0,120))}</span></button>`).join('');box.querySelectorAll('.search-hit').forEach(b=>b.onclick=()=>{const e=data.exams.find(x=>x.examId===b.dataset.eid);if(!e)return;const i=e.questions.findIndex(x=>x.id===b.dataset.qid);startQuiz(e,'practice',e.questions,i<0?0:i)})}
function renderQuick(){const el=$('#quickCard');if(!el)return;const w=wrongList().length,m=markedList().length;const bw=$('#quickWrongN'),bm=$('#quickMarkedN');if(bw)bw.textContent=w;if(bm)bm.textContent=m;const qw=$('#quickWrong'),qm=$('#quickMarked');if(qw)qw.classList.toggle('is-off',!w);if(qm)qm.classList.toggle('is-off',!m);const si=$('#qSearch');if(si)si.placeholder='Alle '+allQuestions().length+' Fragen durchsuchen …';el.hidden=false}
const WSTOP=new Set(['aber','auch','dass','der','die','das','dem','den','des','ein','eine','einer','eines','einem','einen','für','mit','nicht','oder','sind','über','und','von','vor','werden','wird','wenn','sich','bei','aus','auf','nach','kann','können','muss','müssen','sie','ihre','ihrer','ist','im','in','zu','zur','zum','als','durch','noch','nur','wie','was','welche','welcher','welches','man','hat','haben','diese','dieser','dieses','damit','hier','dann','dabei','dafür','ihnen','ihrem','ihren','sein','seine','seiner','jedoch','sowie','etwa','immer','schon','kundin','kunde','herr','frau','welchen']);
function tokensOf(t){return new Set((String(t).toLowerCase().match(/[a-zäöüß]{5,}/g)||[]).filter(x=>!WSTOP.has(x)))}
function wBody(s){const b=s&&s.body;return Array.isArray(b)?b.join(' '):(typeof b==='string'?b:'')}
function matchWissen(q,limit){if(!wissen||!wissen.length||!q)return [];const toks=tokensOf(q.prompt+' '+(q.options||[]).map(o=>o.text).join(' '));if(toks.size<4)return [];const hits=[];for(const s of wissen){const st=tokensOf(s.title+' '+wBody(s));let n=0;toks.forEach(t=>{if(st.has(t))n++});if(n>=2)hits.push({s,n})}return hits.sort((a,b)=>b.n-a.n).slice(0,limit||3).map(x=>x.s)}
function wissenLinks(q){const m=matchWissen(q,3);if(!m.length)return '';return `<div class="wissen-links"><span class="note-small">📖 Passend nachlesen:</span>${m.map(s=>`<button class="chip chip-link" data-wissen="${safeText(s.title)}">${safeText(s.title)}</button>`).join('')}</div>`}
function shareResult(z){if(!z)return;let correct=0,scored=0;z.qs.forEach((q,i)=>{const manual=Boolean(q.manualGrade)||q.type==='text'&&!(q.answerIds||[]).length;if(manual&&z.graded[q.id]===undefined)return;scored++;if(isCorrect(q,z.answers[i]))correct++});const pct=scored?Math.round(correct/scored*100):0;const txt='Prüfungswerk · '+z.exam.title+': '+correct+'/'+scored+' richtig ('+pct+' %) · '+(z.mode==='exam'?'Prüfungsmodus':'Lernmodus')+' · '+new Date().toLocaleDateString('de-DE');if(navigator.share){try{navigator.share({title:'Prüfungswerk Ergebnis',text:txt}).catch(()=>{})}catch(e){showToast(txt)}}else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showToast('Ergebnis in die Zwischenablage kopiert')).catch(()=>showToast(txt))}else showToast(txt)}
function updateQuizTimer(){const el=$('#quizTimer');const z=activeQuiz;if(!el)return;if(!z||!z.deadline){el.hidden=true;return}const left=Math.max(0,z.deadline-Date.now());el.hidden=false;el.textContent='⏳ '+Math.floor(left/60000)+':'+String(Math.floor(left%60000/1000)).padStart(2,'0');el.classList.toggle('warn',left<=15*60000);el.classList.toggle('crit',left<=5*60000);if(left<=0&&!z.timeUp){z.timeUp=true;showToast('Zeit abgelaufen – du kannst weiterarbeiten oder auswerten.')}}
function last14(){const out=[],t=new Date();for(let i=13;i>=0;i--){const x=new Date(t);x.setDate(t.getDate()-i);out.push({k:dkey(x),m:dayMin(dkey(x)),d:x.getDate()})}return out}
function sparkSvg(){const h=((profile().stats||{}).history||[]).slice(-12);if(h.length<2)return '<p class="note-small">Noch zu wenig Runden für eine Kurve – ab zwei Runden siehst du hier deinen Trend.</p>';const pts=h.map((r,i)=>{const pct=r.scored?r.correct/r.scored:0;return [i/(h.length-1)*300,58-pct*54]});const d=pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');const last=h[h.length-1];const pct=last.scored?Math.round(last.correct/last.scored*100):0;return `<svg class="spark" viewBox="0 0 300 62" preserveAspectRatio="none" aria-hidden="true"><polyline points="${d}" fill="none" stroke="#35665a" stroke-width="2.5" stroke-linejoin="round"/></svg><p class="note-small">Letzte ${h.length} Runden · aktuell <b>${pct} %</b> richtig</p>`}
document.addEventListener('click',e=>{const t=e.target;if(!t)return;if(t.id==='skipQuestion'){skipQuestion();return}
 if(t.id==='jumpButton'){openJump(false);return}if(t.id==='backQuestion'){const z=activeQuiz;if(z&&z.index>0){qStamp(z);z.index--;z.revealed=false;z.qStart=Date.now();renderQuestion();window.scrollTo(0,0)}return}if(t.id==='markButton'){const z=activeQuiz;if(z)toggleMark(z.qs[z.index]);return}if(t.dataset&&t.dataset.wissen!==undefined){wissenQuery=t.dataset.wissen;showWissen();return}if(t.dataset&&t.dataset.fs!==undefined){settings().fontScale=+t.dataset.fs;save();applySettings();showToast('Schriftgröße angepasst');return}if(t.dataset&&t.dataset.theme!==undefined){settings().theme=t.dataset.theme;save();applySettings();showToast('Design: '+t.textContent);return}if(t.id==='updBtn'){hardRefresh();return}
 if(t.id==='setExamMinSave'){const v=Math.max(10,Math.min(240,Math.round(+($('#setExamMin')||{}).value||90)));settings().examMin=v;save();showToast('Prüfungszeit: '+v+' Minuten');const d=$('#settingsDialog');if(d)d.close();return}});
if(window.matchMedia){try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(settings().theme==='auto')applySettings()})}catch(e){}}
setInterval(()=>{if(activeQuiz&&activeQuiz.deadline)updateQuizTimer()},1000);

/* ===== v14: Antwortzeit-Messung + Pruefungsreife-Ampel ===== */
function qPause(z){if(!z||!z.qStart)return;z.qAcc=z.qAcc||{};z.qAcc[z.index]=(z.qAcc[z.index]||0)+(Date.now()-z.qStart)/1000;z.qStart=null}
function qResume(z){if(z&&!z.qStart)z.qStart=Date.now()}
function qElapsed(z){if(!z)return 0;let s=(z.qAcc&&z.qAcc[z.index])||0;if(z.qStart)s+=(Date.now()-z.qStart)/1000;return s}
function qStamp(z){if(!z)return;const s=qElapsed(z);if(!(s>0))return;z.qTimes=z.qTimes||[];z.qTimes[z.index]=Math.max(0,Math.min(900,s));z.qAcc=z.qAcc||{};z.qAcc[z.index]=0;z.qStart=null}
function logQuestionTimes(z){if(!z||!Array.isArray(z.qs))return;const p=profile(),s=p.stats||(p.stats={sessions:0,answered:0,correct:0,byExam:{},history:[]});s.timeLog=s.timeLog||[];z.qLog=z.qLog||{};z.qs.forEach((q,i)=>{const kk=qkey(q._eid||z.exam.examId,q.id);if(z.qLog[kk])return;const t=(z.qTimes||[])[i];const ans=z.answers[i];if(t==null||!ans||!ans.length||!String(ans[0]).trim())return;const auto=!(Boolean(q.manualGrade)||q.type==='text'&&!(q.answerIds||[]).length);s.timeLog.push({e:z.exam.examId,s:Math.max(1,Math.round(t)),c:auto?(isCorrect(q,ans)?1:0):null});z.qLog[kk]=1;bumpDaily(q,ans,Math.max(1,Math.round(t)),auto)});if(s.timeLog.length>3000)s.timeLog=s.timeLog.slice(-3000)}
function fmtSec(s){s=Math.round(s);return s<60?s+' s':Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+' min'}
function timeStats(){const log=(profile().stats||{}).timeLog||[];const graded=log.filter(x=>x.c===0||x.c===1);const right=graded.filter(x=>x.c===1).length,wrong=graded.filter(x=>x.c===0).length;const avg=log.length?log.reduce((a,b)=>a+b.s,0)/log.length:0;const pct=graded.length?right/graded.length*100:0;return{n:log.length,avg,right,wrong,graded:graded.length,pct}}
function perExamTime(){const log=(profile().stats||{}).timeLog||[];const m={};log.forEach(x=>{const r=m[x.e]||(m[x.e]={t:0,n:0,r:0,w:0});r.t+=x.s;r.n++;if(x.c===1)r.r++;else if(x.c===0)r.w++});return m}
function renderReadiness(){const el=$('#readiness');if(!el)return;const t=timeStats();const dd=dailyStat();const dAvg=dd.secN?dd.secSum/dd.secN:0;const dPct=dd.graded?dd.correct/dd.graded*100:0;const dOk=dd.graded>0&&dPct>=80;
 if(!t.n){el.hidden=false;el.innerHTML='<div class="ready-head"><p class="eyebrow muted">PRÜFUNGSREIFE</p><span class="ready-note">Ziel: ⌀ ≤ 60 s pro Frage · ≥ 80 % richtig</span></div><p class="note-small">Noch keine Messwerte. Sobald du Fragen beantwortest, siehst du hier deine durchschnittliche Antwortzeit und deine Trefferquote.</p>';return}
 const tOk=t.avg<=60,aOk=t.graded>0&&t.pct>=80;
 const pe=perExamTime();const rows=data.exams.map(e=>{const r=pe[e.examId];if(!r||!r.n)return '';const a=r.t/r.n,g=r.r+r.w?r.r/(r.r+r.w)*100:0;return `<div class="ready-row"><span class="ready-name">${safeText(e.title.replace('IHK-Prüfung ','P'))}</span><span class="ready-cell ${a<=90?'ok':'no'}">${fmtSec(a)}</span><span class="ready-cell ${r.r+r.w&&g>=80?'ok':'no'}">${r.r+r.w?Math.round(g)+' %':'—'}</span><span class="ready-cell muted">${r.r}✓ / ${r.w}✕</span></div>`}).join('');
 el.hidden=false;el.innerHTML=`<div class="ready-head"><p class="eyebrow muted">PRÜFUNGSREIFE</p><span class="ready-note">Ziel: ⌀ ≤ 60 s pro Frage · ≥ 80 % richtig</span></div>
 <div class="ready-grid">
  <div class="ready-tile ${tOk?'ok':'no'}"><span class="ready-label">⌀ Antwortzeit</span><b>${fmtSec(t.avg)}</b><small>${tOk?'unter 60 s – im Ziel':'über 60 s – zu langsam'}</small></div>
  <div class="ready-tile ${aOk?'ok':'no'}"><span class="ready-label">Trefferquote</span><b>${t.graded?Math.round(t.pct)+' %':'—'}</b><small>${t.graded?(aOk?'über 80 % – bereit':'unter 80 % – noch üben'):'noch keine bewerteten Antworten'}</small></div><div class="ready-tile ${dOk?'ok':'no'} wide"><span class="ready-label">Heute · seit 0:00</span><b>${dd.graded?Math.round(dPct)+' %':'—'}</b><small>${dd.secN?'⌀ '+fmtSec(dAvg)+' pro Frage':'noch keine Zeit'} · ${dd.answered} Antworten${dd.sessions?' · '+dd.sessions+(dd.sessions===1?' Runde':' Runden'):''} · startet täglich um 0:00 neu</small></div>
 </div>
 <div class="ready-bar"><span class="rb-ok" style="width:${t.graded?Math.round(t.pct):0}%"></span><span class="rb-no" style="width:${t.graded?100-Math.round(t.pct):100}%"></span></div>
 <div class="ready-foot"><span class="ok">✓ ${t.right} richtig</span><span class="no">✕ ${t.wrong} falsch</span><span class="muted">${t.n} Antworten gemessen</span></div>
 ${rows?`<details class="ready-exams"><summary>Pro Prüfung ansehen</summary><div class="ready-thead"><span>Prüfung</span><span>⌀ Zeit</span><span>Quote</span><span>Richtig/Falsch</span></div>${rows}</details>`:''}`}

/* ===== v16: Skippen + Tagesstand ===== */
function skipQuestion(){const z=activeQuiz;if(!z)return;qStamp(z);const i=z.index;if(z.qs.length<2)return;const q=z.qs.splice(i,1)[0];const a=(z.answers||[]).splice(i,1)[0];const t=(z.qTimes||[]).splice(i,1)[0];z.qs.push(q);z.answers.push(a);z.qTimes.push(t);if(z.index>=z.qs.length)z.index=z.qs.length-1;z.revealed=false;z.qStart=Date.now();renderQuestion();showToast('Ans Ende verschoben – kommt am Schluss nochmal')}
function dailyStat(){const p=profile();const d=p.daily;if(!d||d.date!==dkey()){p.daily={date:dkey(),answered:0,correct:0,graded:0,secSum:0,secN:0,sessions:0};return p.daily}return d}
function bumpDaily(q,ans,sec,auto){const d=dailyStat();d.answered++;if(sec>0){d.secSum+=sec;d.secN++}if(auto){d.graded++;if(isCorrect(q,ans))d.correct++}save()}

/* ================= v17 ================= */
/* 1) Tages-Tagebuch: Vortag wird archiviert  2) Themen-Training
   3) Hinweise: 60 s Trainingsziel / 90 s in der Pruefung / 50 % Bestehensgrenze */
(function(){
  var _ds=dailyStat;
  dailyStat=function(){
    try{
      var p=profile(),d=p.daily;
      if(d&&d.date&&d.date!==dkey()){
        p.dailyLog=p.dailyLog||[];
        if(!p.dailyLog.some(function(x){return x.date===d.date})){
          p.dailyLog.push({date:d.date,answered:d.answered||0,correct:d.correct||0,graded:d.graded||0,secSum:d.secSum||0,secN:d.secN||0,sessions:d.sessions||0});
          if(p.dailyLog.length>400)p.dailyLog=p.dailyLog.slice(-400);
          save();
        }
      }
    }catch(e){}
    return _ds();
  };
  function topicIndex(){var m={};data.exams.forEach(function(e){e.questions.forEach(function(q){var t=q.topic||q.topicGuess;if(!t)return;(m[t]=m[t]||[]).push(q)})});return m}
  function startTopic(t){var m=topicIndex(),qs=m[t]||[];if(!qs.length){showToast('Zu diesem Thema sind keine Fragen hinterlegt.');return}startQuiz({examId:'thema-'+t,title:'Thema: '+t,questions:qs},'practice',qs,0)}
  function mountTopics(){var h=$('#topicSection');if(h)return h;var r=$('#readiness');if(!r||!r.parentNode)return null;h=document.createElement('section');h.id='topicSection';h.className='exam-section';h.hidden=true;r.parentNode.insertBefore(h,r);return h}
  function renderTopics(){var h=mountTopics();if(!h)return;var m=topicIndex(),ts=Object.keys(m).sort(function(a,b){return m[b].length-m[a].length});if(!ts.length){h.hidden=true;return}h.hidden=false;
    h.innerHTML='<p class="eyebrow muted">THEMEN-TRAINING</p><h2>Nach Themen lernen</h2>'
      +'<p class="note-small">Tippe ein Thema an – du übst dann nur diese Fragen, quer über alle Prüfungen. Genau dafür sind die Themen-Überschriften da.</p>'
      +'<div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">'
      +ts.map(function(t){return '<button class="button button-outline" data-topic="'+safeText(t)+'" style="display:flex;justify-content:space-between;gap:10px;text-align:left"><span>'+safeText(t)+'</span><b>'+m[t].length+'</b></button>'}).join('')
      +'</div>';
    h.querySelectorAll('[data-topic]').forEach(function(b){b.onclick=function(){startTopic(b.dataset.topic)}});
  }
  var _rr=renderReadiness;
  renderReadiness=function(){
    _rr();
    try{renderTopics()}catch(e){}
    var el=$('#readiness');if(!el||el.hidden)return;
    if(!el.querySelector('.v17note')){
      var n=document.createElement('p');n.className='ready-note v17note';n.style.marginTop='10px';
      n.innerHTML='Trainingsziel: <b>höchstens 60 Sekunden</b> pro Frage und <b>mindestens 80 %</b> richtig. '
        +'In der Prüfung hast du <b>90 Sekunden</b> pro Frage, bestanden wird ab <b>50 %</b>.';
      el.appendChild(n);
    }
    var log=(profile().dailyLog||[]).slice(-7).reverse();
    if(log.length&&!el.querySelector('.v17days')){
      var b=document.createElement('div');b.className='v17days';b.style.marginTop='14px';
      b.innerHTML='<p class="eyebrow muted">TAGEBUCH · LETZTE TAGE</p>'
        +log.map(function(x){var a=x.secN?Math.round(x.secSum/x.secN):0,p=x.graded?Math.round(x.correct/x.graded*100):0;
          return '<div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:4px 0;border-bottom:1px solid rgba(128,128,128,.2)"><span>'+x.date+'</span><span>'+x.answered+' Antworten</span><span>⌀ '+a+' s</span><span>'+(x.graded?p+' %':'—')+'</span></div>'}).join('');
      el.appendChild(b);
    }
  };
})();

/* ================= v18 =================
   1) Modul-Fortschritt: Ø Antwortzeit, Quote, Bestehens-Check, zuletzt geübt
   2) Erinnerungen: 16:00 wenn nichts gelernt / Pause mit Restzeit       */
(function(){
  var PASS_GOAL=50, TIME_GOAL=60;
  function daysSince(iso){
    if(!iso)return null;
    var d=new Date(iso);if(isNaN(d))return null;
    var a=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    var b=new Date();b=new Date(b.getFullYear(),b.getMonth(),b.getDate());
    return Math.round((b-a)/86400000);
  }
  function lastText(iso){
    var n=daysSince(iso);
    if(n===null)return 'noch nicht geübt';
    if(n===0)return 'heute geübt';
    if(n===1)return 'gestern geübt';
    return 'vor '+n+' Tagen geübt';
  }
  function examStats(eid){
    var s=profile().stats||{},es=(s.byExam||{})[eid]||{},pe=(perExamTime()||{})[eid]||{n:0,t:0,r:0,w:0};
    var avg=pe.n?pe.t/pe.n:0;
    var rate=es.answered?Math.round(es.correct/es.answered*100):null;
    var hist=(s.history||[]).filter(function(x){return x.examId===eid&&x.scored>0}).slice(-5);
    var pass=hist.length?Math.round(hist.filter(function(x){return x.correct/x.scored>=PASS_GOAL/100}).length/hist.length*100):null;
    var all=(s.history||[]).filter(function(x){return x.examId===eid});
    return {avg:avg,rate:rate,pass:pass,rounds:es.sessions||0,answered:es.answered||0,
            last:all.length?all[all.length-1].date:null,histN:hist.length};
  }
  function enhanceCards(){
    var p=profile(),s=p.stats||{};
    Array.prototype.forEach.call(document.querySelectorAll('.exam-card'),function(card){
      var eid=card.getAttribute('data-exam');if(!eid)return;
      var old=card.querySelector('.exam-stats');if(old)old.remove();
      var st=examStats(eid);
      var box=document.createElement('div');box.className='exam-stats';
      var aOk=st.avg>0&&st.avg<=TIME_GOAL, rOk=st.rate!==null&&st.rate>=80, pOk=st.pass!==null&&st.pass>=50;
      box.innerHTML=
        '<span class="es-cell '+(aOk?'ok':'no')+'"><b>'+(st.avg?Math.round(st.avg)+' s':'—')+'</b>Ø Zeit</span>'+
        '<span class="es-cell '+(rOk?'ok':'no')+'"><b>'+(st.rate!==null?st.rate+' %':'—')+'</b>Quote</span>'+
        '<span class="es-cell '+(pOk?'ok':'no')+'"><b>'+(st.pass!==null?st.pass+' %':'—')+'</b>Bestehen</span>'+
        '<span class="es-last">'+lastText(st.last)+'</span>';
      var foot=card.querySelector('.exam-card-foot');
      if(foot)card.insertBefore(box,foot);else card.appendChild(box);
    });
  }
  var _rr=renderReadiness;
  renderReadiness=function(){_rr();try{enhanceCards()}catch(e){}};
  /* ---------- Erinnerungen ---------- */
  function rs(){data.settings=data.settings||{};var r=data.settings.reminders;if(!r||typeof r!=='object')r=data.settings.reminders={daily:true,pause:true,hour:16,pauseMin:10};
    if(typeof r.daily!=='boolean')r.daily=true;if(typeof r.pause!=='boolean')r.pause=true;
    if(typeof r.hour!=='number')r.hour=16;if(typeof r.pauseMin!=='number')r.pauseMin=10;return r;}
  function supported(){return ('Notification' in window)&&('serviceWorker' in navigator)}
  function granted(){return supported()&&Notification.permission==='granted'}
  function fire(title,body,tag){
    if(!granted())return Promise.resolve(false);
    var opts={body:body,tag:tag||'pw',icon:'./icon.svg',badge:'./icon.svg',renotify:true};
    return navigator.serviceWorker.ready.then(function(reg){
      if(reg&&reg.showNotification){reg.showNotification(title,opts);return true}
      new Notification(title,opts);return true;
    }).catch(function(){try{new Notification(title,opts)}catch(e){}return false});
  }
  function remainingMin(){var d=diary();var left=d.goalMin-dayMin(dkey());return Math.max(0,Math.round(left))}
  var dailyTimer=null,pauseTimer=null;
  function scheduleDaily(){
    clearTimeout(dailyTimer);var r=rs();if(!r.daily)return;
    var now=new Date(),t=new Date();t.setHours(r.hour,0,0,0);
    if(t.getTime()<=now.getTime())t.setDate(t.getDate()+1);
    var ms=t.getTime()-now.getTime();
    if(ms>6*3600000)return;
    dailyTimer=setTimeout(function(){
      var d=dailyStat();
      if(d.answered===0&&granted())fire('Heute noch nicht gelernt','Dein Tagesziel sind '+fmtMin(diary().goalMin)+'. Ein paar Fragen reichen für den Anfang.','pw-daily');
      else scheduleDaily();
    },ms);
  }
  window.addEventListener('load',scheduleDaily);
  document.addEventListener('visibilitychange',function(){
    var r=rs();
    if(document.hidden){
      if(r.pause&&granted()){
        clearTimeout(pauseTimer);
        pauseTimer=setTimeout(function(){
          var left=remainingMin();
          if(left>0&&document.hidden)fire('Noch '+fmtMin(left)+' Lernzeit heute','Du bist fast am Tagesziel – '+Math.min(20,left)+' Minuten reichen noch nicht, aber sie bringen dich weiter.','pw-pause');
        },Math.max(1,r.pauseMin)*60000);
      }
    }else{
      clearTimeout(pauseTimer);pauseTimer=null;
      scheduleDaily();
      if(r.daily){var now=new Date();if(now.getHours()>=r.hour){var d=dailyStat();if(d.answered===0&&granted())fire('Heute noch nicht gelernt','Dein Tagesziel sind '+fmtMin(diary().goalMin)+'.','pw-daily');}}
    }
  });
  /* ---------- Einstellungen ---------- */
  function paintSettings(){
    var r=rs(),el=document.getElementById('remBox');if(!el)return;
    var perm=supported()?Notification.permission:'unsupported';
    el.innerHTML='<div class="help-actions">'+
      '<button type="button" class="button '+(r.daily?'button-dark':'button-outline')+'" id="remDaily">Täglich '+r.hour+':00</button>'+
      '<button type="button" class="button '+(r.pause?'button-dark':'button-outline')+'" id="remPause">Pause nach '+r.pauseMin+' min</button>'+
      '<button type="button" class="button button-outline" id="remAllow">'+(perm==='granted'?'Benachrichtigungen aktiv':perm==='denied'?'Blockiert – in iOS-Einstellungen erlauben':'Benachrichtigungen erlauben')+'</button>'+
      '<button type="button" class="button button-outline" id="remTest">Test</button></div>'+
      '<p class="note-small" style="margin-top:6px">Erinnerungen laufen nur, solange die App installiert und mindestens im Hintergrund geöffnet ist. iOS weckt geschlossene Web-Apps nicht von selbst – für einen echten 16-Uhr-Wecker eignet sich die Kurzbefehle-App.</p>';
    el.querySelector('#remDaily').onclick=function(){r.daily=!r.daily;save();paintSettings();showToast('Tägliche Erinnerung '+(r.daily?'an':'aus'));scheduleDaily()};
    el.querySelector('#remPause').onclick=function(){r.pause=!r.pause;save();paintSettings();showToast('Pausen-Erinnerung '+(r.pause?'an':'aus'))};
    el.querySelector('#remAllow').onclick=function(){
      if(!supported()){showToast('Dieser Browser unterstützt keine Benachrichtigungen.');return}
      Notification.requestPermission().then(function(p){paintSettings();showToast(p==='granted'?'Benachrichtigungen aktiv':'Nicht erlaubt');scheduleDaily()});
    };
    el.querySelector('#remTest').onclick=function(){fire('Prüfungswerk','So sehen deine Erinnerungen aus. Noch '+fmtMin(remainingMin())+' bis zum Tagesziel.','pw-test').then(function(ok){if(!ok)showToast('Erst Benachrichtigungen erlauben.')})};
  }
  var _open=openSettings;
  openSettings=function(){
    _open();
    var dlg=document.getElementById('settingsDialog');if(!dlg)return;
    if(!document.getElementById('remBox')){
      var box=document.createElement('div');box.id='remBox';
      var anchor=dlg.querySelector('#updBtn');var wrap=anchor&&anchor.closest('.help-actions');
      var head=document.createElement('p');head.className='note-small';head.innerHTML='<b>Erinnerungen</b>';
      if(wrap&&wrap.parentNode){wrap.parentNode.insertBefore(head,wrap);wrap.parentNode.insertBefore(box,wrap)}
      else dlg.appendChild(box);
    }
    paintSettings();
  };
})();

/* ================= v19 · Merkzettel / Spickzettel ================= */
(function(){
  var MERK=[
  {id:'luecke',n:'01',t:'Versorgungslücke berechnen',tag:'Rechnen',
   f:['Versorgungslücke = Versorgungsziel − gesetzliche Rente − betriebliche Rente − private Vorsorge',
      'Versorgungskapital = Versorgungslücke × 12 × 100 ÷ Zins'],
   b:[['Versorgungsziel','Nettoverdienst, den du im Alter halten willst.'],
      ['Gesetzliche Rente','Im Prüfungstext meist als Prozent des Bruttos angegeben (z. B. 35 %).'],
      ['Betriebliche Rente','Die garantierte Altersrente aus der bAV.'],
      ['Private Vorsorge','Was schon aus eigenen Verträgen fließt.'],
      ['Versorgungskapital','Der Betrag, der die Lücke über den Zins dauerhaft deckt.']],
   tip:'Prüfungsbeispiel: Ziel 2.700 € − bAV 600 € − GRV 1.400 € (35 % von 4.000 €) = 700 € Lücke. Bei 4 % Zins: 700 × 12 × 100 ÷ 4 = 210.000 € Kapital.'},
  {id:'schichten',n:'02',t:'Das Drei-Schichten-Modell',tag:'Systematik',
   f:['Gilt seit dem Alterseinkünftegesetz vom 01.01.2005'],
   b:[['Schicht 1 · Basisvorsorge','Gesetzliche Rente, Basisrente (Rürup), landwirtschaftliche Alterskasse. Steuerlich vorgelagert: Beiträge abziehbar, Auszahlung nachgelagert besteuert.'],
      ['Schicht 2 · Betrieblich & gefördert','Betriebliche Altersversorgung (§ 3 Nr. 63 EStG) und Riester (§ 10a EStG). Staatliche Förderung über Zulagen und Sonderausgabenabzug.'],
      ['Schicht 3 · Privat','Kapitallebens-, Renten- und Fondspolicen, reiner Vermögensaufbau. Keine staatliche Förderung.']],
   tip:'Merksatz: Schicht 1 = gesetzlich, Schicht 2 = Chef und Staat, Schicht 3 = privat. Die Schicht entscheidet, wie die Auszahlung später besteuert wird.'},
  {id:'steuer',n:'03',t:'Steuererklärung: welche Sparte wie',tag:'Steuern',
   f:['Alle Beiträge laufen als Vorsorgeaufwendungen in die Sonderausgaben'],
   b:[['Basisabsicherung','Kranken- und Pflegeversicherung in der Basisabsicherung: voll abziehbar.'],
      ['Altersvorsorgeaufwendungen','Gesetzliche Rentenversicherung, Basisrente, bAV und Riester.'],
      ['Sonstige Vorsorgeaufwendungen','Arbeitslosen-, Erwerbsunfähigkeits-, Unfall-, Haftpflicht-, Risikolebens- und Kapitallebensversicherung. Nur bis zum Höchstbetrag und nur, soweit der Topf nicht schon von der Basisabsicherung gefüllt ist.'],
      ['Wichtig','Beiträge zur Kapitallebensversicherung sind seit 2005 nicht mehr als Vorsorgeaufwand abziehbar.']],
   tip:'Reihenfolge beim Ausfüllen: erst Basisabsicherung (Kranken/Pflege), dann Altersvorsorge, dann der Rest. Was übrig bleibt, verfällt im Höchstbetrag.'},
  {id:'auszahlung',n:'04',t:'Was ist bei Auszahlung steuerpflichtig?',tag:'Steuern',
   f:['Steuerfrei heißt nicht automatisch meldefrei'],
   b:[['Gesetzliche Rente','Nur der Besteuerungsanteil. Der Satz steigt Jahr für Jahr (Kohortenprinzip) – den Wert für dein Prüfungsjahr im Skript nachsehen.'],
      ['bAV und Riester','Voll nachgelagert steuerpflichtig in der Auszahlungsphase.'],
      ['Basisrente (Rürup)','Ebenfalls voll steuerpflichtig, da die Beiträge vorher abziehbar waren.'],
      ['Kapitallebensversicherung','Nur der Ertrag (Auszahlung minus Beiträge), und zwar hälftig – bei Laufzeit ab 12 Jahren und nicht abzugsfähigen Beiträgen. Sonst voll.'],
      ['Private Rentenversicherung','Ertragsanteil der Rente.'],
      ['Risikolebensversicherung','Die Todesfallleistung ist steuerfrei; es kann aber Erbschaftsteuer anfallen.'],
      ['BU-Rente','Steuerfrei, wenn die Beiträge nicht als Vorsorgeaufwand abgezogen wurden.'],
      ['Unfall, Haftpflicht, Hausrat','Leistungen sind steuerfrei.'],
      ['Kranken- und Pflegeversicherung','Leistungen sind steuerfrei.']],
   tip:'Faustregel: Was vorher abziehbar war, wird hinten besteuert. Was vorher aus versteuertem Geld bezahlt wurde, bleibt hinten steuerfrei.'},
  {id:'waisen',n:'05',t:'Waisenrente',tag:'Gesetzliche Rente',
   f:['Halbwaise = 10 % · Vollwaise = 20 % der vollen EMR/AR'],
   b:[['Halbwaisenrente','Tod eines versicherten Elternteils: 10 % der vollen Erwerbsminderungs- bzw. Altersrente des Verstorbenen.'],
      ['Vollwaisenrente','Tod beider Elternteile: 20 % der höheren Erwerbsminderungs- bzw. Altersrente.'],
      ['Voraussetzung','Das Kind muss kindergeldberechtigt sein.'],
      ['Achtung','Dein Skript sagt ausdrücklich: keine Verdienstgrenze. Gesetzlich gibt es eine Hinzuverdienstgrenze – für die Prüfung gilt dein Skript, im Originalbogen bitte gegenprüfen.']],
   tip:'Die Prozentwerte beziehen sich immer auf die volle EMR/AR – nicht auf die tatsächlich gezahlte Rente des Verstorbenen.'},
  {id:'beitrag',n:'06',t:'Wie setzt sich der Beitrag zusammen?',tag:'Beitrag',
   f:['Beitrag = Sparanteil + Risikoanteil + Kostenanteil + Sicherheitszuschlag'],
   b:[['Sparanteil','Geht in die Anlage, bildet das Kapital bzw. die spätere Rente.'],
      ['Risikoanteil','Bezahlt den Versicherungsschutz – bei der Risikolebensversicherung ist er der einzige echte Leistungsanteil.'],
      ['Kostenanteil','Verwaltung und Provision, also Abschluss- und Verwaltungskosten.'],
      ['Sicherheitszuschlag','Puffer für die Rechnungsgrundlagen (Sterblichkeit, Zins, Kosten).']],
   tip:'Bei der Risikolebensversicherung gibt es keinen nennenswerten Sparanteil – deshalb ist sie so günstig. Bei der Kapitallebensversicherung ist der Sparanteil der größte Brocken.'},
  {id:'faktoren',n:'07',t:'Was beeinflusst den Beitrag?',tag:'Beitrag',
   f:['Je höher das Risiko, desto höher der Beitrag'],
   b:[['Eintrittsalter','Je älter beim Abschluss, desto teurer – das Risiko läuft länger.'],
      ['Beruf und Berufsgruppe','Vor allem bei der BU entscheidend: Büro, Handwerk oder gefährliche Tätigkeit.'],
      ['Gesundheitszustand','Vorerkrankungen führen zu Risikozuschlägen oder Ausschlüssen; teils Aufschub oder Ablehnung.'],
      ['Versicherungsdauer','Längere Laufzeit bedeutet mehr Beitragsjahre, aber auch mehr Kapitalaufbau.'],
      ['Versicherungssumme und Leistungsumfang','Höhere Summe und mehr Einschlüsse kosten mehr.'],
      ['Zahlweise','Monatlich ist teurer als jährlich, weil Ratenzahlung eingerechnet wird.'],
      ['Weitere Faktoren','Raucherstatus, gefährliche Hobbys, Selbstbeteiligung. Das Geschlecht darf seit 2012 bei Neuverträgen keine Rolle mehr spielen (Unisex).']],
   tip:'Prüfungsklassiker: Für die BU sind Beruf und Gesundheitszustand die beiden stärksten Hebel – nicht das Alter allein.'},
  {id:'gkv',n:'08',t:'GKV-Befreiung und Pflegeversicherung',tag:'Gesetzlich',
   f:['Die Pflegeversicherung folgt immer der Krankenversicherung'],
   b:[['GKV versichert','Dann besteht auch die soziale Pflegeversicherung bei derselben Kasse.'],
      ['Privat krankenversichert','Dann besteht eine private Pflegepflichtversicherung – Abschluss ist Pflicht.'],
      ['Befreiung von der GKV-Pflicht','Zum Beispiel Beihilfeberechtigte und Beamte, hauptberuflich Selbstständige, Arbeitnehmer über der Jahresarbeitsentgeltgrenze auf Antrag, Studierende sowie Künstler.'],
      ['Berufsständisches Versorgungswerk','Wer dort pflichtversichert ist – etwa Ärzte, Apotheker, Architekten, Notare, Rechtsanwälte, Steuerberater –, wird von der Rentenversicherungspflicht befreit (§ 6 SGB VI).'],
      ['Folge für die Förderung','Diese Personengruppe bekommt keine Riester-Förderung. Die Befreiung muss beantragt und dem Arbeitgeber gemeldet werden.']],
   tip:'Befreiung ist meist unwiderruflich – und sie kostet dich die staatliche Förderung. Genau das fragt die IHK gern ab.'},
  {id:'bbg',n:'09',t:'Beitragsbemessungsgrenze (BBG)',tag:'Gesetzlich',
   f:['Beitrag = Entgelt bis zur BBG × Beitragssatz','Monatswert = Jahreswert ÷ 12'],
   b:[['Definition','Höchstgrenze, bis zu der Arbeitsentgelt bzw. Arbeitseinkommen in der Rentenversicherung versicherbar ist.'],
      ['Darüber hinaus','Es werden keine Beiträge mehr gezahlt – aber es gibt auch nur Leistung bis zur BBG.'],
      ['Versicherungspflicht','Bleibt trotz Überschreiten der BBG bestehen.'],
      ['Rechnung','Verdienst 6.000 €, BBG 5.000 €: Beiträge werden nur aus 5.000 € berechnet, die restlichen 1.000 € bleiben beitragsfrei.']],
   tip:'Die konkreten Jahreswerte ändern sich jedes Jahr. Ich nenne hier bewusst keine Zahl – nimm den Wert aus deinem Skript, sonst lernst du einen veralteten.'}
  ];

  var MERKB=[
  {id:'wartezeit',n:'B1',t:'Wartezeiten',tag:'Kranken · Unfall · Leben',src:'werk',
   f:['Allgemeine Wartezeit: 3 Monate ab Versicherungsbeginn'],
   b:[['Grundregel','Die allgemeine Wartezeit beträgt 3 Monate. Die Wartezeiten rechnen vom Versicherungsbeginn an.'],
      ['Entfällt bei Unfall','Wörtlich: „Sie entfällt (a) bei Unfällen“. Nach einem Unfall gibt es also keine Wartezeit.'],
      ['Ehegatte / Lebenspartner','Entfällt ebenfalls für den Ehegatten einer mindestens 3 Monate versicherten Person – wenn die gleichartige Versicherung innerhalb von 2 Monaten nach Eheschließung beantragt wird.'],
      ['Besondere Wartezeiten','Gelten unter anderem für Entbindung, Psychotherapie, Zahnbehandlung, Zahnersatz und Kieferorthopädie. Diese liegen über den 3 Monaten.'],
      ['Vorversicherung anrechnen','Wer aus einer privaten oder gesetzlichen Krankenversicherung ausscheidet, kann die dort ununterbrochen zurückgelegte Versicherungszeit auf die Wartezeit anrechnen lassen – Antrag spätestens 2 Monate nach Ende der Vorversicherung.'],
      ['Neugeborene','Versicherungsschutz ohne Risikozuschläge und ohne Wartezeiten ab Vollendung der Geburt, wenn ein Elternteil am Geburtstag mindestens 3 Monate versichert ist und die Anmeldung spätestens 2 Monate nach der Geburt erfolgt.']],
   tip:'Verwechslungsfalle: Die Wartezeit läuft einmal ab Versicherungsbeginn. Die Karenzzeit wird bei jedem Leistungsfall neu relevant – das Werk nennt sie ausdrücklich bei Auslandsbehandlung („unter Berücksichtigung von Karenzzeit und Höchstdauer“).'},
  {id:'verweisung',n:'B2',t:'BU: Verweisung & Risikozuschlag',tag:'Berufsunfähigkeit',src:'werk',
   f:['Risikozuschlag maximal bis zur einfachen Beitragshöhe'],
   b:[['Verweisung','Der Versicherer kann grundsätzlich prüfen, ob du auf eine andere zumutbare Tätigkeit verwiesen werden kannst. Genau das ist der Streitpunkt in vielen BU-Fällen.'],
      ['Verzicht im Werk','Wörtlich: „Bei Vorliegen der allgemeinen Dienstunfähigkeit in Verbindung mit einer Versetzung in den Ruhestand, verzichten wir auf eine konkrete Verweisung gemäß Ziffer 2.1.“'],
      ['Risikozuschlag bei Erhöhung','Wird der Versicherungsschutz höher oder umfassender, kann für den hinzukommenden Teil ein Risikozuschlag verlangt oder ein Leistungsausschluss vereinbart werden – und es gelten erneut Wartezeiten.'],
      ['Obergrenze','Wörtlich: „Mit Rücksicht auf ein erhöhtes Risiko ist die Vereinbarung eines Risikozuschlages bis zur einfachen Beitragshöhe zulässig.“ Mehr als das Doppelte geht also nicht.'],
      ['Ausschlüsse','Kein Versicherungsschutz bei vorsätzlicher Straftat, bei Teilnahme an inneren Unruhen aufseiten der Unruhestifter und bei absichtlicher Herbeiführung von Krankheit.']],
   tip:'Merke die Richtung: Zuschlag ist nach oben begrenzt – Ausschluss und Ablehnung sind es nicht. Deshalb ist der Leistungsausschluss für den Kunden das größere Risiko.'},
  {id:'tagegeld',n:'B3',t:'Krankentagegeld',tag:'Krankenversicherung',src:'werk',
   f:['Tagegeld = Einkommensersatz, nicht Kostenerstattung'],
   b:[['Was es leistet','Eine tägliche Geldleistung, wenn du krankheitsbedingt arbeitsunfähig bist. Sie ersetzt fehlendes Einkommen – die Arztkosten zahlt die Krankheitskostenversicherung.'],
      ['Wartezeit','Auch hier gilt die Wartezeit, sie kann aber durch Vorversicherungszeiten verkürzt oder ersetzt werden.'],
      ['Anrechnung','Personen, die aus der privaten oder gesetzlichen Krankenversicherung ausgeschieden sind, wird die dort ununterbrochen zurückgelegte Versicherungszeit auf die Wartezeiten angerechnet.'],
      ['Bedingung dafür','Die neue Versicherung muss spätestens 2 Monate nach Beendigung der Vorversicherung beantragt werden – zusammen mit einer Krankheitskostenversicherung, und der Schutz muss unmittelbar anschließen.'],
      ['Höhe egal','Wörtlich: „Für die Anrechnung der Versicherungszeit kommt es nicht auf die Höhe des bisherigen Krankengeldanspruches an.“'],
      ['Karenzzeit und Höchstdauer','Beide sind tarifabhängig. Im Werk ausdrücklich genannt für Behandlungen im Ausland, dort nur in öffentlichen Krankenhäusern.']],
   tip:'Klassische Prüfungsfrage: Zählt die Vorversicherungszeit auch, wenn das Krankengeld früher niedriger war? Ja – die Höhe ist ausdrücklich unerheblich.'},
  {id:'pflege',n:'B4',t:'Pflegepflichtversicherung',tag:'Kranken & Pflege',src:'gemischt',
   f:['Pflege folgt der Krankenversicherung'],
   b:[['Grundsatz (Sozialrecht)','Wer gesetzlich krankenversichert ist, ist in der sozialen Pflegepflichtversicherung. Wer privat krankenversichert ist, muss eine private Pflegepflichtversicherung abschließen.'],
      ['Im Werk geregelt','Das Werk enthält den Bedingungsteil MB/PPV 2022 für die private Pflegepflichtversicherung – also die Bedingungen, nicht die Beitragssätze.'],
      ['Ergänzungsschutz','Für Zusatzleistungen gibt es den Bedingungsteil MB/EPV 2017 für Ergänzungsversicherungen zur privaten und zur sozialen Pflegepflichtversicherung.'],
      ['Staatlich gefördert','Zusätzlich existiert der Bedingungsteil MB/GEPV 2022 für die staatlich geförderte Pflegeversicherung.'],
      ['Stand des Werks','Copyright 2022, häufigste Jahresangaben 2021/2022. Beitragssätze, BBG und Steuerprozente daraus sind veraltet – die Werte gehören aus deinem aktuellen Skript.']],
   tip:'Aus dem Werk lernst du die Bedingungen – was ist versichert, was nicht. Beitragssätze und Rechengrößen stehen dort nicht drin und wären 2022er-Stand.'}
  ];
  function esc(x){return safeText(x)}
  function card(m){
    var d=document.createElement('details');d.className='merk-item';d.id='merk-'+m.id;
    var badge=m.src==='werk'?'<span class="merk-src">Quelle: Bedingungswerk</span>':(m.src==='gemischt'?'<span class="merk-src">Bedingungswerk + Sozialrecht</span>':'');
    d.innerHTML='<summary><span class="merk-n">'+esc(m.n)+'</span><span class="merk-tt"><b>'+esc(m.t)+'</b><small>'+esc(m.tag)+'</small></span><span class="merk-plus">＋</span></summary>'
      +'<div class="merk-body">'
      +(m.f&&m.f.length?'<div class="merk-formula">'+m.f.map(function(x){return '<div>'+esc(x)+'</div>'}).join('')+'</div>':'')
      +'<dl class="merk-dl">'+m.b.map(function(x){return '<dt>'+esc(x[0])+'</dt><dd>'+esc(x[1])+'</dd>'}).join('')+'</dl>'
      +(m.tip?'<div class="merk-tip"><b>Merke</b> '+esc(m.tip)+'</div>':'')
      +badge
      +'</div>';
    return d;
  }
  function matchM(m,q){
    if(!q)return true;
    var hay=(m.t+' '+m.tag+' '+(m.f||[]).join(' ')+' '+m.b.map(function(x){return x[0]+' '+x[1]}).join(' ')+' '+(m.tip||'')).toLowerCase();
    return hay.indexOf(q)>=0;
  }
  function ensureView(){
    var v=document.getElementById('merkView');
    if(!v){
      v=document.createElement('section');v.id='merkView';v.className='view';v.hidden=true;
      var app=document.getElementById('app')||document.body;app.appendChild(v);
    }
    return v;
  }
  var merkTab='pruefung';
  function renderMerk(filter){
    var v=ensureView(),q=(filter||'').trim().toLowerCase();
    var SRC=merkTab==='bed'?MERKB:MERK;
    v.innerHTML='<div class="quiz-wrap"><div class="quiz-top"><button class="back-button" id="merkBack">← Übersicht</button><div class="quiz-title">Merkzettel</div><span class="quiz-mode">'+MERK.length+' + '+MERKB.length+' THEMEN</span></div>'
      +'<div class="merk-head"><p class="eyebrow">SPICKZETTEL</p><h2>'+(merkTab==='bed'?'Bedingungen-Kompass':'Die neun Klassiker')+'</h2><p class="note-small">'+(merkTab==='bed'?'Direkt aus dem Proximus-Bedingungswerk – mit wörtlichen Zitaten, wo es zählt.':'Kurz, prüfungsnah und aus deiner Lernhilfe zusammengefasst. Tippe ein Thema auf.')+'</p></div>'
      +'<div class="merk-tabs"><button data-tab="pruefung" class="merk-tab '+(merkTab==='pruefung'?'active':'')+'">Prüfungsstoff · '+MERK.length+'</button><button data-tab="bed" class="merk-tab '+(merkTab==='bed'?'active':'')+'">Bedingungen · '+MERKB.length+'</button></div>'
      +'<input class="wissen-search" id="merkSearch" type="search" placeholder="Thema suchen – z. B. Wartezeit, Verweisung, Waisenrente …" value="'+esc(filter||'')+'">'
      +'<div class="merk-list" id="merkList"></div></div>';
    var list=v.querySelector('#merkList'),n=0;
    SRC.forEach(function(m){if(!matchM(m,q))return;n++;list.appendChild(card(m))});
    if(!n)list.innerHTML='<p class="note-small">Kein Thema gefunden. Versuch es mit „Wartezeit“, „Steuer“ oder „Rente“.</p>';
    v.querySelector('#merkBack').onclick=closeMerk;
    Array.prototype.forEach.call(v.querySelectorAll('[data-tab]'),function(b){
      b.onclick=function(){merkTab=b.getAttribute('data-tab');renderMerk(v.querySelector('#merkSearch')?v.querySelector('#merkSearch').value:'')};
    });
    var si=v.querySelector('#merkSearch');
    si.oninput=function(){
      var val=si.value,scroll=v.scrollTop,q2=val.trim().toLowerCase();
      var listEl=v.querySelector('#merkList');listEl.innerHTML='';
      var nn=0;
      (merkTab==='bed'?MERKB:MERK).forEach(function(m){if(!matchM(m,q2))return;nn++;listEl.appendChild(card(m))});
      if(!nn)listEl.innerHTML='<p class="note-small">Kein Thema gefunden. Versuch es mit „Wartezeit“, „Steuer“ oder „Rente“.</p>';
      v.scrollTop=scroll;
    };
  }
  function openMerk(id){
    if(id){merkTab=MERKB.some(function(m){return m.id===id})?'bed':'pruefung'}
    var v=ensureView();
    ['homeView','quizView','wissenView','diaryView'].forEach(function(x){var el=document.getElementById(x);if(el)el.hidden=true});
    v.hidden=false;renderMerk('');
    if(id){var d=document.getElementById('merk-'+id);if(d){d.open=true;setTimeout(function(){d.scrollIntoView({block:'start',behavior:'smooth'})},80)}}
    window.scrollTo(0,0);
  }
  function closeMerk(){
    var v=document.getElementById('merkView');if(v)v.hidden=true;
    var h=document.getElementById('homeView');if(h)h.hidden=false;
    if(typeof render==='function')render();
    window.scrollTo(0,0);
  }
  function renderMerkCard(){
    var el=document.getElementById('merkCard');if(!el)return;
    el.hidden=false;
    el.innerHTML='<p class="eyebrow muted">NACHSCHLAGEN</p><h2>Merkzettel</h2>'
      +'<p class="note-small">Neun Themen, die in der Prüfung immer wieder kommen – Formeln, Systematik und die typischen Fallen.</p>'
      +'<div class="merk-grid">'+MERK.map(function(m){
        return '<button class="merk-chip" data-merk="'+esc(m.id)+'"><span class="merk-n">'+esc(m.n)+'</span><span>'+esc(m.t)+'</span></button>';
      }).join('')+'</div>'
      +'<p class="eyebrow muted" style="margin-top:22px">AUS DEM BEDINGUNGSWERK</p>'
      +'<div class="merk-grid">'+MERKB.map(function(m){
        return '<button class="merk-chip" data-merk="'+esc(m.id)+'"><span class="merk-n">'+esc(m.n)+'</span><span>'+esc(m.t)+'</span></button>';
      }).join('')+'</div>';
    Array.prototype.forEach.call(el.querySelectorAll('[data-merk]'),function(b){b.onclick=function(){
      var id=b.getAttribute('data-merk');
      var isBed=MERKB.some(function(m){return m.id===id});
      merkTab=isBed?'bed':'pruefung';
      openMerk(id);
    }});
  }
  var _render=render;
  render=function(){_render();try{renderMerkCard()}catch(e){}};
  document.addEventListener('DOMContentLoaded',function(){
    var qb=document.getElementById('quickMerk');if(qb)qb.onclick=function(){openMerk()};
    var qs=document.getElementById('qSearch');
    try{renderMerkCard()}catch(e){}
  });
  if(document.readyState!=='loading'){
    var qb2=document.getElementById('quickMerk');if(qb2)qb2.onclick=function(){openMerk()};
    try{renderMerkCard()}catch(e){}
  }
  var _sw=showWissen;showWissen=function(){var v=document.getElementById('merkView');if(v)v.hidden=true;_sw()};
  var _sd=showDiary;showDiary=function(){var v=document.getElementById('merkView');if(v)v.hidden=true;_sd()};
})();

/* ================= v23 · Skripte & Folien ================= */
var SKRIPTE=[];
(function(){
  var curDeck=null,curSlide=0,query='';
  function deckView(){
    var v=document.getElementById('skriptView');
    if(!v){v=document.createElement('section');v.id='skriptView';v.className='view';v.hidden=true;(document.getElementById('app')||document.body).appendChild(v)}
    return v;
  }
  function hay(s,d){return (s.title+' '+s.text+' '+(s.notes||'')+' '+d.title).toLowerCase()}
  function listView(){
    var v=deckView();v.hidden=false;
    var total=SKRIPTE.reduce(function(a,d){return a+d.count},0);
    var q=(query||'').toLowerCase();
    var hits=[];
    if(q){
      SKRIPTE.forEach(function(d){d.slides.forEach(function(s){if(hay(s,d).indexOf(q)>=0)hits.push({d:d,s:s})})});
    }
    v.innerHTML='<div class="quiz-wrap"><div class="quiz-top"><button class="back-button" id="skBack">← Übersicht</button><div class="quiz-title">Skripte & Folien</div><span class="quiz-mode">'+SKRIPTE.length+' BLÖCKE · '+total+' FOLIEN</span></div>'
      +'<div class="merk-head"><p class="eyebrow">DEIN UNTERRICHTSSTOFF</p><h2>Folien zum Nachlesen</h2><p class="note-small">Die Originalfolien deines Ausbilders, durchsuchbar. Tippe einen Block an oder such direkt.</p></div>'
      +'<input class="wissen-search" id="skSearch" type="search" placeholder="In allen Folien suchen – z. B. BBG, Sparanteil, Quotenvorrecht …" value="'+(query||'').replace(/"/g,'&quot;')+'">'
      +'<div id="skBody"></div></div>';
    var body=v.querySelector('#skBody');
    if(q){
      body.innerHTML='<p class="note-small">'+hits.length+' Treffer für „'+(query||'').replace(/</g,'&lt;')+'"</p><div class="sk-hits">'
        +hits.slice(0,120).map(function(h,i){return '<button class="sk-hit" data-hit="'+i+'"><span class="sk-hit-t">'+safeText(h.s.title)+'</span><small>'+safeText(h.d.title)+' · Folie '+h.s.n+'</small></button>'}).join('')+'</div>';
      body.querySelectorAll('[data-hit]').forEach(function(b){b.onclick=function(){var h=hits[+b.getAttribute('data-hit')];openSlide(h.d,h.d.slides.indexOf(h.s))}});
    }else if(!SKRIPTE.length){
      body.innerHTML='<p class="note-small">Die Folien werden beim ersten Laden mit Internetverbindung geholt. Lade die App einmal neu.</p>';
    }else{
      body.innerHTML='<div class="sk-grid">'+SKRIPTE.map(function(d,i){
        return '<button class="sk-card" data-deck="'+i+'"><span class="sk-num">'+safeText(d.range)+'</span><b>'+safeText(d.title)+'</b><small>'+d.count+' Folien · '+safeText(d.topic)+'</small><span class="sk-go">Öffnen ↗</span></button>';
      }).join('')+'</div>';
      body.querySelectorAll('[data-deck]').forEach(function(b){b.onclick=function(){openDeck(SKRIPTE[+b.getAttribute('data-deck')])}});
    }
    v.querySelector('#skBack').onclick=closeSkript;
    var si=v.querySelector('#skSearch');
    si.oninput=function(){query=si.value;var pos=si.selectionStart;listView();var n=document.getElementById('skSearch');if(n){n.focus();n.setSelectionRange(pos,pos)}};
    window.scrollTo(0,0);
  }
  function openDeck(d){curDeck=d;curSlide=0;renderSlide()}
  function openSlide(d,i){curDeck=d;curSlide=i;renderSlide()}
  function renderSlide(){
    var v=deckView(),d=curDeck,s=d.slides[curSlide];
    var prev=curSlide>0,next=curSlide<d.slides.length-1;
    var body=safeText(s.text||'').replace(/\n/g,'<br>');
    v.innerHTML='<div class="quiz-wrap"><div class="quiz-top"><button class="back-button" id="skList">← Alle Blöcke</button><div class="quiz-title">'+safeText(d.title)+'</div><span class="quiz-mode">'+(curSlide+1)+' / '+d.slides.length+'</span></div>'
      +'<p class="question-topic">'+safeText(d.topic)+' · '+safeText(d.range)+'</p>'
      +'<h1 class="question-title">'+safeText(s.title)+'</h1>'
      +'<div class="slide-body">'+(body||'<i>Diese Folie enthält nur Grafik – kein Text lesbar.</i>')+'</div>'
      +(s.notes?'<div class="question-note"><b>Notiz</b><span>'+safeText(s.notes).replace(/\n/g,'<br>')+'</span></div>':'')
      +'<div class="quiz-controls"><span class="points-label">FOLIE '+(curSlide+1)+'</span>'
      +(prev?'<button class="button button-outline" id="skPrev">← Zurück</button>':'')
      +(next?'<button class="button button-dark" id="skNext">Weiter →</button>':'<button class="button button-dark" id="skEnd">Ende</button>')
      +'</div>'
      +'<div class="sk-dots">'+d.slides.map(function(_,i){return '<button class="sk-dot'+(i===curSlide?' on':'')+'" data-sl="'+i+'" aria-label="Folie '+(i+1)+'"></button>'}).join('')+'</div>'
      +'</div>';
    v.querySelector('#skList').onclick=listView;
    var b=v.querySelector('#skPrev');if(b)b.onclick=function(){if(curSlide>0){curSlide--;renderSlide()}};
    var n=v.querySelector('#skNext');if(n)n.onclick=function(){if(curSlide<d.slides.length-1){curSlide++;renderSlide()}};
    var e=v.querySelector('#skEnd');if(e)e.onclick=listView;
    v.querySelectorAll('[data-sl]').forEach(function(x){x.onclick=function(){curSlide=+x.getAttribute('data-sl');renderSlide()}});
    window.scrollTo(0,0);
  }
  function openSkript(){['homeView','quizView','wissenView','diaryView','merkView'].forEach(function(x){var el=document.getElementById(x);if(el)el.hidden=true});query='';listView()}
  function closeSkript(){var v=document.getElementById('skriptView');if(v)v.hidden=true;var h=document.getElementById('homeView');if(h)h.hidden=false;if(typeof render==='function')render();window.scrollTo(0,0)}
  function renderSkriptCard(){
    var el=document.getElementById('skriptCard');if(!el)return;
    if(!SKRIPTE.length){el.hidden=true;return}
    el.hidden=false;
    var total=SKRIPTE.reduce(function(a,d){return a+d.count},0);
    el.innerHTML='<p class="eyebrow muted">NACHLESEN</p><h2>Skripte & Folien</h2>'
      +'<p class="note-small">'+total+' Originalfolien aus dem Unterricht – durchsuchbar und mit den Prüfungsthemen verknüpft.</p>'
      +'<div class="sk-grid">'+SKRIPTE.map(function(d,i){
        return '<button class="sk-card" data-skc="'+i+'"><span class="sk-num">'+safeText(d.range)+'</span><b>'+safeText(d.title)+'</b><small>'+d.count+' Folien</small></button>';
      }).join('')+'</div>';
    el.querySelectorAll('[data-skc]').forEach(function(b){b.onclick=function(){openSkript();openDeck(SKRIPTE[+b.getAttribute('data-skc')])}});
  }
  window.openSkript=openSkript;window.renderSkriptCard=renderSkriptCard;
  var _render=render;
  render=function(){_render();try{renderSkriptCard()}catch(e){}};
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.getElementById('quickSkript');if(b)b.onclick=openSkript;
    try{renderSkriptCard()}catch(e){}
  });
  if(document.readyState!=='loading'){
    var b2=document.getElementById('quickSkript');if(b2)b2.onclick=openSkript;
  }
  var _sw=showWissen;showWissen=function(){var v=document.getElementById('skriptView');if(v)v.hidden=true;_sw()};
  var _sd=showDiary;showDiary=function(){var v=document.getElementById('skriptView');if(v)v.hidden=true;_sd()};
})();
