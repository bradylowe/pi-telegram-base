FROM node:22-bookworm

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_PATH=/usr/local/lib/node_modules

RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    ca-certificates \
    curl \
    bash \
    nano \
    vim \
    less \
    ripgrep \
    jq \
    tmux \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

RUN npm install -g playwright @playwright/test \
  && playwright install --with-deps chromium \
  && chmod -R a+rX "$PLAYWRIGHT_BROWSERS_PATH"

COPY start-pi.sh connect-to-pi-tmux.sh start-pi-scheduler.sh start-pi-telegram-autoconnect.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/start-pi.sh /usr/local/bin/connect-to-pi-tmux.sh /usr/local/bin/start-pi-scheduler.sh /usr/local/bin/start-pi-telegram-autoconnect.sh

USER node
WORKDIR /workspace

ENV HOME=/home/node

CMD ["/usr/local/bin/start-pi.sh"]
