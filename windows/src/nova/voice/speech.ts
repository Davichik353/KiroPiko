import { State } from "../../core/state";
import { showNotice } from "../preview";

let ticket = 0;

/** Read aloud only after a click, using an explicitly local OS voice. */
export const Speech = {
  stop() {
    ++ticket;
    if (typeof window.speechSynthesis !== "undefined") window.speechSynthesis.cancel();
    State.novaSpeaking = false;
    State.notify();
  },
  speak(text: string) {
    this.stop();
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") throw new Error("Озвучивание не поддерживается этим окружением.");
    const voices = synth.getVoices().filter(voice => voice.localService);
    const russian = /[а-яё]/i.test(text);
    const voice = voices.find(item => item.lang.startsWith(russian ? "ru" : "en"));
    if (!voice) throw new Error("Нет локального голоса для языка ответа. Установите соответствующий голосовой пакет Windows и попробуйте снова.");
    const utterance = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, " Блок кода. ").replace(/[*#`]/g, ""));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    const current = ticket;
    const finish = () => { if (current === ticket) { State.novaSpeaking = false; State.notify(); } };
    utterance.onstart = () => { if (current === ticket) { State.novaSpeaking = true; State.notify(); } };
    utterance.onend = finish;
    utterance.onerror = (event) => {
      if (current !== ticket) return;
      finish();
      showNotice(`Не удалось озвучить ответ: ${event.error}`);
    };
    synth.speak(utterance);
  },
};
