# Talablar Hujjati

## Kirish

"Shok Taksi" kompaniyasi uchun Progressive Web App (PWA) — mijozlar haydovchilarni baholash tizimi. Mijoz sayohat tugagandan so'ng QR kod orqali haydovchini aniqlab, 5 yulduzli umumiy reyting va 4 ta kategoriya bo'yicha baho qo'yadi, ixtiyoriy izoh qoldiradi. Haydovchilar o'z reytinglarini ko'radi, admin esa barcha statistikani boshqaradi.

---

## Lug'at

- **Ilova**: Shok Taksi haydovchi baholash PWA ilovasi
- **Mijoz**: Taksi xizmatidan foydalangan va baholash qoldiruvchi foydalanuvchi
- **Haydovchi**: Shok Taksi kompaniyasida ishlaydigan va baholanadigan shaxs
- **Admin**: Ilova va baholash ma'lumotlarini boshqaruvchi kompaniya xodimi
- **QR_Kod**: Har bir avtomobilga yopishtirilgan, haydovchiga bog'langan noyob QR kod
- **Baholash**: Mijoz tomonidan haydovchiga qo'yilgan umumiy va kategoriyaviy baho
- **Umumiy_Reyting**: 1 dan 5 gacha yulduz ko'rinishidagi asosiy baho
- **Kategoriya_Bahosi**: Tozalik, Xushmuomalalik, Haydash_Uslubi, Vaqtida_Kelish bo'yicha alohida baho
- **Izoh**: Mijoz tomonidan ixtiyoriy qoldirilgan matnli fikr
- **Haydovchi_Paneli**: Haydovchi o'z reytingini ko'radigan sahifa
- **Admin_Paneli**: Admin barcha baholashlarni ko'radigan va boshqaradigan sahifa

---

## Talablar

### Talab 1: QR Kod Orqali Haydovchini Aniqlash

**Foydalanuvchi hikoyasi:** Mijoz sifatida men QR kodni skanerlash orqali haydovchini aniqlamoqchiman, shunda to'g'ri haydovchiga baho qo'ya olaman.

#### Qabul qilish mezonlari

1. THE Ilova SHALL har bir haydovchi uchun noyob QR kod generatsiya qilish imkonini ta'minlashi kerak.
2. WHEN mijoz QR kodni skanerlasa, THE Ilova SHALL haydovchi ma'lumotlarini (ismi, avtomobil raqami) baholash sahifasida ko'rsatishi kerak.
3. WHEN noto'g'ri yoki eskirgan QR kod skanerlansa, THE Ilova SHALL "QR kod yaroqsiz yoki topilmadi" xato xabarini ko'rsatishi kerak.
4. WHEN QR kod skanerlash muvaffaqiyatli bo'lsa, THE Ilova SHALL mijozni baholash formasiga yo'naltirishi kerak.
5. IF kamera ruxsati berilmasa, THEN THE Ilova SHALL "Kamera ruxsatini bering" xabarini ko'rsatishi va ruxsat so'rashi kerak.

---

### Talab 2: Umumiy Yulduzli Reyting

**Foydalanuvchi hikoyasi:** Mijoz sifatida men haydovchiga 1 dan 5 gacha yulduz qo'ymoqchiman, shunda umumiy tajribamni ifodalay olaman.

#### Qabul qilish mezonlari

1. THE Ilova SHALL baholash formasida 5 ta interaktiv yulduz ko'rsatishi kerak.
2. WHEN mijoz yulduzni tanlasa, THE Ilova SHALL tanlangan yulduz va undan oldingilarini to'liq (sariq) ko'rsatishi kerak.
3. THE Ilova SHALL faqat 1, 2, 3, 4 yoki 5 butun son qiymatlarini qabul qilishi kerak.
4. WHEN mijoz baholashni yuborishga harakat qilsa va umumiy reyting tanlanmagan bo'lsa, THE Ilova SHALL "Umumiy bahoni tanlang" xato xabarini ko'rsatishi kerak.

