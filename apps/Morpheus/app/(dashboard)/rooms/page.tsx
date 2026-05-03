"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import clsx from "clsx";

interface Room {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

const createRoomSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  color: z.string().min(1, "Cor e obrigatoria"),
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;

const bookingSchema = z.object({
  title: z.string().min(1, "Titulo e obrigatorio"),
  description: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

const PRESET_COLORS = [
  "#8855ff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#ec4899",
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookings, setBookings] = useState<EventInput[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm & { start: string; end: string }>({
    title: "",
    description: "",
    start: "",
    end: "",
  });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [eventDetail, setEventDetail] = useState<EventClickArg | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { name: "", color: PRESET_COLORS[0] },
  });

  const {
    register: registerBooking,
    handleSubmit: handleBookingSubmit,
    formState: { errors: bookingErrors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
  });

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
        if (data.length > 0 && !selectedRoom) {
          setSelectedRoom(data[0]);
        }
      }
    } catch {}
  }, [selectedRoom]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const fetchBookings = useCallback(
    async (roomId: string) => {
      try {
        const calendarApi = calendarRef.current?.getApi();
        if (!calendarApi) return;
        const start = calendarApi.view.activeStart.toISOString();
        const end = calendarApi.view.activeEnd.toISOString();
        const res = await fetch(
          `/api/rooms/${roomId}/bookings?start=${start}&end=${end}`
        );
        if (res.ok) {
          const data = await res.json();
          setBookings(
            data.map((b: Record<string, unknown>) => ({
              id: b.id as string,
              title: b.title as string,
              start: b.start as string,
              end: b.end as string,
              backgroundColor: selectedRoom?.color ?? "#8855ff",
              borderColor: selectedRoom?.color ?? "#8855ff",
            }))
          );
        }
      } catch {}
    },
    [selectedRoom]
  );

  useEffect(() => {
    if (selectedRoom) {
      fetchBookings(selectedRoom.id);
    }
  }, [selectedRoom, fetchBookings]);

  const onCreateRoom = async (data: CreateRoomForm) => {
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        resetCreate();
        setShowCreateRoom(false);
        fetchRooms();
      }
    } catch {}
  };

  const onDeactivateRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedRoom?.id === roomId) {
          setSelectedRoom(null);
        }
        fetchRooms();
      }
    } catch {}
  };

  const onStartEdit = (room: Room) => {
    setEditingRoomId(room.id);
    setEditName(room.name);
    setEditColor(room.color);
  };

  const onSaveEdit = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, color: editColor }),
      });
      if (res.ok) {
        setEditingRoomId(null);
        fetchRooms();
      }
    } catch {}
  };

  const onDateSelect = (selectInfo: DateSelectArg) => {
    setBookingForm({
      title: "",
      description: "",
      start: selectInfo.startStr,
      end: selectInfo.endStr,
    });
    setShowBookingModal(true);
    setError(null);
  };

  const onEventClick = (clickInfo: EventClickArg) => {
    setEventDetail(clickInfo);
  };

  const onCreateBooking = async (data: BookingForm) => {
    if (!selectedRoom) return;
    try {
      const res = await fetch(`/api/rooms/${selectedRoom.id}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          start: bookingForm.start,
          end: bookingForm.end,
        }),
      });
      if (res.status === 409) {
        setError("Conflito de horario: ja existe uma reserva neste periodo.");
        return;
      }
      if (res.ok) {
        setShowBookingModal(false);
        setError(null);
        fetchBookings(selectedRoom.id);
      }
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Salas</h1>
        <button
          onClick={() => setShowCreateRoom(true)}
          className="px-4 py-2 bg-morpheus-500 text-white rounded-lg hover:bg-morpheus-600 transition-colors"
        >
          Nova Sala
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Salas
            </h2>
            {rooms.length === 0 && (
              <p className="text-gray-400 text-sm">Nenhuma sala cadastrada.</p>
            )}
            <ul className="space-y-2">
              {rooms.map((room) => (
                <li key={room.id}>
                  {editingRoomId === room.id ? (
                    <div className="space-y-2 p-2 rounded-lg bg-gray-50">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-morpheus-500"
                      />
                      <div className="flex gap-1 flex-wrap">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className={clsx(
                              "w-6 h-6 rounded-full border-2 transition-transform",
                              editColor === c
                                ? "border-gray-900 scale-110"
                                : "border-transparent"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onSaveEdit(room.id)}
                          className="px-3 py-1 text-xs bg-morpheus-500 text-white rounded-md hover:bg-morpheus-600"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingRoomId(null)}
                          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={clsx(
                        "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                        selectedRoom?.id === room.id
                          ? "bg-morpheus-50 border border-morpheus-200"
                          : "hover:bg-gray-50"
                      )}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: room.color }}
                        />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {room.name}
                        </span>
                        {!room.active && (
                          <span className="text-xs text-red-500">Inativa</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartEdit(room);
                          }}
                          className="p-1 text-gray-400 hover:text-morpheus-600 transition-colors"
                          title="Editar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        {room.active && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeactivateRoom(room.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Desativar"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {selectedRoom ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedRoom.color }}
                  />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedRoom.name}
                  </h2>
                </div>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  slotDuration="00:15:00"
                  slotMinTime="07:00:00"
                  slotMaxTime="22:00:00"
                  editable
                  selectable
                  locale="pt-br"
                  events={bookings}
                  select={onDateSelect}
                  eventClick={onEventClick}
                  datesSet={() => {
                    if (selectedRoom) fetchBookings(selectedRoom.id);
                  }}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "timeGridWeek,timeGridDay",
                  }}
                  height="auto"
                  allDaySlot={false}
                  nowIndicator
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-400">
                Selecione uma sala para ver o calendario.
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateRoom && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCreateRoom(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Nova Sala
            </h3>
            <form
              onSubmit={handleCreateSubmit(onCreateRoom)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  {...registerCreate("name")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-morpheus-500"
                  placeholder="Nome da sala"
                />
                {createErrors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {createErrors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <label key={c} className="cursor-pointer">
                      <input
                        type="radio"
                        value={c}
                        {...registerCreate("color")}
                        className="sr-only"
                      />
                      <span
                        className={clsx(
                          "block w-8 h-8 rounded-full border-2 transition-transform",
                          "peer-checked:border-gray-900"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    </label>
                  ))}
                </div>
                {createErrors.color && (
                  <p className="text-xs text-red-500 mt-1">
                    {createErrors.color.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRoom(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-morpheus-500 text-white rounded-lg hover:bg-morpheus-600 text-sm"
                >
                  Criar Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBookingModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowBookingModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Nova Reserva
            </h3>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}
            <form
              onSubmit={handleBookingSubmit(onCreateBooking)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titulo
                </label>
                <input
                  type="text"
                  defaultValue={bookingForm.title}
                  {...registerBooking("title")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-morpheus-500"
                  placeholder="Titulo da reserva"
                />
                {bookingErrors.title && (
                  <p className="text-xs text-red-500 mt-1">
                    {bookingErrors.title.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descricao
                </label>
                <textarea
                  defaultValue={bookingForm.description}
                  {...registerBooking("description")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-morpheus-500 resize-none"
                  rows={3}
                  placeholder="Descricao (opcional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inicio
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={new Date(bookingForm.start).toLocaleString("pt-BR")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fim
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={new Date(bookingForm.end).toLocaleString("pt-BR")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-morpheus-500 text-white rounded-lg hover:bg-morpheus-600 text-sm"
                >
                  Reservar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {eventDetail && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEventDetail(null)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {eventDetail.event.title}
            </h3>
            <p className="text-sm text-gray-500">
              {eventDetail.event.start?.toLocaleString("pt-BR")} -{" "}
              {eventDetail.event.end?.toLocaleString("pt-BR")}
            </p>
            <button
              onClick={() => setEventDetail(null)}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
