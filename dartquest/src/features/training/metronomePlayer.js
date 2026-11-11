import {METRONOME_TONES,metronomePosition} from './metronomeModel.js'
// The sound is scheduled on the audio clock; UI timers only fill a short look-ahead.
export function createMetronomePlayer(sequence,{onPosition=()=>{},onDone=()=>{},onError=()=>{},AudioContext=globalThis.AudioContext??globalThis.webkitAudioContext}={}) {
 let context,interval,anchor=0,elapsed=0,playing=false,disposed=false,scheduled=0;const nodes=new Set()
 const clearSounds=()=>{for(const node of nodes){try{node.stop()}catch{/* already stopped */}}nodes.clear()}
 const sound=(toneId,at,volume=75)=>{const level=Math.max(0,Math.min(100,Number(volume)||0))/75;if(level===0)return;const tone=METRONOME_TONES.find(t=>t.id===toneId)??METRONOME_TONES[0];const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=tone.type;oscillator.frequency.value=tone.frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.16*level,at+.004);gain.gain.exponentialRampToValueAtTime(.0001,at+tone.length);oscillator.connect(gain);gain.connect(context.destination);nodes.add(oscillator);oscillator.onended=()=>{nodes.delete(oscillator);oscillator.disconnect();gain.disconnect()};oscillator.start(at);oscillator.stop(at+tone.length+.01)}
 const eventAt=index=>{const cycle=Math.floor(index/sequence.events.length);if(!sequence.loop&&cycle>0)return null;const firstAtBoundary=sequence.joinsAtLastTone&&cycle>0&&index%sequence.events.length===0;const event=sequence.events[index%sequence.events.length];return {...event,at:event.at+cycle*sequence.duration,silent:firstAtBoundary}}
 const tick=()=>{
  if(!playing)return
  if(context.state!=='running'){pause();onError('Tonwiedergabe unterbrochen. Tippe auf Fortsetzen.');return}
  elapsed=Math.max(0,context.currentTime-anchor);onPosition(metronomePosition(sequence,elapsed))
  if(!sequence.loop&&elapsed>=sequence.duration+(sequence.joinsAtLastTone?.25:0)){pause();onDone();return}
  // Skip overdue sounds after a suspended/background tab instead of firing a burst.
  let event=eventAt(scheduled)
  while(event&&event.at<elapsed-.12){scheduled++;event=eventAt(scheduled)}
  while(event&&event.at<=elapsed+.1){if(!event.silent)sound(event.tone,Math.max(context.currentTime,anchor+event.at),event.volume);scheduled++;event=eventAt(scheduled)}
 }
 function pause(){if(playing){elapsed=Math.max(0,context.currentTime-anchor);playing=false}clearInterval(interval);clearSounds()}
 return {
  async start(){if(disposed)return false;if(playing)return true;try{if(!AudioContext)throw Error();if(!context||context.state==='closed')context=new AudioContext();await context.resume();if(disposed)return false;if(context.state!=='running')throw Error();anchor=context.currentTime-elapsed;scheduled=0;while(eventAt(scheduled)&&eventAt(scheduled).at<elapsed-.001)scheduled++;playing=true;tick();interval=setInterval(tick,25);return true}catch{onError('Ton konnte nicht gestartet werden. Prüfe die Lautstärke und tippe erneut auf Starten.');return false}},
  pause,
  stop(){pause();elapsed=0;scheduled=0;onPosition(metronomePosition(sequence,0))},
  async preview(tone,volume=75){try{if(!AudioContext)return false;if(!context||context.state==='closed')context=new AudioContext();await context.resume();sound(tone,context.currentTime,volume);return true}catch{return false}},
  dispose(){disposed=true;pause();void context?.close().catch(()=>{})},
 }
}
