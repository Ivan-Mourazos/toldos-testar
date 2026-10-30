// Geometría plana en mm. Sin medidas ni referencias de pedidos.
export const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,n)=>a.map(v=>v*n);
export const linea=(a,b,extra={})=>({tipo:'tramo',a,b,...extra});
export const arco=(c,r,inicio,barrido,extra={})=>({tipo:'arco',c,r,inicio,barrido,...extra});
export const circulo=(c,r,extra={})=>({tipo:'ollao',c,r,...extra});
export function puntosPrimitiva(p){
 if(p.tipo==='tramo'){const n=Math.max(2,Math.ceil(d(p.a,p.b)/10));return Array.from({length:n+1},(_,i)=>add(p.a,mul(sub(p.b,p.a),i/n)));}
 const n=Math.max(24,Math.ceil(Math.abs((p.barrido??2*Math.PI)*p.r)/5));return Array.from({length:n+1},(_,i)=>{const a=(p.inicio??0)+(p.barrido??2*Math.PI)*i/n;return [p.c[0]+p.r*Math.cos(a),p.c[1]+p.r*Math.sin(a)];});
}
const modulo=a=>(a%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
export function distanciaPrimitiva(q,p){
 if(p.tipo==='tramo'){const v=sub(p.b,p.a),l=d(p.a,p.b)**2,t=l?Math.max(0,Math.min(1,sub(q,p.a).reduce((s,x,i)=>s+x*v[i],0)/l)):0;return d(q,add(p.a,mul(v,t)));}
 const radial=Math.abs(d(q,p.c)-p.r);if(p.tipo==='ollao')return radial;
 const a=Math.atan2(q[1]-p.c[1],q[0]-p.c[0]),t=p.barrido>=0?modulo(a-p.inicio):modulo(p.inicio-a);
 if(t<=Math.abs(p.barrido)+1e-9)return radial;
 const pt=a=>[p.c[0]+p.r*Math.cos(a),p.c[1]+p.r*Math.sin(a)];return Math.min(d(q,pt(p.inicio)),d(q,pt(p.inicio+p.barrido)));
}
export function compararPrimitivas(a,b,tolerancia=1){
 const sentido=(xs,ys)=>{const filas=xs.map((x,i)=>{const candidatos=ys.map((y,j)=>({j,error:Math.max(...puntosPrimitiva(x).map(q=>distanciaPrimitiva(q,y)))})).sort((u,v)=>u.error-v.error);const mejor=candidatos[0]??{j:null,error:Infinity},y=ys[mejor.j];const parametros=x.tipo==='arco'&&y?{centroMm:d(x.c,y.c),radioMm:Math.abs(x.r-y.r),barridoGrados:Math.abs(Math.abs(x.barrido)-Math.abs(y.barrido))*180/Math.PI,longitudMm:Math.abs(x.r*Math.abs(x.barrido)-y.r*Math.abs(y.barrido))}:null;return {i,id:x.id,referencia:y?.id,error:mejor.error,parametros,cuadra:mejor.error<=tolerancia&&(!parametros||Math.max(parametros.centroMm,parametros.radioMm,parametros.longitudMm)<=tolerancia)};});return {filas,cuadran:filas.filter(f=>f.cuadra).length,total:xs.length,max:filas.length?Math.max(...filas.map(f=>f.error)):0};};
 const ida=sentido(a,b),vuelta=sentido(b,a);return {ida,vuelta,cuadra:a.length===b.length&&ida.cuadran===a.length&&vuelta.cuadran===b.length};
}
export function offsetPoligono(ps,margenes){
 const area=ps.reduce((s,p,i)=>s+p[0]*ps[(i+1)%ps.length][1]-p[1]*ps[(i+1)%ps.length][0],0),signo=Math.sign(area);
 const ls=ps.map((p,i)=>{const q=ps[(i+1)%ps.length],v=sub(q,p),n=mul([v[1],-v[0]],signo*margenes[i]/d(p,q));return [add(p,n),add(q,n)];});
 return ls.map(([c,e],i)=>{const [a,b]=ls[(i+ls.length-1)%ls.length],v=sub(b,a),w=sub(e,c),det=v[0]*w[1]-v[1]*w[0];if(Math.abs(det)<1e-10)return c;const t=((c[0]-a[0])*w[1]-(c[1]-a[1])*w[0])/det;return add(a,mul(v,t));});
}
export const poligono=(ps,extra={})=>ps.map((p,i)=>linea(p,ps[(i+1)%ps.length],extra));
export function transformarPrimitiva(p,T){
 if(p.tipo==='tramo')return {...p,a:T(p.a),b:T(p.b)};
 const c=T(p.c),u=T([p.c[0]+p.r,p.c[1]]),v=T([p.c[0],p.c[1]+p.r]),signo=Math.sign((u[0]-c[0])*(v[1]-c[1])-(u[1]-c[1])*(v[0]-c[0]));
 if(p.tipo==='ollao')return {...p,c,r:d(c,u)};
 const q=T([p.c[0]+p.r*Math.cos(p.inicio),p.c[1]+p.r*Math.sin(p.inicio)]);return {...p,c,r:d(c,u),inicio:Math.atan2(q[1]-c[1],q[0]-c[0]),barrido:p.barrido*signo};
}
export function contiene(q,ps){let dentro=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a[1]>q[1])!==(b[1]>q[1])&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])dentro=!dentro;}return dentro;}
