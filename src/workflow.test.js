import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkWorkflowDirectories,
  createReviewPackage,
  createWorkflowStore,
  defaultWorkflowSettings,
  directoryTemplateRoot,
  extractReviewPackageFromPdf,
  isPendingGeneration,
  markReviewApproved,
  markReviewFilesGenerated,
  isAbsolutePathTemplate,
  normalizeWorkflowSettings,
  resolveGeneratedReviewFile,
  resolveGeneratedReviewFiles,
  resolveDirectoryTemplate,
  rpsPlanteamientoFilename,
  waitForDirectories,
  workflowReadiness
} from './workflow.js';
import { buildOrderReviewPdf } from './domain/reviewPdf.js';
import { buildOrderPlanteamientoPdf } from './domain/planteamientoPdf.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe('flujo de revisión y producción', () => {
  it('puede reabrir desde la web el planteamiento definitivo guardado en la carpeta anual', async () => {
    const awning = { id: 'a', of: '0230001', model: 'BAMBALINA', units: 1, width: 300, projection: 100 };
    const order = { orderCode: 'AR2601234', awnings: [awning] };
    const calculation = {
      ofs: [{
        of: awning.of,
        awningId: awning.id,
        awningIndex: 0,
        calculation: { valid: true, fabricWidth: 300, fabricDrop: 100, fabricMl: 3, fabricPanels: 1 },
        despiece: { rows: [], anchoring: null }
      }]
    };
    const review = { kind: 'toldos-testar-review', orderCode: order.orderCode, status: 'PRODUCED', order, production: { files: [] } };
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, review });

    await expect(extractReviewPackageFromPdf(pdf)).resolves.toEqual(review);
  });

  it('resuelve el año del pedido en las tres rutas configurables', () => {
    const template = path.join(os.tmpdir(), 'Pedidos', '{YYYY}', 'TOLDOS');
    expect(resolveDirectoryTemplate(template, 'AR2601234')).toBe(path.join(os.tmpdir(), 'Pedidos', '2026', 'TOLDOS'));
  });

  it('resuelve un archivo generado desde la carpeta configurada y no desde la ruta persistida', () => {
    const planteamientosDirectory = path.join(os.tmpdir(), 'Planteamientos', '{YYYY}');
    const review = {
      status: 'PRODUCED',
      orderCode: 'AR2601234',
      production: { files: [{ type: 'pdf', filename: 'AR2601234-1.pdf', savedPath: 'C:\\ruta-antigua\\archivo.pdf' }] }
    };

    expect(resolveGeneratedReviewFile(review, { planteamientosDirectory }, 0)).toMatchObject({
      filename: 'AR2601234-1.pdf',
      savedPath: path.join(os.tmpdir(), 'Planteamientos', '2026', 'AR2601234-1.pdf')
    });
  });

  it('rechaza nombres que intentan salir de la carpeta de archivos generados', () => {
    const review = {
      status: 'PRODUCED',
      orderCode: 'AR2601234',
      production: { files: [{ type: 'pdf', filename: '..\\secreto.pdf', savedPath: '' }] }
    };

    expect(() => resolveGeneratedReviewFile(review, { planteamientosDirectory: os.tmpdir() }, 0)).toThrow('no es válido');
  });

  it('busca las reservas importadas dentro de procesados', () => {
    const review = {
      status: 'PRODUCED', orderCode: 'AR2601234',
      production: { files: [{ type: 'rps', filename: '0230001.xls', savedPath: '' }] }
    };
    const root = path.join(os.tmpdir(), 'Subida');
    const candidates = resolveGeneratedReviewFiles(review, { rpsUploadDirectory: root }, 0);
    expect(candidates.map((file) => file.savedPath)).toEqual([
      path.join(root, '0230001.xls'),
      path.join(root, 'procesados', '0230001.xls')
    ]);
  });

  it('convierte el nombre compacto al formato del histórico de planteamientos RPS', () => {
    expect(rpsPlanteamientoFilename('AR2604014', 'AR2604014-1.pdf')).toBe('AR.26.04014-1.pdf');
    const review = {
      status: 'PRODUCED', orderCode: 'AR2604014',
      production: { files: [{ type: 'pdf', filename: 'AR2604014-1.pdf', savedPath: '' }] }
    };
    const archive = path.join(os.tmpdir(), 'RPS', '{YYYY}');
    const candidates = resolveGeneratedReviewFiles(review, {
      planteamientosDirectory: path.join(os.tmpdir(), 'Entrada'),
      rpsPlanteamientosDirectory: archive
    }, 0);
    expect(candidates[1].savedPath).toBe(path.join(os.tmpdir(), 'RPS', '2026', 'AR.26.04014-1.pdf'));
  });

  it('corrige una carpeta cuyo año se escribió entre llaves', () => {
    const settings = normalizeWorkflowSettings({ reviewDirectory: path.join(os.tmpdir(), 'Pedidos', '{2026}', 'TOLDOS') });
    expect(settings.reviewDirectory).toBe(path.join(os.tmpdir(), 'Pedidos', '2026', 'TOLDOS'));
  });

  it('solo declara producción lista con rutas completas y activación explícita', () => {
    const settings = normalizeWorkflowSettings({
      productionEnabled: true,
      reviewDirectory: path.join(os.tmpdir(), 'Pedidos', '{YYYY}', 'TOLDOS'),
      planteamientosDirectory: path.join(os.tmpdir(), 'Planteamientos'),
      rpsUploadDirectory: path.join(os.tmpdir(), 'RPS')
    });
    expect(workflowReadiness(settings)).toEqual({ reviewReady: true, productionReady: true, missing: [] });
    expect(workflowReadiness({ ...settings, productionEnabled: false }).productionReady).toBe(false);
  });

  it('comprueba que las tres carpetas existen, permiten escribir y no deja archivos de prueba', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-directory-check-'));
    temporaryDirectories.push(root);
    const reviewDirectory = path.join(root, 'Pedidos', '2026', 'TOLDOS');
    const planteamientosDirectory = path.join(root, 'Planteamientos');
    const rpsUploadDirectory = path.join(root, 'RPS');
    await Promise.all([reviewDirectory, planteamientosDirectory, rpsUploadDirectory].map((directory) => fs.mkdir(directory, { recursive: true })));

    const result = await checkWorkflowDirectories({
      productionEnabled: true,
      reviewDirectory: path.join(root, 'Pedidos', '{YYYY}', 'TOLDOS'),
      planteamientosDirectory,
      rpsUploadDirectory
    }, { year: 2026 });

    expect(result.ok).toBe(true);
    expect(result.directories.every((directory) => directory.ok)).toBe(true);
    await expect(fs.readdir(reviewDirectory)).resolves.toEqual([]);
    await expect(fs.readdir(planteamientosDirectory)).resolves.toEqual([]);
    await expect(fs.readdir(rpsUploadDirectory)).resolves.toEqual([]);
  });

  it('indica qué carpeta no existe sin ocultar las que sí están disponibles', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-directory-check-'));
    temporaryDirectories.push(root);
    const available = path.join(root, 'Disponible');
    await fs.mkdir(available, { recursive: true });

    const result = await checkWorkflowDirectories({
      productionEnabled: true,
      reviewDirectory: available,
      planteamientosDirectory: path.join(root, 'No-existe'),
      rpsUploadDirectory: available
    }, { year: 2026 });

    expect(result.ok).toBe(false);
    expect(result.directories.map(({ label, ok }) => ({ label, ok }))).toEqual([
      { label: 'Pedidos para revisión', ok: true },
      { label: 'Planteamientos generados', ok: false },
      { label: 'Subida de material', ok: true }
    ]);
    expect(result.directories[1].error).toContain('no existe');
  });

  it('espera a una carpeta de red dormida: el primer acceso falla y el siguiente ya llega', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-carpeta-dormida-'));
    temporaryDirectories.push(root);
    const dormida = path.join(root, 'Dormida');
    const waits = [];
    // La carpeta «despierta» durante la primera espera, como un montaje de red que se reconecta.
    const wait = async (ms) => { waits.push(ms); await fs.mkdir(dormida, { recursive: true }); };

    await expect(waitForDirectories([root, dormida, dormida, ''], { delaysMs: [10, 20], wait })).resolves.toEqual([]);
    expect(waits).toEqual([10]);
  });

  it('dice qué carpetas siguen sin llegar después de todas las esperas', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-carpeta-dormida-'));
    temporaryDirectories.push(root);
    const missing = path.join(root, 'No-existe');
    const waits = [];

    await expect(waitForDirectories([root, missing], { delaysMs: [10, 20], wait: async (ms) => { waits.push(ms); } }))
      .resolves.toEqual([missing]);
    expect(waits).toEqual([10, 20]);
  });

  it('la raíz de una carpeta con {YYYY} es lo que hay antes del año', () => {
    expect(directoryTemplateRoot(path.join('/mnt', 'pedidos', '{YYYY}', 'TOLDOS'))).toBe(path.join('/mnt', 'pedidos'));
    expect(directoryTemplateRoot(path.join('/mnt', 'rps', 'subida'))).toBe(path.join('/mnt', 'rps', 'subida'));
    expect(directoryTemplateRoot('')).toBe('');
  });

  it('guarda las dos carpetas de remolques y las comprueba solo si están puestas', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-directory-check-'));
    temporaryDirectories.push(root);
    const available = path.join(root, 'Disponible');
    await fs.mkdir(path.join(available, '2026'), { recursive: true });
    const settings = normalizeWorkflowSettings({
      productionEnabled: true,
      reviewDirectory: available,
      planteamientosDirectory: available,
      rpsUploadDirectory: available,
      remolquesPlanteamientosDirectory: available,
      remolquesOficinaTecnicaDirectory: path.join(available, '{YYYY}')
    });
    expect(settings.remolquesOficinaTecnicaDirectory).toBe(path.join(available, '{YYYY}'));
    expect(() => normalizeWorkflowSettings({ remolquesOficinaTecnicaDirectory: available }))
      .toThrow('La carpeta de oficina técnica de remolques debe llevar {YYYY}.');
    expect(() => normalizeWorkflowSettings({ remolquesPlanteamientosDirectory: 'relativa' }))
      .toThrow('La carpeta de planteamientos de remolques debe ser una ruta absoluta válida en el sistema del servidor.');
    const result = await checkWorkflowDirectories(settings, { year: 2026 });
    expect(result.directories.map(({ label, ok }) => ({ label, ok }))).toEqual([
      { label: 'Pedidos para revisión', ok: true },
      { label: 'Planteamientos generados', ok: true },
      { label: 'Subida de material', ok: true },
      { label: 'Remolques · planteamientos', ok: true },
      { label: 'Remolques · oficina técnica', ok: true }
    ]);
    // Las de remolques no cuentan para «Generar archivos» de toldos.
    expect(workflowReadiness({ ...settings, remolquesPlanteamientosDirectory: '' }).productionReady).toBe(true);
    expect(defaultWorkflowSettings({ remolquesPlanteamientosDirectory: '/mnt/r/plan' }).remolquesPlanteamientosDirectory).toBe('/mnt/r/plan');
  });

  it('guarda la carpeta interna de remolques: absoluta, sin {YYYY}, y la comprueba si está puesta', async () => {
    // Nada fuera de tmp/ del repositorio.
    await fs.mkdir(path.join(process.cwd(), 'tmp'), { recursive: true });
    const root = await fs.mkdtemp(path.join(process.cwd(), 'tmp', 'workflow-remolques-'));
    temporaryDirectories.push(root);
    const interna = path.join(root, 'remolques-pedidos');
    await fs.mkdir(interna);
    const settings = normalizeWorkflowSettings({ remolquesRevisionDirectory: `${interna}${path.sep}` });
    expect(settings.remolquesRevisionDirectory).toBe(interna);
    expect(() => normalizeWorkflowSettings({ remolquesRevisionDirectory: 'relativa' }))
      .toThrow('La carpeta interna de remolques debe ser una ruta absoluta válida en el sistema del servidor.');
    expect(() => normalizeWorkflowSettings({ remolquesRevisionDirectory: path.join(interna, '{YYYY}') }))
      .toThrow('La carpeta interna de remolques no lleva {YYYY}: todos los pedidos van en la misma carpeta.');
    expect(defaultWorkflowSettings({ remolquesRevisionDirectory: '/var/lib/x' }).remolquesRevisionDirectory).toBe('/var/lib/x');
    expect(defaultWorkflowSettings({}).remolquesRevisionDirectory).toBe('');
    const result = await checkWorkflowDirectories(settings, { year: 2026 });
    expect(result.directories.find((item) => item.key === 'remolquesRevisionDirectory'))
      .toMatchObject({ label: 'Remolques · pedidos guardados', ok: true, path: interna });
    // No cuenta para «Generar archivos» de toldos.
    expect(workflowReadiness(settings).missing).not.toContain('Remolques · pedidos guardados');
  });

  it('guarda la carpeta de borradores: absoluta, sin {YYYY}, y la comprueba si está puesta', async () => {
    // Nada fuera de tmp/ del repositorio.
    await fs.mkdir(path.join(process.cwd(), 'tmp'), { recursive: true });
    const root = await fs.mkdtemp(path.join(process.cwd(), 'tmp', 'workflow-borradores-'));
    temporaryDirectories.push(root);
    const borradores = path.join(root, 'borradores');
    await fs.mkdir(borradores);
    const settings = normalizeWorkflowSettings({ draftsDirectory: `${borradores}${path.sep}` });
    expect(settings.draftsDirectory).toBe(borradores);
    expect(() => normalizeWorkflowSettings({ draftsDirectory: 'relativa' }))
      .toThrow('La carpeta de borradores debe ser una ruta absoluta válida en el sistema del servidor.');
    expect(() => normalizeWorkflowSettings({ draftsDirectory: path.join(borradores, '{YYYY}') }))
      .toThrow('La carpeta de borradores no lleva {YYYY}: todos los borradores van en la misma carpeta.');
    expect(defaultWorkflowSettings({ draftsDirectory: '/var/lib/x' }).draftsDirectory).toBe('/var/lib/x');
    expect(defaultWorkflowSettings({}).draftsDirectory).toBe('');
    expect(normalizeWorkflowSettings({}).draftsDirectory).toBe('');
    const result = await checkWorkflowDirectories(settings, { year: 2026 });
    expect(result.directories.find((item) => item.key === 'draftsDirectory'))
      .toMatchObject({ label: 'Borradores', ok: true, path: borradores });
    // No cuenta para «Generar archivos» de toldos.
    expect(workflowReadiness(settings).missing).not.toContain('Borradores');
    // Sin ponerla, no se comprueba.
    const sinBorradores = await checkWorkflowDirectories(normalizeWorkflowSettings({}), { year: 2026 });
    expect(sinBorradores.directories.some((item) => item.key === 'draftsDirectory')).toBe(false);
  });

  it('en Linux exige rutas POSIX montadas y rechaza rutas de Windows o UNC', () => {
    expect(isAbsolutePathTemplate('/mnt/toldos/{YYYY}/TOLDOS', 'linux')).toBe(true);
    expect(isAbsolutePathTemplate('C:\\Pedidos\\{YYYY}', 'linux')).toBe(false);
    expect(isAbsolutePathTemplate('\\\\servidor\\Pedidos\\{YYYY}', 'linux')).toBe(false);
    expect(isAbsolutePathTemplate('//servidor/Pedidos/{YYYY}', 'linux')).toBe(false);
    expect(isAbsolutePathTemplate('\\\\servidor\\Pedidos\\{YYYY}', 'win32')).toBe(true);
  });

  it('al actualizar un pedido vuelve a revisión y conserva su fecha de creación', () => {
    const existing = { createdAt: '2026-08-01T10:00:00.000Z', status: 'PRODUCED' };
    const review = createReviewPackage({
      order: { orderCode: 'AR2601234', technician: 'Ana', awnings: [{ model: 'ARZUA PRO' }] },
      calculation: { ofs: [{ of: '260001' }], diagnostics: [] },
      existing,
      now: '2026-08-07T10:00:00.000Z'
    });
    expect(review.status).toBe('PENDING_REVIEW');
    expect(review.createdAt).toBe(existing.createdAt);
    expect(review.production).toBeNull();
  });

  it('guarda un único PEDIDO.pdf editable y lo lista sin duplicar el pedido completo', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-workflow-'));
    temporaryDirectories.push(root);
    const reviews = path.join(root, '{YYYY}', 'TOLDOS');
    const store = createWorkflowStore({
      settingsFile: path.join(root, 'settings.json'),
      defaults: defaultWorkflowSettings({ reviewDirectory: reviews })
    });
    await store.saveSettings({
      productionEnabled: false,
      reviewDirectory: reviews,
      planteamientosDirectory: '',
      rpsUploadDirectory: ''
    });
    const review = createReviewPackage({
      order: { orderCode: 'AR2601234', customer: 'Cliente', technician: 'Ana', awnings: [{ model: 'ARZUA PRO' }] },
      calculation: { ofs: [{ of: '260001' }], diagnostics: [] }
    });
    const pdf = await buildOrderReviewPdf({ order: review.order, calculation: { ofs: [], diagnostics: [] }, review });
    const savedPath = await store.saveReview(review, pdf);
    const listing = await store.listReviews(2026);
    const savedDirectory = path.join(root, '2026', 'TOLDOS');
    expect(savedPath).toBe(path.join(savedDirectory, 'AR2601234.pdf'));
    expect(await fs.readdir(savedDirectory)).toEqual(['AR2601234.pdf']);
    expect(listing).toHaveLength(1);
    expect(listing[0].orderCode).toBe('AR2601234');
    expect(listing[0]).not.toHaveProperty('order');
    expect((await store.getReview('AR2601234')).order.customer).toBe('Cliente');

    const approved = markReviewApproved(review, {
      reviewer: 'Ana',
      now: '2026-08-13T09:30:00.000Z'
    });
    const approvedPdf = await buildOrderReviewPdf({
      order: approved.order,
      calculation: { ofs: [], diagnostics: [] },
      review: approved
    });
    await store.saveReview(approved, approvedPdf);

    expect(await fs.readdir(savedDirectory)).toEqual(['AR2601234.pdf']);
    expect((await store.listReviews(2026))[0].status).toBe('APPROVED');
    expect((await store.getReview('AR2601234')).order).toEqual(review.order);
  });

  it('ignora sin mostrar error el PDF definitivo AR2601234-1.PDF de la misma carpeta', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-workflow-'));
    temporaryDirectories.push(root);
    const reviews = path.join(root, '{YYYY}', 'TOLDOS');
    const store = createWorkflowStore({
      settingsFile: path.join(root, 'settings.json'),
      defaults: defaultWorkflowSettings({ reviewDirectory: reviews })
    });
    await store.saveSettings({
      productionEnabled: false,
      reviewDirectory: reviews,
      planteamientosDirectory: reviews,
      rpsUploadDirectory: ''
    });
    const review = createReviewPackage({
      order: { orderCode: 'AR2601234', customer: 'Cliente', technician: 'Ana', awnings: [{ model: 'ARZUA PRO' }] },
      calculation: { ofs: [{ of: '260001' }], diagnostics: [] }
    });
    const editablePdf = await buildOrderReviewPdf({ order: review.order, calculation: { ofs: [], diagnostics: [] }, review });
    await store.saveReview(review, editablePdf);
    const finalPdf = await buildOrderReviewPdf({ order: review.order, calculation: { ofs: [], diagnostics: [] } });
    const savedDirectory = path.join(root, '2026', 'TOLDOS');
    await fs.writeFile(path.join(savedDirectory, 'AR2601234-1.PDF'), finalPdf);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const listing = await store.listReviews(2026);

    expect(listing.map((item) => item.orderCode)).toEqual(['AR2601234']);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('conserva quién aprobó y registra al autor que genera los archivos', () => {
    const updated = markReviewFilesGenerated({
      orderCode: 'AR2601234',
      reviewedBy: 'Luis',
      reviewedAt: '2026-08-07T11:30:00.000Z',
      reviewNote: 'OK'
    }, {
      generatedBy: 'Ana',
      files: [{ type: 'pdf', filename: 'AR2601234-1.pdf' }],
      now: '2026-08-07T12:00:00.000Z'
    });
    expect(updated.status).toBe('PRODUCED');
    expect(updated.reviewedBy).toBe('Luis');
    expect(updated.reviewedAt).toBe('2026-08-07T11:30:00.000Z');
    expect(updated.reviewNote).toBe('OK');
    expect(updated.production.createdBy).toBe('Ana');
    expect(updated.production.files[0].filename).toBe('AR2601234-1.pdf');
  });

  it('marca la revisión como aprobada sin generar producción ni alterar el pedido', () => {
    const order = { orderCode: 'AR2601234', customer: 'Cliente', awnings: [{ id: 'a', model: 'CORTINA' }] };
    const approved = markReviewApproved({ orderCode: 'AR2601234', order, production: null }, {
      reviewer: ' Adrián ',
      now: '2026-08-13T09:30:00.000Z'
    });

    expect(approved).toMatchObject({
      status: 'APPROVED',
      reviewedBy: 'Adrián',
      reviewedAt: '2026-08-13T09:30:00.000Z',
      updatedAt: '2026-08-13T09:30:00.000Z',
      reviewNote: '',
      production: null
    });
    expect(approved.order).toBe(order);
  });
});

describe('pendiente de generar', () => {
  it('cualquier pedido guardado y no generado se puede generar (aprobar lo lleva CoordinaOT)', () => {
    expect(isPendingGeneration('PENDING_REVIEW')).toBe(true);
    expect(isPendingGeneration('CHANGES_REQUESTED')).toBe(true);
    expect(isPendingGeneration('APPROVED')).toBe(true);
    expect(isPendingGeneration('PRODUCED')).toBe(false);
    expect(isPendingGeneration('')).toBe(false);
  });
});
