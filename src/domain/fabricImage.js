export function normalizeFabricImage(input) {
  if (!input) return null;
  if (typeof input !== 'string' || input.length > 600000 || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(input)) {
    throw new Error('La imagen del planteamiento debe ser PNG o JPEG y ocupar menos de 450 KB.');
  }
  return input;
}
