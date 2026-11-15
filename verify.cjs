const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(source);
const elements=new Map();
function element(key){if(!elements.has(key))elements.set(key,{textContent:'',innerHTML:'',value:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return[]},showModal(){},close(){},click(){}});return elements.get(key);}
const storage=new Map();
const sandbox={console,Date,Math,Set,Map,JSON,Number,String,Boolean,Array,Object,Error,Blob,URL,
 document:{querySelector:element,querySelectorAll(){return[]},addEventListener(){},body:{classList:{toggle(){},remove(){}}},createElement:element},
 location:{hash:'#home'},window:{addEventListener(){},scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout(){return 1},clearTimeout(){},setInterval(){},navigator:{}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const evaluate=s=>vm.runInContext(s,sandbox);
assert.equal(evaluate('QUESTIONS.length'),320);assert.equal(evaluate('LESSONS.length'),20);
assert.equal(evaluate('new Set(QUESTIONS.map(q=>q.id)).size'),320);
assert.equal(evaluate('QUESTIONS.filter(q=>q.subject==="재무회계").length'),160);
assert.equal(evaluate('QUESTIONS.filter(q=>q.subject==="원가회계").length'),160);
assert(evaluate('QUESTIONS.every(q=>q.choices.length===4&&new Set(q.choices).size===4&&q.explanation.length>12&&LESSONS.some(l=>l.id===q.lesson))'));
// Answer-index randomization never changes the underlying correct answer.
evaluate('startSession("practice", QUESTIONS.slice(0,10).map(q=>q.id))');
assert(evaluate('state.session.ids.every(id=>state.session.orders[id].includes(getQ(id).correct))'));
// First wrong then correct: a successful retry clears the active mistake and retains history.
evaluate('recordQuestion(QUESTIONS[0],1); recordQuestion(QUESTIONS[0],0); persist()');
assert.equal(evaluate('state.attempts[QUESTIONS[0].id].times'),2);
assert.equal(evaluate('stats().wrong'),0);assert.equal(evaluate('stats().rate'),50);
// A high overall score cannot overcome subject failure.
evaluate('startSession("exam", [...QUESTIONS.filter(q=>q.subject==="재무회계").slice(0,20),...QUESTIONS.filter(q=>q.subject==="원가회계").slice(0,20)].map(q=>q.id));state.session.ids.forEach((id,i)=>state.session.answers[id]=i<27?getQ(id).correct:1)');
assert.equal(evaluate('calculate(state.session).score'),67.5);assert.equal(evaluate('calculate(state.session).pass'),false);
// Exactly 40/80 gives an average of 60 and passes; unanswered questions earn no points.
evaluate('state.session.answers={};state.session.ids.forEach((id,i)=>{if(i<8||(i>=20&&i<36))state.session.answers[id]=getQ(id).correct})');
assert.equal(evaluate('calculate(state.session).financial'),40);assert.equal(evaluate('calculate(state.session).cost'),80);assert.equal(evaluate('calculate(state.session).score'),60);assert.equal(evaluate('calculate(state.session).pass'),true);
// Round-trip backup preserves state and the running timer, filters unknown question ids.
evaluate('state.notes[1]="<script>unsafe</script>"; state.completed=[1,2];persist();state=normalize(JSON.parse(localStorage.getItem(KEY)))');
assert.equal(evaluate('state.completed.length'),2);assert(evaluate('state.session.deadline>Date.now()'));
assert.equal(evaluate('esc(state.notes[1])'),'&lt;script&gt;unsafe&lt;/script&gt;');
assert.equal(evaluate('normalize({version:1,bookmarks:["bad","01-01"]}).bookmarks.length'),1);
assert.throws(()=>evaluate('normalize({version:2})'));
// Time expiry submits once, counting skipped questions as wrong.
evaluate('state.session.deadline=Date.now()-100;tick();tick()');
assert.equal(evaluate('state.session.finished'),true);assert.equal(evaluate('state.history.length'),1);
assert.equal(evaluate('Object.keys(state.attempts).length'),40);
assert.equal(evaluate('state.history[0].score'),60);
console.log('PASS — 320 unique questions; balanced subjects; scoring, subject threshold, retry history, backup validation, escaping and timed auto-submit.');

// Every chapter now provides a full reading, defined vocabulary and a worked example.
assert(evaluate('LESSONS.every(l=>l.book.sections.length>=4&&l.book.sections.every(s=>s.paragraphs.length>=2)&&l.book.terms.length===4&&l.book.worked.steps.length===3)'));
assert.equal(evaluate('QUESTIONS.filter(q=>q.level==="입문").length'),80);
assert.equal(evaluate('QUESTIONS.filter(q=>q.level==="반복").length'),80);
assert(evaluate('LESSONS.every(l=>QUESTIONS.filter(q=>q.lesson===l.id).length===16)'));
// Original v1 question ids and notes remain valid after the expansion.
assert.equal(evaluate('normalize({version:1,completed:[1],notes:{1:"계속 공부"},bookmarks:["01-01"]}).notes[1]'),'계속 공부');
console.log('PASS — 20 textbook chapters, 80 definitions, 20 worked examples and v1 record compatibility.');

// Foundation routes, migration and backup must preserve existing records.
assert.equal(evaluate('FOUNDATION.length'),8);
assert(evaluate('FOUNDATION.every(c=>c.sections.length===5&&c.checks.length===2&&c.worked.steps.length===3)'));
evaluate('state=normalize({version:1,completed:[1],notes:{1:"기존 메모"}})');
assert.equal(evaluate('state.foundation.completed.length'),0);
assert.equal(evaluate('state.notes[1]'),'기존 메모');
evaluate('foundationView(1)');
assert(evaluate('app.innerHTML.includes("회계랑 부기")&&app.innerHTML.includes("foundation-note")'));
evaluate('foundationView(8)');
assert(evaluate('app.innerHTML.includes("lesson/1")&&app.innerHTML.includes("선급비용")'));
evaluate('state.foundation.notes[8]="<img src=x>";state.foundation.completed=[1,8];persist();state=normalize(JSON.parse(localStorage.getItem(KEY)));foundationView(8)');
assert.equal(evaluate('state.foundation.completed.length'),2);
assert(evaluate('app.innerHTML.includes("&lt;img src=x&gt;")'));
evaluate('location.hash="#foundation/2";render()');
assert(evaluate('app.innerHTML.includes("자산·부채·자본부터")'));
evaluate('foundationView(null)');
assert(evaluate('app.innerHTML.includes("8장을 읽은 뒤")'));
console.log('PASS — foundation reading routes, original record migration, first/last chapter, escaped notes and backup round-trip.');
