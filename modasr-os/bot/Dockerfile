FROM python:3.12-slim
WORKDIR /app
RUN useradd -m modasr
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER modasr
CMD ["python", "-m", "modasr_bot.main"]
