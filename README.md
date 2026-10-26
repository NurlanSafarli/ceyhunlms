# Jayhun Tech

Azərbaycan dilində IT müəllimi portfoliosu və tədris idarəetməsi. Help Desk, sistem və şəbəkə inzibatçılığı kursları, sillabus, tələbə qeydiyyatı və qorunan admin paneli.

## Öz kompüterinizdə işə salmaq

**Node.js 24 LTS** quraşdırın. Windows PowerShell, macOS Terminal və Linux terminalında eyni əmrlər işləyir. Docker və ayrıca verilənlər bazası lazım deyil.

Repozitoriyanı kompüterinizə endirin (GitHub **Code → Download ZIP**, sonra arxivi açın) və layihə qovluğunda terminal açın. Git istifadə edirsinizsə:

```sh
git clone https://github.com/NurlanSafarli/ceyhunlms.git
cd ceyhunlms
```

İlk dəfə:

```sh
npm ci
npm run setup:local
npm run local
```

`setup:local` saytı hazırlayır, `.env` ayarlarını yaradır və **ilk admin istifadəçi adını/parolunu terminalda soruşur**. Parol ən azı 12 simvol olmalıdır; yazarkən ekranda görünmür. Standart parol yoxdur. Mövcud hesab, ayarlar və tələbə məlumatları təkrar quraşdırmada dəyişdirilmir.

Brauzerdə öz kompüterinizdə açın:

- **Sayt:** `http://127.0.0.1:3001/`
- **Admin panel:** `http://127.0.0.1:3001/admin`

Hər sonrakı istifadə üçün yalnız **`npm run local`** kifayətdir. Terminalı açıq saxlayın; dayandırmaq üçün **Ctrl+C** basın. Tətbiq yalnız həmin kompüterdən açılır. Lokal istifadədə bütün CRUD, qeydiyyat, qrup, vəsait, imtahan və nəticə funksiyaları işləyir. Qeydiyyat forması məlumatı yerli bazaya yazır; WhatsApp rejimindən istifadə etmir.

`3001` portu məşğuldursa `.env` faylında `PORT=3002` yazın və yenidən başladın. Terminal yeni ünvanları göstərəcək. Windows PowerShell `npm.ps1` faylını bloklayarsa əmrlərdə `npm` əvəzinə **`npm.cmd`** yazın; sistemin təhlükəsizlik siyasətini dəyişmək lazım deyil.

## Məlumatlar və ehtiyat nüsxə

Hamısı **`.local/registrations.sqlite`** bazasında saxlanır: admin hesabları, sayt məzmunu, kurslar/sillabuslar, tələbələr, qruplar, vəsait faylları, imtahanlar və nəticələr. Brauzeri və proqramı bağlamaq bu məlumatları silmir. **`.local` qovluğunu silməyin.** Git-ə şəxsi məlumatlar və `.env` daxil edilmir.

Ehtiyat nüsxə yaratmaq:

```sh
npm run db:backup
```

Fayl `.local/backups/` qovluğuna yazılır. Tətbiq işləyərkən də SQLite bütün təsdiqlənmiş yazıları vahid nüsxəyə daxil edir. Bu faylı başqa təhlükəsiz diskdə də saxlayın; tələbə məlumatları və admin hesabları olduğu üçün paylaşmayın. Çalışan SQLite bazasının təkcə əsas faylını əl ilə köçürmək əvəzinə bu əmrdən istifadə edin.

Bərpa: əvvəl proqramı dayandırın, aşağıdakı nümunədə fayl adını öz ehtiyat nüsxənizlə əvəz edin:

```sh
npm run db:restore -- .local/backups/your-backup.sqlite --to .local/restored.sqlite
```

Sonra `.env` faylında `DATABASE_PATH=.local/restored.sqlite` yazın və `npm run local` işlədin. **Mövcud faylın üzərinə yazılmır.** Hesab/parol saxlanır, əvvəlki giriş sessiyaları ləğv olunur. Dərs faylları da eyni nüsxədən bərpa edilir.

## Parolu dəyişmək və yeniləmək

```sh
npm run admin:reset
```

Mövcud adminin istifadəçi adını yazın; yeni parol gizli daxil edilir. Bu əməliyyat aktiv sessiyaları bitirir. Yeni əlavə admin hesabı üçün `npm run admin:create -- --prompt` istifadə edin.

Kod yenilənəndə əvvəl ehtiyat nüsxə yaradın və proqramı dayandırın. Git checkout-da:

```sh
git pull --ff-only
npm ci
npm run setup:local
npm run local
```

