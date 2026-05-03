# 🚀 MORPHEUS - DOCKER ENVIRONMENT READY!

## ✅ Status: Totalmente Funcional

Os containers estão rodando e prontos para uso:

```
✅ morpheus_app   (Next.js)     - http://localhost:3000
✅ morpheus_db    (PostgreSQL)  - localhost:5432
```

---

## 🌐 Acessar a Aplicação

**URL**: [http://localhost:3000](http://localhost:3000)

### Credenciais de Teste (Demo)
```
Email: admin@clinica-demo.com
Senha: admin123
```

---

## 📊 Banco de Dados

**PostgreSQL 16**
- Host: `localhost:5432`
- Usuário: `morpheus`
- Senha: `morpheus_dev_password_123`
- Database: `morpheus`

### Conectar via DBeaver/pgAdmin
```
Host: localhost
Port: 5432
Database: morpheus
Username: morpheus
Password: morpheus_dev_password_123
```

---

## 🛠️ Comandos Úteis

### Gerenciar Containers
```bash
# Ver status
docker-compose ps

# Ver logs (todos)
docker-compose logs -f

# Ver logs (apenas app)
docker-compose logs morpheus_app -f

# Ver logs (apenas banco)
docker-compose logs morpheus_db -f

# Pausar
docker-compose pause

# Retomar
docker-compose unpause

# Reiniciar
docker-compose restart

# Parar
docker-compose down

# Limpar tudo (inclui banco)
docker-compose down -v
```

### Reiniciar Completo
```bash
docker-compose down -v
docker-compose up --build -d
```

---

## 📋 Informações da Aplicação

**Projeto**: Morpheus - SaaS Clinical Management Platform
- **Versão**: 1.0.0
- **Node.js**: 20-slim
- **Next.js**: 14.2.35
- **Prisma**: 5.22.0
- **PostgreSQL**: 16-alpine

### Portas Utilizadas
- `3000`: Aplicação Next.js
- `5432`: PostgreSQL

### Funcionalidades Implementadas
✅ Next.js 14 com App Router
✅ PostgreSQL 16 com Prisma ORM
✅ NextAuth.js v5 para autenticação
✅ Multi-tenancy pronto
✅ TypeScript para type-safety
✅ Tailwind CSS para estilização
✅ Dashboard responsivo

---

## 📁 Estrutura de Volumes

**PostgreSQL Data**: `postgres_data/`
- Dados persistem entre restarts
- Limpar com: `docker-compose down -v`

---

## 🐛 Solução de Problemas

### "Connection refused on localhost:3000"
```bash
# Verificar se o container está rodando
docker ps --filter "name=morpheus"

# Ver logs da aplicação
docker logs morpheus_app -f
```

### "Error connecting to database"
```bash
# Verificar se PostgreSQL está pronto
docker logs morpheus_db -f

# Restart ambos
docker-compose restart
```

### "Port already in use"
Altere as portas em `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"    # Next.js
  - "5433:5432"    # PostgreSQL
```

---

## 🔐 Segurança (Produção)

⚠️ **NÃO USE ESSAS CREDENCIAIS EM PRODUÇÃO**

Altere em `docker-compose.yml`:
- `NEXTAUTH_SECRET`: Gerar novo com `openssl rand -base64 32`
- Senhas do PostgreSQL
- Variáveis de ambiente

---

## 📝 Próximos Passos

1. ✅ Acessar http://localhost:3000
2. ✅ Login com credenciais de teste
3. ✅ Explorar o dashboard
4. ✅ Testar funcionalidades
5. 📌 Implementar suas customizações

---

**Última atualização**: ${new Date().toLocaleString('pt-BR')}
