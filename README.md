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

## Canlı sayt: jayhuntech.az (PHP hostinq)

Canlı sayt cPanel paylaşımlı hostinqdə işləyir. Orada Node.js yoxdur, ona görə backend `php/` qovluğundakı PHP versiyasıdır (PHP 8.2+, SQLite). Bu versiya Node serveri ilə eyni API, verilənlər bazası sxemi və yoxlamalardan istifadə edir. Sayt, `/admin` paneli və `/api` eyni domendə işləyir.

**Serverdəki quruluş:**

| Serverdə                                         | Repozitoriyada                                           |
| ------------------------------------------------ | -------------------------------------------------------- |
| `public_html/` (sayt)                            | `npm run build` → `dist/` qovluğunun içindəkilər         |
| `public_html/api.php`                            | `php/api.php`                                            |
| `public_html/.htaccess`                          | `php/htaccess.txt`                                       |
| `jayhuntech/app.php`, `jayhuntech/bootstrap.php` | `php/app.php`, `php/bootstrap.php`                       |
| `jayhuntech/shared/default-content.json`         | `shared/default-content.json`                            |
| `jayhuntech/shared/legacy-solutions.json`        | `server/legacy-solutions.json`                           |
| `jayhuntech/config.php`                          | `php/config.example.php` əsasında (repoya əlavə edilmir) |
| `jayhuntech/data/registrations.sqlite`           | baza — **heç vaxt üzərinə yazmayın**                     |

`jayhuntech/` qovluğu `public_html`-dən kənardadır, ona görə kod və baza internetdən görünmür.

**Partnyor şirkətləri və loqolar:**

Admin → **Sayt məzmunu → Partnyorlar və müştərilər** bölməsində şirkətin adını dəyişin, əlavə edin, sıralayın və ya gizlədin. Yeni şirkəti əvvəl **Məzmunu yadda saxla** ilə saxlayın, sonra **Şirkətin loqosu** sahəsindən PNG/JPG/WebP faylı seçin (maksimum 5 MB). Loqo dərhal saxlanır; eyni sahədən dəyişdirilə və silinə bilər. Şirkətin adının dəyişməsi loqonu silmir. Şirkət silinib məzmun saxlananda onun loqosu da silinir. Loqolar mövcud SQLite bazasında avtomatik yaradılan əlavə cədvəldə saxlanır; ayrıca uploads qovluğu və ya yeni hostinq xidməti lazım deyil.

Qovluqların quruluşu və PHP backend saxlanır. `config.php` və mövcud baza əvəz edilməməlidir. GitHub Pages-də admin dəyişikliklərinin görünməsi üçün PHP API bağlantısı aktiv olmalıdır; PHP hostinqdəki sayt bunu birbaşa oxuyur.

**Dəyişikliyi canlı sayta çıxarmaq:**

1. Sayt (React) dəyişibsə: `npm run build`, sonra `dist/` içindəkiləri FTP ilə `public_html/`-ə yükləyin. Əvvəlcə `assets/`, ən sonda `index.html`.
2. Backend dəyişibsə: `php/app.php` faylını `jayhuntech/app.php` kimi yükləyin.
3. Əvvəlcə lokalda yoxlayın:
   - `npm run test:php` — API testlərini PHP backend-ə qarşı işlədir;
   - `npm run build && php -S 127.0.0.1:8080 php/router.php` — saytı və admin paneli `http://127.0.0.1:8080` ünvanında açır. İlk admin hesabı üçün `ADMIN_PASSWORD` mühit dəyişənini təyin edin.

**Ehtiyat nüsxə:** cPanel → **Backup** və ya FTP ilə `jayhuntech/data/registrations.sqlite` faylını endirin.

## Admin paneli serverə yerləşdirmək (Node.js / Docker)

Server aldıqda **eyni tətbiqi və lokal ehtiyat nüsxəni** istifadə edin. `Dockerfile`, `compose.yaml` və `deploy/Caddyfile` qalıcı verilənlər bazası, domen və avtomatik HTTPS üçün hazırdır. Lokal HTTP ayarları serverə ötürülmür; server rejimində giriş HTTPS tələb edir.

**[Lokal məlumatlarla serverə keçid — addım-addım təlimat](docs/DEPLOYMENT.az.md)**

Hosting üçün yeni kod yazmaq lazım deyil. Serverinizdə Docker Compose və domeniniz olmalıdır. Mövcud admin hesabınız ehtiyat nüsxə ilə daşınır. Konfiqurasiya bir server instansiyası üçündür.

## PHP hostinqə avtomatik FTPS deploy

`.github/workflows/php-hosting.yml` tətbiq faylları `main` branch-də dəyişəndə PHP hostinqə avtomatik yayım edir. Serverdə Node.js və ya Python quraşdırmaq lazım deyil; build və deploy GitHub Actions-da işləyir. Mövcud PHP kodu və `public_html` / `jayhuntech` quruluşu saxlanır.

