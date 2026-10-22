export function attachmentProblem(file:{name:string;size?:number},provider:string):string|null {
  const ext=file.name.split('.').pop()?.toLowerCase() ?? '';
  const image=['png','jpg','jpeg','webp','gif'].includes(ext);
  if(ext==='pdf' && provider!=='anthropic')return 'PDF сейчас можно прочитать через Anthropic API. Выберите его или приложите текст из документа.';
  if(image && ['ollama','lmstudio','custom'].includes(provider))return 'Этот локальный чат передаёт только текст. Выберите облачную модель с поддержкой изображений.';
  if(['doc','docx','xls','xlsx','ppt','pptx','zip','rar','7z','exe','mp4','mp3'].includes(ext))return 'Этот формат пока не читается в чате. Сохраните нужный фрагмент как TXT или PDF.';
  const text=['txt','md','markdown','csv','tsv','json','jsonl','log','ts','tsx','js','jsx','mjs','cjs','py','rs','go','java','c','cpp','h','hpp','cs','html','css','scss','less','xml','yaml','yml','toml','ini','sql','sh','ps1','bat','env','cfg','conf','rb','php','swift','kt','dart','vue','svelte','r','ipynb'];
  if(!image && ext!=='pdf' && !text.includes(ext) && !['readme','license','makefile','dockerfile'].includes(file.name.toLowerCase()))return 'Этот формат пока не читается в чате. Сохраните нужный фрагмент как TXT или PDF.';
  if(file.size!==undefined && file.size>(image?5_000_000:ext==='pdf'?25_000_000:200_000))return 'Файл слишком большой для этого чата. Приложите изображение до 5 МБ, PDF до 25 МБ или текст до 200 КБ.';
  return null;
}
