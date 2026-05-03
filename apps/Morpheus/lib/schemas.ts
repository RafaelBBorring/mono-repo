import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(1, "Senha e obrigatoria"),
});

export const registerSchema = z.object({
  clinicName: z.string().min(2, "Nome da clinica deve ter no minimo 2 caracteres"),
  adminName: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z.string().min(8, "Senha deve ter no minimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas nao conferem",
  path: ["confirmPassword"],
});

export const createRoomSchema = z.object({
  name: z.string().min(1, "Nome da sala e obrigatorio"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor invalida").default("#6366f1"),
});

export const updateRoomSchema = createRoomSchema.partial();

export const createPsychologistSchema = z.object({
  name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 digitos").optional().or(z.literal("")),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  crp: z.string().optional().or(z.literal("")),
  birthDate: z.string().optional(),
  schedules: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  })).default([]),
});

export const createClientSchema = z.object({
  psychologistId: z.string().min(1, "Selecione uma psicologa"),
  name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 digitos").optional().or(z.literal("")),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  birthDate: z.string().optional(),
  consentSms: z.boolean().default(false),
  consentEmail: z.boolean().default(false),
  consentWhatsapp: z.boolean().default(false),
});

export const createAppointmentSchema = z.object({
  psychologistId: z.string().min(1, "Selecione uma psicologa"),
  clientId: z.string().min(1, "Selecione um cliente"),
  startsAt: z.string().min(1, "Data de inicio obrigatoria"),
  endsAt: z.string().min(1, "Data de fim obrigatoria"),
  value: z.number().positive("Valor deve ser positivo"),
  notes: z.string().optional(),
}).refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
  message: "Data de fim deve ser apos a data de inicio",
  path: ["endsAt"],
});

export const createRoomBookingSchema = z.object({
  roomId: z.string().min(1, "Selecione uma sala"),
  title: z.string().min(1, "Titulo e obrigatorio"),
  description: z.string().optional(),
  startsAt: z.string().min(1, "Data de inicio obrigatoria"),
  endsAt: z.string().min(1, "Data de fim obrigatoria"),
}).refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
  message: "Data de fim deve ser apos a data de inicio",
  path: ["endsAt"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type CreatePsychologistInput = z.infer<typeof createPsychologistSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CreateRoomBookingInput = z.infer<typeof createRoomBookingSchema>;
