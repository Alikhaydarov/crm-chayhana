"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, Search, ShoppingCart } from "lucide-react";
import { PageWrap } from "@/components/ui";
import { BRANCH_NAMES } from "@/lib/constants";
import { fmtM } from "@/lib/utils";
import type { Company, CompanyPayment, Order } from "@/types/domain";
import type { DamageRequest } from "@/types";

type Filter = "all" | "orders" | "payments" | "damages";
type Event = { id: string; type: "order" | "payment" | "damage"; date: string; company: string; amount: number; detail: string; orderId: string };

const dayKey = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function HistoryTab({ orders, payments, companies, damages, lang }: { orders: Order[]; payments: CompanyPayment[]; companies: Company[]; damages: DamageRequest[]; lang: string }) {
  const today = dayKey();
  const [selectedDay, setSelectedDay] = useState(today);
  const [month, setMonth] = useState(() => new Date(`${today}T12:00:00`));
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const locale = lang === "ko" ? "ko-KR" : "uz-UZ";
  const companyMap = useMemo(() => new Map(companies.map((company) => [company.id, company.name])), [companies]);
  const events = useMemo<Event[]>(() => [
    ...orders.map((order) => ({ id: `order-${order.id}`, type: "order" as const, date: dayKey(order.orderDate || order.createdAt), company: order.companyName || companyMap.get(order.companyId) || "Firma", amount: order.totalPrice, detail: `${order.items.length} ta mahsulot`, orderId: order.id })),
    ...payments.map((payment) => ({ id: `payment-${payment.id}`, type: "payment" as const, date: dayKey(payment.paymentDate || payment.createdAt), company: companyMap.get(payment.companyId) || "Firma", amount: payment.amount, detail: `${payment.paymentMethod === "card" ? "Karta" : "Naqd"}${payment.note ? ` · ${payment.note}` : ""}`, orderId: payment.orderId })),
    ...damages.map((damage) => ({ id: `damage-${damage.id}`, type: "damage" as const, date: dayKey(damage.updatedAt || damage.createdAt), company: BRANCH_NAMES[damage.branch] || damage.branch, amount: damage.quantity, detail: `${damage.productName} · ${damage.reason}`, orderId: damage.id })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [orders, payments, damages, companyMap]);

  const counts = useMemo(() => events.reduce<Record<string, { orders: number; payments: number; damages: number }>>((acc, event) => {
    acc[event.date] ||= { orders: 0, payments: 0, damages: 0 };
    const key = event.type === "order" ? "orders" : event.type === "payment" ? "payments" : "damages";
    acc[event.date][key] += 1;
    return acc;
  }, {}), [events]);
  const visible = events.filter((event) => event.date === selectedDay && (filter === "all" || `${event.type}s` === filter) && `${event.company} ${event.detail} ${event.orderId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selectedOrders = events.filter((event) => event.date === selectedDay && event.type === "order");
  const selectedPayments = events.filter((event) => event.date === selectedDay && event.type === "payment");
  const selectedDamages = events.filter((event) => event.date === selectedDay && event.type === "damage");
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  const changeMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return <PageWrap title="Tarix" sub="Orderlar va firmalarga qilingan to'lovlar">
    <div className="history-summary">
      <div><ShoppingCart size={18} /><span>Tanlangan kundagi orderlar</span><strong>{fmtM(selectedOrders.reduce((sum, event) => sum + event.amount, 0))}</strong><small>{selectedOrders.length} ta order</small></div>
      <div><CircleDollarSign size={18} /><span>Tanlangan kundagi to'lovlar</span><strong>{fmtM(selectedPayments.reduce((sum, event) => sum + event.amount, 0))}</strong><small>{selectedPayments.length} ta to'lov</small></div>
      <div><AlertTriangle size={18} /><span>Tanlangan kundagi braklar</span><strong>{selectedDamages.reduce((sum, event) => sum + event.amount, 0)}</strong><small>{selectedDamages.length} ta brak</small></div>
    </div>
    <div className="history-layout">
      <section className="history-calendar">
        <div className="history-calendar-head"><button onClick={() => changeMonth(-1)} aria-label="Oldingi oy"><ChevronLeft /></button><strong>{month.toLocaleDateString(locale, { month: "long", year: "numeric" })}</strong><button onClick={() => changeMonth(1)} aria-label="Keyingi oy"><ChevronRight /></button></div>
        <div className="history-weekdays">{(lang === "ko" ? ["월","화","수","목","금","토","일"] : ["Du","Se","Ch","Pa","Ju","Sh","Ya"]).map(day => <span key={day}>{day}</span>)}</div>
        <div className="history-days">{days.map((date) => { const key = dayKey(date.toISOString()); const count = counts[key] as any; return <button key={key} className={`${date.getMonth() !== month.getMonth() ? "outside " : ""}${key === today ? "today " : ""}${key === selectedDay ? "selected" : ""}`} onClick={() => setSelectedDay(key)}><span>{date.getDate()}</span>{count && <div><i className="order-dot" />{count.payments > 0 && <i className="payment-dot" />}{count.damages > 0 && <i className="damage-dot" />}</div>}</button>; })}</div>
        <button className="history-today" onClick={() => { const now = new Date(); setMonth(now); setSelectedDay(today); }}><CalendarDays size={15} /> Bugun</button>
      </section>
      <section className="history-events">
        <div className="history-toolbar"><div className="history-filters">{(["all", "orders", "payments", "damages"] as Filter[]).map(value => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "Barchasi" : value === "orders" ? "Orderlar" : value === "payments" ? "To'lovlar" : "Braklar"}</button>)}</div><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Firma, sklad yoki ID" /></label></div>
        <div className="history-date-title"><strong>{new Date(`${selectedDay}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</strong><span>{visible.length} ta harakat</span></div>
        <div className="history-event-list">{visible.map(event => <article key={event.id}><div className={`history-event-icon ${event.type}`} >{event.type === "order" ? <ShoppingCart size={17} /> : event.type === "payment" ? <CircleDollarSign size={17} /> : <AlertTriangle size={17} />}</div><div className="history-event-main"><strong>{event.company}</strong><span>{event.type === "order" ? "Yangi order" : event.type === "payment" ? "Firma to'lovi" : "Brak tasdiqlash"} · #{event.orderId.slice(-8)}</span><small>{event.detail}</small></div><div className={`history-event-amount ${event.type}`}><strong>{event.type === "payment" ? "+" : event.type === "damage" ? "-" : ""}{event.type === "damage" ? event.amount : fmtM(event.amount)}</strong><span>{event.type === "order" ? "Order" : event.type === "payment" ? "To'lov" : "Brak"}</span></div></article>)}{!visible.length && <div className="history-empty"><CalendarDays size={28} /><strong>Bu kunda tarix yo'q</strong><span>Boshqa sana yoki filtrni tanlang</span></div>}</div>
      </section>
    </div>
  </PageWrap>;
}
