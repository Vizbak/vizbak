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
function fallback(messages,risk){
  const last=String(messages[messages.length-1]?.content||'').toLowerCase();
  if(risk)return "I’m taking that seriously. If you might act on this or you’re not safe right now, move toward another person and contact local emergency or crisis support now. Are you in immediate danger or do you have a plan or means with you?";
  if(/everyone hates me|nobody likes me|no one likes me/.test(last))return "That sounds brutal to sit in. I don’t know that everyone hates you, even if it feels very convincing right now. Don’t solve the relationship for two minutes—put the phone down, get some water, and tell me what happened immediately before this spike.";
  if(/worthless|useless|failure|hate myself/.test(last))return "You’re feeling very badly about yourself right now, and that can make a total verdict feel factual. It isn’t something you need to settle while you’re this activated. Stand up, get some water, then tell me what set this off.";
  if(/panic|spiral|overthink|can't stop thinking|cant stop thinking/.test(last))return "Your brain sounds stuck in a loop rather than short on more analysis. Don’t solve it for two minutes—use one GROUND task or put both feet on the floor and name five things you can see. What kicked the loop off?";
  return "I’m here. You don’t have to explain this perfectly, and we don’t need to solve the whole thing at once. Tell me the one thought that keeps repeating most.";
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
