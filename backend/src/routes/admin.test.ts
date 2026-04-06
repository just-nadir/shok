import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { buildCsv } from './admin';

// ---------------------------------------------------------------------------
// CSV eksport format to'g'riligini tekshirish — Talab 7.5
// ---------------------------------------------------------------------------

describe('buildCsv – CSV format to\'g\'riligini tekshirish', () => {
  const sampleRow = {
    id: 'uuid-1',
    full_name: 'Ali Valiyev',
    car_number: '01A123BC',
    overall_rating: 5,
    cleanliness: 'good',
    politeness: 'average',
    driving_style: 'good',
    punctuality: 'bad',
    comment: null,
    created_at: '2025-01-15T10:00:00.000Z',
  };

  it('birinchi qator sarlavha bo\'lishi kerak', () => {
    const csv = buildCsv([]);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toBe(
      'ID,Haydovchi,Avtomobil,Umumiy reyting,Tozalik,Xushmuomalalik,Haydash uslubi,Vaqtida kelish,Izoh,Sana'
    );
  });

  it('bo\'sh massiv uchun faqat sarlavha qaytarishi kerak', () => {
    const csv = buildCsv([]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1);
  });

  it('bir qatorli ma\'lumot to\'g\'ri formatlanishi kerak', () => {
    const csv = buildCsv([sampleRow]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2);
    const dataLine = lines[1];
    expect(dataLine).toContain('uuid-1');
    expect(dataLine).toContain('Ali Valiyev');
    expect(dataLine).toContain('01A123BC');
    expect(dataLine).toContain('5');
    expect(dataLine).toContain('good');
  });

  it('null qiymatlar bo\'sh satr sifatida ko\'rsatilishi kerak', () => {
    const csv = buildCsv([sampleRow]);
    const dataLine = csv.split('\n')[1];
    // comment is null — should appear as empty between commas
    const cols = dataLine.split(',');
    // comment is at index 8 (0-based)
    expect(cols[8]).toBe('');
  });

  it('vergul o\'z ichiga olgan izoh qo\'shtirnoq ichida bo\'lishi kerak', () => {
    const rowWithComma = { ...sampleRow, comment: 'Yaxshi, lekin kech keldi' };
    const csv = buildCsv([rowWithComma]);
    expect(csv).toContain('"Yaxshi, lekin kech keldi"');
  });

  it('qo\'shtirnoq o\'z ichiga olgan izoh to\'g\'ri escape qilinishi kerak', () => {
    const rowWithQuote = { ...sampleRow, comment: 'U "yaxshi" haydovchi' };
    const csv = buildCsv([rowWithQuote]);
    expect(csv).toContain('"U ""yaxshi"" haydovchi"');
  });

  it('bir nechta qatorlar to\'g\'ri soni bilan qaytarilishi kerak', () => {
    const rows = [sampleRow, { ...sampleRow, id: 'uuid-2' }, { ...sampleRow, id: 'uuid-3' }];
    const csv = buildCsv(rows);
    const lines = csv.split('\n');
    // header + 3 data rows
    expect(lines.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// QR kod noyobligini tekshirish — Talab 1.1
// ---------------------------------------------------------------------------

describe('QR kod noyobligi', () => {
  /**
   * Simulates the QR code generation logic used in GET /api/admin/qr/:driverId.
   * Each call to crypto.randomBytes(32).toString('hex') must produce a unique token.
   */
  function generateQrCode(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  it('har bir generatsiya noyob token qaytarishi kerak', () => {
    const codes = new Set<string>();
    const COUNT = 1000;
    for (let i = 0; i < COUNT; i++) {
      codes.add(generateQrCode());
    }
    expect(codes.size).toBe(COUNT);
  });

  it('token uzunligi 64 belgi bo\'lishi kerak (32 bayt hex)', () => {
    const code = generateQrCode();
    expect(code.length).toBe(64);
  });

  it('token faqat hex belgilardan iborat bo\'lishi kerak', () => {
    const code = generateQrCode();
    expect(/^[0-9a-f]+$/.test(code)).toBe(true);
  });
});
