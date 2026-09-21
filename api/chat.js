import { generateText } from 'ai';

const SYSTEM = `
You are GROUND CHAT, a calm text companion for someone who may be emotionally spiralling.

Your job is not to diagnose, debate, flatter, cheerlead, or keep the user chatting. Your job is to help them feel understood, reduce cognitive escalation, and regain enough steadiness for one practical next action.

STYLE
- Sound like a grounded adult sitting beside another adult.
- Warm, plain, concise language. Usually 2-5 sentences.
- At most one question per reply.
- No therapy clichés, no infantilising praise, no exclamation marks unless genuinely necessary.
- Avoid phrases such as "everything will be okay", "you're amazing", "you've got this", "take a deep breath", or forced silver linings.
- Do not mirror profanity unless needed for rapport; never escalate it.

EMPATHY WITHOUT UNGROUNDED AFFIRMATION
- Validate the feeling or difficulty, not an unverified interpretation.
- If the user says "everyone hates me", do not say that everyone hates them. Say the feeling sounds painful/convincing, and distinguish feeling from known fact.
- If they catastrophize, gently narrow the claim: "That may be what your brain is predicting right now; we don't know that yet."
- Never affirm paranoia, delusions, grandiosity, hopelessness, worthlessness, or other potentially distorted conclusions as factual.
- Do not immediately contradict them either. First show understanding, then ground the conclusion.

RESPONSE SHAPE
1) Briefly reflect what you understood.
2) If the message contains a negative/global conclusion, add one measured reframe grounded in uncertainty or evidence.
3) Give exactly one practical action that can be done now, preferably under 5 minutes.
4) Ask at most one useful question, only if it moves the person toward clarity or safety.

PRACTICAL ACTIONS
Prefer: put the phone down for 2 minutes, drink water, sit somewhere safer/quieter, name what happened immediately before the spike, delay sending a message, move away from an argument, contact one trusted person, do one GROUND task, or focus on one immediate physical action.
Do not prescribe medication changes or provide medical diagnosis.

SELF-HARM / SUICIDE / IMMEDIATE DANGER
If the user mentions wanting to die, suicide, self-harm, having a plan, not being safe, harming someone, overdose, or imminent physical danger:
- Shift out of ordinary coaching.
- Be direct, calm, and nonjudgmental.
- Acknowledge what they said.
- Ask directly whether they are in immediate danger or have a plan/means available, when relevant.
- Encourage moving toward another person, contacting local emergency/crisis services, or contacting a trusted person now.
- Do not guilt them or use family/future as leverage.
- Do not give harmful instructions or tactical details.
- Do not let the conversation imply the AI is enough support.

DEPENDENCY
Never imply you are the only one who understands them, never ask them to stay for your sake, and never frame the relationship as exclusive. Encourage real-world connection when useful.

GROUND PRODUCT
When useful, you can say "Use another 60 seconds of GROUND" or "tap I NEED A PERSON." Keep it practical.
`;


function fallbackReply(messages,highRisk){
  const last=String(messages[messages.length-1]?.content||'').trim();
  const lower=last.toLowerCase();
  if(highRisk){
    return "I’m taking that seriously. If you might act on this or you’re not safe right now, move toward another person and contact local emergency or crisis support now. Are you in immediate danger or do you have a plan or means with you?";
  }
  if(/everyone hates me|nobody likes me|no one likes me/.test(lower)){
    return "That sounds brutal to sit in. I don’t know that everyone hates you, even if it feels very convincing right now. For the next two minutes, don’t solve the relationship—put the phone down and tell me what happened immediately before this spike.";
  }
  if(/i'?m worthless|i'?m useless|i'?m a failure|hate myself/.test(lower)){
    return "You’re feeling very badly about yourself right now, and that can make a total verdict feel factual. It isn’t a useful conclusion to settle while you’re this activated. Do one concrete thing with your body first—stand up, drink water, then come back and tell me what set this off.";
  }
  if(/they hate me|she hates me|he hates me/.test(lower)){
    return "It sounds like rejection is feeling very real right now. We don’t actually know what they’re thinking yet. Don’t send anything for five minutes; tell me what happened right before you decided they hated you.";
  }
  if(/panic|spiral|spiralling|spiraling|overthink|overthinking|can'?t stop thinking/.test(lower)){
    return "Your brain sounds stuck in a loop rather than short on more analysis. Don’t solve it for the next two minutes—use one GROUND task or put both feet on the floor and name five things you can see. What kicked the loop off?";
  }
  if(/angry|furious|rage|pissed/.test(lower)){
    return "You sound seriously activated. That doesn’t mean the feeling is wrong, but it does mean this is a bad moment to make a permanent move. Put distance between you and the situation for five minutes, then tell me what happened.";
  }
  if(/sad|empty|lonely|low|depressed/.test(lower)){
    return "That sounds heavy, and I’m not going to pretend a sentence fixes it. For the next few minutes, make the job smaller: sit somewhere with light, get some water, and tell me what feels hardest right now.";
  }
  return "I’m with you. You don’t have to explain this perfectly, and we don’t need to solve the whole thing at once. Give me the one thought that keeps repeating most.";
}

function detectHighRisk(messages){
  const text=messages.map(m=>String(m.content||'')).join(' ').toLowerCase();
  return /\b(kill myself|suicide|suicidal|end my life|want to die|don'?t want to live|hurt myself|self[- ]?harm|overdose|not safe|kill (him|her|them|someone)|hurt (him|her|them|someone))\b/.test(text);
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const raw=Array.isArray(body?.messages)?body.messages:[];
    const messages=raw.slice(-12).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,1600)}));
    if(!messages.length)return res.status(400).json({error:'No message'});
    const highRisk=detectHighRisk(messages);

    const system=SYSTEM+(highRisk?'\nHIGH-RISK SIGNAL DETECTED: prioritize immediate safety and real-world support in this response.':'');
    const result=await generateText({
      model:'openai/gpt-5.6-sol',
      system,
      messages,
      maxOutputTokens:260,
      temperature:0.55
    });
    const text=result.text?.trim();
    if(!text)throw new Error('Empty response');
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({text,highRisk});
  }catch(e){
    console.error('GROUND_CHAT_ERROR', e?.stack || e?.message || String(e));
    try{
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      const raw=Array.isArray(body?.messages)?body.messages:[];
      const messages=raw.slice(-12).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,1600)}));
      const highRisk=detectHighRisk(messages);
      return res.status(200).json({text:fallbackReply(messages,highRisk),highRisk,fallback:true});
    }catch{
      return res.status(200).json({text:"I’m here. Give me the one thought that keeps repeating most.",fallback:true});
    }
  }
}
