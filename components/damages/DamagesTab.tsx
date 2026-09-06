"use client";

import { Fragment, memo, useCallback, useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ImagePlus, Search, TrendingDown, XCircle } from "lucide-react";
import { PageWrap, Modal } from "@/components/ui";
import { CameraCodeScanner } from "@/components/products/CameraCodeScanner";
import { approveDamageRequestApi, createDamageRequestApi, rejectDamageRequestApi } from "@/lib/api";
import { BRANCH_ICONS, BRANCH_NAMES, TRANSFER_STATUS_CONFIG } from "@/lib/constants";
import { fmt, fmtD, fmtDate, fmtM } from "@/lib/utils";
import type { DamageRequest, Product, StockMap, UserInfo } from "@/types";
import type { OrderReceipt } from "@/types/domain";

type Props = {
  damages: DamageRequest[];
  products: Product[];
  stock: StockMap;
  user: UserInfo;
  fetchAll: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  t: Record<string, string>;
};

function fileToReceipt(file: File): Promise<OrderReceipt> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: String(reader.result || "") });
    reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
    reader.readAsDataURL(file);
  });
}

const DamageCard = memo(function DamageCard({
  damage,
  isSA,
  loading,
  onOpen,
  onApprove,
  onReject,
}: {
  damage: DamageRequest;
  isSA: boolean;
  loading: boolean;
  onOpen: (damage: DamageRequest) => void;
  onApprove: (damage: DamageRequest) => void;
  onReject: (damage: DamageRequest) => void;
}) {
  const st = TRANSFER_STATUS_CONFIG[damage.status as keyof typeof TRANSFER_STATUS_CONFIG];
  return (
    <article className="damage-card" style={{ cursor: "pointer" }} onClick={() => onOpen(damage)}>
      <div className="damage-card-media">
        {damage.image?.dataUrl ? <img src={damage.image.dataUrl} alt="" /> : <AlertTriangle size={22} />}
      </div>
      <div className="damage-card-main">
        <div className="damage-card-title">
          <strong>{damage.productName}</strong>
          <span className="badge" style={{ background: st.bg, color: st.c }}>{st.i} {st.l}</span>
        </div>
        <div className="damage-card-meta">
          {BRANCH_ICONS[damage.branch] || "🏢"} {BRANCH_NAMES[damage.branch] || damage.branch} · {fmt(damage.quantity)} {damage.unit} · {fmtD(damage.createdAt)}
        </div>
        <p>{damage.reason}</p>
      </div>
      {isSA && damage.status === "pending" && (
        <div className="damage-actions" onClick={(event) => event.stopPropagation()}>
          <button className="btn-ghost" disabled={loading} onClick={() => onReject(damage)}>
            <XCircle size={15} /> Rad
          </button>
          <button className="btn-primary" disabled={loading} onClick={() => onApprove(damage)}>
            <CheckCircle2 size={15} /> Accept
          </button>
        </div>
      )}
    </article>
  );
});

