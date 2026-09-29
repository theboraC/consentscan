FROM mcr.microsoft.com/playwright:v1.49.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
ENV PORT=7860
EXPOSE 7860
CMD ["node", "src/index.js"]
