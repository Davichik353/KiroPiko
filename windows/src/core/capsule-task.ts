export function capsuleTask<T extends {id:string;state:string;isIntegration?:boolean}>(tasks:readonly T[]):T|undefined {
  const rank=(s:string)=>s==="approval" || s==="question"?0:s==="error"?1:["working","thinking","searching"].includes(s)?2:s==="finished"?3:4;
  return tasks.filter(t=>!t.isIntegration && rank(t.state)<4).sort((a,b)=>rank(a.state)-rank(b.state))[0];
}
