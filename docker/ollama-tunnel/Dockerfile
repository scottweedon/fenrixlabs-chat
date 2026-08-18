# Minimal autossh sidecar that holds open a local port-forward to the
# remote Ollama box, bypassing Thundercompute's HTTPS edge proxy (which
# was silently killing long-running generations at ~135s). See the
# `ollama-tunnel` service in docker-compose.override.yml for the actual
# tunnel command/args.
FROM alpine:3.20
RUN apk add --no-cache autossh openssh-client
ENTRYPOINT ["/bin/sh", "-c"]
