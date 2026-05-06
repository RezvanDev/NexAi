🚀 Полное руководство по запуску в Production
Это руководство поможет тебе запустить проект "с нуля" до работающего сайта с SSL (HTTPS).

1. Выбор сервера (VPS)
Для стабильной работы ИИ-агента и Docker-контейнеров рекомендуются следующие параметры:

Провайдер: Hetzner (лучшее соотношение цена/качество в Европе) или DigitalOcean.
Регион: Frankfurt (Германия) — минимальная задержка до OpenAI и LiveKit.
Характеристики:
Минимально: 2 GB RAM, 1 vCPU (например, Hetzner CX22).
Рекомендуемо: 4 GB RAM, 2 vCPU.
ОС: Ubuntu 22.04 LTS или 24.04 LTS.
2. Подготовка сервера
После покупки сервера зайди на него через SSH (через Терминал):

bash
ssh root@твой_ip_сервера
Выполни базовую настройку и установку Docker:

bash
# Обновляем систему
apt update && apt upgrade -y
# Устанавливаем Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
# Проверяем установку
docker compose version
3. Деплой проекта
Загрузи файлы: Используй git clone (если проект в репозитории) или скопируй папку проекта через SCP/SFTP.

Настрой .env: Создай файл .env в папке проекта на сервере:

bash
nano .env
Вставь туда свои ключи (OpenAI, LiveKit, Telegram). Важно: Порт укажи 3000.

Запусти Docker:

bash
docker compose up -d --build
4. Настройка Домена и SSL (HTTPS)
Микрофон в браузере не будет работать без HTTPS. Для этого нам нужен Nginx как прокси-сервер.

Установи Nginx и Certbot:

bash
apt install nginx python3-certbot-nginx -y
Настрой конфигурацию Nginx: Создай файл конфига (замени your-domain.com на свой домен):

bash
nano /etc/nginx/sites-available/aicall
Вставь туда:

nginx
server {
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
Активируй конфиг и получи SSL:

bash
ln -s /etc/nginx/sites-available/aicall /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
# Получаем сертификат (бесплатно)
certbot --nginx -d your-domain.com
5. Полезные команды
Посмотреть логи (что происходит внутри):
bash
docker compose logs -f
Перезапустить всё:
bash
docker compose restart
Остановить проект:
bash
docker compose down
Обновить код после изменений:
bash
git pull
docker compose up -d --build
✅ Финальный чек-лист:
Домен направлен на IP сервера (A-запись в DNS).
Ключи в .env актуальны.
HTTPS работает (замочек в браузере).
Порты 80, 443 открыты в файрволе.
Теперь твой AI-Ассистент готов к масштабным продажам! 🚀