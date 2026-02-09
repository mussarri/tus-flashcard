# Flashcard Sistemi - Mobile App UX Akışı

## 🎯 Genel Mimari

Status-based sistemimiz için mobil UX, **3 ana ekran** etrafında şekillenmelidir:

```
Ana Ekran (Dashboard) → Seans Seçimi → Çalışma Ekranı
         ↓
   İstatistikler
```

---

## 📱 1. Ana Ekran (Dashboard)

### Üst Bölüm - Günlük Özet Kartları
```
┌─────────────────────────────────────┐
│  📚 Bugün                           │
│                                     │
│  🔴 İncelenmeli    15 kart         │
│  🟡 Öğreniliyor     8 kart         │
│  🟢 Yeni          42 kart          │
└─────────────────────────────────────┘
```

**Veri Kaynağı:** `GET /api/student/flashcards/overview`
- 🔴 İncelenmeli = `HARD + MEDIUM`
- 🟡 Öğreniliyor = `MEDIUM`
- 🟢 Yeni = `UNSEEN`

### Orta Bölüm - Ders Listesi
```
┌─────────────────────────────────────┐
│  Anatomi                         📊 │
│  🔴 15  🟡 8  🟢 42              → │
├─────────────────────────────────────┤
│  Fizyoloji                       📊 │
│  🔴 5   🟡 3  🟢 18              → │
├─────────────────────────────────────┤
│  Biyokimya                       📊 │
│  🔴 8   🟡 5  🟢 25              → │
└─────────────────────────────────────┘
```

**Tıklama:** Ders seçimi → Seans oluşturma ekranına geçiş

### Alt Bölüm - Hızlı Eylemler
```
┌───────────────┬───────────────────┐
│  🎯 Hızlı     │  📈 İstatistikler │
│  Başla        │                   │
└───────────────┴───────────────────┘
```

---

## 🎯 2. Seans Oluşturma Ekranı

### 2.1. Ders Seçimi (İlk Adım)
```
┌─────────────────────────────────────┐
│  ← Geri        Ders Seçin           │
├─────────────────────────────────────┤
│                                     │
│  ✓ Anatomi                          │
│    🔴 15  🟡 8  🟢 42               │
│                                     │
│  ☐ Fizyoloji                        │
│    🔴 5   🟡 3  🟢 18               │
│                                     │
│  ☐ Biyokimya                        │
│    🔴 8   🟡 5  🟢 25               │
│                                     │
├─────────────────────────────────────┤
│  [İleri >]                          │
└─────────────────────────────────────┘
```

### 2.2. Zorluk Seçimi (İkinci Adım) - KRİTİK!
```
┌─────────────────────────────────────┐
│  ← Geri    Anatomi - Çalışma Türü   │
├─────────────────────────────────────┤
│                                     │
│  Hangi kartları çalışmak istersin? │
│                                     │
│  ☐  🟢 Yeni Kartlar                │
│      42 kart mevcut                 │
│                                     │
│  ☐  🟡 Öğreniliyor                 │
│      8 kart mevcut                  │
│                                     │
│  ☐  🔴 Zorlanıyorum                │
│      15 kart mevcut                 │
│                                     │
│  ☐  🌟 Kolay (Tekrar için)         │
│      23 kart mevcut                 │
│                                     │
├─────────────────────────────────────┤
│  📚 Kart Sayısı:  [20]  ▲▼         │
│                                     │
│  ⚙️ Gelişmiş Seçenekler             │
│                                     │
│  [Seansı Başlat]                    │
└─────────────────────────────────────┘
```

**Önemli:** Çoklu seçim (multi-select) yapılabilmeli!

