"use client";
export function SpeechButton({text}:{text:string}){
  function speak(){if(!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ja-JP";u.rate=.82;window.speechSynthesis.speak(u)}
  return <button className="sound-button" onClick={speak} aria-label={`播放：${text}`}>♪</button>;
}
