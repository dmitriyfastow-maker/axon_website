const sharp=require(process.cwd()+"/node_modules/sharp");
const T={en:["Say what you need.","Vax gets on with it.","Sites, videos, ads, texts, numbers —","done in minutes, not just advised."],
ru:["Скажите, что нужно.","Vax берётся за дело.","Сайты, ролики, реклама, тексты, расчёты —","готово за минуты, а не совет."],
ua:["Скажіть, що потрібно.","Vax береться до справи.","Сайти, ролики, реклама, тексти, розрахунки —","готово за хвилини, а не порада."]};
const esc=s=>s.replace(/&/g,"&amp;");
(async()=>{for(const [l,t] of Object.entries(T)){
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect x="560" y="0" width="640" height="630" fill="#f6f1e8"/>
<text x="590" y="168" font-family="Helvetica Neue" font-weight="800" font-size="44" fill="#1c1a17">VAXO<tspan fill="#e8a838">.</tspan></text>
<text x="590" y="260" font-family="Helvetica Neue" font-weight="700" font-size="${l=="en"?50:46}" fill="#1c1a17">${esc(t[0])}</text>
<text x="590" y="322" font-family="Helvetica Neue" font-weight="700" font-size="${l=="en"?50:46}" fill="#d48a1c">${esc(t[1])}</text>
<text x="590" y="400" font-family="Helvetica Neue" font-size="25" fill="#4a453d">${esc(t[2])}</text>
<text x="590" y="436" font-family="Helvetica Neue" font-size="25" fill="#4a453d">${esc(t[3])}</text>
<text x="590" y="520" font-family="Helvetica Neue" font-weight="600" font-size="22" fill="#8a8378">vaxogroup.com</text></svg>`;
await sharp("public/og-image.png").composite([{input:Buffer.from(svg)}]).png({compressionLevel:9,palette:false}).toFile(`public/og-${l}.png`);}})();