**Yaygın Kombinasyonlar (Quick Preset'ler):**
```
┌─────────────────────────────────────┐
│  Hızlı Seçenekler:                  │
│                                     │
│  [🎯 Sadece Yeni]     → UNSEEN     │
│  [🔥 Zorları Tekrar]  → HARD       │
│  [⚡ Karma]           → UNSEEN+HARD│
│  [📖 Özel Seç]        → Manuel     │
└─────────────────────────────────────┘
```

### 2.3. Gelişmiş Seçenekler (Opsiyonel)
```
┌─────────────────────────────────────┐
│  Gelişmiş Seçenekler                │
├─────────────────────────────────────┤
│                                     │
│  🏛️ Pattern Önceliği               │
│  ○ Normal (Karışık)                 │
│  ● Yapısal (Anatomi)                │
│    Temel yapı kartları önce gelir   │
│                                     │
│  🔀 Sıralama                        │
│  ● Karışık                          │
│  ○ Önce Zor                         │
│  ○ Önce Kolay                       │
│                                     │
└─────────────────────────────────────┘
```

**API Çağrısı:**
```javascript
POST /api/student/flashcards/session
{
  userId: "user-uuid",
  lessonId: "anatomy-uuid",
  statuses: ["UNSEEN", "HARD"],  // Seçilen statüler
  limit: 20,
  enablePatternWeighting: true   // Gelişmiş seçenek
}
```

---

## 📖 3. Çalışma Ekranı (Kart Görüntüleme)

### 3.1. Kart Ön Yüz (Soru)
```
┌─────────────────────────────────────┐
│  ← Çık    Anatomi     [15/20]  ⋮   │
├─────────────────────────────────────┤
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Progress bar (75%)                 │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │   [Görsel varsa buraya]       │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  Soru:                              │
│  M. sternocleidomastoideus'un       │
│  innervasyonu nedir?                │
│                                     │
│                                     │
│                                     │
│                                     │
│  [Cevabı Göster]                    │
│                                     │
└─────────────────────────────────────┘
```

**Üst Bar Özellikleri:**
- Progress: `15/20 kart`
- Menü (⋮): Oturumu duraklat, favorilere ekle

### 3.2. Kart Arka Yüz (Cevap + Feedback)
```
┌─────────────────────────────────────┐
│  ← Çık    Anatomi     [15/20]  ⭐  │
├─────────────────────────────────────┤
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Progress bar (75%)                 │
│                                     │
│  Soru:                              │
│  M. sternocleidomastoideus'un       │
│  innervasyonu nedir?                │
│                                     │
│  ────────────────────────────────   │
│                                     │
│  ✓ Cevap:                           │
│  N. accessorius (CN XI)             │
│                                     │
│  💡 Ek Bilgi:                       │
│  Spinal aksesuar sinir, motor...   │
│                                     │
├─────────────────────────────────────┤
│  Bu kartı ne kadar biliyorsun?      │
│                                     │
│  [🟢 Kolay]  [🟡 Orta]  [🔴 Zor]   │
│   EASY      MEDIUM      HARD       │
└─────────────────────────────────────┘
```

### 3.3. Feedback Butonları - KRİTİK TASARIM

**Önerilen Düzen (Geniş Dokunma Alanı):**
```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐   │
│  │  🟢 Kolay                    │   │
│  │  Ezberledim                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🟡 Orta                     │   │
│  │  Hatırlıyorum ama zorlandım  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🔴 Zor                      │   │
│  │  Bilmiyorum / Yanlış yaptım  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Alternatif: Kaydırma Jesti (Swipe)**
```
← Zor      Orta      Kolay →
🔴         🟡         🟢

Kullanıcı kartı sola/sağa kaydırarak işaretler
```

**API Çağrısı:**
```javascript
POST /api/student/flashcards/{cardId}/review
{
  userId: "user-uuid",
  response: "HARD"  // EASY | MEDIUM | HARD
}
```

### 3.4. Seans Tamamlama Ekranı
```
┌─────────────────────────────────────┐
│                                     │
│           🎉                        │
│     Tebrikler!                      │
│                                     │
│  20 kart çalıştın                   │
│                                     │
│  📊 Bugünkü Özet:                   │
│  🟢 Kolay:     8 kart (40%)         │
│  🟡 Orta:      7 kart (35%)         │
│  🔴 Zor:       5 kart (25%)         │
│                                     │
│  ⏱️ Süre: 12 dakika                │
│  🔥 Seri: 5 gün                     │
│                                     │
│  [Ana Ekrana Dön]                   │
│  [Yeni Seans Başlat]                │
│                                     │
└─────────────────────────────────────┘
```

---

## 📊 4. İstatistikler Ekranı

### 4.1. Üst Özet Kartları
```
┌─────────────────────────────────────┐
│  📊 İstatistikler                   │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┬──────────┬──────────┐│
│  │ 420      │ 156      │ 78%      ││
│  │ Toplam   │ Ezber    │ Doğruluk ││
│  └──────────┴──────────┴──────────┘│
│                                     │
│  🔥 Çalışma Serisi: 12 gün         │
│                                     │
└─────────────────────────────────────┘
```

### 4.2. Heatmap (Aktivite Takvimi)
```
┌─────────────────────────────────────┐
│  📅 Son 30 Gün                      │
├─────────────────────────────────────┤
│  Pts Sal Çar Per Cum Cts Paz       │
│  ▓▓▓ ░░░ ▓▓▓ ▓▓▓ ░░░ ░░░ ▓▓▓      │
│  ▓▓▓ ▓▓▓ ░░░ ▓▓▓ ▓▓▓ ░░░ ▓▓▓      │
│  ▓▓▓ ▓▓▓ ▓▓▓ ░░░ ▓▓▓ ▓▓▓ ▓▓▓      │
│                                     │
│  ░ 0  ▒ 1-10  ▓ 10+                │
└─────────────────────────────────────┘
```

**API:** `GET /api/student/flashcards/activity?days=30`

### 4.3. Ders Bazlı Mastery
```
┌─────────────────────────────────────┐
│  📚 Ders Başarı Oranları            │
├─────────────────────────────────────┤
│  Anatomi          ████████░░  85%   │
│  156 / 183 kart                     │
│                                     │
│  Fizyoloji        ██████░░░░  60%   │
│  75 / 125 kart                      │
│                                     │
│  Biyokimya        ███░░░░░░░  35%   │
│  42 / 120 kart                      │
└─────────────────────────────────────┘
```

**API:** `GET /api/student/flashcards/mastery`

---

## 🎨 5. UX Best Practices

### 5.1. Renk Kodlama Tutarlılığı
```
🟢 EASY    → Yeşil   → #4CAF50 (Başarı)
🟡 MEDIUM  → Sarı    → #FFC107 (Dikkat)
🔴 HARD    → Kırmızı → #F44336 (Zorluk)
🟣 UNSEEN  → Mor     → #9C27B0 (Yeni)
```

### 5.2. Micro-Interactions
- **Kart çevirme:** Flip animasyonu (300ms)
- **Feedback seçimi:** Ripple effect + vibration (haptic)
- **Progress bar:** Smooth animation
- **Streak artışı:** Konfeti animasyonu 🎉

### 5.3. Offline Support
```
┌─────────────────────────────────────┐
│  📡 Çevrimdışı Mod                  │
├─────────────────────────────────────┤
│  İnternet bağlantısı yok            │
│                                     │
│  ✓ Seans devam edebilir             │
│  ✓ Cevaplar kaydedilecek            │
│  ⚠️ Senkronizasyon bekleniyor       │
│                                     │
│  [Devam Et]                         │
└─────────────────────────────────────┘
```

**Strateji:**
- Seansı başlatırken 20 kartı önden yükle
- Cevapları local storage'da sakla
- Bağlantı gelince batch sync yap

### 5.4. Erişilebilirlik
- **Font boyutu:** Ayarlanabilir (A⁻ A A⁺)
- **Karanlık mod:** OLED-friendly true black
- **Sesli okuma:** TTS desteği
- **Büyük butonlar:** Min. 48x48dp touch target

---

## 🔄 6. Akış Senaryoları

### Senaryo 1: Yeni Kullanıcı (Onboarding)
```
1. Uygulama açılır
2. "Anatomi dersini başlat" prompt'u
3. Status açıklaması (UNSEEN/EASY/MEDIUM/HARD)
4. İlk 5 kart tutorial mode
5. Başarı ekranı + motivasyon
```

### Senaryo 2: Sabah Rutini
```
1. Bildirim: "15 kart incelenmeli! 🔥"
2. Dashboard açılır → Hızlı özet
3. "Hızlı Başlat" → Otomatik seans (HARD+MEDIUM)
4. 15 kartı çöz → Başarı ekranı
5. Streak +1 → Motivasyon
```

### Senaryo 3: Sınav Öncesi Yoğun Çalışma
```
1. Anatomi → Tüm statüler seç
2. 50 kart limiti
3. Pattern weighting aktif
4. 2 saat → İstatistikleri gör
5. Zayıf noktalar → Yeni seans
```

### Senaryo 4: Zorlu Kartları Tekrar
```
1. Dashboard → Anatomi
2. Sadece 🔴 HARD seç
3. 15 kartı çöz
4. Bazıları MEDIUM'a geçti → Başarı hissi
5. Motivasyon boost
```

---

## 🚀 7. Teknik Implementasyon Notları

### 7.1. State Management (React Native örneği)
```typescript
interface SessionState {
  sessionId: string;
  currentCardIndex: number;
  cards: FlashcardWithProgress[];
  selectedStatuses: Status[];
  stats: SessionStats;
}
```

### 7.2. API Call Flow
```
1. Dashboard açılır
   → GET /overview
   → Cache 5 dakika

2. Seans başlar
   → POST /session
   → Kartları fetch
   → Local state'e yükle

3. Her cevap
   → POST /:cardId/review
   → Optimistic update
   → Background sync

4. Seans biter
   → Analytics gönder
   → Cache invalidate
```

### 7.3. Performance Optimizations
- **Lazy loading:** Kartları 5'erli yükle
- **Image caching:** React Native Fast Image
- **Prefetch:** Sonraki kartın görselini önceden yükle
- **Debounce:** Review API çağrılarını 300ms debounce

---

## 📱 8. Ekran Akış Diyagramı

```
┌─────────────┐
│  Dashboard  │
│  (Ana Sayfa)│
└─────┬───────┘
      │
      ├──→ Hızlı Başlat → Çalışma Ekranı
      │
      ├──→ Ders Seç → Zorluk Seç → Çalışma Ekranı
      │
      └──→ İstatistikler

Çalışma Ekranı:
  Kart 1/20 → Cevabı Gör → Feedback (EASY/MEDIUM/HARD)
    ↓
  Kart 2/20 → ...
    ↓
  Kart 20/20 → Tamamlama Ekranı → Dashboard
```

---

## 🎯 9. Kritik UX Kararları

### Karar 1: 3 Buton mu, 4 Buton mu?
**✅ 3 Buton (EASY/MEDIUM/HARD)**
- Daha basit cognitive load
- Mobile'da daha az alan kaplar
- Backend'le uyumlu

### Karar 2: Swipe Gesture vs Button?
**✅ Hybrid Yaklaşım**
- Ana akış: Butonlar (tutarlı, keşfedilebilir)
- Power user: Swipe (hızlı, pro feature)
- Ayarlardan açılabilir

### Karar 3: Otomatik Seans vs Manuel Seçim?
**✅ İkisini de Sun**
- "Hızlı Başlat": Otomatik (HARD+MEDIUM)
- "Özel Seans": Manuel multi-select
- Yeni kullanıcı → Otomatik öner
- İleri kullanıcı → Manuel tercih eder

### Karar 4: Pattern Weighting Göster mi?
**✅ Gelişmiş Seçeneklerde Gizle**
- Anatomi öğrencileri için değerli
- Casual user'ı korkutmasın
- Tooltip ile açıkla

---

## ✨ Bonus: Gamification Elementleri

```
🏆 Başarılar:
- "İlk 100 Kart" 
- "7 Gün Seri"
- "Anatomi Ustası" (90% mastery)

📈 Streak Sistemi:
- Her gün çalış → Streak +1
- 7 gün → Rozet
- 30 gün → Premium badge

⚡ XP Sistemi:
- HARD → MEDIUM: +10 XP
- MEDIUM → EASY: +5 XP
- 20 kart tamamla: +50 XP bonus
```

---

## 📋 Implementation Checklist

### Phase 1: MVP (2 hafta)
- [ ] Dashboard screen with overview
- [ ] Session creation with status selection
- [ ] Study screen (card front/back)
- [ ] Feedback buttons (EASY/MEDIUM/HARD)
- [ ] Session completion screen
- [ ] Basic API integration

### Phase 2: Core Features (2 hafta)
- [ ] Multi-select status filtering
- [ ] Progress tracking
- [ ] Statistics screen
- [ ] Activity heatmap
- [ ] Mastery by lesson
- [ ] Offline support (basic)

### Phase 3: Polish (1 hafta)
- [ ] Animations and micro-interactions
- [ ] Pattern weighting option
- [ ] Quick presets
- [ ] Advanced settings
- [ ] Dark mode
- [ ] Accessibility improvements

### Phase 4: Gamification (1 hafta)
- [ ] Streak system
- [ ] Achievements
- [ ] XP system
- [ ] Badges and rewards
- [ ] Push notifications

---

## 🎨 Component Library Recommendations

### UI Framework
- **React Native Paper** (Material Design)
- **React Native Elements** (Cross-platform)
- **NativeBase** (Comprehensive)

### Animations
- **React Native Reanimated** (High performance)
- **Lottie** (JSON animations)

### Charts
- **Victory Native** (Charts for heatmap)
- **React Native Chart Kit** (Simple charts)

### State Management
- **Zustand** (Lightweight, recommended)
- **Redux Toolkit** (If complex)
- **React Query** (API state)

---

Bu UX akışı, status-based sistemin tüm özelliklerini kullanıcı dostu bir şekilde sunar. Multi-select, shuffle, pattern weighting gibi teknik özellikleri basit UI elementlerine dönüştürür. 

Öncelik sırası:
1. **Dashboard + Seans Oluşturma** (MVP)
2. **Çalışma Ekranı + Feedback** (Core)
3. **İstatistikler** (Retention)
4. **Gelişmiş özellikler** (Power users)
