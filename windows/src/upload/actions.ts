/** Shared accessible hit targets for the Canvas file-choice screen. */
export const UPLOAD_BUTTONS = {
  ask: { x: 114, w: 168 }, mail: { x: 290, w: 174 }, cancel: { x: 472, w: 112 },
};
export interface UploadCanvasActions { ask(): void; mail(): void; cancel(): void }
export function createUploadButtons(doc: Pick<Document, "createElement">, actions: UploadCanvasActions, labels: Record<keyof UploadCanvasActions, string>): HTMLButtonElement[] {
  return (["ask", "mail", "cancel"] as const).map(action => {
    const button = doc.createElement("button");
    const box = UPLOAD_BUTTONS[action];
    button.className = "upload-hit";
    button.setAttribute("aria-label", labels[action]);
    Object.assign(button.style, { left: `${box.x}px`, top: "113px", width: `${box.w}px`, height: "26px" });
    button.addEventListener("click", actions[action]);
    return button;
  });
}
