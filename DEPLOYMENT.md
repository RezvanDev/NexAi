# Инструкция по развертыванию (Deployment Guide)

Этот проект использует **WebSocket** для передачи аудио в реальном времени. Из-за этого его **НЕЛЬЗЯ** полностью развернуть на Vercel (Vercel подходит только для фронтенда/лендинга).

Однако архитектура проекта **упрощена**: один сервер обслуживает и звонки, и CRM. Это значит, что развертывание очень простое.

**Рекомендуемый вариант:** Виртуальный сервер (VPS/VDS).
**Провайдеры:** Hetzner, DigitalOcean, Aeza, Timeweb (любой Ubuntu сервер).

---

## Вариант 1: Docker (Самый надежный)

Этот метод поднимет всё (App + CRM + База) одной командой.

### 1. Подготовка сервера
Купите VPS (Ubuntu 22.04).
Зайдите по SSH: `ssh root@ip`
Установите Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 2. Подготовка файлов
Создайте в корне проекта файл `Dockerfile`:

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Установка зависимостей
COPY package.json package-lock.json ./
RUN npm ci

# Копирование исходников
COPY . .

# Сборка (собирает и Frontend, и Backend)
RUN npm run build

# Открываем порт
EXPOSE 3000

# Запускаем один сервер, который делает всё
CMD ["npm", "run", "start"]
```

### 3. Запуск
```bash
# Сборка образа
docker build -t ai-call-assistant .

# Запуск
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/db" \
  -e OPENAI_API_KEY="sk-..." \
  --name app \
  ai-call-assistant
```

---

## Вариант 2: Запуск без Docker (через PM2)

Если не хотите возиться с Docker:

1.  **Поставьте Node.js 20:**
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

2.  **Скачайте код и соберите:**
    ```bash
    git clone <ссылка> app
    cd app
    npm ci
    npm run build
    ```

3.  **Запустите через PM2 (чтобы работал вечно):**
    ```bash
    npm install -g pm2
    export DATABASE_URL="..."
    export OPENAI_API_KEY="..."
    pm2 start dist/index.cjs --name "ai-assistant"
    ```

Все заработает на порту 3000:
*   CRM: `http://ip:3000/crm/index.html`
*   Звонки: `http://ip:3000/`

---

## Что насчет Vercel?
На Vercel можно залить только **Лендинг** (`/landing-page`).
1.  Зайдите в папку `landing-page`.
2.  `vercel deploy`.
3.  Он будет работать идеально.
Сам бот на Vercel работать не будет из-за WebSocket ограничений.


# База данных (укажите данные вашей локальной базы PostgreSQL)