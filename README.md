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

Müraciətlərin redaktəsi və silinməsi qorunan `/admin` panelindən edilir. Tələbə məlumatları və vəsait faylları yalnız admin sessiyası ilə açılır. Silmə zamanı ehtiyat nüsxələri və ixrac fayllarını da nəzərə alın.

## Məzmunu dəyişmək

- `/admin`: serverli saytda məzmun, kurslar, sillabuslar, FAQ və bölmələrin görünməsi üçün əsas redaktə yeri.
- `shared/default-content.json`: yeni bazaya yalnız ilk dəfə daxil edilən başlanğıc məzmun və GitHub Pages üçün statik məzmun. Dəqiq cədvəl və qiymətlər müəllim tərəfindən təsdiqlənməlidir.
- `src/App.tsx` və `src/content.tsx`: ictimai sayt və bazadan məzmunun yüklənməsi. Brend, bio, əsas bölmə mətnləri və əlaqə nömrəsi admin paneldən dəyişir.
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

## Admin panel və ilk giriş

İşlək panel serverli versiyanın **`/admin`** ünvanındadır. GitHub Pages-də **https://nurlansafarli.github.io/ceyhunlms/admin/** ünvanı ayrıca giriş səhifəsini açır. Server qoşulmayıbsa, səhifə bunu aydın bildirir və parol qəbul etmir. Server qoşulduqdan sonra “Panelə daxil ol” həmin serverdəki qorunan panelə aparır. Paneldəki dəyişikliklər serverli sayta tətbiq olunur; statik GitHub Pages saytına avtomatik ötürülmür. WhatsApp-dan gələn müraciətlər admin panelə əl ilə əlavə edilə bilər.

Admin parolu repozitoriyada saxlanmır və standart giriş parolu yoxdur. Hesabı yaratmağın iki yolu var:

1. Mühitin təhlükəsiz dəyişənlər bölməsində `ADMIN_USERNAME` və **ən azı 12 simvolluq** `ADMIN_PASSWORD` təyin edin, serveri başladın. Heç bir admin hesabı yoxdursa, ilk hesab bir dəfə yaradılır. Sonrakı startlar mövcud hesabın parolunu dəyişmir. Hesab yaradıldıqdan sonra ilkin `ADMIN_PASSWORD` dəyişənini silə bilərsiniz.
2. Serverdə interaktiv terminal açıb aşağıdakı əmri işlədin. Parol terminalda göstərilmir və əmr tarixçəsinə daxil olmur:

```sh
npm run admin:create
```

Mövcud admin parolunu təhlükəsiz dəyişmək və aktiv sessiyaları ləğv etmək üçün:

```sh
npm run admin:create -- --reset
```

Production rejimində HTTPS tələb olunur: sessiya kukisi `Secure`, `HttpOnly`, `SameSite=Strict` olur. Yalnız lokal HTTP testində `COOKIE_SECURE=false` istifadə edilə bilər; ictimai serverdə bu istisnadan istifadə etməyin. Sessiyalar 12 saatdan sonra bitir. Giriş cəhdləri məhdudlaşdırılır; dəyişdirən sorğular CSRF tokeni və mənbə yoxlamasından keçir.

### Panel bölmələri

- **İcmal:** müraciət statistikası, aktiv qruplar və yaxınlaşan imtahanlar.
- **Müraciətlər:** yaratmaq, axtarmaq, redaktə/silmə, status və daxili qeyd, CSV ixracı. Əl ilə əlavə edilmiş qeydlərdə saxta razılıq tarixi yaradılmır.
- **Kurslar və sillabus:** kurs CRUD, yayım/gizlətmə, sıralama, modullar və praktiki tapşırıqlar.
- **Dərs qrupları:** kurs, başlanma/bitmə, həftəlik cədvəl, tutum, format, tələbə əlavə etmə/çıxarma.
- **Tədris vəsaitləri:** qrup və ya ümumi kitabxana, linklər, mətn qeydləri, fayl yükləmə/əvəzləmə/silmə. Maksimum fayl həcmi 10 MB; fayllar SQLite bazasında saxlanır və yalnız adminə endirilir. Tələbə portalı bu versiyaya daxil deyil.
- **İmtahan təqvimi:** Bakı vaxtı ilə tarix və saat, qrup, müddət, maksimum/keçid balı, məkan və təlimatlar.
- **Nəticələr:** yalnız həmin qrupun tələbəsinə bal və geribildirim əlavə etmək, iştirak etməmə, nəticənin redaktəsi/silinməsi.
- **Sayt məzmunu:** brend, əlaqə, hero, bio, tədris yanaşması, əsas bölmə mətnləri və bölmələrin görünməsi.
- **Suallar və cavablar:** FAQ CRUD, yayım və sıralama.

