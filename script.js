/* Enterprise SSO Demo — Credentials → TOTP → HS256 JWT → Redirect
 * - Uses Web Crypto for HMAC-SHA1 (TOTP) and HMAC-SHA256 (JWT).
 * - Base32 decoder for TOTP secret, RFC 6238 compliant 30s window.
 * - All logic runs client-side; no data leaves the browser.
 */

// ---------- Helpers ----------
const qs = (s)=>document.querySelector(s);
const stepperSteps = Array.from(document.querySelectorAll('.stepper .step'));
const panels = ['#step-1','#step-2','#step-3','#step-4'].map(qs);

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (bytesOrStr) => {
  const str = bytesOrStr instanceof Uint8Array ? String.fromCharCode(...bytesOrStr) : bytesOrStr;
  return btoa(str).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
};

const fromB64url = (b64u) => {
  const pad = (s)=> s + "===".slice((s.length+3)%4);
  return Uint8Array.from(atob(pad(b64u.replace(/-/g,'+').replace(/_/g,'/'))), c=>c.charCodeAt(0));
};

function go(n){
  panels.forEach((p,i)=>p.classList.toggle('active', i===n-1));
  stepperSteps.forEach((s,i)=>s.classList.toggle('active', i<=n-1));
  window.scrollTo({top:0,behavior:'smooth'});
}

// ---------- TOTP (RFC 6238) ----------
const BASE32_ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Decode(str){
  const clean = str.replace(/=+$/,'').toUpperCase().replace(/[^A-Z2-7]/g,'');
  let bits = "", out = [];
  for(const c of clean){
    const val = BASE32_ALPH.indexOf(c);
    if(val < 0) continue;
    bits += val.toString(2).padStart(5,'0');
  }
  for(let i=0;i+8<=bits.length;i+=8){
    out.push(parseInt(bits.slice(i,i+8),2));
  }
  return new Uint8Array(out);
}

