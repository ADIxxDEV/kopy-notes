"use client";

import { Icon } from "@/components/Icon";
import { Modal } from "@/components/board/Panels";
import { useToast } from "@/lib/toast";

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (url.startsWith("blob:")) window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function ExportPanel({
  onClose,
  pageTitle,
  onPNG,
  onPDF,
  onJSON,
  onPrint,
}: {
  onClose: () => void;
  pageTitle: string;
  onPNG: () => void;
  onPDF: () => void;
  onJSON: () => void;
  onPrint: () => void;
}) {
  const { push } = useToast();

  const options: {
    id: string;
    label: string;
    desc: string;
    icon: React.ReactNode;
    action: () => void;
  }[] = [
    {
      id: "png",
      label: "Image (PNG)",
      desc: "Save the current page as a picture.",
      icon: <Icon name="image" className="h-5 w-5" />,
      action: () => {
        onPNG();
        push("Page exported as PNG.", "success");
      },
    },
    {
      id: "pdf",
      label: "PDF",
      desc: "Save the current page as a PDF document.",
      icon: <Icon name="doc" className="h-5 w-5" />,
      action: () => {
        onPDF();
        push("Page exported as PDF.", "success");
      },
    },
    {
      id: "json",
      label: "Editable lesson (.kopy)",
      desc: "Every page, stroke and imported file in one portable archive.",
      icon: <Icon name="save" className="h-5 w-5" />,
      action: () => {
        onJSON();

      },
    },
    {
      id: "print",
      label: "Print",
      desc: "Send the current page to a printer.",
      icon: <Icon name="print" className="h-5 w-5" />,
      action: onPrint,
    },
  ];

  return (
    <Modal title="Export" icon={<Icon name="export" className="h-5 w-5 text-brand-light" />} onClose={onClose}>
      <div className="space-y-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              o.action();
              if (o.id !== "print") onClose();
            }}
            className="kn-focus flex w-full items-center gap-4 rounded-xl border border-line bg-base-2 p-4 text-left transition hover:border-brand/50 hover:bg-elevated"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-light">
              {o.icon}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{o.label}</span>
              <span className="block text-xs text-muted">{o.desc}</span>
            </span>
            <Icon name="chevronRight" className="h-4 w-4 text-faint" />
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-faint">
        Exporting “{pageTitle}”. Switch pages to export a different page.
      </p>
    </Modal>
  );
}

export { download };
