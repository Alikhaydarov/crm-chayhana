"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeftRight, Bell, Check, CheckCheck,
  CreditCard, PackageX, ReceiptText, X,
} from "lucide-react";
import type { TabId } from "@/types";

export type AdminNotification = {
  id: string;
  type: "transfer" | "stock" | "order" | "payment";
  title: string;
  description: string;
  createdAt: string;
  tab: TabId;
  level: "info" | "success" | "warning" | "danger";
};

const ICONS = {
  transfer: ArrowLeftRight,
  stock: PackageX,
  order: ReceiptText,
  payment: CreditCard,
};

function relativeTime(value: string) {
  if (!value) return "Joriy holat";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Hozir";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Hozir";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}

export function AdminNotifications({
  notifications,
  onNavigate,
}: {
  notifications: AdminNotification[];
  onNavigate: (tab: TabId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [readIds, setReadIds] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setReadIds(JSON.parse(localStorage.getItem("crm-admin-read-notifications") || "[]"));
    } catch {
      setReadIds([]);
    }
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unreadCount = notifications.filter(item => !readIds.includes(item.id)).length;
  const visible = useMemo(
    () => filter === "all" ? notifications : notifications.filter(item => !readIds.includes(item.id)),
    [filter, notifications, readIds],
  );

  const saveRead = (ids: string[]) => {
    const unique = Array.from(new Set(ids)).slice(-500);
    setReadIds(unique);
    localStorage.setItem("crm-admin-read-notifications", JSON.stringify(unique));
  };

  const openItem = (item: AdminNotification) => {
    saveRead([...readIds, item.id]);
    setOpen(false);
    onNavigate(item.tab);
  };

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        className={`topbar-control alert-control${open ? " active" : ""}`}
        title={`${unreadCount} ta yangi bildirishnoma`}
        onClick={() => setOpen(value => !value)}
      >
        <Bell size={17} />
        {unreadCount > 0 && <span>{Math.min(unreadCount, 99)}</span>}
      </button>

      {open && (
        <section className="notification-panel">
          <header className="notification-header">
            <div>
              <strong>Faoliyat markazi</strong>
              <small>{unreadCount ? `${unreadCount} ta yangi xabar` : "Hammasi ko'rilgan"}</small>
            </div>
            <button className="icon-control" title="Yopish" onClick={() => setOpen(false)}><X size={16} /></button>
          </header>

          <div className="notification-toolbar">
            <div className="notification-tabs">
              <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Barchasi</button>
              <button className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>
                Yangi {unreadCount > 0 && <span>{unreadCount}</span>}
              </button>
            </div>
            {unreadCount > 0 && (
              <button className="mark-read" onClick={() => saveRead([...readIds, ...notifications.map(item => item.id)])}>
                <CheckCheck size={15} /> Hammasini o'qish
              </button>
            )}
          </div>

          <div className="notification-list">
            {visible.map(item => {
              const Icon = ICONS[item.type];
              const unread = !readIds.includes(item.id);
              return (
                <button key={item.id} className={`notification-item ${item.level}${unread ? " unread" : ""}`} onClick={() => openItem(item)}>
                  <span className="notification-icon"><Icon size={18} /></span>
                  <span className="notification-copy">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                    <time>{relativeTime(item.createdAt)}</time>
                  </span>
                  {unread ? <i /> : <Check size={15} />}
                </button>
              );
            })}
            {!visible.length && (
              <div className="notification-empty">
                <AlertTriangle size={22} />
                <strong>Yangi faoliyat yo'q</strong>
                <span>O'zgarishlar shu yerda ko'rinadi.</span>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
