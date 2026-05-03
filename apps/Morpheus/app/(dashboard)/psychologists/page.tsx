"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import clsx from "clsx";

const psychologistSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  cpf: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  crp: z.string().optional(),
  birthDate: z.string().optional(),
});

type PsychologistFormData = z.infer<typeof psychologistSchema>;

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Psychologist {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  crp: string | null;
  birthDate: string | null;
  active: boolean;
  schedules: Schedule[];
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terca" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sabado" },
];

const emptyForm: PsychologistFormData = {
  name: "",
  cpf: "",
  email: "",
  phone: "",
  crp: "",
  birthDate: "",
};

export default function PsychologistsPage() {
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [checkedDays, setCheckedDays] = useState<Record<number, boolean>>({});
  const [scheduleTimes, setScheduleTimes] = useState<Record<number, { startTime: string; endTime: string }>>({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PsychologistFormData>({
    resolver: zodResolver(psychologistSchema),
    defaultValues: emptyForm,
  });

  const fetchPsychologists = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/psychologists?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setPsychologists(data);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchPsychologists();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchPsychologists]);

  useEffect(() => {
    fetchPsychologists();
  }, []);

  function openCreateModal() {
    setEditingId(null);
    setCheckedDays({});
    setScheduleTimes({});
    reset(emptyForm);
    setShowModal(true);
  }

  function openEditModal(psychologist: Psychologist) {
    setEditingId(psychologist.id);
    const formValues: PsychologistFormData = {
      name: psychologist.name,
      cpf: psychologist.cpf || "",
      email: psychologist.email || "",
      phone: psychologist.phone || "",
      crp: psychologist.crp || "",
      birthDate: psychologist.birthDate ? psychologist.birthDate.split("T")[0] : "",
    };
    reset(formValues);

    const days: Record<number, boolean> = {};
    const times: Record<number, { startTime: string; endTime: string }> = {};
    psychologist.schedules.forEach((s) => {
      days[s.dayOfWeek] = true;
      times[s.dayOfWeek] = { startTime: s.startTime, endTime: s.endTime };
    });
    setCheckedDays(days);
    setScheduleTimes(times);
    setShowModal(true);
  }

  function toggleDay(day: number) {
    setCheckedDays((prev) => {
      const next = { ...prev };
      if (next[day]) {
        delete next[day];
      } else {
        next[day] = true;
        if (!scheduleTimes[day]) {
          setScheduleTimes((t) => ({ ...t, [day]: { startTime: "08:00", endTime: "18:00" } }));
        }
      }
      return next;
    });
  }

  async function onSubmit(data: PsychologistFormData) {
    const schedules = Object.entries(checkedDays)
      .filter(([, checked]) => checked)
      .map(([day, ,]) => ({
        dayOfWeek: Number(day),
        startTime: scheduleTimes[Number(day)]?.startTime || "08:00",
        endTime: scheduleTimes[Number(day)]?.endTime || "18:00",
      }));

    const payload = { ...data, schedules };

    if (editingId) {
      const res = await fetch(`/api/psychologists/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowModal(false);
        fetchPsychologists();
      }
    } else {
      const res = await fetch("/api/psychologists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowModal(false);
        fetchPsychologists();
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja desativar esta psicologa?")) return;
    const res = await fetch(`/api/psychologists/${id}`, { method: "DELETE" });
    if (res.ok) fetchPsychologists();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Psicologas</h1>
        <button onClick={openCreateModal} className="px-4 py-2 bg-morpheus-500 text-white rounded-lg hover:bg-morpheus-600">
          Nova Psicologa
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar psicologas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {psychologists.map((psychologist) => (
          <div key={psychologist.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{psychologist.name}</h3>
                {psychologist.crp && <p className="text-sm text-morpheus-600">CRP: {psychologist.crp}</p>}
              </div>
              <span
                className={clsx(
                  "inline-block px-2 py-1 text-xs font-medium rounded-full",
                  psychologist.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}
              >
                {psychologist.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              {psychologist.email && <p>{psychologist.email}</p>}
              {psychologist.phone && <p>{psychologist.phone}</p>}
            </div>
            {psychologist.schedules.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Horarios:</p>
                {psychologist.schedules.map((s) => (
                  <p key={s.dayOfWeek} className="text-xs text-gray-600">
                    {DAYS_OF_WEEK.find((d) => d.value === s.dayOfWeek)?.label}: {s.startTime} - {s.endTime}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => openEditModal(psychologist)}
                className="px-3 py-1.5 text-sm bg-morpheus-500 text-white rounded-lg hover:bg-morpheus-600"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(psychologist.id)}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Desativar
              </button>
            </div>
          </div>
        ))}
      </div>

      {psychologists.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhuma psicologa encontrada.
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Editar Psicologa" : "Nova Psicologa"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">CRP</label>
                <input {...register("crp")} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                <input {...register("birthDate")} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500" />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Horarios de Atendimento</h3>
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 min-w-[100px]">
                        <input
                          type="checkbox"
                          checked={!!checkedDays[day.value]}
                          onChange={() => toggleDay(day.value)}
                          className="rounded border-gray-300 text-morpheus-500 focus:ring-morpheus-500"
                        />
                        <span className="text-sm text-gray-700">{day.label}</span>
                      </label>
                      {checkedDays[day.value] && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={scheduleTimes[day.value]?.startTime || "08:00"}
                            onChange={(e) =>
                              setScheduleTimes((prev) => ({
                                ...prev,
                                [day.value]: { ...prev[day.value], startTime: e.target.value },
                              }))
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={scheduleTimes[day.value]?.endTime || "18:00"}
                            onChange={(e) =>
                              setScheduleTimes((prev) => ({
                                ...prev,
                                [day.value]: { ...prev[day.value], endTime: e.target.value },
                              }))
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-morpheus-500 focus:border-morpheus-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
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
