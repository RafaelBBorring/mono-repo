"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import clsx from "clsx";

const clientSchema = z.object({
  psychologistId: z.string().min(1, "Psicologa e obrigatoria"),
  name: z.string().min(1, "Nome e obrigatorio"),
  cpf: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  consentSms: z.boolean().optional(),
  consentEmail: z.boolean().optional(),
  consentWhatsapp: z.boolean().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface PsychologistOption {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  consentSms: boolean;
  consentEmail: boolean;
  consentWhatsapp: boolean;
  active: boolean;
  psychologist: { id: string; name: string };
}

const emptyForm: ClientFormData = {
  psychologistId: "",
  name: "",
  cpf: "",
  email: "",
  phone: "",
  birthDate: "",
  consentSms: false,
  consentEmail: false,
  consentWhatsapp: false,
};

function formatCpf(cpf: string | null) {
  if (!cpf) return "";
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [psychologists, setPsychologists] = useState<PsychologistOption[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: emptyForm,
  });

  const fetchClients = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/clients?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setClients(data);
    }
  }, [search]);

  const fetchPsychologists = useCallback(async () => {
    const res = await fetch("/api/psychologists");
    if (res.ok) {
      const data = await res.json();
      setPsychologists(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchClients();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchClients]);

  useEffect(() => {
    fetchClients();
    fetchPsychologists();
  }, []);

  function openCreateModal() {
    setEditingId(null);
    reset(emptyForm);
    setShowModal(true);
  }

  function openEditModal(client: Client) {
    setEditingId(client.id);
    const formValues: ClientFormData = {
      psychologistId: client.psychologist.id,
      name: client.name,
      cpf: client.cpf || "",
      email: client.email || "",
      phone: client.phone || "",
      birthDate: client.birthDate ? client.birthDate.split("T")[0] : "",
      consentSms: client.consentSms,
      consentEmail: client.consentEmail,
      consentWhatsapp: client.consentWhatsapp,
    };
    reset(formValues);
    setShowModal(true);
  }

  async function onSubmit(data: ClientFormData) {
    if (editingId) {
      const res = await fetch(`/api/clients/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowModal(false);
        fetchClients();
      }
    } else {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowModal(false);
        fetchClients();
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja desativar este cliente?")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) fetchClients();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button onClick={openCreateModal} className="px-4 py-2 bg-morpheus-500 text-white rounded-lg hover:bg-morpheus-600">
          Novo Cliente
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Nome</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">CPF</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Psicologa</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Email</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Telefone</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{client.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatCpf(client.cpf)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{client.psychologist.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{client.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{client.phone}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(client)}
                      className="px-3 py-1.5 text-sm bg-morpheus-500 text-white rounded-lg hover:bg-morpheus-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Desativar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Editar Cliente" : "Novo Cliente"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Psicologa *</label>
                <select
                  {...register("psychologistId")}
                  className={clsx("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500", errors.psychologistId ? "border-red-500" : "border-gray-300")}
                >
                  <option value="">Selecione uma psicologa</option>
                  {psychologists.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.psychologistId && <p className="text-xs text-red-500 mt-1">{errors.psychologistId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  {...register("name")}
                  className={clsx("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500", errors.name ? "border-red-500" : "border-gray-300")}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <input {...register("cpf")} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input {...register("email")} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input {...register("phone")} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                <input {...register("birthDate")} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500" />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Consentimentos</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" {...register("consentSms")} className="rounded border-gray-300 text-morpheus-500 focus:ring-morpheus-500" />
                    <span className="text-sm text-gray-700">SMS</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" {...register("consentEmail")} className="rounded border-gray-300 text-morpheus-500 focus:ring-morpheus-500" />
                    <span className="text-sm text-gray-700">Email</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" {...register("consentWhatsapp")} className="rounded border-gray-300 text-morpheus-500 focus:ring-morpheus-500" />
                    <span className="text-sm text-gray-700">WhatsApp</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-morpheus-500 text-white rounded-lg hover:bg-morpheus-600 disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
