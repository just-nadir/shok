import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const router = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/avatars'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Faqat JPEG, PNG yoki WebP rasm yuklanadi'));
    }
  },
});

// POST /api/upload/avatar
router.post('/avatar', upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'Fayl yuklanmadi', code: 'NO_FILE' });
    return;
  }
  const url = `/uploads/avatars/${req.file.filename}`;
  res.status(200).json({ url });
});

export default router;
