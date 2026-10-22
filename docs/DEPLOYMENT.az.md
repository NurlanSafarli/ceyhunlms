# Lokal məlumatlarla serverə keçid

Bu təlimat **gələcək serveriniz üçündür**. Lokal istifadə üçün server, domen və Docker tələb olunmur: `npm run setup:local`, sonra `npm run local` kifayətdir.

Serverdə Docker Engine + Docker Compose, domen və qalıcı disk lazımdır. Domenin DNS **A** qeydini serverin IP ünvanına yönəldin. **80/443** portlarını açın. IPv6 istifadə etmirsinizsə köhnə/yanlış AAAA qeydi saxlamayın. Caddy domen üçün HTTPS sertifikatını avtomatik alır və yeniləyir.

## 1. Lokal bazanı hazırlayın

Son köçürmə zamanı lokal tətbiqi **Ctrl+C** ilə dayandırın. Layihə qovluğunda:

```sh
npm run db:backup
```

Əmr `.local/backups/` daxilində yeni fayl yaradır və adını göstərir. İçərisində bütün tələbələr, qruplar, fayllar, imtahanlar, nəticələr, məzmun və admin hesabları var. Serverə keçid tamamlanana qədər lokal bazaya yeni məlumat yazmayın; iki ayrı bazanın dəyişiklikləri avtomatik birləşdirilmir.

## 2. Serverdə layihəni hazırlayın

```sh
git clone https://github.com/NurlanSafarli/ceyhunlms.git
cd ceyhunlms
cp .env.example .env
chmod 600 .env
mkdir -p .local/import
chmod 700 .local .local/import
```

`.env` faylında **`DOMAIN`** dəyərini real domeninizlə dəyişin; `https://` və `/` əlavə etməyin. `compose.yaml` server üçün HTTPS, `/data/registrations.sqlite` bazası və bir etibarlı reverse proxy ayarını özü verir. Lokal `PORT` və `DATABASE_PATH` dəyərləri konteynerin bu ayarlarını əvəz etmir.

Lokal ehtiyat nüsxənizi **SFTP və ya SCP** vasitəsilə serverdəki `.local/import/backup.sqlite` ünvanına göndərin. Bu faylı GitHub-a, `public` qovluğuna və ya ümumi linkə yükləməyin. Adını `backup.sqlite` qoymaq aşağıdakı əmri dəyişmədən işlətməyə imkan verir.

```sh
docker compose config --quiet
docker compose build app
```

## 3. İlk startdan əvvəl məlumatları bərpa edin

```sh
docker compose run --rm --no-deps --user 0:0 \
  -v "./.local/import:/import:ro" \
  app sh -c 'npm run db:restore -- /import/backup.sqlite && chown node:node "$DATABASE_PATH"'
docker compose up -d
docker compose ps
```

Birdəfəlik bərpa əmri məxfi faylı oxuyur və bazanın sahibini tətbiqin istifadəçisinə təyin edir. Əsas tətbiq `node` istifadəçisi ilə işləyir.

Admin hesabınız və parolunuz saxlanır; əvvəlki giriş sessiyaları daşınmır. `https://SIZIN-DOMEN/admin` ünvanından daxil olun; `SIZIN-DOMEN` hissəsini real domeninizlə əvəz edin. Sayt həmin domenin əsas ünvanındadır. Yeni qeydiyyatlar və panel dəyişiklikləri artıq server bazasına yazılır.

**Bərpa mövcud bazanın üzərinə yazmır.** Səhvən əvvəl tətbiqi başladıb boş baza yaratmısınızsa volume-u silməyin. `docker compose stop` edin, `compose.yaml` daxilində tətbiqin `DATABASE_PATH` dəyərini `/data/imported.sqlite` kimi yeni ada dəyişin və bərpa əmrini yenidən işlədin. Əvvəlki baza da qalır. Sonra `docker compose up -d` ilə başladın.

Lokal məlumat daşımadan tam yeni server qurursunuzsa bərpa əmrini buraxın. `docker compose up -d` etdikdən sonra ilk admini yaradın:

```sh
docker compose exec app npm run admin:create -- --prompt
```

Parol terminalda görünməyəcək. Repo daxilində standart giriş parolu yoxdur.

## 4. GitHub Pages keçidini qoşun

Repozitoriyada **Settings → Secrets and variables → Actions → Variables** bölməsində **`ADMIN_PANEL_URL`** dəyişəni yaradın. Dəyəri yeni serverinizin tam admin URL-i olsun: `https://SIZIN-DOMEN/admin`. Buraya parol və ya token yazmayın.

**Actions → Publish Jayhun Tech to GitHub Pages → Run workflow** başladın. Yayım bitdikdən sonra https://nurlansafarli.github.io/ceyhunlms/admin/ ünvanındakı düymə serverinizə aparacaq.

GitHub Pages əsas saytının məzmunu statik qalır. Admin dəyişikliklərinin hamıya görünməsi və müraciətlərin bazaya yazılması üçün əsas sayt olaraq **serverinizin domenini paylaşın**. GitHub Pages versiyası lokal/server bazası ilə sinxronlaşdırılmır.

## Gündəlik əməliyyatlar

Admin parolunu dəyişmək:

```sh
docker compose exec app npm run admin:reset
```

Server bazasının ehtiyat nüsxəsini hosta çıxarmaq:

```sh
docker compose exec app npm run db:backup -- --to /data/export-2026-10-22.sqlite
docker compose cp app:/data/export-2026-10-22.sqlite .local/export-2026-10-22.sqlite
```

Hər dəfə yeni fayl adı/tarix seçin. Eyni ad varsa əmr üzərinə yazmayacaq. Nüsxəni ayrıca təhlükəsiz diskə köçürün.

Yeniləmə: əvvəl ehtiyat nüsxə yaradın, sonra:

```sh
git pull --ff-only
docker compose up -d --build
```

`jayhun_data` volume-u bazanı və faylları saxlayır. **`docker compose down -v` işlətməyin** — `-v` məlumat volume-larını silir. Sadəcə dayandırmaq üçün `docker compose stop` istifadə edin. HTTPS sertifikatları `caddy_data` volume-unda saxlanır.

## Yoxlama və alternativ hosting

- `docker compose ps`: app sağlam, Caddy işlək olmalıdır.
- `docker compose logs --tail=50 app caddy`: start, domen və sertifikat xətaları.
- Domenin `/api/health` ünvanı `{ "status": "ok" }` qaytarmalıdır.
- `/admin` hesab və parol tələb etməlidir; lokal parolunuz bərpadan sonra eyni qalır.

Docker əvəzinə Node.js hosting istifadə etsəniz: Node.js **24**, `npm ci && npm run build`, start üçün `npm start`. `DATABASE_PATH` qalıcı diskin yoluna, `PORT` hostingin tələb etdiyi porta işarə etməlidir. `.env` və ya hostingin təhlükəsiz mühit dəyişənləri oxunur; hosting dəyişənləri üstündür. Public serverdə `COOKIE_SECURE=true` və HTTPS istifadə edin. `TRUST_PROXY_HOPS` dəyərini yalnız real etibarlı proxy sayına uyğun seçin; birbaşa çıxışda `0` qalmalıdır. Bir SQLite bazası ilə yalnız bir tətbiq instansiyası işlədin.
