export interface UnionPano { eje:number; solape:number; tubo?:number }
export interface TramoPano { desde:number; hasta:number; unionInferior?:number; unionSuperior?:number }
export interface RepartoPanos { tramos:TramoPano[]; uniones:UnionPano[]; error?:string }
/** Regla común: primero una entrada viable; si el perfil lo permite, unión normal de 2 cm. */
export function repartirPanos({desde,hasta,frente,rollo,tubos=[],indicados,normal=false}:{
  desde:number;hasta:number;frente:number;rollo:number;tubos?:UnionPano[];indicados?:UnionPano[];normal?:boolean;
}):RepartoPanos {
  const tramos:TramoPano[]=[],uniones:UnionPano[]=[];
  let inicio=desde;
  const error=(texto:string):RepartoPanos=>({tramos:[{desde,hasta}],uniones:[],error:texto});
  function unir(u:UnionPano):boolean {
    if(!Number.isFinite(u.eje)||!Number.isFinite(u.solape)||u.solape<=0||u.eje-u.solape/2<=inicio||u.eje+u.solape/2>=hasta) return false;
    tramos.push({desde:inicio,hasta:u.eje+u.solape/2,unionInferior:uniones.length?uniones.length-1:undefined,unionSuperior:uniones.length});
    uniones.push(u);inicio=u.eje-u.solape/2;return true;
  }
  if(indicados) {
    for(const u of indicados) if(!unir(u)) return error('Los empates deben estar ordenados dentro del paño y llevar solape positivo.');
  } else if(rollo>0 && frente>rollo) {
    while(hasta-inicio>rollo+0.001) {
      const candidatos=tubos.filter(t=>t.eje-t.solape/2>inicio && t.eje+t.solape/2-inicio<=rollo && t.eje+t.solape/2<hasta).sort((a,b)=>a.eje-b.eje);
      const candidato=candidatos.at(-1)??(normal&&rollo>2?{eje:inicio+rollo-1,solape:2}:undefined);
      if(!candidato||!unir(candidato)||uniones.length>100) return error('No hay una entrada de tubo que permita repartir el paño en este rollo.');
    }
  }
  tramos.push({desde:inicio,hasta,unionInferior:uniones.length?uniones.length-1:undefined});
  return {tramos,uniones};
}
