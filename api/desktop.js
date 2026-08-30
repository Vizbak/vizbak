module.exports = async function handler(req, res) {
  const source = 'https://raw.githubusercontent.com/Vizbak/vizbak/main/index.html';

  try {
    const upstream = await fetch(source, {
      headers: { 'cache-control': 'no-cache' }
    });

    if (!upstream.ok) {
      res.status(upstream.status).send('Unable to load VIZBAK.');
      return;
    }

    let html = await upstream.text();

    const theme = `
<style id="vizbak-desktop-theme">
/* VIZBAK DESKTOP VISUAL SYSTEM */
:root{
  --paper:#000;
  --ink:#fff;
  --black:#000;
  --white:#fff;
  --gold:#c9a65a;
  --goldSoft:rgba(201,166,90,.48);
  --goldFaint:rgba(201,166,90,.18);
}
html,body{background:#000!important;color:#fff!important}
body{cursor:none}

/* The landing screen is intentionally only the VIZBAK wordmark. */
#home{background:#000!important;color:#fff!important}
#home .chrome,
#home .sub,
#home .hint,
#home .hero:before,
#home .hero:after{display:none!important}
#home .hero{padding:0;background:none!important}
#home .hero h1{
  color:#fff!important;
  font-family:Arial,Helvetica,sans-serif!important;
  font-weight:700!important;
  letter-spacing:.055em!important;
  line-height:.82!important;
  text-shadow:none!important;
}

/* Desktop category index: 3 x 2, black tiles, restrained gold edges. */
#index{background:#000!important;color:#fff!important}
#cats{
  inset:88px 3.2vw 54px!important;
  display:grid!important;
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  grid-template-rows:repeat(2,minmax(0,1fr))!important;
  gap:18px!important;
  padding:0!important;
}
.cat{
  background:#050505!important;
  color:#fff!important;
  border:1px solid var(--goldSoft)!important;
  box-shadow:
    inset 0 0 0 1px rgba(201,166,90,.07),
    0 0 18px rgba(201,166,90,.025)!important;
}
.cat:first-child{border-left:1px solid var(--goldSoft)!important}
.cat:before{
  opacity:.08!important;
  filter:grayscale(1) brightness(.25)!important;
  transform:scale(1.01)!important;
}
.cat:after{
  background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.55))!important;
}
.cat:hover{
  border-color:rgba(201,166,90,.82)!important;
  box-shadow:
    inset 0 0 0 1px rgba(201,166,90,.12),
    0 0 28px rgba(201,166,90,.07)!important;
}
.cat:hover:before{opacity:.12!important;filter:grayscale(1) brightness(.35)!important}
.catText{width:90%!important}
.num{color:rgba(255,255,255,.55)!important;margin-bottom:16px!important}
.ct{
  color:#fff!important;
  font-family:Arial,Helvetica,sans-serif!important;
  font-weight:700!important;
  font-size:clamp(28px,3.5vw,58px)!important;
  line-height:.9!important;
  letter-spacing:-.045em!important;
}
.arrow{color:rgba(255,255,255,.72)!important}

/* Keep the rest of the existing site white-on-black where appropriate. */
.indexChrome{color:#fff!important}
.indexChrome button{color:#fff!important}

@media(max-width:800px){
  /* Desktop theme is not applied to mobile.html, but keep this safe if the file is opened directly. */
  #cats{inset:74px 14px 24px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-rows:repeat(3,minmax(0,1fr))!important;gap:9px!important}
}
</style>`;

    html = html.replace('</head>', theme + '</head>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('Unable to load VIZBAK.');
  }
};
