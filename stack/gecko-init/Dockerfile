FROM python:3.11-slim
RUN pip install --no-cache-dir requests==2.31.0
WORKDIR /init
COPY init.py /init/init.py
ENTRYPOINT ["python", "/init/init.py"]