---

### Talab 3: Kategoriyaviy Baholash

**Foydalanuvchi hikoyasi:** Mijoz sifatida men haydovchini alohida kategoriyalar bo'yicha baholamoqchiman, shunda aniqroq fikr bildira olaman.

#### Qabul qilish mezonlari

1. THE Ilova SHALL baholash formasida quyidagi 4 ta kategoriyani ko'rsatishi kerak: Tozalik, Xushmuomalalik, Haydash Uslubi, Vaqtida Kelish.
2. WHEN mijoz kategoriya bahosini tanlasa, THE Ilova SHALL tanlangan qiymatni vizual ravishda ajratib ko'rsatishi kerak.
3. THE Ilova SHALL har bir kategoriya uchun "Yaxshi", "O'rtacha", "Yomon" uchta variantni ko'rsatishi kerak.
4. WHERE kategoriya bahosi tanlanmagan bo'lsa, THE Ilova SHALL kategoriyani ixtiyoriy deb hisoblashi va yuborishga ruxsat berishi kerak.

---

### Talab 4: Ixtiyoriy Matnli Izoh

**Foydalanuvchi hikoyasi:** Mijoz sifatida men haydovchi haqida matnli izoh qoldirmoqchiman, shunda batafsil fikrimni bildira olaman.

#### Qabul qilish mezonlari

1. THE Ilova SHALL baholash formasida ixtiyoriy matn kiritish maydonini ko'rsatishi kerak.
2. THE Ilova SHALL izoh matnini maksimal 500 belgiga cheklashi kerak.
3. WHEN mijoz 500 belgidan oshsa, THE Ilova SHALL qo'shimcha belgilar kiritishni bloklashi va qolgan belgilar sonini ko'rsatishi kerak.
4. WHEN izoh bo'sh qoldirilsa, THE Ilova SHALL baholashni izohsiz qabul qilishi kerak.

---

### Talab 5: Baholashni Yuborish

**Foydalanuvchi hikoyasi:** Mijoz sifatida men baholashimni yuborib, tasdiqlash xabarini olmoqchiman, shunda baholashim qabul qilinganini bilaman.

#### Qabul qilish mezonlari

1. WHEN mijoz "Yuborish" tugmasini bosib, umumiy reyting tanlangan bo'lsa, THE Ilova SHALL baholashni serverga saqlashi kerak.
2. WHEN baholash muvaffaqiyatli saqlansa, THE Ilova SHALL "Baholingiz qabul qilindi. Rahmat!" xabarini ko'rsatishi kerak.
3. IF server bilan aloqa uzilsa, THEN THE Ilova SHALL baholashni qurilmada vaqtincha saqlashi va aloqa tiklanganda avtomatik yuborishi kerak.
4. WHEN baholash yuborilgandan so'ng, THE Ilova SHALL bir xil QR kod orqali qayta baholashni 24 soat davomida bloklashi kerak.
5. IF mijoz 24 soat ichida qayta baholashga urinsa, THEN THE Ilova SHALL "Siz bu haydovchini bugun allaqachon baholagansiz" xabarini ko'rsatishi kerak.

---

### Talab 6: Haydovchi Paneli

**Foydalanuvchi hikoyasi:** Haydovchi sifatida men o'z reytingimni va mijozlar izohlarini ko'rmoqchiman, shunda xizmat sifatimni yaxshilay olaman.

#### Qabul qilish mezonlari

