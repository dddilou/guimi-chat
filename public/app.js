import { DEFAULT_PERSONA, DEFAULT_MODEL, refreshPersona } from './defaults.js';
import { cleanReply } from './message-utils.js';
import { replyParts } from './reply-parts.js';
import { canInitiate } from './presence.js';
const $ = s => document.querySelector(s), KEY = 'guimi-chat-v2';
const empty = () => ({persona:{...DEFAULT_PERSONA,name:'Aa.💩'},messages:[],memories:[],summary:{text:'',throughId:null}});
let state = empty(), busy = false, error = '', tab = 'persona', visible = 200;
let connection = {configured:false,model:DEFAULT_MODEL};
let pendingReply=false, messageVersion=0;
let lastInteraction=Date.now(), initialized=false;
function readPreferences(){try{return JSON.parse(localStorage.getItem('guimi-chat-presence')||'{}');}catch{return {};}}
let presence=readPreferences();
function savePresence(){try{localStorage.setItem('guimi-chat-presence',JSON.stringify(presence));}catch{}}
function stickerMotion(){return "";}
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(text) { const e=$('#toast');e.textContent=text;e.hidden=false;clearTimeout(e.timer);e.timer=setTimeout(()=>e.hidden=true,4200); }
function save() { try {localStorage.setItem(KEY,JSON.stringify(state));return true;} catch {toast('浏览器存储空间不足，请到「记录」导出备份。');return false;} }
async function request(path,body) {
  const res=await fetch('/api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await res.json();if(!res.ok)throw Error(data.error||'操作失败，请重试。');return data;
}
function updateInput() {
  const input=$('#message-input');$('#send-button').disabled=!input.value.trim();
  $('.plus').hidden=!!input.value.trim();input.disabled=false;
  input.style.height='42px';input.style.height=Math.min(110,input.scrollHeight)+'px';
}
function render() {
  const box=$('#messages');box.replaceChildren();
  $('#chat-name').textContent=state.persona.name||'Aa.💩';$('#friend-name').textContent=state.persona.name||'Aa.💩';
  if(state.messages.length>visible){const more=document.createElement('button');more.className='history-more';more.textContent='查看更早的消息';more.onclick=()=>{const height=box.scrollHeight;visible+=200;render();box.scrollTop=box.scrollHeight-height;};box.append(more);}
  let last=0;
  for(const m of state.messages.slice(-visible)) {
    const time=new Date(m.createdAt).getTime();
    if(time-last>300000){const e=document.createElement('div');e.className='time';const label=document.createElement('span');label.textContent=new Date(time).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});e.append(label);box.append(e);}
    const row=document.createElement('div');row.className='row '+m.role;
    row.innerHTML=`<img class="avatar" src="/assets/${m.role==='user'?'me':'friend'}.jpg" alt="${m.role==='user'?'我的头像':'她的头像'}"><div class="bubble"></div>`;
    if(m.sticker && /^\/assets\/stickers\/[a-f0-9]{64}\.(gif|png|jpg|webp)$/.test(m.sticker)){
      const bubble=row.querySelector('.bubble');bubble.classList.add('sticker-bubble');
      const img=document.createElement('img');img.src=m.sticker;img.alt=m.content;img.className='chat-sticker'+stickerMotion(m.sticker);img.loading='lazy';bubble.append(img);
    } else row.querySelector('.bubble').textContent=m.role==='assistant'?cleanReply(m.content):m.content;
    row.querySelector('.bubble').ondblclick=()=>remember(`${m.role==='user'?'用户':'角色'}原话：${m.content}`);
    box.append(row);last=time;
  }
  if(busy){const row=document.createElement('div');row.className='row assistant';row.innerHTML='<img class="avatar" src="/assets/friend.jpg" alt="她的头像"><div class="bubble typing" aria-label="对方正在输入">···</div>';box.append(row);}
  if(error){const e=document.createElement('div');e.className='error';e.textContent=error;const retry=document.createElement('button');retry.textContent='重试';retry.onclick=()=>send(true);e.append(retry);box.append(e);}
  box.scrollTop=box.scrollHeight;updateInput();
}
async function acceptReply(data,version=messageVersion){
  if(version!==messageVersion)return;
  const parts=data.parts||replyParts(data.text,stickers);
  state.summary=data.summary||state.summary;
  for(const [index,part] of parts.slice(0,3).entries()){
    if(index)await new Promise(resolve=>setTimeout(resolve,650));
    if(version!==messageVersion)return;
    state.messages.push({id:uid(),role:'assistant',...part,createdAt:new Date().toISOString()});save();render();
  }
  save();
}
async function send(retry=false,sticker=null) {
  const input=$('#message-input'),text=input.value.trim();
  if(!retry){if(!text&&!sticker)return;state.messages.push({id:uid(),role:'user',content:sticker?sticker.name:text,...(sticker?{sticker:sticker.url}:{}),createdAt:new Date().toISOString()});
    if(/^(?:诡秘[，,\s]*)?(?:请)?(?:记住|记一下)/.test(text))remember('用户原话：'+text,false);
    if(!sticker)input.value='';save();picker.hidden=true;
  }else if(state.messages.at(-1)?.role!=='user')return;
  messageVersion++;pendingReply=true;lastInteraction=Date.now();error='';render();
  input.focus();drainReplies();
}
async function drainReplies(){
  if(busy||!pendingReply)return;
  busy=true;render();
  try{
    while(pendingReply){
      pendingReply=false;
      const version=messageVersion;
      // Freeze the request; newer messages stay visible and are picked up next.
      const snapshot=JSON.parse(JSON.stringify(state));
      try{
        const data=await request('chat',snapshot);
        if(version===messageVersion)await acceptReply(data,version);
      }catch(err){
        if(version===messageVersion){error=err.message.includes('fetch')?'连接中断了，消息已保留，请重试。':err.message;break;}
      }
    }
  }finally{busy=false;lastInteraction=Date.now();render();}
}

