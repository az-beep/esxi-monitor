FROM nginx:alpine

# Копировать файлы фронтенда
COPY . /usr/share/nginx/html

# Копировать конфигурацию nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Копировать SSL сертификаты
RUN mkdir -p /etc/nginx/ssl

EXPOSE 80 443