export function DamagesTab({ damages, products, stock, user, fetchAll, showToast, t }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<DamageRequest | null>(null);
  const [form, setForm] = useState<{ branch: string; productId: string; quantity: number; reason: string }>({
    branch: user.role === "superadmin" ? "shop" : user.role,
    productId: "",
    quantity: 1,
    reason: "",
  });
  const [image, setImage] = useState<OrderReceipt | undefined>();
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [filterText, setFilterText] = useState("");

  const isSA = user.role === "superadmin";
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const inStockProducts = useMemo(
    () => products.filter((product) => Number(stock[product.id] || 0) > 0),
    [products, stock],
  );
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const source = needle
      ? inStockProducts.filter((product) =>
          `${product.name} ${product.qrCode || ""} ${product.category}`.toLocaleLowerCase().includes(needle),
        )
      : inStockProducts;
    return source.slice(0, 80);
  }, [inStockProducts, query]);

  const selectedStock = form.productId ? Number(stock[form.productId] || 0) : 0;

  const periodStart = useMemo(() => {
    const now = new Date();
    if (filterPeriod === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filterPeriod === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    if (filterPeriod === "month") { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    return null;
  }, [filterPeriod]);

  const matchesBranchAndText = useCallback((damage: DamageRequest) => {
    if (isSA && filterBranch !== "all" && damage.branch !== filterBranch) return false;
    const needle = filterText.trim().toLocaleLowerCase();
    if (needle && !`${damage.productName} ${damage.reason}`.toLocaleLowerCase().includes(needle)) return false;
    return true;
  }, [isSA, filterBranch, filterText]);

  const pending = useMemo(
    () => damages.filter((damage) => damage.status === "pending" && matchesBranchAndText(damage)),
    [damages, matchesBranchAndText],
  );
  const history = useMemo(() => {
    return damages.filter((damage) =>
      damage.status !== "pending"
      && matchesBranchAndText(damage)
      && (!periodStart || new Date(damage.createdAt) >= periodStart),
    );
  }, [damages, matchesBranchAndText, periodStart]);

  const damageValue = useCallback(
    (damage: DamageRequest) => damage.quantity * (productMap.get(damage.productId)?.pricePerUnit || 0),
    [productMap],
  );

  const approvedHistory = useMemo(() => history.filter((damage) => damage.status === "approved"), [history]);
  const rejectedCount = useMemo(() => history.filter((damage) => damage.status === "rejected").length, [history]);
  const totalDamageValue = useMemo(
    () => approvedHistory.reduce((sum, damage) => sum + damageValue(damage), 0),
    [approvedHistory, damageValue],
  );

  const branchBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    approvedHistory.forEach((damage) => map.set(damage.branch, (map.get(damage.branch) || 0) + damageValue(damage)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [approvedHistory, damageValue]);

  const productBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; value: number; qty: number; unit: string }>();
    approvedHistory.forEach((damage) => {
      const current = map.get(damage.productId) || { name: damage.productName, value: 0, qty: 0, unit: damage.unit };
      current.value += damageValue(damage);
      current.qty += damage.quantity;
      map.set(damage.productId, current);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [approvedHistory, damageValue]);

  const maxBranchValue = branchBreakdown[0]?.[1] || 0;
  const maxProductValue = productBreakdown[0]?.value || 0;

  const historyGroups = useMemo(() => {
    const groups: { key: string; label: string; items: DamageRequest[] }[] = [];
    const indexByKey = new Map<string, number>();
    history.forEach((damage) => {
      const key = new Date(damage.createdAt).toDateString();
      let idx = indexByKey.get(key);
      if (idx === undefined) {
        idx = groups.length;
        indexByKey.set(key, idx);
        groups.push({ key, label: fmtDate(damage.createdAt), items: [] });
      }
      groups[idx].items.push(damage);
    });
    return groups;
  }, [history]);

  const detectProduct = (code: string) => {
    setScannerOpen(false);
    const normalized = code.trim();
    const found = inStockProducts.find((product) => String(product.qrCode || "").trim() === normalized);
    if (!found) {
      const existsButEmpty = products.find((product) => String(product.qrCode || "").trim() === normalized);
      setQuery(code);
      showToast(
        existsButEmpty ? "Bu mahsulot ushbu skladda qolmagan" : "Bu shtrix-koddagi mahsulot topilmadi",
        "error",
      );
      return;
    }
    setForm((current) => ({ ...current, productId: found.id, quantity: 1 }));
    setQuery(found.name);
    showToast(`${found.name} tanlandi · skladda ${fmt(Number(stock[found.id] || 0))} ${found.unit}`);
  };

  const submit = async () => {
    if (!form.productId) {
      showToast("Mahsulot tanlang", "error");
      return;
    }
    if (form.quantity <= 0) {
      showToast("Miqdor noto'g'ri", "error");
      return;
    }
    if (selectedStock <= 0) {
      showToast("Bu mahsulot ushbu skladda qolmagan", "error");
      return;
    }
    if (form.quantity > selectedStock) {
      showToast(`Skladda faqat ${fmt(selectedStock)} ${productMap.get(form.productId)?.unit || ""} bor`, "error");
      return;
    }
    if (form.reason.trim().length < 3) {
      showToast("Brak sababini yozing", "error");
      return;
    }
    if (!image) {
      showToast("Brak rasmini kiriting", "error");
      return;
    }

    setLoading(true);
    const result = await createDamageRequestApi({
      ...form,
      branch: user.role,
      reason: form.reason.trim(),
      image,
    });
    setLoading(false);

    if (!result.success) {
      showToast((result as any).message || "Xatolik", "error");
      return;
    }

    showToast("Brak so'rovi adminga yuborildi");
    setShowModal(false);
    setImage(undefined);
    setForm({ branch: user.role, productId: "", quantity: 1, reason: "" });
    setQuery("");
    fetchAll();
  };

  const action = useCallback(async (damage: DamageRequest, type: "approve" | "reject") => {
    setLoading(true);
    const result = type === "approve"
      ? await approveDamageRequestApi(damage.id, user.name)
      : await rejectDamageRequestApi(damage.id, user.name);
    setLoading(false);

    if (!result.success) {
      showToast((result as any).message || "Xatolik", "error");
      return;
    }
    showToast(type === "approve" ? "Brak tasdiqlandi va skladdan ayrildi" : "Brak rad etildi");
    setDetail((current) => (current?.id === damage.id ? null : current));
    fetchAll();
  }, [fetchAll, showToast, user.name]);

  const handleApprove = useCallback((damage: DamageRequest) => action(damage, "approve"), [action]);
  const handleReject = useCallback((damage: DamageRequest) => action(damage, "reject"), [action]);

  return (
    <PageWrap
      title={t.damageRequests || "Brak so'rovlari"}
      sub="Brak mahsulotlar tarixi va skladdan ayrish"
      action={!isSA && (
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          {t.newDamageRequest || "+ Brak yuborish"}
        </button>
      )}
    >
      {showModal && (
        <Modal onClose={() => !loading && setShowModal(false)} className="damage-modal">
          <div className="modal-title">Brak so'rovi</div>

          <div className="damage-form-grid">
            <div className="form-group">
              <label className="form-label">YUBORUVCHI SKLAD</label>
              <div className="crm-input">{user.branchIcon || BRANCH_ICONS[user.role]} {user.branchName}</div>
            </div>
            <div className="form-group">
              <label className="form-label">SONI</label>
              <input
                className="crm-input"
                type="number"
                min={1}
                max={selectedStock || undefined}
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) || 1 })}
              />
              {form.productId && (
                <small className="damage-selected">
                  Skladda: {fmt(selectedStock)} {productMap.get(form.productId)?.unit || ""}
                </small>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">MAHSULOT</label>
            <div className="damage-search-row">
              <button type="button" className="btn-ghost" onClick={() => setScannerOpen(true)}>
                <Camera size={15} /> Skan
              </button>
              <label>
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nomi yoki shtrix-kod"
                />
              </label>
            </div>
            <select
              className="crm-input"
              value={form.productId}
              onChange={(event) => setForm({ ...form, productId: event.target.value, quantity: 1 })}
            >
              <option value="">Mahsulot tanlang</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · skladda {fmt(Number(stock[product.id] || 0))} {product.unit} · {product.qrCode || "kod yo'q"}
                </option>
              ))}
            </select>
            {!inStockProducts.length && (
              <small className="damage-selected">Bu skladda brakka chiqarish uchun mahsulot yo'q.</small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t.damageReason || "BRAK SABABI"}</label>
            <textarea
              className="crm-input"
              rows={3}
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.damageImage || "BRAK RASMI"}</label>
            <label className="damage-upload">
              <ImagePlus size={17} />
              <span>{image ? image.name : "JPG, PNG yoki WEBP, 10 MB gacha"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                    showToast("Faqat JPG, PNG yoki WEBP rasm", "error");
                    return;
                  }
                  if (file.size > 10 * 1024 * 1024) {
                    showToast("Rasm 10 MB dan kichik bo'lishi kerak", "error");
                    return;
                  }
                  try {
                    setImage(await fileToReceipt(file));
                  } catch {
                    showToast("Rasmni o'qib bo'lmadi", "error");
                  }
                }}
              />
            </label>
          </div>

          <div className="modal-actions" style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" disabled={loading} onClick={() => setShowModal(false)} style={{ flex: 1 }}>
              {t.cancel}
            </button>
            <button className="btn-primary" disabled={loading || !inStockProducts.length} onClick={submit} style={{ flex: 2 }}>
              {loading ? "Yuborilmoqda..." : t.send}
            </button>
          </div>

          <CameraCodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={detectProduct} />
        </Modal>
      )}

      {detail && (() => {
        const st = TRANSFER_STATUS_CONFIG[detail.status as keyof typeof TRANSFER_STATUS_CONFIG];
        return (
          <Modal onClose={() => !loading && setDetail(null)}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 18,
              }}
            >
              <div className="modal-title" style={{ margin: 0 }}>{detail.productName}</div>
              <span className="badge" style={{ background: st.bg, color: st.c }}>{st.i} {st.l}</span>
            </div>

            {detail.image?.dataUrl ? (
              <img
                src={detail.image.dataUrl}
                alt=""
                style={{
                  width: "100%",
                  maxHeight: 360,
                  objectFit: "contain",
                  borderRadius: 12,
                  background: "var(--app-panel-soft)",
                  marginBottom: 16,
                }}
              />
            ) : (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: 160,
                  borderRadius: 12,
                  background: "var(--app-panel-soft)",
                  color: "var(--app-muted)",
                  marginBottom: 16,
                }}
              >
                <AlertTriangle size={28} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                ["Sklad", `${BRANCH_ICONS[detail.branch] || "🏢"} ${BRANCH_NAMES[detail.branch] || detail.branch}`],
                ["Miqdor", `${fmt(detail.quantity)} ${detail.unit}`],
                ["Yuborgan", detail.requestedBy || "—"],
                ["Sana", fmtD(detail.createdAt)],
                ["Tasdiqlagan", detail.approvedBy || "—"],
              ].map(([l, v]) => (
                <div key={String(l)} style={{ background: "var(--app-panel-soft)", borderRadius: 11, padding: "11px 13px" }}>
                  <div style={{ fontSize: 10, color: "var(--app-muted)", marginBottom: 4, fontWeight: 700 }}>{l}</div>
                  <div style={{ fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: isSA && detail.status === "pending" ? 18 : 0 }}>
              <div style={{ fontSize: 10, color: "var(--app-muted)", marginBottom: 4, fontWeight: 700 }}>BRAK SABABI</div>
              <div style={{ fontWeight: 600, lineHeight: 1.5 }}>{detail.reason || "—"}</div>
            </div>

            {isSA && detail.status === "pending" && (
              <div className="modal-actions" style={{ display: "flex", gap: 10 }}>
                <button className="btn-ghost" disabled={loading} onClick={() => action(detail, "reject")} style={{ flex: 1 }}>
                  <XCircle size={15} /> Rad
                </button>
                <button className="btn-primary" disabled={loading} onClick={() => action(detail, "approve")} style={{ flex: 2 }}>
                  <CheckCircle2 size={15} /> Accept
                </button>
              </div>
            )}
          </Modal>
        );
      })()}

      <div className="history-toolbar" style={{ marginBottom: 16 }}>
        <div className="history-filters">
          {(["all", "today", "week", "month"] as const).map((value) => (
            <button
              key={value}
              className={filterPeriod === value ? "active" : ""}
              onClick={() => setFilterPeriod(value)}
            >
              {value === "all" ? "Barchasi" : value === "today" ? "Bugun" : value === "week" ? "Hafta" : "Oy"}
            </button>
          ))}
        </div>
        <label>
          <Search size={16} />
          <input
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
            placeholder="Mahsulot yoki sabab bo'yicha qidirish"
          />
        </label>
        {isSA && (
          <select
            className="crm-input"
            style={{ maxWidth: 190 }}
            value={filterBranch}
            onChange={(event) => setFilterBranch(event.target.value)}
          >
            <option value="all">Barcha skladlar</option>
            {Object.entries(BRANCH_NAMES).map(([id, name]) => (
              <option key={id} value={id}>{BRANCH_ICONS[id] || "🏢"} {name}</option>
            ))}
          </select>
        )}
      </div>

      <section className="damage-summary">
        <div><AlertTriangle size={18} /><span>Kutilayotgan</span><strong>{pending.length}</strong></div>
        <div><CheckCircle2 size={18} /><span>Tarix</span><strong>{history.length}</strong></div>
      </section>

      <div className="damage-stats">
        <div className="damage-stat-card">
          <div className="damage-stat-label"><TrendingDown size={13} /> Umumiy brak qiymati</div>
          <div className="damage-stat-value" style={{ color: "#f85149" }}>{fmtM(totalDamageValue)}</div>
          <div className="damage-stat-sub">{approvedHistory.length} ta tasdiqlangan · {rejectedCount} ta rad etilgan</div>
        </div>

        {isSA && (
          <div className="damage-stat-card">
            <div className="damage-stat-label">Sklad bo'yicha</div>
            <div className="damage-rank-list">
              {branchBreakdown.slice(0, 4).map(([branch, value]) => (
                <div className="damage-rank-row" key={branch}>
                  <span className="damage-rank-row-name">{BRANCH_ICONS[branch] || "🏢"} {BRANCH_NAMES[branch] || branch}</span>
                  <span className="damage-rank-row-value">{fmtM(value)}</span>
                  <div className="damage-rank-bar-track">
                    <div className="damage-rank-bar-fill" style={{ width: `${maxBranchValue ? (value / maxBranchValue) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              {!branchBreakdown.length && <span style={{ fontSize: 12, color: "var(--app-muted)" }}>Ma'lumot yo'q</span>}
            </div>
          </div>
        )}

        <div className="damage-stat-card">
          <div className="damage-stat-label">Mahsulot bo'yicha</div>
          <div className="damage-rank-list">
            {productBreakdown.map((item) => (
              <div className="damage-rank-row" key={item.name}>
                <span className="damage-rank-row-name">{item.name} · {fmt(item.qty)} {item.unit}</span>
                <span className="damage-rank-row-value">{fmtM(item.value)}</span>
                <div className="damage-rank-bar-track">
                  <div className="damage-rank-bar-fill" style={{ width: `${maxProductValue ? (item.value / maxProductValue) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {!productBreakdown.length && <span style={{ fontSize: 12, color: "var(--app-muted)" }}>Ma'lumot yo'q</span>}
          </div>
        </div>
      </div>

      <div className="damage-list">
        {pending.map((damage) => (
          <DamageCard
            key={damage.id}
            damage={damage}
            isSA={isSA}
            loading={loading}
            onOpen={setDetail}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
        {!pending.length && !history.length && (
          <div className="history-empty">
            <AlertTriangle size={28} />
            <strong>Brak so'rovlari yo'q</strong>
            <span>Yangi brak requestlar shu yerda chiqadi</span>
          </div>
        )}
      </div>

      {historyGroups.map((group) => (
        <Fragment key={group.key}>
          <div className="damage-history-date">{group.label} · {group.items.length} ta</div>
          <div className="table-wrap">
            <table className="crm-table mobile-card-table">
              <thead>
                <tr>
                  <th>Mahsulot</th>
                  {isSA && <th>Sklad</th>}
                  <th>Miqdor</th>
                  <th>Qiymat</th>
                  <th>Holat</th>
                  <th className="hide-mobile">Kim</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((damage) => {
                  const st = TRANSFER_STATUS_CONFIG[damage.status as keyof typeof TRANSFER_STATUS_CONFIG];
                  return (
                    <tr key={damage.id} onClick={() => setDetail(damage)} style={{ cursor: "pointer" }}>
                      <td data-label="Mahsulot" className="mobile-card-primary" style={{ fontWeight: 700 }}>{damage.productName}</td>
                      {isSA && <td data-label="Sklad">{BRANCH_ICONS[damage.branch] || "🏢"} {BRANCH_NAMES[damage.branch] || damage.branch}</td>}
                      <td data-label="Miqdor">{fmt(damage.quantity)} {damage.unit}</td>
                      <td data-label="Qiymat" style={{ fontWeight: 700 }}>{fmtM(damageValue(damage))}</td>
                      <td data-label="Holat"><span className="badge" style={{ background: st.bg, color: st.c }}>{st.i} {st.l}</span></td>
                      <td data-label="Kim" className="hide-mobile" style={{ fontSize: 11, color: "var(--app-muted)" }}>{damage.approvedBy || damage.requestedBy || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Fragment>
      ))}
    </PageWrap>
  );
}