function remember(text,notify=true) {
  if(busy&&notify)return toast('等她回复完再修改记忆吧');text=text.trim();if(!text)return;
  if(text.length>2000)return toast('每条记忆最多 2000 字');if(state.memories.length>=1000)return toast('记忆已满，请整理后再添加');
  if(!state.memories.some(m=>m.text===text)){state.memories.push({id:uid(),text,source:'用户保存',createdAt:new Date().toISOString()});save();}
  if(notify)toast('已加入长期记忆');
}
$('#chat-form').onsubmit=e=>{e.preventDefault();send();};
$('#message-input').oninput=updateInput;
$('#message-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send();}};
const picker=$('#emoji-picker');
let stickers=[], pickerTab='stickers';
function renderPicker(){
  picker.innerHTML='<div class="picker-tabs"><button data-picker="emoji">笑脸</button><button data-picker="stickers">我的表情</button><button id="add-stickers" aria-label="添加表情包">＋ 添加</button></div><div id="picker-content"></div><input type="file" id="sticker-files" multiple accept="image/gif,image/png,image/jpeg,image/webp" hidden>';
  for(const button of picker.querySelectorAll('[data-picker]')){button.classList.toggle('active',button.dataset.picker===pickerTab);button.onclick=()=>{pickerTab=button.dataset.picker;renderPicker();};}
  const content=$('#picker-content');
  if(pickerTab==='emoji'){
    content.className='emoji-grid';
    for(const emoji of ['😂','😭','🥺','🥰','😎','🙃','😤','🤔','🤡','👀','🫶','💚','👍','✨','🎨','💤','😅','🤣','😋','🥹','😇','😱','🤫','💩']){const button=document.createElement('button');button.type='button';button.textContent=emoji;button.onclick=()=>{$('#message-input').value+=emoji;picker.hidden=true;updateInput();$('#message-input').focus();};content.append(button);}
  }else{
    content.className='sticker-grid';
    if(!stickers.length)content.innerHTML='<div class="sticker-empty"><span>♡</span><strong>把常用的表情放这里</strong><p>点击「＋ 添加」，可以一次选多张<br>支持 GIF 动图、PNG、JPG、WebP</p><small>微信中保存的表情原图可以直接添加</small></div>';
    for(const sticker of stickers){const button=document.createElement('button');button.className='sticker-choice';button.title=sticker.name;button.setAttribute('aria-label','发送表情：'+sticker.name);const img=document.createElement('img');img.src=sticker.url;img.alt=sticker.name;img.className=stickerMotion(sticker.url).trim();img.loading='lazy';button.append(img);button.onclick=()=>send(false,sticker);content.append(button);}
  }
  $('#add-stickers').onclick=()=>$('#sticker-files').click();
  $('#sticker-files').onchange=async e=>{
    const files=[...e.target.files];if(!files.length)return;
    $('#add-stickers').disabled=true;let added=0;const failures=[];
    for(const file of files){
      try{
        if(file.size>6*1024*1024)throw Error('超过 6 MB');
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('读取失败'));reader.readAsDataURL(file);});
        const name=file.name.replace(/\.[^.]+$/,'').slice(0,100)||'表情包';
        const sticker=await request('stickers',{name,data});if(!stickers.some(s=>s.id===sticker.id))stickers.push(sticker);added++;
      }catch(err){failures.push(file.name+'：'+err.message);}
    }
    pickerTab='stickers';renderPicker();toast(failures.length?`添加 ${added} 张，${failures.length} 张未成功：${failures[0]}`:`已添加 ${added} 张表情包，点击就能发送`);
  };
}
renderPicker();
$('#emoji-toggle').onclick=()=>picker.hidden=!picker.hidden;
$('.voice').onclick=()=>toast('这一版支持文字聊天；可以用手机键盘的语音输入转成文字。');
function openSettings(next=tab){if(busy)return toast('等她回复完再打开设置吧');tab=next;picker.hidden=true;renderSettings();$('#settings').hidden=false;$('#scrim').hidden=false;$('#close-settings').focus();}
function closeSettings(){$('#settings').hidden=true;$('#scrim').hidden=true;$('#open-settings').focus();}
$('#open-settings').onclick=()=>openSettings();$('.plus').onclick=()=>openSettings('data');$('.back').onclick=()=>openSettings('data');
$('#close-settings').onclick=closeSettings;$('#scrim').onclick=closeSettings;
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.tab;renderSettings();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSettings();picker.hidden=true;}if(e.key==='Tab'&&!$('#settings').hidden){const items=[...$('#settings').querySelectorAll('button,input,textarea,a')].filter(x=>!x.hidden&&x.offsetParent!==null);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
function renderSettings() {
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const body=$('#settings-body');
  if(tab==='persona') {
    body.innerHTML=`<p class="note">这是按你提供的设定陪你聊天的 AI 角色。后续有她的性格、口头禅或聊天示例，都可以补在这里。</p><form id="persona"><label class="field">她的备注<input name="name" maxlength="40" value="${esc(state.persona.name||'Aa.💩')}"></label><label class="field">你们的关系<textarea name="facts" rows="6" maxlength="10000">${esc(state.persona.facts)}</textarea></label><label class="field">她说话的感觉<textarea name="style" rows="7" maxlength="10000">${esc(state.persona.style)}</textarea></label><label class="field">性格、口头禅和聊天示例<textarea name="extra" rows="6" maxlength="10000" placeholder="后续继续补充">${esc(state.persona.extra||'')}</textarea></label><button class="primary">保存设定</button></form>`;
    const presenceLabel=document.createElement('label');presenceLabel.className='presence-option';
    presenceLabel.innerHTML='<input type="checkbox" id="presence-enabled"> 允许她主动找我聊天<small>页面开着且约 10 秒没输入时，她可以开口一次。没回复不会连着发，你接话后才会有下一次主动开场；关闭页面后不发消息。</small>';
    $('#persona').prepend(presenceLabel);$('#presence-enabled').checked=presence.enabled!==false;
    $('#presence-enabled').onchange=e=>{presence.enabled=e.target.checked;savePresence();lastInteraction=Date.now();};
    $('#persona').onsubmit=e=>{e.preventDefault();const form=new FormData(e.target);state.persona={revision:DEFAULT_PERSONA.revision,name:form.get('name').trim()||'Aa.💩',facts:form.get('facts'),style:form.get('style'),extra:form.get('extra')};save();render();toast('设定已保存，下条回复就会使用');};
  } else if(tab==='memory') {
    body.innerHTML=`<p class="note">近期对话会自动带入上下文，较早聊天会整理为摘要。双击气泡或说「记住：……」可以收藏长期记忆；写清楚是你的事还是她的事。</p><form id="memory"><label class="field">添加记忆<textarea name="text" rows="3" maxlength="2000" required placeholder="例如：用户下次想 cosplay 雷姆"></textarea></label><button class="primary">记住</button></form><h3 class="section">长期记忆 · ${state.memories.length}</h3><div id="memory-list"></div><h3 class="section">较早聊天摘要</h3><p class="note">${esc(state.summary.text||'对话还不长，暂时不需要摘要。聊天变长后会自动整理，并保留原始记录。')}</p>`;
    $('#memory').onsubmit=e=>{e.preventDefault();remember(new FormData(e.target).get('text'));renderSettings();};
    const list=$('#memory-list');if(!state.memories.length)list.innerHTML='<p class="note">还没有单独收藏的记忆。</p>';
    for(const memory of [...state.memories].reverse()) {const card=document.createElement('div');card.className='memory-card';card.innerHTML=`<div>${esc(memory.text)}</div><footer><span>${new Date(memory.createdAt).toLocaleDateString('zh-CN')}</span><span><button class="edit">编辑</button><button class="delete">删除</button></span></footer>`;
      card.querySelector('.edit').onclick=()=>{const text=prompt('修改这条记忆',memory.text);if(text===null)return;if(!text.trim()||text.length>2000)return toast('请填写 1～2000 字');memory.text=text.trim();memory.source='用户编辑';save();renderSettings();};
      card.querySelector('.delete').onclick=()=>{if(confirm('删除这条收藏记忆？原始聊天和已有摘要仍然保留。')){state.memories=state.memories.filter(m=>m.id!==memory.id);save();renderSettings();}};list.append(card);}
  } else if(tab==='connection') {
    body.innerHTML=`<div class="connection-state">${connection.configured?'● 已配置 DeepSeek':'○ 尚未配置连接'}</div><p class="note">当前模型：${esc(connection.model)}。测试连接会发送一条简短请求。</p><button class="secondary" id="test-connection">测试连接</button><form id="connection"><label class="field">API Key<input name="key" type="password" autocomplete="off" required placeholder="填写新的 Key 才需要修改"><small>启动配置已保存于本机服务端，浏览器不会收到完整 Key。此处更换的 Key 仅在本次服务运行期间有效。</small></label><label class="field">模型<input name="model" required value="${esc(connection.model)}"></label><button class="primary">验证并连接</button></form><p id="connection-result" class="note" role="status"></p>`;
    const run=async(action,button)=>{button.disabled=true;$('#connection-result').textContent='正在连接 DeepSeek…';try{connection=await action();if($('#connection-result'))$('#connection-result').textContent='连接成功，可以聊天了';}catch(err){if($('#connection-result'))$('#connection-result').textContent=err.message;}finally{button.disabled=false;}};
    $('#test-connection').onclick=e=>run(()=>request('test',{}),e.target);
    $('#connection').onsubmit=e=>{e.preventDefault();const form=new FormData(e.target);run(()=>request('config',{key:form.get('key'),model:form.get('model')}),e.submitter);};
  } else {
    body.innerHTML=`<h3 class="section">聊天记录 · ${state.messages.length} 条</h3><p class="note">聊天、设定和记忆保存在当前浏览器。换设备或清理浏览器前，请导出备份。</p><button class="secondary" id="export">导出备份</button><button class="secondary" id="import">导入备份</button><input id="file" type="file" accept=".json" hidden><h3 class="section">开始新的聊天</h3><p class="note">清空后删除对话和摘要，人物设定与收藏记忆保留。</p><button class="danger" id="clear">清空聊天</button><h3 class="section">你们的聊天背景</h3><img class="background-preview" src="/assets/background.jpg" alt="P4 两人熊帽背景"><p class="note">她的头像使用 P1，你的头像使用 P2，聊天背景使用 P4。</p>`;
    $('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='诡秘聊天备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    $('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>12*1024*1024)throw Error('文件过大');const candidate=await request('validate',JSON.parse(await file.text()));if(!confirm('用备份替换当前聊天、设定和记忆？'))return;state=candidate;state.persona=refreshPersona(state.persona);save();error='';render();renderSettings();toast('备份已恢复');}catch(err){toast('导入失败：'+err.message);}};
    $('#clear').onclick=()=>{if(confirm('清空聊天和摘要？此操作无法撤销，建议先导出备份。')){state.messages=[];state.summary={text:'',throughId:null};error='';save();render();closeSettings();}};
  }
}
async function init() {
  try {const saved=localStorage.getItem(KEY);if(saved){const candidate={...empty(),...JSON.parse(saved)};state=await request('validate',candidate);state.persona=refreshPersona(state.persona);save();}}
  catch{toast('旧记录读取失败，浏览器中的原数据尚未改动。');}
  if(state.messages.at(-1)?.role==='user')error='上次的消息还没有收到回复。';
  render();try{connection=await request('status');}catch{toast('网站服务未连接，请先启动网站。');}
  try{stickers=await request('stickers');renderPicker();render();}catch{toast('表情库暂时没有加载成功，请刷新重试。');}
  initialized=true;
}
for(const event of ['pointerdown','keydown','input'])document.addEventListener(event,()=>lastInteraction=Date.now(),{passive:true});
document.addEventListener('visibilitychange',()=>lastInteraction=Date.now());
async function maybeInitiate(){
  presence=readPreferences();
  const lastUser=state.messages.findLast(m=>m.role==='user');
  const userToken=lastUser?.id||'first-visit';
  const available=initialized&&!busy&&!error&&connection.configured&&!document.hidden&&$('#settings').hidden&&picker.hidden&&!$('#message-input').value.trim();
  if(!canInitiate({now:Date.now(),lastInteraction,presence,lastUser,lastRole:state.messages.at(-1)?.role,available}))return;
  presence.userToken=userToken;presence.lastAt=Date.now();savePresence();
  busy=true;render();
  const version=messageVersion;
  try{await acceptReply(await request('proactive',JSON.parse(JSON.stringify(state))),version);}catch{ /* Idle requests never interrupt the conversation with retries. */ }
  finally{busy=false;lastInteraction=Date.now();render();if(pendingReply)drainReplies();}
}
setInterval(maybeInitiate,1000);
init();