Əlaqəli qiymət, qrup və ya müraciət məlumatı olan qeydlərin silinməsi bloklanır. Əvvəlcə əlaqəli qeydləri idarə edin və ya kurs/qrupu arxivləyin. Köhnə müraciət bazası ilk start zamanı məlumat itirmədən yenilənir; başlanğıc məzmun yalnız bir dəfə əlavə edilir, silinmiş məzmun növbəti startda geri qayıtmır.

Brauzer testləri `tests/browser-server.mjs` ilə ayrı yaddaş bazasında test admini yaradır. Oradakı test hesabı real serverdə yaradılmır.

## Admin paneli serverə yerləşdirmək

GitHub Pages yalnız statik faylları təqdim edir. Parollar, tələbələr, qruplar və nəticələri saxlayan tətbiq üçün **Node.js 24, qalıcı disk və HTTPS** olan hosting lazımdır. Hazırda repozitoriyaya server xidməti qoşulmayıb. GitHub-a push etmək ayrıca hosting yaratmır.

`Dockerfile` tətbiqi yerləşdirməyə hazırlayır. Serverdə image yaradın:

```sh
docker build -t jayhun-tech .
```

Hosting-in təhlükəsiz dəyişənlər bölməsində `ADMIN_USERNAME` və ən azı 12 simvolluq `ADMIN_PASSWORD` təyin edin; `/data` üçün qalıcı disk/volume qoşun. Bu adlara `VITE_` prefiksi əlavə etməyin: parol frontend build-ə daxil edilməməlidir. Tətbiqin portu `3001`, sağlamlıq yoxlaması `/api/health`-dir. Bir instansiya işlədin. HTTPS reverse proxy arxasında sessiya kukiləri təhlükəsiz qalır.

Öz Docker serverinizdə dəyişənləri Git-ə daxil edilməyən, `chmod 600 .env` ilə qorunan `.env` faylına yazdıqdan sonra:

```sh
docker run -d --name jayhun-tech --restart unless-stopped \
  --env-file .env \
  --mount type=volume,source=jayhun-data,target=/data \
  -p 127.0.0.1:3001:3001 jayhun-tech
```

Bu əmr yalnız lokal port açır; öz domeniniz üçün HTTPS reverse proxy qurulmalıdır. İlk admin server başlayanda yaradılır. Sonradan parolu interaktiv dəyişmək üçün `docker exec -it jayhun-tech env -u ADMIN_PASSWORD npm run admin:create -- --reset` istifadə edin. Konteyner yenilənərkən `jayhun-data` volume-unu silməyin.

Serverdə `/admin` işlədikdən sonra GitHub Pages girişini ona bağlayın:

1. GitHub repozitoriyasında **Settings → Secrets and variables → Actions → Variables** açın.
2. **`ADMIN_PANEL_URL`** adlı dəyişən yaradın; dəyəri serverinizin tam HTTPS admin ünvanı olsun, məsələn `https://your-domain.example/admin`. Bu nümunə ünvanı real domeninizlə əvəz edin. Buraya parol və ya token yazmayın.
3. **Actions → Publish Jayhun Tech to GitHub Pages → Run workflow** başladın.
4. **https://nurlansafarli.github.io/ceyhunlms/admin/** açın və “Panelə daxil ol” seçin.

Lokal Pages build üçün eyni açıq ünvan `VITE_ADMIN_URL` dəyişəni ilə verilə bilər. `build:pages` real `dist-pages/admin/index.html` yaradır; `/admin`, `/admin/` və səhifənin yenilənməsi SPA fallback-dən asılı deyil. Pages testləri də həqiqi statik serverdə işləyir. Giriş parolu yalnız serverin öz ünvanında daxil edilir; üçüncü tərəf kukilərinə və CORS istisnalarına ehtiyac yoxdur.