Repo **Settings → Secrets and variables → Actions** bölməsində `FTP_HOST`, `FTP_USERNAME`, `FTP_PASSWORD` repository secret-ləri olmalıdır. `FTP_HOST` yalnız host adıdır (məsələn, `ftp.jayhuntech.az`); port 21-dir. Proses yalnız etibarlı sertifikatla **explicit FTPS** istifadə edir. Plain FTP-yə avtomatik keçid və TLS yoxlamasını söndürmək yoxdur.

FTP hesabı ilə daxil olduqda həm `public_html`, həm də `jayhuntech` qovluqları eyni əsas qovluqda görünməlidir. Mövcud `jayhuntech/config.php`, PHP faylları və `public_html/.htaccess` yoxlanılır; bu, yeni hostinq quraşdıran deyil, mövcud saytı yeniləyən prosesdir.

Əl ilə başlatmaq: **Actions → Deploy PHP hosting via FTPS → Run workflow**. `check_only` seçili olduqda yalnız bağlantı və qovluqlar yoxlanır; heç nə yüklənmir. Yükləmək üçün seçimi söndürün. Yayımlar növbə ilə işləyir və yarıda avtomatik ləğv olunmur.

Yalnız paketdəki tətbiq kodu və hazır frontend faylları yüklənir. `.htaccess`, `.user.ini`, `config.php`, `data/`, istifadəçi yükləmələri və digər server faylları dəyişdirilmir. Köhnə versiya və hazırlanan fayllar FTP əsas qovluğunda `.jayhun-deploy/<yayım-id>/` altında, `public_html`-dən kənarda saxlanır. Fayllar geri oxunaraq yoxlanılır, `index.html` ən sonda dəyişdirilir. Sonra ana səhifə, `/admin`, `/api/health` və ictimai məzmun yalnız GET sorğuları ilə yoxlanılır; sınaq qeydiyyatı göndərilmir. Xəta baş versə əvvəlki tətbiq faylları bərpa edilir; bağlantı itərsə bərpa üçün göstərilən backup qovluğu saxlanır. Baza ehtiyat nüsxəsini mövcud cPanel Backup qaydası ilə ayrıca idarə edin.

## GitHub Pages

İctimai səhifə: https://nurlansafarli.github.io/ceyhunlms/

Admin keçidi: https://nurlansafarli.github.io/ceyhunlms/admin/

GitHub Pages yalnız statik frontend-i yayımlayır. Backend PHP 8.2+ hostinqdə işləyir; hostinqdə Node.js tələb edilmir. Node.js GitHub Actions-da frontend fayllarını yığmaq və testləri idarə etmək üçündür.

`.github/workflows/pages.yml` hər `main` push-dan sonra PHP testlərini işlədir, Pages saytını yayımlayır və **jayhuntech-php-hosting** adlı hazır hostinq paketini artifact kimi yaradır. GitHub **Settings → Pages → Source: GitHub Actions** seçilməlidir.

PHP hostinqə keçid:

1. Uğurlu Actions yayımının **Artifacts → jayhuntech-php-hosting** paketini endirin. Paketdə server üçün Node.js faylları, parol və baza yoxdur.
2. Paketdəki `QURASDIRMA.txt` üzrə PHP və hazır frontend fayllarını cPanel-ə yükləyin. Mövcud `config.php` və `data/` qorunmalıdır. PHP 8.2+, PDO SQLite, mbstring və GD tələb edilir.
3. `https://jayhuntech.az/api/health` və `/admin` ünvanlarını yoxlayın. PHP API yalnız `https://nurlansafarli.github.io` origin-inə ictimai məzmun və qeydiyyat üçün CORS icazəsi verir; admin sorğuları bu icazəyə daxil deyil.
4. GitHub **Settings → Secrets and variables → Actions → Variables** daxilində `PHP_API_ORIGIN=https://jayhuntech.az` təyin edin. `ADMIN_PANEL_URL` standart olaraq `https://jayhuntech.az/admin` ünvanıdır; başqa hostinq üçün dəyişdirin. Bu sahələrə parol və token yazılmır.
5. **Actions → Publish Jayhun Tech to GitHub Pages → Run workflow** başladın. Bundan sonra Pages məzmunu PHP bazasından oxuyur, müraciətləri PHP API-yə göndərir və admin dəyişiklikləri səhifə yeniləndikdə görünür. Admin girişi PHP domenində açılır.

`PHP_API_ORIGIN` boş olduqda Pages ilkin statik məzmunu göstərir və qeydiyyat WhatsApp mesajı hazırlayır. Bu, hostinq qoşulana qədər işlək rejimdir. API bağlantısı aktiv olduğu halda göndərmə xətası istifadəçiyə göstərilir; müraciət göndərilmədən uğur mesajı göstərilmir.

Lokal Pages build-i: `VITE_API_ORIGIN=https://jayhuntech.az VITE_ADMIN_URL=https://jayhuntech.az/admin npm run build:pages`. Hazır PHP paketi üçün `npm run build && node scripts/package-php.mjs`.

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
