# Jayhun Tech

Azərbaycan dilində IT müəllimi portfoliosu. Help Desk, sistem və şəbəkə inzibatçılığı kursları, interaktiv sillabuslar və SQLite bazasında saxlanan tələbə müraciətləri.

## İşə salmaq

Node.js **24 LTS** tövsiyə olunur (`.nvmrc`); minimum Node.js 22.13. SQLite üçün əlavə xidmət və ya ayrıca verilənlər bazası quraşdırmaq lazım deyil.

```sh
cd /workspace/ceyhunlms
npm ci --cache /workspace/.cache/npm
npm run dev
```

Vite 3000, API 3001 portunda işləyir. Vite `/api` sorğularını serverə ötürür. `GET /api/health` işlək verilənlər bazasını yoxlayır. Proseslərin dayandırılması üçün Ctrl+C.

```sh
npm run build
npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Sistem Chromium-u olmayan maşında əvvəl `npx playwright install chromium` işlədin, sonra `npm run test:e2e` çağırın. Brauzer testləri hazırlanmış production build-i 4173 portunda, ayrıca yaddaş bazası ilə işə salır. Testlər real müraciət bazasına yazmır.

## Production

```sh
npm ci
npm run build
NODE_ENV=production PORT=3001 node server/index.mjs
```

Server həm frontend-i, həm də API-ni təqdim edir. İctimai yerləşdirmədə HTTPS reverse proxy və qalıcı disk istifadə edin. SQLite bazası standart olaraq `.local/registrations.sqlite` faylındadır. `DATABASE_PATH` ilə başqa qalıcı yol seçmək olar. `.local/` qovluğu və məlumat bazası internetdən təqdim edilmir və Git-ə daxil edilmir. Tətbiq bir server instansiyası üçün nəzərdə tutulub; bir neçə instansiya üçün ortaq verilənlər bazasına keçid lazımdır.

API daxil olan IP-yə görə 10 dəqiqədə 10 sorğu limiti tətbiq edir. Reverse proxy quraşdırarkən Express `trust proxy` sazlamasını yalnız etibar etdiyiniz proxy sayına/ünvanına uyğun edin; təsadüfi `X-Forwarded-For` başlığına etibar etməyin. SQLite üçün Node xəbərdarlığı gözləniləndir; ayrıca SQLite paketi tələb olunmur.

## Müraciətlərə baxmaq

Qeydiyyat müəllimə avtomatik SMS və ya e-poçt göndərmir. Müraciətlər serverdə saxlanılır. Serverə giriş hüququ olan müəllim CSV ixracı ilə müraciətlərə baxa bilər:

```sh
umask 077
npm run --silent registrations:export > .local/registrations.csv
```

CSV faylını ictimai qovluğa qoymayın. CSV düsturu kimi işləyə bilən mətnlər ixrac zamanı qorunur. Yeni məlumat bazasının fayl icazələri `0600`, qovluğu `0700`-dır. Ehtiyat nüsxəni SQLite backup vasitəsi ilə və ya server dayandırıldıqdan sonra yaradın; çalışan WAL bazasının təkcə əsas faylını köçürmək kifayət etmir.

Məlumatların silinməsi/düzəldilməsi tələbləri müəllim tərəfindən serverdə icra olunur. İctimai admin paneli və tələbə məlumatlarını göstərən açıq API yoxdur. Silmə zamanı ehtiyat nüsxələri və ixrac fayllarını da nəzərə alın.

## Məzmunu dəyişmək

- `src/data.ts`: üç kurs, təklif edilən 8/12/10 həftəlik proqramlar, modullar, praktiki tapşırıqlar, FAQ. Dəqiq cədvəl və qiymətlər müəllim tərəfindən təsdiqlənməlidir; saytda qiymət və başlanma tarixi uydurulmayıb.
- `src/App.tsx`: “Jayhun Tech” adı, müəllim təqdimatı, istifadəçi tərəfindən təsdiqlənmiş `+994 51 301 95 25` nömrəsi, qeydiyyat forması və məxfilik mətni. Müəllim haqqında mətn ilkin redaktə olunan təqdimatdır; təcrübə, sertifikat və tələbə sayı iddiaları əlavə edilməyib.
- `src/styles.css`: mobil və masaüstü dizayn.
- `server/app.mjs`: validasiya, spam limiti, təkrar müraciət yoxlaması və bazaya yazma.

Şriftlər lokal paketlərdən yüklənir. Sayt xarici şəkil və ya font xidmətinə bağlı deyil. Sillabus seçilmiş kurs üçün UTF-8 TXT faylı kimi endirilir. Heç bir real müraciət test məqsədilə yaradılmır.

## GitHub Pages yayımı

GitHub Pages üçün ayrıca statik build mövcuddur. Asset yolları `/ceyhunlms/` prefiksindən istifadə edir; müəllim məlumatları, kurslar və sillabuslar eyni qalır.

```sh
npm run build:pages
CHROMIUM_PATH=/usr/bin/chromium npm run test:pages
```

Nəticə `dist-pages/` qovluğuna yazılır. `.github/workflows/pages.yml` hər `main` push-dan sonra build yaradıb GitHub Pages-ə yayımlayır. Repozitoriyanın **Settings → Pages → Build and deployment → Source** seçimində **GitHub Actions** seçilməlidir. İlk yayım bundan əvvəl uğursuz olarsa **Actions → Publish Jayhun Tech to GitHub Pages → Run workflow** ilə yenidən başladın.

Sayt ünvanı: `https://nurlansafarli.github.io/ceyhunlms/` (ilk uğurlu Pages yayımından sonra).

GitHub Pages Node.js/SQLite serverini işlətmir. Bu versiyada forma **WhatsApp mesajını hazırlayır**; tələbə keçidi açıb mesajı özü göndərir. Keçid `+994 51 301 95 25` nömrəsinə yönəlir. WhatsApp-da mesaj göndərilməyincə müraciət müəllimə çatmır; sayt uğurlu qeydiyyat iddiası göstərmir və məlumatları bazaya yazmır. WhatsApp istifadəsi üçün həmin nömrənin WhatsApp hesabı olmalıdır. Məxfilik mətni və FAQ bu rejimə uyğundur.

Normal `npm run build` / `npm run dev` əvvəlki server və SQLite qeydiyyat axınını saxlayır. WhatsApp və ya başqa xarici xidmətə avtomatik mesaj göndərilmir.
