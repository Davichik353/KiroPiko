import { Bridge } from "../../core/bridge";
import { State } from "../../core/state";
import { Speech } from "./speech";

/** Cancellation invalidates the pending reply before stopping its native process. */
export class VoiceSession {
  private ticket = 0;
  active = false;
  async listen(): Promise<string | null> {
    const ticket = ++this.ticket;
    this.active = true;
    Speech.stop();
    State.novaListening = true;
    State.notify();
    try {
      const text = await Bridge.voiceListen();
      return ticket === this.ticket ? text : null;
    } catch (err) {
      if (ticket !== this.ticket) return null;
      throw err;
    } finally { if (ticket === this.ticket) { this.active = false; State.novaListening = false; State.notify(); } }
  }
  stop() {
    if (!this.active) return;
    ++this.ticket;
    this.active = false;
    State.novaListening = false;
    State.notify();
    void Bridge.voiceStop().catch(console.error);
  }
}