ZIP-dən istifadə edirsinizsə `.local` və `.env` fayllarını qoruyun, yeni kodu yerləşdirin, sonra son üç əmri işlədin. Quraşdırma bazanı silmir və mövcud admin parolunu əvəz etmir.

## Panel bölmələri

- **İcmal:** müraciətlər, aktiv qruplar və yaxınlaşan imtahanlar.
- **Müraciətlər:** əl ilə əlavə, redaktə/silmə, axtarış, status, daxili qeyd və CSV ixracı.
- **Kurslar və sillabus:** kurs CRUD, yayım/gizlətmə, sıralama, modullar və praktiki tapşırıqlar.
- **Dərs qrupları:** kurs, cədvəl, tutum, format, tələbələri əlavə etmək/çıxarmaq.
- **Tədris vəsaitləri:** qrup və ya ümumi kitabxana, link, mətn qeydi, fayl yükləmə/əvəzləmə/silmə (10 MB). Faylları yalnız admin endirir.
- **İmtahan təqvimi və nəticələr:** Bakı vaxtı ilə tarix/saat, qrup, bal, keçid həddi, geribildirim və iştirak etməmə.
- **Sayt məzmunu:** brend, əlaqə, başlıqlar, bio, tədris yanaşması və bölmələrin görünməsi.
- **Suallar və cavablar:** FAQ CRUD, yayım və sıralama.

Əlaqəli məlumatı olan qeydlər silinərkən qorunur. Köhnə baza avtomatik yenilənir; silinmiş məzmun növbəti startda geri qayıtmır. Avtomatik SMS/e-poçt göndərilmir. Tələbə portalı bu versiyaya daxil deyil.

Sosial linklər üçün **Sayt məzmunu → Sosial şəbəkələr** bölməsində WhatsApp, LinkedIn və Instagram ünvanlarını `https://` ilə daxil edib **Məzmunu yadda saxla** düyməsinə basın. Linklər saytın əlaqə və alt hissələrində görünür. İkonu gizlətmək üçün linki silib yadda saxlayın. WhatsApp əvvəlcədən müəllimin təsdiqlənmiş nömrəsinə qoşulub; digər profillər daxil edilənədək gizlidir. Lokal paneldəki dəyişikliklər lokal sayta aiddir; GitHub Pages üçün statik linklər `shared/default-content.json` faylında saxlanılır.

**Standart loqo:** Saytda daxili SVG monoqram istifadə olunur; əlavə fayl yükləmək lazım deyil. Simvol və brend yazısı tünd/açıq rejimə uyğunlaşır, nöqtə və şüar narıncı qalır.

**Saytın loqosu:** **Sayt məzmunu → Brend və əlaqə → Saytın loqosu** bölməsindən PNG, JPG və ya WebP yükləyin (maksimum 5 MB / 25 meqapiksel). Loqo dərhal saxlanır, saytın header və footer hissəsində kiçik ikonu əvəz edir (brend yazısı ilə eyni hündürlükdə). Brend yazısı və narıncı şüar saxlanılır. Loqonu dəyişmək və silmək mümkündür; silindikdə standart ikon yenidən göstərilir. Fayl SQLite bazasında və ehtiyat nüsxədə saxlanılır, müəllim qalereyasından ayrıdır. Lokal dəyişikliklər GitHub Pages-ə avtomatik ötürülmür.

**Müəllim qalereyası:** **Sayt məzmunu → Müəllim haqqında → Müəllimin şəkli** bölməsindən Bir və ya bir neçə JPG, PNG və ya WebP seçin (cəmi maksimum 8 şəkil, hər biri 5 MB / 25 meqapiksel). Əvvəlki şəkil saxlanılır, yenilər qalereyaya əlavə edilir. Şəkillər dərhal yayımlanır və ayrı-ayrılıqda silinə bilər. Saytda qalereyanı sürüşdürməklə, ox düymələri və klaviaturanın sağ/sol oxları ilə idarə etmək olur. Server şəkli ölçüləndirib WebP formatına çevirir və metadatanı silir. Şəkil SQLite bazasında saxlanılır və ehtiyat nüsxəyə daxildir.

**IT həllər:** **Sayt məzmunu → IT həllər** bölməsində başlığı, izahı və xidmətləri dəyişin. **IT həlli əlavə et** ilə yeni xidmət yaradın; ayrıca xidməti və ya bütün bölməni gizlədə, xidməti silə bilərsiniz. Sonda **Məzmunu yadda saxla** düyməsinə basın. Yayımlanmış xidmətlər varsa, header-də **IT həllər** keçidi görünür. İlkin mətnlər texniki dəstək, server və şəbəkə xidmətləri üçün redaktə edilə bilən şablonlardır.

