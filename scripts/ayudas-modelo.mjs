// Elegir un modelo en el selector de Parámetros (dos filas: grupo y modelo). Si el modelo no está
// en el grupo que se ve, se prueban los grupos hasta encontrarlo.
export async function irAModelo(page, nombre) {
  const nav = page.getByRole('navigation', { name: 'Modelos de parámetros' });
  const boton = () => nav.locator('[data-model]').filter({ has: page.getByText(nombre, { exact: true }) });
  if (!(await boton().count())) {
    for (const grupo of await nav.locator('[data-group]').all()) {
      await grupo.click();
      if (await boton().count()) break;
    }
  }
  await boton().first().click();
}
