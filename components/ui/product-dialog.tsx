"use client";

import type { ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function ProductDialog({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="radix-dialog-overlay" />
      <Dialog.Content className="radix-dialog-content">
        <header className="radix-dialog-header">
          <div><Dialog.Title className="radix-dialog-title">{title}</Dialog.Title>{description && <Dialog.Description className="radix-dialog-description">{description}</Dialog.Description>}</div>
          <Dialog.Close className="radix-icon-button" aria-label="Yopish"><X size={18} /></Dialog.Close>
        </header>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function DeleteProductDialog({ open, onOpenChange, productName, loading, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; productName: string; loading: boolean; onConfirm: () => void }) {
  return <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="radix-dialog-overlay" />
      <AlertDialog.Content className="radix-alert-content">
        <AlertDialog.Title className="radix-dialog-title">Mahsulot o‘chirilsinmi?</AlertDialog.Title>
        <AlertDialog.Description className="radix-dialog-description"><strong>{productName}</strong> va unga tegishli sklad qoldiqlari o‘chiriladi. Bu amalni ortga qaytarib bo‘lmaydi.</AlertDialog.Description>
        <div className="radix-dialog-actions"><AlertDialog.Cancel className="btn-ghost">Bekor</AlertDialog.Cancel><AlertDialog.Action className="btn-danger" onClick={(event) => { event.preventDefault(); onConfirm(); }} disabled={loading}>{loading ? "O‘chirilmoqda..." : "O‘chirish"}</AlertDialog.Action></div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
