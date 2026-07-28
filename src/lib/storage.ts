export type UserSettings = {
  targetLevel:"N5"|"N4"|"N3"|"N2"|"N1"; dailyGrammar:number; dailyVocabulary:number;
  dailyMinutes:number; kanaSkipped:boolean; provider:"openai"|"anthropic"|"gemini"|"compatible";
  model:string; baseUrl:string; apiKey:string;
};
export const defaultSettings:UserSettings = {targetLevel:"N5",dailyGrammar:10,dailyVocabulary:50,dailyMinutes:30,kanaSkipped:false,provider:"openai",model:"",baseUrl:"",apiKey:""};
const KEY="hibi:user-settings";
export function loadSettings():UserSettings {
  if(typeof window==="undefined") return defaultSettings;
  try { const raw=localStorage.getItem(KEY); return raw?{...defaultSettings,...JSON.parse(raw)}:defaultSettings; } catch { return defaultSettings; }
}
export function saveSettings(settings:UserSettings){localStorage.setItem(KEY,JSON.stringify(settings))}
