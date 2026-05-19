# Gunakan image resmi Node.js versi 20 (Slim untuk ukuran lebih ringan dan stabilitas glibc + global crypto)
FROM node:20-slim

# Set direktori kerja di dalam container
WORKDIR /usr/src/app

# Copy package.json dan package-lock.json terlebih dahulu untuk memanfaatkan cache Docker
COPY package*.json ./

# Install seluruh dependencies yang dibutuhkan
RUN npm install --production

# Copy seluruh file aplikasi ke dalam container
COPY . .

# Google Cloud Run akan memberikan variabel environment PORT (biasanya 8080)
ENV PORT=8080

# Beritahu Docker port apa yang digunakan
EXPOSE 8080

# Jalankan server
CMD [ "node", "server.js" ]
