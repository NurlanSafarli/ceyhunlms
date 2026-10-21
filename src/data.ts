export type CourseId = 'help-desk' | 'system-admin' | 'network-admin';
export type Course = {
  id: CourseId;
  number: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  duration: string;
  level: string;
  tags: string[];
  prerequisites: string;
  outcome: string;
  modules: { title: string; duration: string; topics: string[]; lab: string }[];
};

export const courses: Course[] = [
  {
    id: 'help-desk',
    number: '01',
    name: 'Help Desk',
    shortName: 'Help Desk',
    category: 'İLK ADDIMIN BURADAN BAŞLASIN',
    description:
      'IT dünyasının təməlini öyrən. Texniki problemləri analiz et, həll tap və istifadəçilərə dəstək ol.',
    duration: '8 həftə',
    level: 'Başlanğıc',
    tags: ['Windows', 'Hardware', 'Troubleshooting'],
    prerequisites: 'Xüsusi IT biliyi tələb olunmur. Kompüterdən əsas istifadə bacarığı kifayətdir.',
    outcome:
      'Kompüter problemlərini diaqnostika etmək, əməliyyat sistemini qurmaq və texniki dəstək müraciətlərini idarə etmək.',
    modules: [
      {
        title: 'IT əsasları və kompüter avadanlıqları',
        duration: '1–2-ci həftə',
        topics: [
          'IT rolları və Help Desk-in iş prinsipləri',
          'CPU, RAM, disk və periferiya qurğuları',
          'BIOS/UEFI, komponent seçimi və diaqnostika',
        ],
        lab: 'Virtual kompüterin hazırlanması və avadanlıq inventarının yaradılması.',
      },
      {
        title: 'Əməliyyat sistemləri və Windows',
        duration: '3–4-cü həftə',
        topics: [
          'Windows-un quraşdırılması və ilkin sazlanması',
          'İstifadəçilər, icazələr və fayl sistemləri',
          'Sürücülər, yeniləmələr və sistem alətləri',
        ],
        lab: 'Windows virtual maşınının qurulması və istifadəçi hüquqlarının sazlanması.',
      },
      {
        title: 'Şəbəkə əsasları və bağlantı problemləri',
        duration: '5-ci həftə',
        topics: [
          'IP ünvanı, DHCP və DNS anlayışları',
          'Wi-Fi və kabel bağlantıları',
          'ping, ipconfig, tracert və nslookup',
        ],
        lab: 'İnternet bağlantısı problemlərinin addım-addım diaqnostikası.',
      },
      {
        title: 'Texniki dəstək və təhlükəsizlik',
        duration: '6–7-ci həftə',
        topics: [
          'Ticket prosesi, prioritet və eskalasiya',
          'İstifadəçi ilə aydın ünsiyyət və uzaqdan dəstək',
          'Parol siyasəti, fişinq və ehtiyat nüsxə',
        ],
        lab: 'Nümunə müraciətlərin qeydiyyatı, həlli və bilik bazasının hazırlanması.',
      },
      {
        title: 'Yekun praktika və karyera hazırlığı',
        duration: '8-ci həftə',
        topics: [
          'Real iş ssenariləri üzrə problemlərin həlli',
          'Texniki müsahibə sualları və CV strukturu',
          'Yekun layihənin təqdimatı və geribildirim',
        ],
        lab: 'Kiçik ofis üçün texniki dəstək planı və işlək Windows mühiti.',
      },
    ],
  },
  {
    id: 'system-admin',
    number: '02',
    name: 'Sistem inzibatçılığı',
    shortName: 'Sistem inzibatçılığı',
    category: 'İNFRASTRUKTURU SƏN İDARƏ ET',
    description:
      'Serverləri qur, istifadəçiləri idarə et və dayanıqlı IT infrastrukturu yarat. Nəzəriyyədən real sistemlərə keç.',
    duration: '12 həftə',
    level: 'Orta səviyyə',
    tags: ['Windows Server', 'Linux', 'Active Directory'],
    prerequisites:
      'Windows və şəbəkə əsasları üzrə biliklər. Help Desk proqramını bitirmək tövsiyə olunur.',
    outcome:
      'Windows və Linux serverlərini qurmaq, domen və istifadəçiləri idarə etmək, ehtiyat nüsxə və monitorinq planı hazırlamaq.',
    modules: [
      {
        title: 'Server əsasları və virtuallaşdırma',
        duration: '1–2-ci həftə',
        topics: [
          'Server rolları və infrastruktura baxış',
          'Hyper-V və virtual maşınların idarə edilməsi',
          'Resurs bölgüsü, virtual şəbəkə və snapshot',
        ],
        lab: 'Bir neçə serverdən ibarət təcrid olunmuş virtual laboratoriya.',
      },
      {
        title: 'Windows Server və Active Directory',
        duration: '3–5-ci həftə',
        topics: [
          'Domen kontrollerinin quraşdırılması',
          'OU, istifadəçi və qrupların idarə edilməsi',
          'Group Policy, DNS və DHCP xidmətləri',
        ],
        lab: 'Ofis domeni, istifadəçi qrupları və mərkəzləşdirilmiş təhlükəsizlik siyasəti.',
      },
      {
        title: 'Linux inzibatçılığı',
        duration: '6–8-ci həftə',
        topics: [
          'Terminal, fayl sistemi və icazələr',
          'Paketlər, proseslər və systemd xidmətləri',
          'SSH, istifadəçilər və shell skriptləri',
        ],
        lab: 'Linux serverinin qurulması və rutin tapşırıqların avtomatlaşdırılması.',
      },
      {
        title: 'Monitorinq, təhlükəsizlik və backup',
        duration: '9–10-cu həftə',
        topics: [
          'Log analizi və sistem monitorinqi',
          'Giriş hüquqları və sistemin sərtləşdirilməsi',
          'Ehtiyat nüsxə və bərpa ssenariləri',
        ],
        lab: 'Planlaşdırılmış backup və sınaq bərpası.',
      },
      {
        title: 'Yekun infrastruktur layihəsi',
        duration: '11–12-ci həftə',
        topics: [
          'İnfrastrukturun planlaşdırılması',
          'Xidmətlərin inteqrasiyası və sənədləşdirilməsi',
          'Nasazlıqların həlli və layihənin təqdimatı',
        ],
        lab: 'Domen, fayl serveri, Linux xidməti və backup-dan ibarət ofis infrastrukturu.',
      },
    ],
  },
  {
    id: 'network-admin',
    number: '03',
    name: 'Şəbəkə inzibatçılığı',
    shortName: 'Şəbəkə inzibatçılığı',
    category: 'BAĞLANTILARIN ARXASINDAKI GÜC',
    description:
      'Şəbəkələrin necə işlədiyini kəşf et. Router və switch-ləri sazla, təhlükəsiz və etibarlı bağlantılar qur.',
    duration: '10 həftə',
    level: 'Başlanğıc / Orta',
    tags: ['Cisco', 'Routing & Switching', 'Network Security'],
    prerequisites:
      'Kompüterdən sərbəst istifadə və texniki ingiliscə terminləri öyrənməyə hazırlıq.',
    outcome:
      'IP ünvanlama planı hazırlamaq, VLAN və marşrutlaşdırmanı sazlamaq, şəbəkə problemlərini diaqnostika etmək.',
    modules: [
      {
        title: 'Şəbəkə əsasları və OSI modeli',
        duration: '1–2-ci həftə',
        topics: [
          'LAN, WAN və şəbəkə topologiyaları',
          'OSI və TCP/IP modelləri',
          'Ethernet, kabellər və şəbəkə avadanlıqları',
        ],
        lab: 'Simulyatorda sadə LAN topologiyasının qurulması.',
      },
      {
        title: 'IP ünvanlama və subnetting',
        duration: '3–4-cü həftə',
        topics: [
          'IPv4, subnet mask və CIDR',
          'Subnetting və VLSM',
          'IPv6 əsasları və ünvanlama planı',
        ],
        lab: 'Şöbələr üçün IP ünvanlama planının hazırlanması.',
      },
      {
        title: 'Switching və VLAN',
        duration: '5–6-cı həftə',
        topics: [
          'Switch-in ilkin sazlanması',
          'VLAN, trunk və inter-VLAN routing',
          'STP və port təhlükəsizliyi',
        ],
        lab: 'Bir neçə şöbəli ofisin VLAN-larla ayrılması.',
      },
      {
        title: 'Routing və şəbəkə təhlükəsizliyi',
        duration: '7–8-ci həftə',
        topics: [
          'Statik marşrutlar və OSPF əsasları',
          'NAT, DHCP və ACL',
          'Təhlükəsiz idarəetmə və diaqnostika',
        ],
        lab: 'Filiallar arasında bağlantı və giriş məhdudiyyətlərinin sazlanması.',
      },
      {
        title: 'Yekun şəbəkə layihəsi',
        duration: '9–10-cu həftə',
        topics: [
          'Şəbəkə dizaynı və sənədləşdirmə',
          'Nasazlıqların tapılması və aradan qaldırılması',
          'Layihənin təqdimatı və texniki müsahibə',
        ],
        lab: 'VLAN, routing, DHCP və ACL ilə tam ofis şəbəkəsi.',
      },
    ],
  },
];