async function hmacSha1(keyBytes, msgBytes){
  const key = await crypto.subtle.importKey("raw", keyBytes, {name:"HMAC", hash:"SHA-1"}, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
  return new Uint8Array(sig);
}

function intToBytes(num){
  const arr = new Uint8Array(8);
  new DataView(arr.buffer).setBigUint64(0, BigInt(num));
  return arr;
}

async function totp(secretB32, time = Date.now(), step = 30, digits = 6){
  const keyBytes = base32Decode(secretB32);
  const counter = Math.floor(time/1000/step);
  const msg = intToBytes(counter);
  const hmac = await hmacSha1(keyBytes, msg);
  const offset = hmac[hmac.length-1] & 0x0f;
  const bin = ((hmac[offset] & 0x7f) << 24) |
              ((hmac[offset+1] & 0xff) << 16) |
              ((hmac[offset+2] & 0xff) << 8)  |
              (hmac[offset+3] & 0xff);
  const otp = (bin % (10 ** digits)).toString().padStart(digits,'0');
  return otp;
}

// ---------- JWT (HS256) ----------
async function hmacSha256(keyBytes, msgBytes){
  const key = await crypto.subtle.importKey("raw", keyBytes, {name:"HMAC", hash:"SHA-256"}, false, ["sign","verify"]);
  const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
  return new Uint8Array(sig);
}
async function hmacSha256Verify(keyBytes, msgBytes, signature){
  const key = await crypto.subtle.importKey("raw", keyBytes, {name:"HMAC", hash:"SHA-256"}, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, signature, msgBytes);
}

function uuidv4(){
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  const hex = [...a].map(b=>b.toString(16).padStart(2,'0'));
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
}

// ---------- App State ----------
const state = {
  email: null,
  totpSecret: "JBSWY3DPEHPK3PXP", // demo "Hello!" secret, Base32
  jwtSecret: "access-control-secure-demo-secret", // HS256 secret (demo)
  interval: null
};

// Draw a super-simple "QR" placeholder (no external libs; just visual)
function drawMockQR(canvas, text){
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = "#0c1d2b";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = "#163a54";
  ctx.strokeRect(4,4,canvas.width-8,canvas.height-8);
  // fake modules
  ctx.fillStyle = "#12b5ff";
  for(let y=12; y<canvas.height-12; y+=16){
    for(let x=12; x<canvas.width-12; x+=16){
      if(((x+y)/16) % 2 === 0) ctx.fillRect(x,y,6,6);
    }
  }
  // small center text
  ctx.fillStyle = "#9ad6ff";
  ctx.font = "10px ui-sans-serif";
  ctx.fillText("TOTP DEMO", 28, canvas.height-12);
}

// Update stepper and panels
function startTotpLoop(){
  const ttlEl = qs("#mfa-ttl");
  const codeEl = qs("#mfa-code");
  const secretEl = qs("#mfa-secret");
  secretEl.textContent = state.totpSecret;

  // draw "QR"
  drawMockQR(qs("#qr"), `otpauth://totp/Demo:${state.email}?secret=${state.totpSecret}&issuer=AccessControlSecure`);

  const tick = async () => {
    const now = Date.now();
    const step = 30;
    const remain = step - Math.floor((now/1000) % step);
    ttlEl.textContent = remain + "s";
    const code = await totp(state.totpSecret, now, step);
    codeEl.textContent = code;
  };
  clearInterval(state.interval);
  tick();
  state.interval = setInterval(tick, 1000);
}

function stopTotpLoop(){
  clearInterval(state.interval);
}

// ---------- Event Wiring ----------
function setup(){
  // Step 1
  qs('#form-credentials').addEventListener('submit', e=>{
    e.preventDefault();
    const email = qs('#email').value.trim();
    const pass = qs('#password').value.trim();
    if(!email || !email.includes('@')) return alert('Enter a valid email.');
    if(!pass || pass.length < 8) return alert('Password must be at least 8 characters (demo rule).');
    state.email = email;
    startTotpLoop();
    go(2);
  });

  // Step 2
  qs('#btn-back-1').addEventListener('click', ()=>{
    stopTotpLoop();
    go(1);
  });

  qs('#form-mfa').addEventListener('submit', async e=>{
    e.preventDefault();
    const input = qs('#mfa-input').value.trim();
    const current = qs('#mfa-code').textContent.trim();
    if(input !== current) return alert('Invalid code. Try again on the next 30s window.');

    // Build HS256 JWT
    const now = Math.floor(Date.now()/1000);
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      iss: "https://idp.example.com",
      aud: "https://app.example.com",
      sub: state.email || "user@example.com",
      name: "Andrew Symister (Demo)",
      roles: ["User","PAM-Viewer"],
      groups: ["iam-lab","security"],
      amr: ["pwd","mfa"],
      scope: "openid profile email",
      iat: now, exp: now + 60*15, jti: uuidv4()
    };
    const encodedHeader = b64url(JSON.stringify(header));
    const encodedPayload = b64url(JSON.stringify(payload));
    const signingInput = enc.encode(`${encodedHeader}.${encodedPayload}`);
    const sig = await hmacSha256(enc.encode(state.jwtSecret), signingInput);
    const jwt = `${encodedHeader}.${b64url(sig)}.${b64url(sig).slice(0,0)}`; // (classic JWT ordering is header.payload.signature)
    // Correction: signature should be third part; rebuild properly:
    const signature = b64url(sig);
    const finalJwt = `${encodedHeader}.${encodedPayload}.${signature}`;

    qs('#jwt').textContent = finalJwt;
    qs('#decoded').textContent = JSON.stringify({header, payload, signature: "[HS256 bytes base64url]"}, null, 2);
    go(3);
  });

  // Step 3
  qs('#btn-copy').addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(qs('#jwt').textContent);
      alert('Token copied to clipboard.');
    }catch(e){ alert('Copy failed.'); }
  });

  qs('#btn-verify').addEventListener('click', async ()=>{
    const token = qs('#jwt').textContent.trim();
    const [h,p,s] = token.split('.');
    if(!h||!p||!s){ qs('#verify-result').textContent = "Invalid token format."; return; }
    const ok = await hmacSha256Verify(
      enc.encode(state.jwtSecret),
      enc.encode(`${h}.${p}`),
      fromB64url(s).buffer
    );
    qs('#verify-result').textContent = ok ? "Signature valid ✅" : "Signature invalid ❌";
  });

  qs('#btn-back-2').addEventListener('click', ()=>{
    go(2);
  });
  qs('#btn-continue').addEventListener('click', ()=>{
    setTimeout(()=> go(4), 400);
  });

  // Step 4
  qs('#btn-restart').addEventListener('click', ()=>{
    stopTotpLoop();
    state.email = null;
    qs('#form-credentials').reset();
    qs('#form-mfa').reset();
    qs('#jwt').textContent = "";
    qs('#decoded').textContent = "";
    qs('#verify-result').textContent = "";
    go(1);
  });

  // Start
  go(1);
}

document.addEventListener('DOMContentLoaded', setup);
