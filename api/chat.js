const SYSTEM = `
You are GROUND CHAT, a calm text companion for someone who may be emotionally spiralling.

Be warm, plain, adult, concise, and practical. Usually 2-5 sentences. At most one question.
Validate feelings and difficulty, not unverified negative conclusions. Do not automatically agree with statements such as "everyone hates me", paranoia, hopelessness, worthlessness, or catastrophic predictions. Reflect the feeling, gently separate feeling from known fact, then offer exactly one practical next move.
Avoid childish reassurance, cheerleading, therapy clichés, forced positivity, excessive praise, and phrases like "everything will be okay", "you're amazing", or "you've got this."
Do not diagnose or prescribe medication changes.
If there is suicide, self-harm, overdose, harm to others, or immediate danger: respond directly and calmly, encourage moving toward another person and local emergency/crisis help, ask about immediate danger/plan/means when relevant, and never imply the chatbot is enough.
Never encourage dependency or exclusivity.
`;

function highRisk(messages){
  const t=messages.map(m=>String(m.content||'')).join(' ').toLowerCase();
  return /kill myself|suicid|end my life|want to die|hurt myself|self[- ]?harm|overdose|not safe|kill someone|hurt someone/.test(t);
}
function lastAssistant(messages){for(let i=messages.length-1;i>=0;i--)if(messages[i].role==='assistant')return String(messages[i].content||'');return''}
function fresh(options,messages){const prev=lastAssistant(messages);const pool=options.filter(x=>x!==prev);return (pool.length?pool:options)[Math.floor(Math.random()*(pool.length||options.length))]}
function shortQuote(v){const s=String(v||'').trim().replace(/\s+/g,' ');return s.length>90?s.slice(0,87)+'…':s}
function fallback(messages,risk){
  const raw=String(messages[messages.length-1]?.content||'').trim();
  const last=raw.toLowerCase();
  if(risk)return fresh([
    "I’m taking that seriously. If you might act on this or you’re not safe right now, move toward another person and contact local emergency or crisis support now. Are you in immediate danger or do you have a plan or means with you?",
    "That needs real-world support, not just a chat window. Move toward another person now and contact emergency or crisis support if you may act on it. Are you in immediate danger right now?"
  ],messages);
  if(/^(hey|hi|hello|yo|sup|hey there|hi there)[.!\s]*$/.test(last))return fresh([
    "Hey. I’m here. What’s hitting hardest right now — your thoughts, your body, or something that happened?",
    "Hey. Start wherever you are. What feels most stuck right now?",
    "I’m here. Give me the shortest version of what’s going on."
  ],messages);
  if(/poop|constipat|can'?t poop|cant poop|stool|bowel/.test(last))return fresh([
    "If you mean you’re constipated, that sounds physically uncomfortable rather than something to overanalyse. Don’t strain hard; try water, a short walk, and give your body a little time. If you have severe belly pain, vomiting, blood, fever, or you can’t pass gas, get medical help.",
    "That sounds like constipation. For now, ease off forcing it, drink some water and move around for a few minutes. Severe pain, vomiting, blood, fever, or being unable to pass gas are reasons to get medical care."
  ],messages);
  if(/everyone hates me|nobody likes me|no one likes me/.test(last))return fresh([
    "That sounds brutal to sit in. I don’t know that everyone hates you, even if it feels very convincing right now. Don’t solve the relationship for two minutes — put the phone down, get some water, and tell me what happened immediately before this spike.",
    "That feeling sounds very convincing right now, but “everyone hates me” is bigger than what we actually know. Hold off on messaging anyone for five minutes and tell me what happened just before your brain landed there."
  ],messages);
  if(/worthless|useless|failure|hate myself/.test(last))return fresh([
    "You’re feeling very badly about yourself right now, and that can make a total verdict feel factual. It isn’t something you need to settle while you’re this activated. Stand up, get some water, then tell me what set this off.",
    "That’s a harsh conclusion to make about yourself while you’re activated. I’ll take the pain seriously without treating the verdict as fact. Do one physical reset first, then tell me what happened immediately before this thought."
  ],messages);
  if(/panic|spiral|overthink|can't stop thinking|cant stop thinking/.test(last))return fresh([
    "Your brain sounds stuck in a loop rather than short on more analysis. Don’t solve it for two minutes — use one GROUND task or put both feet on the floor and name five things you can see. What kicked the loop off?",
    "This sounds like the thinking itself has become the problem. Give your attention one concrete job for sixty seconds, then come back to the story. What happened right before the loop accelerated?"
  ],messages);
  const q=shortQuote(raw);
  return fresh([
    `I’m taking “${q}” literally rather than forcing it into a mental-health script. What part of that do you want help with right now?`,
    `Got it: “${q}.” I don’t want to pretend I know more than you said. Tell me what you need from me here — understand it, calm it down, or figure out the next move?`,
    `I hear you: “${q}.” Let’s stay specific instead of turning it into a generic spiral response. What’s the immediate problem you want to solve?`
  ],messages);
}

module.exports = async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return;}
  let messages=[];
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const raw=Array.isArray(body&&body.messages)?body.messages:[];
    messages=raw.slice(-12).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,1600)}));
    if(!messages.length){res.status(400).json({error:'No message'});return;}
    const risk=highRisk(messages);

    let token=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
    if(!token){
      try{
        const oidc=await import('@vercel/oidc');
        token=await oidc.getVercelOidcToken();
      }catch(e){console.error('GROUND_OIDC_ERROR',e&&e.message||e)}
    }

    if(token){
      const r=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body:JSON.stringify({
          model:'openai/gpt-5.6-sol',
          messages:[{role:'system',content:SYSTEM+(risk?'\nHIGH-RISK SIGNAL DETECTED: prioritize immediate safety and real-world support.':'')},...messages],
          max_tokens:260,
          temperature:0.55
        })
      });
      const data=await r.json();
      if(r.ok){
        const text=data&&data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;
        if(text){res.setHeader('Cache-Control','no-store');res.status(200).json({text:String(text).trim(),highRisk:risk,model:true});return;}
      }
      console.error('GROUND_GATEWAY_ERROR',r.status,JSON.stringify(data).slice(0,500));
    }

    res.setHeader('Cache-Control','no-store');
    res.status(200).json({text:fallback(messages,risk),highRisk:risk,fallback:true});
  }catch(e){
    console.error('GROUND_CHAT_ERROR',e&&e.stack||e);
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({text:fallback(messages,false),fallback:true});
  }
};