1. THE Ilova SHALL haydovchiga o'z panelini ko'rish uchun autentifikatsiya (login/parol) talab qilishi kerak.
2. WHEN haydovchi tizimga kirsa, THE Ilova SHALL umumiy o'rtacha reytingni, jami baholashlar sonini va so'nggi 30 kunlik tendensiyani ko'rsatishi kerak.
3. THE Ilova SHALL haydovchiga har bir kategoriya (Tozalik, Xushmuomalalik, Haydash Uslubi, Vaqtida Kelish) bo'yicha o'rtacha bahoni ko'rsatishi kerak.
4. THE Ilova SHALL haydovchiga so'nggi 20 ta baholashni sanasi va izohi bilan ko'rsatishi kerak.
5. WHILE haydovchi paneliga kirish jarayonida, THE Ilova SHALL faqat o'sha haydovchiga tegishli ma'lumotlarni ko'rsatishi kerak.

---

### Talab 7: Admin Paneli

**Foydalanuvchi hikoyasi:** Admin sifatida men barcha haydovchilar bo'yicha baholash statistikasini ko'rmoqchiman, shunda kompaniya xizmat sifatini nazorat qila olaman.

#### Qabul qilish mezonlari

1. THE Ilova SHALL admin paneliga kirishni faqat admin roli bilan autentifikatsiya qilingan foydalanuvchilarga ruxsat berishi kerak.
2. THE Ilova SHALL admin uchun barcha haydovchilar ro'yxatini ularning o'rtacha reytingi bilan ko'rsatishi kerak.
3. WHEN admin haydovchini tanlasa, THE Ilova SHALL o'sha haydovchining barcha baholashlari, kategoriya ballari va izohlarini ko'rsatishi kerak.
4. THE Ilova SHALL adminga sana oralig'i bo'yicha baholashlarni filtrlash imkonini berishi kerak.
5. THE Ilova SHALL adminga barcha baholashlarni CSV formatida eksport qilish imkonini berishi kerak.
6. IF admin haydovchi hisobini bloklasa, THEN THE Ilova SHALL o'sha haydovchining QR kodi orqali yangi baholash qabul qilishni to'xtatishi kerak.

---

### Talab 8: PWA Talablari

**Foydalanuvchi hikoyasi:** Mijoz sifatida men ilovani mobil brauzerdan qulay ishlatmoqchiman va oflayn rejimda ham asosiy funksiyalar ishlashini xohlayman.

#### Qabul qilish mezonlari

1. THE Ilova SHALL mobil qurilmalarda (iOS va Android) brauzer orqali to'liq ishlashi kerak.
2. THE Ilova SHALL "Uy ekraniga qo'shish" funksiyasini qo'llab-quvvatlashi kerak (Web App Manifest).
3. THE Ilova SHALL Service Worker orqali asosiy sahifalarni keshlab, oflayn rejimda ham ko'rsatishi kerak.
4. WHEN ilova oflayn rejimda bo'lsa va mijoz baholash yuborishga urinsa, THE Ilova SHALL baholashni mahalliy xotirada saqlashi kerak.
5. THE Ilova SHALL barcha ekran o'lchamlarida (320px dan 1440px gacha) to'g'ri ko'rinishi kerak (responsive dizayn).
6. THE Ilova SHALL Lighthouse PWA audit bo'yicha kamida 90 ball olishi kerak.

---

### Talab 9: Xavfsizlik

**Foydalanuvchi hikoyasi:** Admin sifatida men tizim xavfsiz ekanligini va soxta baholashlar kiritilmasligini xohlayman.

#### Qabul qilish mezonlari

1. THE Ilova SHALL barcha API so'rovlarini HTTPS orqali yuborishi kerak.
2. THE Ilova SHALL haydovchi va admin parollarini bcrypt algoritmi bilan shifrlashi kerak.
3. WHEN foydalanuvchi noto'g'ri parol bilan 5 marta kirishga urinsa, THE Ilova SHALL hisobni 15 daqiqaga bloklashi kerak.
4. THE Ilova SHALL JWT tokenlarini 24 soatlik muddati bilan chiqarishi kerak.
5. IF JWT token muddati o'tsa, THEN THE Ilova SHALL foydalanuvchini qayta login sahifasiga yo'naltirishi kerak.
