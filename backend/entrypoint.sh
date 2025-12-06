#!/bin/sh
set -e

# Fix permissions for data directories
# This runs as root before switching to appuser
chown -R appuser:appgroup /app/data
chown -R appuser:appgroup /app/images

# Execute the command as appuser
exec gosu appuser "$@"
