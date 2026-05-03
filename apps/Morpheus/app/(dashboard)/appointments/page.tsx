"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import clsx from "clsx";

const appointmentSchema = z.object({
  psychologistId: z.string().min(1, "Psicologa e obrigatoria"),
  clientId: z.string().min(1, "Cliente e obrigatorio"),
  date: z.string().min(1, "Data e obrigatoria"),
  startTime: z.string().min(1, "Hora inicial e obrigatoria"),
  endTime: z.string().min(1, "Hora final e obrigatoria"),
  value: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface PsychologistOption {
  id: string;
  name: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  value: string;
  status: "SCHEDULED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  paymentStatus: "PENDING" | "INVOICED" | "PAID" | "OVERDUE";
  notes: string | null;
  psychologist: { id: string; name: string };
  client: { id: string; name: string };
}

const emptyForm: AppointmentFormData = {
  psychologistId: "",
  clientId: "",
  date: "",
  startTime: "",
  endTime: "",
  value: "",
  notes: "",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  COMPLETED: "Concluida",
  NO_SHOW: "Falta",
  CANCELLED: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-morpheus-100 text-morpheus-700",
  COMPLETED: "bg-green-100 text-green-700",
  NO_SHOW: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  INVOICED: "Faturado",
  PAID: "Pago",
  OVERDUE: "Vencido",
};

const PAYMENT_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  INVOICED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

function formatCurrency(value: string) {
  const num = parseFloat(value);
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [psychologists, setPsychologists] = useState<PsychologistOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    psychologistId: "",
    dateFrom: "",
    dateTo: "",
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: emptyForm,
  });

  const watchPsychologistId = watch("psychologistId");

  const fetchAppointments = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.psychologistId) params.set("psychologistId", filters.psychologistId);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    const res = await fetch(`/api/appointments?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setAppointments(data);
    }
  }, [filters]);

  const fetchPsychologists = useCallback(async () => {
    const res = await fetch("/api/psychologists");
    if (res.ok) {
      const data = await res.json();
      setPsychologists(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    }
  }, []);

  const fetchClients = useCallback(async (psychologistId?: string) => {
    const params = new URLSearchParams();
    if (psychologistId) params.set("psychologistId", psychologistId);
    const res = await fetch(`/api/clients?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setClients(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchPsychologists();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (watchPsychologistId) {
      fetchClients(watchPsychologistId);
    } else {
      setClients([]);
    }
  }, [watchPsychologistId, fetchClients]);

  function openCreateModal() {
    reset(emptyForm);
    setClients([]);
    setShowModal(true);
  }

  async function onSubmit(data: AppointmentFormData) {
    const startsAt = new Date(`${data.date}T${data.startTime}:00`);
    const endsAt = new Date(`${data.date}T${data.endTime}:00`);

    const payload = {
      psychologistId: data.psychologistId,
      clientId: data.clientId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      value: data.value || "0",
      notes: data.notes,
    };

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowModal(false);
      fetchAppointments();
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchAppointments();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Consultas</h1>
        <button onClick={openCreateModal} className="px-4 py-2 bg-morpheus-500 text-white rounded-lg hover:bg-morpheus-600">
          Nova Consulta
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Psicologa</label>
            <select
              value={filters.psychologistId}
              onChange={(e) => setFilters((f) => ({ ...f, psychologistId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500"
            >
              <option value="">Todas</option>
              {psychologists.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data inicio</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data fim</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ psychologistId: "", dateFrom: "", dateTo: "" })}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Data/Hora</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Psicologa</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Cliente</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Valor</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Status</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Pagamento</th>
              <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{formatDateTime(appointment.startsAt)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{appointment.psychologist.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{appointment.client.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(appointment.value)}</td>
                <td className="px-6 py-4">
                  <span className={clsx("inline-block px-2 py-1 text-xs font-medium rounded-full", STATUS_COLORS[appointment.status])}>
                    {STATUS_LABELS[appointment.status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={clsx("inline-block px-2 py-1 text-xs font-medium rounded-full", PAYMENT_COLORS[appointment.paymentStatus])}>
                    {PAYMENT_LABELS[appointment.paymentStatus]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {appointment.status === "SCHEDULED" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateStatus(appointment.id, "COMPLETED")}
                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Completar
                      </button>
                      <button
                        onClick={() => updateStatus(appointment.id, "NO_SHOW")}
                        className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Falta
                      </button>
                      <button
                        onClick={() => updateStatus(appointment.id, "CANCELLED")}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {appointments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhuma consulta encontrada.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Nova Consulta</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  {...register("clientId")}
                  disabled={!watchPsychologistId}
                  className={clsx("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500", errors.clientId ? "border-red-500" : "border-gray-300", !watchPsychologistId && "bg-gray-100")}
                >
                  <option value="">
                    {watchPsychologistId ? "Selecione um cliente" : "Selecione uma psicologa primeiro"}
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.clientId && <p className="text-xs text-red-500 mt-1">{errors.clientId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input
                  {...register("date")}
                  type="date"
                  className={clsx("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500", errors.date ? "border-red-500" : "border-gray-300")}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio *</label>
                  <input
                    {...register("startTime")}
                    type="time"
                    className={clsx("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500", errors.startTime ? "border-red-500" : "border-gray-300")}
                  />
                  {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fim *</label>
                  <input
                    {...register("endTime")}
                    type="time"
                    className={clsx("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500", errors.endTime ? "border-red-500" : "border-gray-300")}
                  />
                  {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input
                  {...register("value")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500"
                />
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
                  {isSubmitting ? "Salvando..." : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