**Animasiya seçimi:** IT həllər redaktorunda hər xidmətin **Animasiya növü** sahəsindən texniki dəstək, server, şəbəkə, bulud və ya təhlükəsizlik görünüşünü seçin. Cihazın “hərəkəti azalt” seçimi animasiyaları dayandırır.

**Dillər və görünüş:** Saytın header-ində AZ / ENG / RU seçimi və açıq/tünd rejim düyməsi var. Seçimlər həmin brauzerdə yadda saxlanır. Hazır interfeys, ilkin sayt məzmunu və sillabuslar tərcümə olunub. Tərcümələr `src/locales/en.json` və `src/locales/ru.json` fayllarında Azərbaycan dilindəki mətnə uyğun saxlanılır; admin panelində tamamilə yeni mətn yazıldıqda onun tərcüməsi də bu fayllara əlavə edilməlidir. Tərcüməsi olmayan mətn orijinal dildə göstərilir. Admin paneli Azərbaycan dilində qalır.

## Admin paneli serverə yerləşdirmək

Server aldıqda **eyni tətbiqi və lokal ehtiyat nüsxəni** istifadə edin. `Dockerfile`, `compose.yaml` və `deploy/Caddyfile` qalıcı verilənlər bazası, domen və avtomatik HTTPS üçün hazırdır. Lokal HTTP ayarları serverə ötürülmür; server rejimində giriş HTTPS tələb edir.

**[Lokal məlumatlarla serverə keçid — addım-addım təlimat](docs/DEPLOYMENT.az.md)**

Hosting üçün yeni kod yazmaq lazım deyil. Serverinizdə Docker Compose və domeniniz olmalıdır. Mövcud admin hesabınız ehtiyat nüsxə ilə daşınır. Konfiqurasiya bir server instansiyası üçündür.

## GitHub Pages

İctimai səhifə: https://nurlansafarli.github.io/ceyhunlms/

Admin keçidi: https://nurlansafarli.github.io/ceyhunlms/admin/

GitHub Pages Node.js/SQLite işlətmir. Oradakı qeydiyyat WhatsApp mesajı hazırlayır; lokal baza ilə əlaqəsi yoxdur. Admin keçidi server qoşulana qədər bunu bildirir. Lokal paneldə dəyişdirdiyiniz məzmun lokal saytda görünür, GitHub Pages-ə avtomatik ötürülmür. Serverə keçəndə tam sayt həmin serverin domenində işləyəcək.

Pages üçün `npm run build:pages` → `dist-pages/`. `.github/workflows/pages.yml` hər `main` push-dan sonra yayımlayır. GitHub **Settings → Pages → Source: GitHub Actions** seçilməlidir. Server hazır olduqda repozitoriyanın **Settings → Secrets and variables → Actions → Variables** bölməsində `ADMIN_PANEL_URL` dəyişənini real HTTPS admin ünvanına təyin edib **Actions → Publish Jayhun Tech to GitHub Pages → Run workflow** başladın. Bu dəyişənə parol və token yazılmır.

## İnkişaf və yoxlamalar

Kod üzərində işləmək üçün `npm run dev`: Vite 3000 portunda, API `.env`-dəki `PORT` (standart 3001) portunda işləyir. `/api/health` baza bağlantısını yoxlayır. `.env` bütün server və baza əmrlərində oxunur; hosting prosesinin dəyişənləri üstünlük daşıyır. Node.js 24 tövsiyə olunur, minimum 22.13-dür.

```sh
npm run build
npm test
npm run test:e2e
npm run build:pages
npm run test:pages
```

Brauzer testlərindən əvvəl `npx playwright install chromium` işlədin. Cloud mühitdə mövcud `/usr/bin/chromium` üçün `CHROMIUM_PATH=/usr/bin/chromium` istifadə edilə bilər. API, bərpa və brauzer testləri ayrıca test bazaları ilə işləyir, real tələbə məlumatlarına toxunmur. `.env` parolları frontend-ə ötürülmür; şriftlər lokal paketlərdədir.

`shared/default-content.json` yeni bazanın başlanğıc məzmunu və Pages-in statik məzmunudur. Gündəlik redaktələr admin paneldə edilir. Sillabuslar seçilən dilə uyğun, Azərbaycan və rus hərflərini dəstəkləyən şriftlə PDF kimi endirilir. PDF brauzerdə hazırlanır və GitHub Pages-də də işləyir. Kurs cədvəlləri, bio və qiymətlər müəllim tərəfindən dəqiqləşdirilməlidir.
