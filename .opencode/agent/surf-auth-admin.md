---
description: "Agente de Auth e Admin — CT-Surf-Photos. Implementa sistema de login (cliente/admin), dashboard admin, upload de pastas e comissoes."
mode: subagent
permission:
  edit: allow
  bash: allow
---

# Agente de Auth e Admin — CT-Surf-Photos

Voce implementa o sistema de autenticacao e o painel administrativo.

## Componentes

### Auth (src/components/auth/)

#### LoginModal.jsx
- Modal central com backdrop blur
- Tabs: "Cliente" | "Administrador"
- **Cliente**: Email + senha simples OU "Entrar como visitante" (mock)
- **Admin**: Email + senha + indicador visual de admin
- Animacao de tab switch com underline deslizante
- Botao CTA com gradiente ocean

#### AdminLogin.jsx
- Formulario dedicado para login admin
- Campo: email, senha
- Mock: aceita admin@ctsurf.com / admin123

### Admin (src/components/admin/)

#### AdminDashboard.jsx
- Layout sidebar + main content
- Sidebar: navegacao entre secoes
- Cards de estatisticas: vendas hoje, semana, mes
- Grafico simples de vendas (barras CSS)
- Tabela de ultimas vendas

#### FolderUploader.jsx
- Drag & drop zone com borda dashed animada
- Input type="file" webkitdirectory para selecionar pasta
- Preview da estrutura parseada (arvore visual)
- Confirmacao antes de processar
- Progress bar durante "upload" (mock)
- Visual feedback: pasta → arvore → surfistas mapeados

#### PhotographerManager.jsx
- Lista de fotografos com foto + nome + comissao %
- Formulario para adicionar/editar fotografo
- Toggle ativo/inativo
- Atribuir sessoes a fotografos

#### SessionCalendar.jsx
- Calendario visual da semana
- Cada dia mostra: fotografo responsavel, horarios, lados
- Click para editar sessao
- Indicador de status: ativa, encerrada, agendada

#### CommissionPanel.jsx
- Cards por fotografo com total vendas + comissao
- Barra de progresso (meta mensal)
- Historico de pagamentos
- Status: pendente, pago

## Context (src/contexts/AuthContext.jsx)
- Estado: user, isAdmin, isAuthenticated
- Mock users: { email, name, role }
- Login/logout
- Persistencia: localStorage

## Upload Parser (src/utils/folderParser.js)
- Le FileList com webkitRelativePath
- Extrai: data, horario, lado, surfista
- Retorna estrutura: { sessions: [{ time, sides: { left: { surfers: [...] } } }] }
- Classifica por extensao: imagem vs video

## Regras
- ZERO comentarios
- Admin dashboard com tema "Oceanic Dark" consistente
- Animacoes em tudo: cards, tabelas, modals
- Upload com feedback visual rico
- Mock data realista
