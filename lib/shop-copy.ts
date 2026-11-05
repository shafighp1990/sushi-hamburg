import { ot } from './operations-copy';
import { ct } from './commerce-copy';
import type { Language } from './catalog';
const rows = {
  serviceNotice: [
    'Sushi-Catering mit Lieferung · kein Verzehr vor Ort.',
    'Кейтеринг суші з доставкою · без залу для відвідувачів.',
    'Sushi catering with delivery · no on-site dining.',
    'کیترینگ سوشی با ارسال سفارش؛ بدون فضای نشستن و پذیرایی حضوری.',
  ],
  home: ['Startseite', 'Головна', 'Home', 'خانه'],
  homeTitle: [
    'Sushi in Hamburg.',
    'Суші в Гамбурзі.',
    'Sushi in Hamburg.',
    'سوشی در هامبورگ.',
  ],
  homeIntro: [
    'Sushi HH ist ein Sushi-Catering mit Lieferung in Hamburg. Wir bieten Sushi-Rollen, Maki und Sets zum Teilen. Entdecke unsere Speisekarte mit Zutaten und Preisen und bestelle deine Auswahl zur Lieferung in Hamburg.',
    'Sushi HH — кейтеринг суші з доставкою в Гамбурзі. Готуємо роли, макі та сети для компанії. Перегляньте меню зі складом і цінами та замовте улюблені страви з доставкою в Гамбурзі.',
    'Sushi HH is a sushi catering service in Hamburg, offering sushi rolls, maki and sharing sets for delivery. Explore the menu, see ingredients and prices, and order your selection for delivery in Hamburg.',
    'سوشی HH یک کیترینگ سوشی در هامبورگ است؛ رول‌های سوشی، ماکی و ست‌های چندنفره را برای شما آماده و ارسال می‌کنیم. در منو مواد اولیه و قیمت هر غذا را ببینید، انتخاب کنید و برای تحویل در هامبورگ سفارش بدهید.',
  ],
  viewMenu: [
    'Speisekarte ansehen',
    'Переглянути меню',
    'View the menu',
    'دیدن منو',
  ],
  homeDelivery: [
    'Sushi zu dir nach Hause.',
    'Суші до вашого дому.',
    'Sushi delivered to your door.',
    'سوشی، درِ خانهٔ شما.',
  ],
  homeOrderInfo: [
    'Bestelle als Gast oder mit Kundenkonto. Nach deiner Bestellung bestätigt Sushi HH die Lieferung; den Status kannst du online verfolgen.',
    'Замовляйте без реєстрації або з кабінету. Після замовлення Sushi HH підтвердить доставку, а ви зможете відстежувати статус онлайн.',
    'Order as a guest or with an account. Sushi HH confirms your delivery after you place an order, and you can follow its status online.',
    'می‌توانید مهمان سفارش بدهید یا حساب بسازید. کیترینگ پس از ثبت سفارش، ارسال را تأیید می‌کند و شما می‌توانید وضعیت آن را آنلاین پیگیری کنید.',
  ],
  homeJournal: [
    'Was steckt in deiner Rolle?',
    'Що всередині вашого ролу?',
    'What goes into your sushi?',
    'داخل سوشی شما چیست؟',
  ],
  homeJournalIntro: [
    'Lerne Sushi-Arten, Zutaten und Zubereitung kennen. Unsere Wissenssammlung ergänzt die Zutatenangaben auf jeder Produktseite.',
    'Дізнайтеся про види суші, інгредієнти та приготування. Наша добірка статей доповнює склад, зазначений на сторінці кожної страви.',
    'Explore sushi styles, ingredients and preparation. Our journal accompanies the ingredient details on each dish’s page.',
    'با انواع سوشی، مواد اولیه و روش تهیه آشنا شوید. دانشنامه در کنار توضیحات هر محصول به شما کمک می‌کند انتخاب آگاهانه‌تری داشته باشید.',
  ],
  productName: ['Produktname', 'Назва страви', 'Product name', 'نام محصول'],
  productTranslationHint: [
    'Name und Beschreibung in einer Sprache reichen aus. Übersetzungen sind optional. Leere Texte werden im Shop in der ausgefüllten Sprache angezeigt; sie werden nicht automatisch übersetzt.',
    'Достатньо назви й опису однією мовою. Переклади необов’язкові. Замість порожніх текстів магазин покаже заповнену мовну версію; автоматичного перекладу немає.',
    'A name and description in one language are enough. Translations are optional. The shop uses the completed language for empty texts; it does not translate them automatically.',
    'نام و توضیح به یک زبان کافی است. ترجمه‌ها اختیاری‌اند. متن‌های خالی در فروشگاه با زبان تکمیل‌شده نمایش داده می‌شوند؛ ترجمهٔ خودکار انجام نمی‌شود.',
  ],
  card: [
    'Kredit- / Debitkarte',
    'Банківська картка',
    'Credit / debit card',
    'کارت اعتباری / بانکی',
  ],
  menu: ['Speisekarte', 'Меню', 'Menu', 'منو'],
  knowledge: ['Sushi-Wissen', 'Про суші', 'Sushi journal', 'دانشنامهٔ سوشی'],
  delivery: ['Lieferung', 'Доставка', 'Delivery', 'ارسال'],
  account: ['Mein Konto', 'Мій кабінет', 'My account', 'حساب من'],
  admin: ['Verwaltung', 'Керування', 'Catering desk', 'مدیریت کیترینگ'],
  cart: ['Deine Bestellung', 'Ваше замовлення', 'Your order', 'سفارش شما'],
  search: [
    'Gericht oder Zutat suchen',
    'Пошук страви або інгредієнта',
    'Find a dish or ingredient',
    'جست‌وجوی غذا یا مواد اولیه',
  ],
  all: ['Alles', 'Усе', 'Everything', 'همه'],
  signature: [
    'Philadelphia & Drachen',
    'Філадельфія та дракони',
    'Philadelphia & dragons',
    'فیلادلفیا و دراگون',
  ],
  sets: [
    'Sets zum Teilen',
    'Сети для компанії',
    'Sharing sets',
    'ست‌های چندنفره',
  ],
  new: ['Neue Rollen', 'Нові роли', 'New rolls', 'رول‌های جدید'],
  classics: [
    'Käserollen & Futomaki',
    'Сирні роли та футомакі',
    'Cheese rolls & futomaki',
    'رول پنیری و فوتوماکی',
  ],
  maki: ['Maki', 'Макі', 'Maki', 'ماکی'],
  menuTitle: ['Die Karte.', 'Наше меню.', 'The menu.', 'منوی ما.'],
  hours: [
    'Donnerstag–Sonntag',
    'Четвер–неділя',
    'Thursday–Sunday',
    'پنج‌شنبه تا یکشنبه',
  ],
  cutoff: [
    'Bestellung bis 13:00 · Lieferung bis 21:00',
    'Замовлення до 13:00 · Доставка до 21:00',
    'Order by 13:00 · Delivery until 21:00',
    'سفارش تا ۱۳:۰۰ · ارسال تا ۲۱:۰۰',
  ],
  add: ['Hinzufügen', 'Додати', 'Add to order', 'افزودن'],
  details: [
    'Zutaten & Details',
    'Склад і подробиці',
    'Ingredients & details',
    'مواد اولیه و جزئیات',
  ],
  empty: [
    'Deine Auswahl beginnt hier.',
    'Ваш вибір починається тут.',
    'Your selection starts here.',
    'غذای دلخواهتان را انتخاب کنید.',
  ],
  emptySub: [
    'Wähle etwas aus der Karte.',
    'Оберіть страву з меню.',
    'Choose something from the menu.',
    'یک غذا از منو به سبد اضافه کنید.',
  ],
  subtotal: ['Speisen', 'Страви', 'Food subtotal', 'جمع غذاها'],
  fee: ['Lieferkosten', 'Доставка', 'Delivery fee', 'هزینهٔ ارسال'],
  total: ['Gesamt', 'Разом', 'Total', 'مبلغ کل'],
  pending: [
    'Wird bestätigt',
    'Після підтвердження',
    'To be confirmed',
    'پس از تأیید',
  ],
  checkout: ['Zur Kasse', 'Оформити', 'Checkout', 'تکمیل سفارش'],
  continue: [
    'Weiter auswählen',
    'Продовжити вибір',
    'Keep browsing',
    'ادامهٔ انتخاب',
  ],
  remove: ['Entfernen', 'Видалити', 'Remove', 'حذف'],
  sort: ['Sortieren', 'Сортування', 'Sort', 'مرتب‌سازی'],
  recommended: ['Menüreihenfolge', 'За меню', 'Menu order', 'ترتیب منو'],
  priceLow: [
    'Preis aufsteigend',
    'Спочатку дешевші',
    'Price: low to high',
    'قیمت: کم به زیاد',
  ],
  priceHigh: [
    'Preis absteigend',
    'Спочатку дорожчі',
    'Price: high to low',
    'قیمت: زیاد به کم',
  ],
  noResults: [
    'Keine passenden Gerichte.',
    'Страв не знайдено.',
    'No matching dishes.',
    'غذایی پیدا نشد.',
  ],
  clear: ['Zurücksetzen', 'Скинути', 'Clear filters', 'حذف فیلترها'],
  allergens: [
    'Bei Allergien bitte vor der Bestellung den vollständigen Zutaten- und Allergeninhalt mit uns klären.',
    'За наявності алергії уточніть повний склад та алергени перед замовленням.',
    'If you have allergies, confirm the full ingredients and allergens with us before ordering.',
    'اگر حساسیت غذایی دارید، پیش از سفارش ترکیبات کامل و مواد حساسیت‌زا را با کیترینگ بررسی کنید.',
  ],
  originalMenus: [
    'Original-Speisekarten',
    'Оригінальні меню',
    'Original menus',
    'منوهای اصلی',
  ],
  contact: ['Kontakt', 'Контакт', 'Contact', 'تماس'],
  privacy: ['Datenschutz', 'Приватність', 'Privacy', 'حریم خصوصی'],
  legal: [
    'Anbieterangaben',
    'Відомості про заклад',
    'Business details',
    'اطلاعات کسب‌وکار',
  ],
  zone: ['Lieferzone', 'Зона доставки', 'Delivery zone', 'محدودهٔ ارسال'],
  zoneUnknown: ['Ich weiß es nicht', 'Не знаю', 'Not sure', 'نمی‌دانم'],
  remote: [
    'C / D / E · 0,70 € pro km, Angebot vor Bestätigung',
    'C / D / E · 0,70 €/км, вартість узгоджується',
    'C / D / E · €0.70/km, quoted before confirmation',
    'C / D / E · کیلومتری ۰٫۷۰ یورو، با تأیید هزینه',
  ],
  zoneNote: [
    'Bitte wähle die mit Sushi HH bestätigte Zone. Unklare Zonen und Fernlieferungen erhalten zuerst ein Angebot.',
    'Оберіть зону, підтверджену Sushi HH. Для невідомих зон і віддалених адрес спочатку узгоджуємо вартість.',
    'Choose the zone confirmed by Sushi HH. Unknown zones and distant addresses receive a quote first.',
    'محدودهٔ تأییدشده با کیترینگ را انتخاب کنید. هزینهٔ مناطق نامشخص یا دور ابتدا اعلام می‌شود.',
  ],
  guest: [
    'Als Gast bestellen',
    'Замовити без реєстрації',
    'Checkout as guest',
    'سفارش بدون حساب',
  ],
  member: [
    'Mit Konto bestellen',
    'Замовити з кабінету',
    'Checkout with an account',
    'سفارش با حساب کاربری',
  ],
  guestNote: [
    'Kein Konto und keine E-Mail nötig. Nach der Bestellung erhältst du deinen privaten Link zur Verfolgung.',
    'Обліковий запис та електронна пошта не потрібні. Після замовлення збережіть приватне посилання для відстеження.',
    'No account or email needed. Save your private tracking link after placing your order.',
    'نیازی به حساب کاربری یا ایمیل نیست. پس از سفارش، لینک خصوصی پیگیری را نگه دارید.',
  ],
  phoneConfirmation: [
    'Sushi HH ruft dich unter der angegebenen Telefonnummer an, um Bestellung, Lieferzeit und Lieferkosten zu bestätigen. Du zahlst erst bei Lieferung; eine Onlinezahlung ist nicht nötig.',
    'Sushi HH зателефонує за вказаним номером, щоб підтвердити замовлення, час і вартість доставки. Оплата при доставці; онлайн-оплата не потрібна.',
    'Sushi HH will call the phone number you provide to confirm your order, delivery time and delivery fee. Pay on delivery; no online payment is needed.',
    'رستوران برای تأیید سفارش، زمان و هزینهٔ تحویل با شماره‌ای که وارد کرده‌اید تماس می‌گیرد. پرداخت هنگام تحویل است و نیازی به پرداخت آنلاین نیست.',
  ],
  phoneConfirmationPending: [
    'Deine Bestellung ist eingegangen. Sushi HH ruft dich zur Bestätigung an. Bis dahin ist die Bestellung noch nicht bestätigt.',
    'Ваше замовлення отримано. Sushi HH зателефонує для підтвердження. До цього замовлення ще не підтверджене.',
    'Your order has been received. Sushi HH will call you to confirm it. Until then, your order is not yet confirmed.',
    'سفارش شما دریافت شد. رستوران برای تأیید با شما تماس می‌گیرد. تا آن زمان، سفارش هنوز تأیید نشده است.',
  ],
  phoneConfirmationStaff: [
    'Bitte den Kunden anrufen und Bestellung, Lieferzeit und Lieferkosten bestätigen. Danach den Status auf „Bestätigt“ setzen.',
    'Зателефонуйте клієнту та узгодьте замовлення, час і вартість доставки. Потім змініть статус на «Підтверджено».',
    'Call the customer to confirm the order, delivery time and delivery fee. Then change the status to Confirmed.',
    'با مشتری تماس بگیرید و سفارش، زمان و هزینهٔ تحویل را تأیید کنید. سپس وضعیت سفارش را به «تأییدشده» تغییر دهید.',
  ],
  phoneConfirmationRequired: [
    'Telefonische Bestätigung ausstehend',
    'Очікує підтвердження телефоном',
    'Awaiting phone confirmation',
    'در انتظار تأیید تلفنی',
  ],
  signIn: ['Anmelden', 'Увійти', 'Sign in', 'ورود'],
  signUp: [
    'Konto erstellen',
    'Створити кабінет',
    'Create an account',
    'ساخت حساب',
  ],
  signOut: ['Abmelden', 'Вийти', 'Sign out', 'خروج'],
  email: ['E-Mail', 'Електронна пошта', 'Email', 'ایمیل'],
  password: ['Passwort', 'Пароль', 'Password', 'رمز عبور'],
  passwordHint: [
    'Mindestens 12 Zeichen',
    'Щонайменше 12 символів',
    'At least 12 characters',
    'حداقل ۱۲ نویسه',
  ],
  name: [
    'Name / Name an der Klingel',
    'Ім’я / прізвище на дзвінку',
    'Name / name on doorbell',
    'نام / نام روی زنگ',
  ],
  phone: ['Telefon', 'Телефон', 'Phone', 'شماره تلفن'],
  address: [
    'Straße, Hausnummer, PLZ, Ort',
    'Вулиця, номер, індекс, місто',
    'Street, house number, postcode, city',
    'خیابان، پلاک، کد پستی، شهر',
  ],
  date: ['Liefertag', 'День доставки', 'Delivery date', 'روز تحویل'],
  time: ['Wunschzeit', 'Бажаний час', 'Preferred time', 'زمان دلخواه'],
  utensils: [
    'Bestecksets',
    'Кількість приборів',
    'Cutlery sets',
    'تعداد دست قاشق و چنگال',
  ],
  notes: ['Anmerkungen', 'Примітки', 'Order notes', 'توضیحات سفارش'],
  payment: [
    'Zahlung bei Lieferung',
    'Оплата при доставці',
    'Pay on delivery',
    'پرداخت هنگام تحویل',
  ],
  paymentNote: [
    'Die Bestellung wird gespeichert. Verfügbarkeit und Lieferzeit bestätigt Sushi HH.',
    'Замовлення буде збережено. Наявність і час доставки підтверджує Sushi HH.',
    'Your order is saved. Sushi HH confirms availability and delivery time.',
    'سفارش ثبت می‌شود؛ موجودی و زمان تحویل را کیترینگ تأیید می‌کند.',
  ],
  consent: [
    'Ich habe Auswahl, Lieferangaben und Datenschutzhinweise geprüft.',
    'Я перевірив(-ла) замовлення, доставку та політику приватності.',
    'I have checked my order, delivery details and privacy information.',
    'انتخاب غذا، اطلاعات تحویل و توضیحات حریم خصوصی را بررسی کرده‌ام.',
  ],
  placeOrder: [
    'Zahlungspflichtig bestellen',
    'Замовити з оплатою при доставці',
    'Place order · pay on delivery',
    'ثبت سفارش با پرداخت هنگام تحویل',
  ],
  requestQuote: [
    'Bestellung zur Lieferkostenklärung senden',
    'Надіслати для узгодження доставки',
    'Submit order for delivery quote',
    'ثبت درخواست تعیین هزینهٔ ارسال',
  ],
  saving: ['Wird gespeichert …', 'Збереження …', 'Saving …', 'در حال ثبت…'],
  saved: ['Gespeichert', 'Збережено', 'Saved', 'ذخیره شد'],
  error: [
    'Das hat nicht geklappt. Bitte erneut versuchen.',
    'Не вдалося. Спробуйте ще раз.',
    'That did not work. Please try again.',
    'انجام نشد؛ لطفاً دوباره تلاش کنید.',
  ],
  unavailable: [
    'Die Online-Kasse ist momentan nicht verfügbar. Bitte kontaktiere uns.',
    'Онлайн-оформлення зараз недоступне. Зв’яжіться з нами.',
    'Online checkout is currently unavailable. Please contact us.',
    'ثبت آنلاین سفارش فعلاً در دسترس نیست؛ با کیترینگ تماس بگیرید.',
  ],
  orderReceived: [
    'Bestellung eingegangen.',
    'Замовлення отримано.',
    'Order received.',
    'سفارش دریافت شد.',
  ],
  track: [
    'Bestellung verfolgen',
    'Відстежити замовлення',
    'Track your order',
    'پیگیری سفارش',
  ],
  orderNumber: [
    'Bestellnummer',
    'Номер замовлення',
    'Order number',
    'شمارهٔ سفارش',
  ],
  privateLink: [
    'Privaten Tracking-Link kopieren',
    'Копіювати приватне посилання',
    'Copy private tracking link',
    'کپی لینک خصوصی پیگیری',
  ],
  privateNote: [
    'Der Link gewährt Zugriff auf diese Bestellung. Bitte nur privat aufbewahren.',
    'Посилання дає доступ до цього замовлення. Зберігайте його приватно.',
    'This link grants access to this order. Keep it private.',
    'این لینک دسترسی به سفارش را می‌دهد؛ آن را خصوصی نگه دارید.',
  ],
  copied: ['Kopiert', 'Скопійовано', 'Copied', 'کپی شد'],
  refresh: ['Aktualisieren', 'Оновити', 'Refresh', 'به‌روزرسانی'],
  newStatus: ['Eingegangen', 'Отримано', 'Received', 'دریافت‌شده'],
  confirmed: ['Bestätigt', 'Підтверджено', 'Confirmed', 'تأییدشده'],
  preparing: ['In Zubereitung', 'Готується', 'Preparing', 'در حال آماده‌سازی'],
  out_for_delivery: [
    'Unterwegs',
    'У дорозі',
    'Out for delivery',
    'در مسیر ارسال',
  ],
  delivered: ['Geliefert', 'Доставлено', 'Delivered', 'تحویل‌شده'],
  cancelled: ['Storniert', 'Скасовано', 'Cancelled', 'لغوشده'],
  orders: ['Bestellungen', 'Замовлення', 'Orders', 'سفارش‌ها'],
  profile: ['Meine Daten', 'Мої дані', 'My details', 'اطلاعات من'],
  save: ['Speichern', 'Зберегти', 'Save changes', 'ذخیرهٔ تغییرات'],
  changePassword: [
    'Passwort ändern',
    'Змінити пароль',
    'Change password',
    'تغییر رمز عبور',
  ],
  currentPassword: [
    'Aktuelles Passwort',
    'Поточний пароль',
    'Current password',
    'رمز فعلی',
  ],
  newPassword: ['Neues Passwort', 'Новий пароль', 'New password', 'رمز جدید'],
  forgot: [
    'Passwort vergessen?',
    'Забули пароль?',
    'Forgot password?',
    'رمز را فراموش کرده‌اید؟',
  ],
  reset: [
    'Link zum Zurücksetzen anfordern',
    'Отримати посилання для скидання',
    'Request reset link',
    'درخواست لینک بازیابی',
  ],
  resetSent: [
    'Falls ein Konto existiert, erhältst du einen Link per E-Mail.',
    'Якщо кабінет існує, ви отримаєте посилання поштою.',
    'If the account exists, a link will be sent by email.',
    'اگر حساب وجود داشته باشد، لینک به ایمیل ارسال می‌شود.',
  ],
  resetUnavailable: [
    'E-Mail-Versand ist noch nicht eingerichtet. Bitte kontaktiere Sushi HH für einen privaten Wiederherstellungslink.',
    'Надсилання листів ще не налаштовано. Зверніться до Sushi HH для приватного посилання відновлення.',
    'Email delivery is not configured yet. Contact Sushi HH for a private recovery link.',
    'ارسال ایمیل هنوز تنظیم نشده است. برای دریافت لینک خصوصی بازیابی با کیترینگ تماس بگیرید.',
  ],
  noOrders: [
    'Noch keine Bestellungen.',
    'Замовлень ще немає.',
    'No orders yet.',
    'هنوز سفارشی ندارید.',
  ],
  overview: ['Übersicht', 'Огляд', 'Overview', 'نمای کلی'],
  products: ['Produkte', 'Страви', 'Products', 'محصولات'],
  customers: ['Kunden', 'Клієнти', 'Customers', 'مشتریان'],
  pendingOrders: [
    'Offene Bestellungen',
    'Активні замовлення',
    'Open orders',
    'سفارش‌های باز',
  ],
  revenue: [
    'Bezahlter Umsatz',
    'Оплачена виручка',
    'Paid revenue',
    'فروش پرداخت‌شده',
  ],
  edit: ['Bearbeiten', 'Редагувати', 'Edit', 'ویرایش'],
  addProduct: [
    'Produkt hinzufügen',
    'Додати страву',
    'Add product',
    'افزودن محصول',
  ],
  addCustomer: [
    'Kunden einladen',
    'Запросити клієнта',
    'Invite customer',
    'افزودن مشتری',
  ],
  price: ['Preis (€)', 'Ціна (€)', 'Price (€)', 'قیمت (یورو)'],
  weight: ['Gewicht (g)', 'Вага (г)', 'Weight (g)', 'وزن (گرم)'],
  category: ['Kategorie', 'Категорія', 'Category', 'دسته‌بندی'],
  description: [
    'Zutaten / Beschreibung',
    'Склад / опис',
    'Ingredients / description',
    'مواد اولیه / توضیحات',
  ],
  upload: [
    'Foto hochladen',
    'Завантажити фото',
    'Upload photo',
    'بارگذاری عکس',
  ],
  active: [
    'Im Shop sichtbar',
    'Показувати в магазині',
    'Visible in shop',
    'نمایش در فروشگاه',
  ],
  close: ['Schließen', 'Закрити', 'Close', 'بستن'],
  cancel: ['Abbrechen', 'Скасувати', 'Cancel', 'انصراف'],
  paid: ['Bezahlt', 'Оплачено', 'Paid', 'پرداخت‌شده'],
  status: ['Status', 'Статус', 'Status', 'وضعیت'],
  customerNote: [
    'Nachricht für den Kunden',
    'Повідомлення клієнту',
    'Message to customer',
    'یادداشت برای مشتری',
  ],
  disable: [
    'Konto deaktivieren',
    'Вимкнути кабінет',
    'Disable account',
    'غیرفعال کردن حساب',
  ],
  enable: [
    'Konto aktivieren',
    'Увімкнути кабінет',
    'Enable account',
    'فعال کردن حساب',
  ],
  resetLink: [
    'Wiederherstellungslink',
    'Посилання відновлення',
    'Recovery link',
    'لینک بازیابی',
  ],
  resetLinkNote: [
    'Dieser Link ist privat und eine Stunde gültig. Nur dem verifizierten Kunden weitergeben. Passwörter sind nicht einsehbar.',
    'Приватне посилання дійсне годину. Передавайте лише перевіреному клієнту. Паролі недоступні для перегляду.',
    'This private link expires in one hour. Share only with the verified customer. Passwords cannot be viewed.',
    'این لینک خصوصی یک ساعت اعتبار دارد؛ فقط در اختیار مشتری احرازشده قرار دهید. رمزها قابل مشاهده نیستند.',
  ],
  adminDenied: [
    'Dieses Konto hat keinen Teamzugang.',
    'Цей кабінет не має доступу до керування.',
    'This account has no staff access.',
    'این حساب دسترسی مدیریت کیترینگ ندارد.',
  ],
  emailNote: [
    'Für eine Änderung der E-Mail-Adresse kontaktiere bitte Sushi HH.',
    'Для зміни електронної пошти зверніться до Sushi HH.',
    'Contact Sushi HH to change your email address.',
    'برای تغییر ایمیل با کیترینگ تماس بگیرید.',
  ],
  back: ['Zurück', 'Назад', 'Back', 'بازگشت'],
  loading: [
    'Wird geladen …',
    'Завантаження …',
    'Loading …',
    'در حال بارگذاری…',
  ],
  choose: ['Auswählen', 'Обрати', 'Choose', 'انتخاب'],
  deliveryQuote: [
    'Lieferkosten werden zuerst bestätigt. Es wurde noch kein endgültiger Gesamtpreis vereinbart.',
    'Спочатку узгодимо доставку. Остаточну суму ще не підтверджено.',
    'Delivery will be quoted first. A final total has not yet been agreed.',
    'هزینهٔ ارسال ابتدا اعلام می‌شود؛ مبلغ نهایی هنوز توافق نشده است.',
  ],
  requestSent: [
    'Anfrage gespeichert.',
    'Запит збережено.',
    'Request saved.',
    'درخواست ثبت شد.',
  ],
  customer: ['Kunde', 'Клієнт', 'Customer', 'مشتری'],
  updated: [
    'Zuletzt aktualisiert',
    'Останнє оновлення',
    'Last updated',
    'آخرین به‌روزرسانی',
  ],
  language: ['Sprache', 'Мова', 'Language', 'زبان'],
  gallery: ['Fotogalerie', 'Фотогалерея', 'Photo gallery', 'گالری عکس'],
  signInHint: [
    'Bestellungen und Lieferdaten an einem Ort.',
    'Замовлення й адреса в одному місці.',
    'Orders and delivery details in one place.',
    'سفارش‌ها و اطلاعات تحویل در یک‌جا.',
  ],
  catalogNote: [
    'Preise laut Speisekarte · Lieferung zusätzlich',
    'Ціни за меню · доставка окремо',
    'Menu prices · delivery charged separately',
    'قیمت‌ها طبق منوی کیترینگ · ارسال جداگانه',
  ],
  amountDue: [
    'Bei Lieferung fällig',
    'До сплати при доставці',
    'Due on delivery',
    'قابل پرداخت هنگام تحویل',
  ],
  noPassword: [
    'Passwörter bleiben vertraulich.',
    'Паролі залишаються конфіденційними.',
    'Passwords stay private.',
    'رمزها محرمانه باقی می‌مانند.',
  ],
  selected: ['Ausgewählt', 'Обрано', 'Selected', 'انتخاب‌شده'],
  minPhoto: [
    'JPG, PNG oder WebP · bis 12 MB',
    'JPG, PNG або WebP · до 12 МБ',
    'JPG, PNG or WebP · up to 12 MB',
    'JPG، PNG یا WebP · حداکثر ۱۲ مگابایت',
  ],
  deleteCustomer: [
    'Konto löschen',
    'Видалити кабінет',
    'Delete account',
    'حذف حساب',
  ],
  deleteConfirm: [
    'Zum Löschen die E-Mail-Adresse erneut eingeben. Bestehende Bestellungen bleiben erhalten.',
    'Для видалення введіть пошту ще раз. Історія замовлень зберігається.',
    'Retype the email to delete the account. Existing order records are retained.',
    'برای حذف، ایمیل را دوباره وارد کنید. سوابق سفارش‌ها حفظ می‌شوند.',
  ],
} as const;
export type CopyKey = keyof typeof rows;
export const languages: Language[] = ['de', 'uk', 'en', 'fa'];
export function t(lang: Language, key: CopyKey) {
  return rows[key][languages.indexOf(lang)];
}
export function errorText(lang: Language, code: string) {
  if (code === 'INVALID_LINK') return ot(lang, 'invalidLink');
  if (code === 'INVALID_SCHEDULE') return ot(lang, 'invalidSchedule');
  if (code === 'DELIVERY_SLOT_EXPIRED' || code === 'INVALID_DELIVERY')
    return ot(lang, 'slotExpired');
  if (code === 'PAYMENT_DISABLED' || code === 'PAYMENT_UNAVAILABLE')
    return ot(lang, 'missing');
  const commerce: Record<string, Parameters<typeof ct>[1]> = {
    INVALID_COUPON: 'invalidCoupon',
    COUPON_LOGIN_REQUIRED: 'couponLoginRequired',
    COUPON_LIMIT: 'couponLimit',
    DELIVERY_AREA: 'deliveryAreaError',
  };
  if (commerce[code]) return ct(lang, commerce[code]);
  const messages: Record<string, readonly string[]> = {
    REVIEW_ACCOUNT_LOCKED: [
      'Diese gemeinsamen Testkonten behalten ihre Zugangsdaten. Profil und Adresse können bearbeitet werden.',
      'Спільні тестові облікові записи зберігають дані входу. Профіль і адресу можна редагувати.',
      'These shared test accounts keep their sign-in details. Profiles and addresses can be edited.',
      'مشخصات ورود حساب‌های مشترک آزمایشی ثابت می‌ماند. نمایه و نشانی را می‌توانید ویرایش کنید.',
    ],
    INVALID_ARRIVAL: [
      'Bitte eine gültige Ankunftszeit innerhalb der nächsten 30 Tage wählen.',
      'Оберіть дійсний час прибуття протягом наступних 30 днів.',
      'Choose a valid arrival time within the next 30 days.',
      'زمان رسیدن معتبری در بازهٔ ۳۰ روز آینده انتخاب کنید.',
    ],
    MESSAGE_CONFLICT: [
      'Diese Nachricht wurde bereits anders gespeichert. Bitte den Verlauf aktualisieren und eine neue Nachricht senden.',
      'Це повідомлення вже збережено з іншим текстом. Оновіть розмову та надішліть нове повідомлення.',
      'This message was already saved with different text. Refresh the conversation and send a new message.',
      'این پیام قبلاً با متن دیگری ذخیره شده است. گفت‌وگو را به‌روز کنید و پیام تازه‌ای بفرستید.',
    ],
    PRICE_CHANGED: [
      'Preise haben sich geändert. Bitte Warenkorb aktualisieren.',
      'Ціни змінилися. Оновіть кошик.',
      'Prices changed. Refresh your basket.',
      'قیمت تغییر کرده است؛ سبد را به‌روز کنید.',
    ],
    INVALID_DELIVERY: [
      'Bitte einen verfügbaren Liefertag und eine Zeit bis 21 Uhr wählen.',
      'Оберіть доступний день і час до 21:00.',
      'Choose an available delivery date and time before 21:00.',
      'روز مجاز و ساعت تحویل تا ۲۱:۰۰ را انتخاب کنید.',
    ],
    EDIT_CONFLICT: [
      'Inzwischen geändert. Bitte neu laden.',
      'Дані вже змінилися. Оновіть сторінку.',
      'Changed by another session. Please reload.',
      'اطلاعات در نشست دیگری تغییر کرده است؛ دوباره بارگذاری کنید.',
    ],
    TOO_MANY_REQUESTS: [
      'Zu viele Versuche. Bitte etwas warten.',
      'Забагато спроб. Зачекайте.',
      'Too many attempts. Please wait.',
      'تعداد درخواست‌ها زیاد است؛ کمی صبر کنید.',
    ],
    INVALID_CREDENTIALS: [
      'Die Zugangsdaten stimmen nicht.',
      'Неправильні дані входу.',
      'Incorrect sign-in details.',
      'مشخصات ورود نادرست است.',
    ],
    INVALID_EMAIL_OR_PASSWORD: [
      'Die Zugangsdaten stimmen nicht.',
      'Неправильні дані входу.',
      'Incorrect sign-in details.',
      'مشخصات ورود نادرست است.',
    ],
    USER_ALREADY_EXISTS: [
      'Für diese E-Mail gibt es bereits ein Konto.',
      'Для цієї пошти вже існує кабінет.',
      'An account already exists for this email.',
      'برای این ایمیل حسابی وجود دارد.',
    ],
    PRODUCT_UNAVAILABLE: [
      'Ein Produkt ist nicht mehr verfügbar. Bitte den Warenkorb prüfen.',
      'Страва недоступна. Перевірте кошик.',
      'A product is no longer available. Check your basket.',
      'یک محصول دیگر موجود نیست؛ سبد را بررسی کنید.',
    ],
  };
  if (
    code === 'PAYMENT_UNAVAILABLE' ||
    code === 'PAYMENT_PROVIDER_ERROR' ||
    code === 'PAYMENT_NOT_READY'
  )
    return [
      'Zahlung ist noch nicht verfügbar. Bitte Sushi HH kontaktieren.',
      'Оплата поки недоступна. Зв’яжіться з Sushi HH.',
      'Payment is not available yet. Please contact Sushi HH.',
      'پرداخت هنوز در دسترس نیست؛ با کیترینگ تماس بگیرید.',
    ][languages.indexOf(lang)];
  if (code === 'PAYMENT_AMOUNT_LOCKED')
    return [
      'Zahlungsbetrag bereits festgelegt. Zahlung zuerst beim Anbieter klären.',
      'Суму платежу зафіксовано. Спочатку узгодьте її з провайдером.',
      'Payment amount is locked. Resolve the payment with the provider first.',
      'مبلغ پرداخت نهایی شده است؛ ابتدا وضعیت پرداخت را با سرویس مربوط بررسی کنید.',
    ][languages.indexOf(lang)];
  if (code === 'PRODUCT_TEXT_REQUIRED')
    return [
      'Bitte Produktname und Beschreibung in mindestens einer Sprache ausfüllen.',
      'Заповніть назву й опис страви принаймні однією мовою.',
      'Enter a product name and description in at least one language.',
      'نام و توضیح محصول را حداقل به یک زبان وارد کنید.',
    ][languages.indexOf(lang)];
  if (code === 'INVALID_PRODUCT_TEXT')
    return [
      'Produktnamen dürfen höchstens 160 und Beschreibungen höchstens 2000 Zeichen haben.',
      'Назва страви може містити до 160 символів, опис — до 2000.',
      'Product names can have up to 160 characters and descriptions up to 2000.',
      'نام محصول حداکثر ۱۶۰ نویسه و توضیح حداکثر ۲۰۰۰ نویسه باشد.',
    ][languages.indexOf(lang)];
  if (code === 'INVALID_INPUT' || code === 'INVALID_PRODUCT')
    return [
      'Bitte die Pflichtfelder und Zahlenwerte prüfen.',
      'Перевірте обов’язкові поля та числові значення.',
      'Check the required fields and numeric values.',
      'فیلدهای ضروری و مقدارهای عددی را بررسی کنید.',
    ][languages.indexOf(lang)];
  if (code === 'SHOP_UNAVAILABLE') return t(lang, 'unavailable');
  if (code === 'EMAIL_NOT_CONFIGURED') return t(lang, 'resetUnavailable');
  return messages[code]?.[languages.indexOf(lang)] || t(lang, 'error');
}
export const statusKey = (s: string): CopyKey =>
  s === 'new'
    ? 'newStatus'
    : (([
        'confirmed',
        'preparing',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ].includes(s)
        ? s
        : 'status') as CopyKey);
