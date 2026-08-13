import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkWorkflowDirectories,
  createReviewPackage,
  createWorkflowStore,
  defaultWorkflowSettings,
  markReviewApproved,
  markReviewFilesGenerated,
  isAbsolutePathTemplate,
  normalizeWorkflowSettings,
  resolveGeneratedReviewFile,
  resolveGeneratedReviewFiles,
  resolveDirectoryTemplate,
  rpsPlanteamientoFilename,
  workflowReadiness
} from './workflow.js';
import { buildOrderReviewPdf } from './domain/reviewPdf.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe('flujo de revisión y producción', () => {
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
