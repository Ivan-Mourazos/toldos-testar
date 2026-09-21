// El casquillo punta que sale del almacén es el "con eje" del diámetro del tubo
// de enrollamiento: Ø70 con el P701 y Ø78 con el P801. CASPUNCE, el código que
// arrastraban el Excel y la web, no existe en RPS (STKArticle, 21/09/2026); el
// consumo real lo confirma en Arzúa (307 OF), Monoblock (40 de 40) y Xacobeo (23 de 25).
export function tipBushing(rollSystem) {
  return rollSystem === 'P801'
    ? { code: 'CASPUNCEJE78MM', description: 'CASQUILLO PUNTA CON EJE Ø78' }
    : { code: 'CASPUNCEJE70MM', description: 'CASQUILLO PUNTA CON EJE Ø70' };
}
