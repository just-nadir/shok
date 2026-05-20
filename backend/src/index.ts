import 'dotenv/config';
import express from 'express';
import path from 'path';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pool from './db/pool';
import authRouter from './routes/auth';
import ratingsRouter from './routes/ratings';
import driversRouter from './routes/drivers';
import adminRouter from './routes/admin';
import driverMeRouter from './routes/driverMe';
import uploadRouter from './routes/upload';
import complaintsRouter from './routes/complaints';

const app = express();
const PORT = process.env.PORT || 3000;

const PgSession = connectPgSimple(session);

app.use(express.json());

// Static — yuklangan rasmlar
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(
  session({
    store: new PgSession({ pool, tableName: 'session' }),
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 kun
    },
  })
);

app.use('/api/auth', authRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/admin', adminRouter);
app.use('/api/driver/me', driverMeRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/complaints', complaintsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend server ishga tushdi: http://localhost:${PORT}`);
});

export default app;