export const faqs = [
  {
    question: 'IT biliyim yoxdur. Hansı kursdan başlayım?',
    answer:
      'Help Desk proqramı sıfırdan başlayanlar üçün nəzərdə tutulub. Kompüter avadanlıqları, Windows və şəbəkə əsaslarını burada öyrənə bilərsiniz. Seçimdə tərəddüd edirsinizsə, qeydiyyat formasında “Seçimdə kömək lazımdır” seçin.',
  },
  {
    question: 'Dərslər onlayn, yoxsa əyani keçirilir?',
    answer:
      'Qeydiyyat zamanı onlayn və ya əyani format seçiminizi bildirə bilərsiniz. Yekun format, dərs cədvəli və əyani məkan qrup formalaşarkən sizinlə dəqiqləşdirilir.',
  },
  {
    question: 'Praktika üçün hansı kompüter lazımdır?',
    answer:
      'Help Desk və şəbəkə dərsləri üçün 8 GB RAM olan kompüter başlanğıc üçün uyğundur. Sistem inzibatçılığı üzrə eyni anda bir neçə virtual maşın işlətmək üçün 16 GB RAM, SSD və virtuallaşdırma dəstəyi tövsiyə olunur.',
  },
  {
    question: 'Kursun qiyməti və ödəniş qaydası necədir?',
    answer:
      'Qiymət, ödəniş qaydası və qrupun başlama tarixi ilkin müraciətdən sonra dəqiqləşdirilir. Formanı doldurmaq ödəniş öhdəliyi yaratmır.',
  },
  {
    question: 'Qeydiyyatdan sonra nə baş verir?',
    answer:
      import.meta.env.MODE === 'pages'
        ? 'Formanı doldurduqdan sonra WhatsApp mesajınız hazırlanır. “WhatsApp-da aç və göndər” düyməsini seçin və açılan söhbətdə mesajı göndərin. Yalnız bundan sonra müraciətiniz müəllimə çatır. Məqsədiniz, uyğun proqram və dərs cədvəli söhbətdə dəqiqləşdirilir.'
        : 'Müraciətiniz sistemdə saxlanılır. Müəllim təqdim etdiyiniz əlaqə vasitəsilə sizinlə əlaqə saxlayaraq məqsədinizi, uyğun proqramı və dərs cədvəlini dəqiqləşdirir.',
  },
];
