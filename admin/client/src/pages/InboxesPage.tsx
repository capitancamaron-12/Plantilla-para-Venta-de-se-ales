import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { Mail, Search, Loader2, Clock, Eye, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Inbox {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

interface InboxEmail {
  id: string;
  inboxId: string;
  inboxEmail: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
}

export default function InboxesPage() {
  const { slug } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInbox, setSelectedInbox] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);

  const { data: inboxes = [], isLoading } = useQuery({
    queryKey: ["inboxes", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inboxes`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch inboxes");
      return res.json() as Promise<Inbox[]>;
    },
  });

  const { data: emails = [] } = useQuery({
    queryKey: ["inbox-emails", selectedInbox],
    queryFn: async () => {
      if (!selectedInbox) return [];
      const res = await fetch(`/api/admin/emails?inboxId=${selectedInbox}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch emails");
      return res.json() as Promise<InboxEmail[]>;
    },
    enabled: !!selectedInbox,
  });

  const filteredInboxes = inboxes.filter((inbox) =>
    inbox.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Gestion de Inboxes</h1>
        <p className="text-zinc-400">
          Total de inboxes: <span className="text-white font-medium">{inboxes.length}</span>
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">Inboxes Activos</h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
            {filteredInboxes.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500">
                {searchTerm ? "No se encontraron inboxes" : "No hay inboxes creados"}
              </div>
            ) : (
              filteredInboxes.map((inbox) => (
                <div
                  key={inbox.id}
                  onClick={() => setSelectedInbox(inbox.id)}
                  className={`px-6 py-4 cursor-pointer transition-colors ${
                    selectedInbox === inbox.id
                      ? "bg-blue-500/10 border-l-4 border-blue-500"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <p className="text-sm font-medium text-white truncate">
                          {inbox.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>
                          Creado {formatDistanceToNow(new Date(inbox.createdAt), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isExpired(inbox.expiresAt) ? (
                        <span className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded">
                          Expirado
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded">
                          Activo
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {format(new Date(inbox.expiresAt), "dd/MM/yy HH:mm")}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              Emails Recibidos {selectedInbox && `(${emails.length})`}
            </h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
            {!selectedInbox ? (
              <div className="px-6 py-8 text-center text-zinc-500">
                Selecciona un inbox para ver sus emails
              </div>
            ) : emails.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500">
                No hay emails recibidos en este inbox
              </div>
            ) : (
              emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`px-6 py-4 cursor-pointer transition-colors ${
                    selectedEmail?.id === email.id
                      ? "bg-purple-500/10 border-l-4 border-purple-500"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-medium text-white line-clamp-1">
                        {email.subject || "(Sin asunto)"}
                      </p>
                      <Eye className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-zinc-400">De: {email.from}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedEmail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Detalles del Email</h3>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-sm font-medium text-zinc-400">Asunto</label>
                <p className="text-white mt-1">{selectedEmail.subject || "(Sin asunto)"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400">De</label>
                <p className="text-white mt-1">{selectedEmail.from}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400">Para</label>
                <p className="text-white mt-1">{selectedEmail.inboxEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400">Fecha</label>
                <p className="text-white mt-1">
                  {format(new Date(selectedEmail.receivedAt), "dd/MM/yyyy HH:mm:ss")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400">Mensaje</label>
                <div className="mt-2 p-4 bg-zinc-800 rounded-lg text-zinc-300 whitespace-pre-wrap break-words text-sm">
                  {selectedEmail.body}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
