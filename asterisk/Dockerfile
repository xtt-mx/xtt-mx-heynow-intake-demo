# Asterisk con chan_websocket + res_websocket_client, la versión que pide HeyNow
# para su canal "Heynow Asterisk" (Developers → Canal de voz → WSS).
FROM debian:bookworm-slim

ARG ASTERISK_VERSION=20.18.1

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl pkg-config bzip2 patch python3 gettext-base \
      libedit-dev libjansson-dev libxml2-dev uuid-dev libsqlite3-dev libssl-dev \
      libsrtp2-dev libcurl4-openssl-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src
RUN curl -fsSL "https://downloads.asterisk.org/pub/telephony/asterisk/releases/asterisk-${ASTERISK_VERSION}.tar.gz" \
      | tar xz

WORKDIR /usr/src/asterisk-${ASTERISK_VERSION}
# pjproject se compila embebido (lo descarga el propio configure). BUILD_NATIVE se
# apaga para que la imagen no dependa de la CPU exacta donde se compiló.
RUN ./configure --with-pjproject-bundled --with-srtp \
 && make menuselect.makeopts \
 && menuselect/menuselect \
      --disable BUILD_NATIVE \
      --enable chan_websocket \
      --enable res_websocket_client \
      --enable res_srtp \
      menuselect.makeopts \
 && make -j"$(nproc)" \
 && make install \
 && make samples \
 && ldconfig \
 && cd /usr/src && rm -rf asterisk-${ASTERISK_VERSION}

COPY templates/ /opt/templates/
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
