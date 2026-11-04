FROM python:3.10-slim

WORKDIR /app

ENV PORT=7860 \
    PYTHONUNBUFFERED=1

# Copy dependency file and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code, models, and curriculum datasets
COPY . .

# Expose Hugging Face Space port
EXPOSE 7860

# Run the Python standard library HTTP server
CMD ["python", "server.py"]
