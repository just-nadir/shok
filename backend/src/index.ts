import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pool from './db/pool';

import authRouter from './routes/auth';
import driversRouter from './routes/drivers';
import ratingsRouter from './routes/ratings';
import driverMeRouter from './routes/driverMe';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Session
const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({ pool, tableName: 'session' }),
    secret: process.env.SESSION_SECRET ?? 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 1 kun
    },
  })
);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/driver/me', driverMeRouter);
app.use('/api/driver', driversRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/admin', adminRouter);

app.listen(PORT, () => {
  console.log(`Backend ishga tushdi: http://localhost:${PORT}`);
});
