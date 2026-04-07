import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import '../types/index';

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId || req.session.role !== 'admin') {
    res.status(401).json({ error: 'Admin huquqi talab qilinadi', code: 'UNAUTHORIZED' });
    return;
  }
  next();
}

// POST /api/complaints — mijoz shikoyat yuboradi (autentifikatsiya shart emas)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { driverQrCode, driverId: bodyDriverId, phone, message } = req.body as {
    driverQrCode?: string; driverId?: string; phone?: string; message?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: 'Shikoyat matni kerak', code: 'MISSING_MESSAGE' });
    return;
  }

  let driverId: string | null = null;
  if (bodyDriverId) {
    const r = await query<{ id: string }>('SELECT id FROM drivers WHERE id = $1 LIMIT 1', [bodyDriverId]);
    if (r.rows.length > 0) driverId = r.rows[0].id;
  } else if (driverQrCode) {
    const r = await query<{ id: string }>('SELECT id FROM drivers WHERE qr_code = $1 LIMIT 1', [driverQrCode]);
    if (r.rows.length > 0) driverId = r.rows[0].id;
  }

  await query(
    `INSERT INTO complaints (driver_id, phone, message) VALUES ($1, $2, $3)`,
    [driverId, phone ?? null, message.trim()]
  );

  res.status(201).json({ message: 'Shikoyatingiz qabul qilindi' });
});

// GET /api/complaints — admin barcha shikoyatlarni ko'radi
router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { status, from, to } = req.query as { status?: string; from?: string; to?: string };

  const conditions: string[] = [];
  const params: unknown[] = [];

  // deleted statusdagilarni hech qachon ko'rsatmaymiz
  conditions.push(`c.status != 'deleted'`);

  if (status && ['new', 'reviewed', 'resolved'].includes(status)) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`c.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    conditions.push(`c.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<{
    id: string;
    driver_id: string | null;
    full_name: string | null;
    car_number: string | null;
    phone: string | null;
    message: string;
    status: string;
    resolution: string | null;
    resolution_note: string | null;
    created_at: string;
  }>(
    `SELECT c.id, c.driver_id, d.full_name, d.car_number, c.phone, c.message, c.status, c.resolution, c.resolution_note, c.created_at
     FROM complaints c
     LEFT JOIN drivers d ON d.id = c.driver_id
     ${where}
     ORDER BY c.created_at DESC`,
    params
  );

  res.status(200).json({
    complaints: result.rows.map(r => ({
      id: r.id,
      driverId: r.driver_id,
      driverName: r.full_name,
      carNumber: r.car_number,
      phone: r.phone,
      message: r.message,
      status: r.status,
      resolution: r.resolution,
      resolutionNote: r.resolution_note,
      createdAt: r.created_at,
    })),
  });
});

// PATCH /api/complaints/:id/status — admin statusni o'zgartiradi
router.patch('/:id/status', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, resolution, resolutionNote } = req.body as { status?: string; resolution?: string; resolutionNote?: string };

  if (!status || !['new', 'reviewed', 'resolved'].includes(status)) {
    res.status(400).json({ error: "Status: 'new', 'reviewed' yoki 'resolved' bo'lishi kerak", code: 'INVALID_STATUS' });
    return;
  }

  // resolved bo'lsa resolution ham saqlanadi, aks holda faqat status yangilanadi
  let result;
  if (status === 'resolved') {
    result = await query<{ id: string }>(
      `UPDATE complaints SET status = $1, resolution = $2, resolution_note = $3 WHERE id = $4 RETURNING id`,
      [status, resolution ?? null, resolutionNote ?? null, id]
    );
  } else {
    result = await query<{ id: string }>(
      `UPDATE complaints SET status = $1 WHERE id = $2 RETURNING id`,
      [status, id]
    );
  }

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Shikoyat topilmadi', code: 'NOT_FOUND' });
    return;
  }

  res.status(200).json({ message: 'Status yangilandi' });
});

// DELETE /api/complaints/:id — admin o'chiradi (soft delete, sabab bilan)
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };

  if (!reason?.trim()) {
    res.status(400).json({ error: "O'chirish sababi kerak", code: 'MISSING_REASON' });
    return;
  }

  const result = await query<{ id: string }>(
    `UPDATE complaints SET status = 'deleted', deleted_at = NOW(), deleted_reason = $1 WHERE id = $2 AND status != 'deleted' RETURNING id`,
    [reason.trim(), id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Shikoyat topilmadi', code: 'NOT_FOUND' });
    return;
  }

  res.status(200).json({ message: "Shikoyat o'chirildi" });
});

// GET /api/complaints/deleted — o'chirilgan shikoyatlar arxivi
router.get('/deleted', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const result = await query<{
    id: string;
    driver_id: string | null;
    full_name: string | null;
    car_number: string | null;
    phone: string | null;
    message: string;
    deleted_reason: string;
    deleted_at: string;
    created_at: string;
  }>(
    `SELECT c.id, c.driver_id, d.full_name, d.car_number, c.phone, c.message,
            c.deleted_reason, c.deleted_at, c.created_at
     FROM complaints c
     LEFT JOIN drivers d ON d.id = c.driver_id
     WHERE c.status = 'deleted'
     ORDER BY c.deleted_at DESC`
  );

  res.status(200).json({
    complaints: result.rows.map(r => ({
      id: r.id,
      driverId: r.driver_id,
      driverName: r.full_name,
      carNumber: r.car_number,
      phone: r.phone,
      message: r.message,
      deletedReason: r.deleted_reason,
      deletedAt: r.deleted_at,
      createdAt: r.created_at,
    })),
  });
});

export default router;
