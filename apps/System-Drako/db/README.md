# Banco de Referência — System-Drako

Esta pasta contém um **banco de dados de referência** (`banco-referencia.drako`) que acompanha o projeto. Ele serve como ponto de partida com personagens de exemplo.

## Como usar seu banco de dados

O System-Drako guarda tudo **localmente** no navegador (IndexedDB). Você tem três caminhos para levar/sincronizar seus dados:

### 1. Banco local (padrão)
Funciona em qualquer navegador, sem configuração. Os dados ficam só naquele navegador/dispositivo.

### 2. Arquivo de banco (online / multi-máquina) — Chrome ou Edge
Abra o painel **Banco de Dados** (ícone de banco no topo) e:
- **Criar arquivo de banco**: cria um `.drako` no seu computador (ex.: em *Downloads*). O Chrome **memoriza a localização** — nas próximas visitas o sistema reconecta automaticamente ao mesmo arquivo e **salva sozinho a cada alteração** (mesmo se você fechar sem salvar).
- **Abrir existente**: aponta para um `.drako` que você já tem (por exemplo, este de referência, ou um backup).

Assim você roda 100% online (GitHub Pages) com seu banco persistente em arquivo.

### 3. Backup / importação manual
Pela **Biblioteca** você exporta um backup `.drako` de todo o banco (ou de uma ficha) e importa em outro lugar.

## Este arquivo de referência
`banco-referencia.drako` é um backup `.drako` válido com 2 NPCs de exemplo (Thalren Sombrasol — Veterano; Grak, o Brutamontes — Recruta). Importe-o pelo painel de Banco ou pela Biblioteca para ter um ponto de partida.
