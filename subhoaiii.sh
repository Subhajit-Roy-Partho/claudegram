#!/bin/sh
#SBATCH -q private
#SBATCH -p general
#SBATCH -t 7-00:00
#SBATCH -c 4
#SBATCH -o memo.out
#SBATCH -e memo.err
#SBATCH -J subhomemo
#SBATCH --mem=20GB

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /scratch/sroy85/Github/claudegram

# Prevent "nested Claude Code session" rejection — CLAUDECODE is inherited
# when this job is submitted from inside a Claude Code terminal.
unset CLAUDECODE

# Clear any stale Telegram long-poll from a previous crashed instance.
# Without this, a ghost process holding the getUpdates slot causes a 409
# conflict and the bot fails to start.
BOT_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN=" .env | cut -d= -f2 | tr -d '"')
if [ -n "$BOT_TOKEN" ]; then
  curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?timeout=0&offset=-1" > /dev/null 2>&1 || true
fi

npm run dev
