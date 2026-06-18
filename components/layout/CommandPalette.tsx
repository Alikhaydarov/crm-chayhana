"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import type { TabId } from "@/types";

type Command = {
  id: TabId;
  label: string;
  description: string;
  icon: React.ElementType;
};

export function CommandPalette({
  commands,
  open,
  onClose,
  onSelect,
}: {
  commands: Command[];
  open: boolean;
  onClose: () => void;
  onSelect: (id: TabId) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return commands;
    return commands.filter(command =>
      `${command.label} ${command.description}`.toLocaleLowerCase().includes(normalized),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="command-backdrop" onClick={onClose}>
      <section className="command-panel" role="dialog" aria-modal="true" aria-label="Tezkor qidiruv" onClick={event => event.stopPropagation()}>
        <div className="command-search">
          <Search size={18} />
          <input
            autoFocus
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") onClose();
              if (event.key === "Enter" && filtered[0]) onSelect(filtered[0].id);
            }}
            placeholder="Bo'lim yoki amalni qidiring..."
          />
          <button className="icon-control" onClick={onClose} title="Yopish"><X size={17} /></button>
        </div>
        <div className="command-results">
          {filtered.map(command => {
            const Icon = command.icon;
            return (
              <button key={command.id} className="command-item" onClick={() => onSelect(command.id)}>
                <span className="command-item-icon"><Icon size={19} /></span>
                <span>
                  <strong>{command.label}</strong>
                  <small>{command.description}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            );
          })}
          {!filtered.length && <div className="command-empty">Mos bo'lim topilmadi</div>}
        </div>
      </section>
    </div>
  );
}
