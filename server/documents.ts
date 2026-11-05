import type { OrderRow, DocumentRow } from './types';
import type { OrderCustomer, OrderItem } from '../lib/shop-types';
import type { ShopSettings, TaxSummary } from '../lib/commerce';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fonts from './pdf-fonts.json';
import type { ShopEnv } from './auth';
import { getSettings } from './commerce';
import { fromBase64, toBase64, capability } from './secrets';
import { enqueueMail } from './mail';
import { fail } from './validation';
export const documentKinds = ['invoice', 'summary', 'receipt'] as const;
type DocumentKind = (typeof documentKinds)[number];
type OrderSnapshot = Omit<OrderRow, 'customer' | 'items' | 'tax'> & {
  customer: OrderCustomer;
  items: OrderItem[];
  tax: TaxSummary | null;
  issuer: ShopSettings['issuer'];
};
type OrderDocument = OrderSnapshot & {
  kind: DocumentKind;
  documentNumber: string;
  issuedAt: number;
  draft: boolean;
};
const isDocumentKind = (value: string): value is DocumentKind =>
  documentKinds.some((kind) => kind === value);
export async function ensureDocuments(env: ShopEnv, orderId: string) {
  const row = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
    .bind(orderId)
    .first<OrderRow>();
  if (!row || row.status === 'cancelled' || row.total === null) return;
  if (
    !row.paid &&
    !(row.payment === 'cash_on_delivery' && row.status !== 'new')
  )
    return;
  const settings = await getSettings(env),
    snapshot: OrderSnapshot = {
      ...row,
      customer: JSON.parse(row.customer),
      items: JSON.parse(row.items),
      tax: row.tax ? JSON.parse(row.tax) : null,
      issuer: settings.issuer,
    };
  const original = await env.DB.prepare(
    "SELECT snapshot FROM order_documents WHERE order_id=? AND kind='invoice'",
  )
    .bind(row.id)
    .first<{ snapshot: string }>();
  if (original) snapshot.issuer = JSON.parse(original.snapshot).issuer;
  // Legal seller details must be entered before issuing invoices or emailing them.
  if (
    !snapshot.issuer.name ||
    !snapshot.issuer.address ||
    !snapshot.issuer.taxId
  )
    return;
  for (const kind of documentKinds) {
    if (kind === 'receipt' && !row.paid) continue;
    await env.DB.prepare(
      'INSERT OR IGNORE INTO order_documents(order_id,kind,snapshot,created_at) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM order_documents WHERE order_id=? AND kind=?)',
    )
      .bind(row.id, kind, JSON.stringify(snapshot), Date.now(), row.id, kind)
      .run();
  }
  if (snapshot.customer.email)
    await enqueueMail(
      env,
      `documents-${row.id}-${row.paid ? 'paid' : 'confirmed'}`,
      'documents',
      snapshot.customer.email,
      { orderId: row.id },
    );
}
export async function getDocument(
  env: ShopEnv,
  order: OrderRow,
  kind: string,
): Promise<OrderDocument> {
  if (!isDocumentKind(kind)) fail('NOT_FOUND', 404);
  if (kind === 'receipt' && !order.paid) fail('PAYMENT_NOT_READY');
  await ensureDocuments(env, order.id);
  const doc = await env.DB.prepare(
    'SELECT * FROM order_documents WHERE order_id=? AND kind=?',
  )
    .bind(order.id, kind)
    .first<DocumentRow>();
  if (doc)
    return {
      ...(JSON.parse(doc.snapshot) as OrderSnapshot),
      documentNumber: `HH-${String(doc.number).padStart(7, '0')}`,
      issuedAt: doc.created_at,
      kind,
      draft: false,
    };
  return {
    ...order,
    customer: JSON.parse(order.customer),
    items: JSON.parse(order.items),
    tax: order.tax ? JSON.parse(order.tax) : null,
    issuer: (await getSettings(env)).issuer,
    kind,
    documentNumber: order.id.slice(0, 8).toUpperCase(),
    issuedAt: Date.now(),
    draft: true,
  };
}
export async function renderDocument(d: OrderDocument) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const latin = await pdf.embedFont(fromBase64(fonts.latin), { subset: true }),
    persian = await pdf.embedFont(fromBase64(fonts.persian), { subset: true });
  pdf.setCreationDate(new Date(d.issuedAt));
  pdf.setModificationDate(new Date(d.issuedAt));
  pdf.setTitle(`Sushi HH ${d.kind} ${d.documentNumber}`);
  pdf.setAuthor('Sushi HH');
  let page = pdf.addPage([595.28, 841.89]),
    y = 790;
  const ink = rgb(0.15, 0.23, 0.19),
    accent = rgb(0.68, 0.27, 0.18);
  const runs = (s: string) =>
    (
      s.match(
        /[\u0600-\u06ff][\u0600-\u06ff\s\u200c\u200f]*|[^\u0600-\u06ff]+/g,
      ) || []
    ).map((value) => ({
      value,
      font: /[\u0600-\u06ff]/.test(value) ? persian : latin,
    }));
  const width = (s: string, size: number) =>
    runs(s).reduce((n, r) => n + r.font.widthOfTextAtSize(r.value, size), 0);
  const text = (value: string | number | null | undefined, size = 10) => {
    const s = Array.from(String(value ?? ''), (character) =>
      character.charCodeAt(0) < 32 ? ' ' : character,
    ).join('');
    const draw = (v: string) => {
      if (y < 65) {
        page = pdf.addPage([595.28, 841.89]);
        y = 785;
      }
      let x = 45;
      for (const r of runs(v)) {
        page.drawText(r.value, { x, y, size, font: r.font, color: ink });
        x += r.font.widthOfTextAtSize(r.value, size);
      }
      y -= size + 7;
    };
    let line = '';
    for (const word of s.split(/\s+/)) {
      const next = line ? line + ' ' + word : word;
      if (width(next, size) <= 505) {
        line = next;
        continue;
      }
      if (line) draw(line);
      line = '';
      for (const char of word) {
        if (width(line + char, size) > 505) {
          draw(line);
          line = '';
        }
        line += char;
      }
    }
    if (line) draw(line);
  };
  page.drawRectangle({ x: 0, y: 822, width: 595, height: 20, color: accent });
  text('SUSHI HH', 24);
  text('Sushi-Catering · Hamburg', 11);
  y -= 15;
  text(
    {
      invoice: 'Rechnung',
      summary: 'Bestellübersicht',
      receipt: 'Zahlungsbeleg',
    }[d.kind] + (d.draft ? ' - ENTWURF / DRAFT' : ''),
    20,
  );
  text(
    `${d.documentNumber} · ${new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'medium' }).format(new Date(d.issuedAt))}`,
  );
  y -= 10;
  text(d.issuer.name || 'Verkäuferangaben noch nicht hinterlegt');
  text(d.issuer.address);
  text(d.issuer.email);
  text(
    d.issuer.taxId
      ? `Steuernummer / USt-IdNr.: ${d.issuer.taxId}`
      : 'Steuerangaben fehlen',
  );
  y -= 12;
  text('Kunde / Lieferung', 12);
  text(d.customer.name);
  text(d.customer.address);
  text(`${d.customer.postcode || ''} ${d.customer.city || 'Hamburg'}`);
  text(d.customer.email);
  text(`Bestellung: ${d.id}`);
  text(`Liefertermin: ${d.date} · ${d.time} (Europe/Berlin)`);
  y -= 10;
  const eur = (n: number) => `${(n / 100).toFixed(2)} EUR`;
  for (const i of d.items) {
    text(
      `${i.quantity} × ${i.name.de} · ${eur(i.price)} = ${eur(i.quantity * i.price)}`,
      11,
    );
  }
  y -= 12;
  text(`Speisen: ${eur(d.subtotal)}`);
  if (d.discount) text(`Rabatt: -${eur(d.discount)}`);
  text(
    `Lieferung: ${d.delivery === null ? 'Wird bestätigt' : eur(d.delivery)}`,
  );
  text(`Gesamt: ${d.total === null ? 'Wird bestätigt' : eur(d.total)}`, 15);
  if (d.tax?.mode === 'small_business')
    text('Steuerbefreiung für Kleinunternehmer gemäß § 19 UStG.');
  else if (d.tax?.vat != null)
    text(`Enthaltene Umsatzsteuer: ${eur(d.tax.vat)}`);
  text(d.paid ? 'Zahlung bestätigt' : 'Zahlung noch offen');
  text(
    `Zahlungsart: ${d.payment === 'cash_on_delivery' ? 'Barzahlung bei Lieferung' : d.payment}`,
  );
  if (d.kind === 'receipt') {
    text(
      `Zahlungseingang: ${new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d.paid_at || d.issuedAt))}`,
    );
  }
  if (d.kind === 'summary') {
    text(`Telefon: ${d.customer.phone}`);
    text(`Besteck: ${d.customer.utensils}`);
    text(d.customer.notes);
  }
  if (d.draft) {
    y -= 10;
    text(
      'Vorschau - keine ausgestellte Rechnung. Verkäuferangaben oder Bestätigung fehlen.',
      10,
    );
  }
  for (const [i, p] of pdf.getPages().entries())
    p.drawText(`Sushi HH · ${i + 1} / ${pdf.getPageCount()}`, {
      x: 45,
      y: 32,
      font: latin,
      size: 9,
      color: ink,
    });
  return pdf.save();
}
export async function documentMail(env: ShopEnv, id: string, origin: string) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
    .bind(id)
    .first<OrderRow>();
  if (!order || order.status === 'cancelled') throw Error('ORDER_CANCELLED');
  const docs = await env.DB.prepare(
    'SELECT * FROM order_documents WHERE order_id=? ORDER BY number',
  )
    .bind(id)
    .all<DocumentRow>();
  const attachments = [];
  for (const doc of docs.results) {
    if (!isDocumentKind(doc.kind)) throw Error('INVALID_DOCUMENT_KIND');
    const d: OrderDocument = {
      ...(JSON.parse(doc.snapshot) as OrderSnapshot),
      kind: doc.kind,
      documentNumber: `HH-${String(doc.number).padStart(7, '0')}`,
      issuedAt: doc.created_at,
      draft: false,
    };
    attachments.push({
      filename: `Sushi-HH-${doc.kind}-${d.documentNumber}.pdf`,
      content: toBase64(await renderDocument(d)),
    });
  }
  if (!attachments.length) throw Error('DOCUMENTS_NOT_READY');
  const token = order.user_id ? '' : await capability(env, 'order:' + id);
  return {
    subject: `Sushi HH · Bestellung ${id.slice(0, 8).toUpperCase()}`,
    text: `Ihre Bestellunterlagen / Your order documents / Документи замовлення / اسناد سفارش\n\n${env.SHOP_ORIGIN || origin}/order?id=${id}${token ? '#token=' + token : ''}`,
    attachments,
  };
}
