import type { Language } from "@/lib/catalog";
const copy = {
  de: { title: "Testversion", notice: "Diese Vorschau ist zum Testen. Bestellungen sind unverbindlich; es werden keine Zahlungen oder E-Mails versendet.", login: "Mit dem bereitgestellten Testkonto anmelden.", username: "Benutzername", order: "Testbestellung aufgeben" },
  en: { title: "Review version", notice: "This preview is for testing. Orders are not binding; no payments or emails are sent.", login: "Sign in with the test account provided to you.", username: "Username", order: "Place test order" },
  uk: { title: "Тестова версія", notice: "Це попередня версія для тестування. Замовлення не є обов’язковими; платежі та електронні листи не надсилаються.", login: "Увійдіть за допомогою наданого тестового облікового запису.", username: "Ім’я користувача", order: "Оформити тестове замовлення" },
  fa: { title: "نسخه آزمایشی", notice: "این نسخه برای آزمایش است. سفارش‌ها واقعی و الزام‌آور نیستند؛ هیچ پرداخت یا ایمیلی ارسال نمی‌شود.", login: "با حساب آزمایشی که به شما داده شده وارد شوید.", username: "نام کاربری", order: "ثبت سفارش آزمایشی" },
};
export function reviewCopy(lang: Language) { return copy[lang]; }
