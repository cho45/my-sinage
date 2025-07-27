#!/bin/bash

# デフォルト値
VOICEVOX_HOST="${VOICEVOX_HOST:-localhost}"
VOICEVOX_PORT="${VOICEVOX_PORT:-50021}"

# 使用方法を表示
usage() {
    echo "Usage: $0 <speaker_id> <text>"
    echo "Example: $0 1 \"こんにちは\""
    exit 1
}

# 引数チェック
if [ $# -lt 2 ]; then
    usage
fi

SPEAKER_ID=$1
shift
TEXT="$*"

# 一時ファイル
QUERY_FILE="/tmp/voicevox_query_$$.json"
AUDIO_FILE="/tmp/voicevox_audio_$$.wav"

# クリーンアップ関数
cleanup() {
    # ls "$QUERY_FILE" "$AUDIO_FILE"
    rm -f "$QUERY_FILE" "$AUDIO_FILE"
}
trap cleanup EXIT

# 1. クエリ作成
echo "Creating audio query..."
curl -s -X POST \
    -G "http://${VOICEVOX_HOST}:${VOICEVOX_PORT}/audio_query" \
    --data-urlencode "text=${TEXT}" \
    --data-urlencode "speaker=${SPEAKER_ID}" \
    -o "$QUERY_FILE"

if [ $? -ne 0 ] || [ ! -s "$QUERY_FILE" ]; then
    echo "Error: Failed to create audio query"
    exit 1
fi

# 2. 音声合成
echo "Synthesizing audio..."
curl -s -X POST \
    "http://${VOICEVOX_HOST}:${VOICEVOX_PORT}/synthesis?speaker=${SPEAKER_ID}" \
    -H "Accept: audio/wav" \
    -H "Content-Type: application/json" \
    -d "@${QUERY_FILE}" \
    -o "$AUDIO_FILE"

if [ $? -ne 0 ] || [ ! -s "$AUDIO_FILE" ]; then
    echo "Error: Failed to synthesize audio"
    exit 1
fi

# 3. 音声再生
echo "Playing audio..."
if command -v paplay >/dev/null 2>&1; then
    # PulseAudio
    paplay "$AUDIO_FILE"
elif command -v aplay >/dev/null 2>&1; then
    # ALSA
    aplay "$AUDIO_FILE" 2>/dev/null
elif command -v afplay >/dev/null 2>&1; then
    # macOS
    afplay "$AUDIO_FILE"
elif command -v play >/dev/null 2>&1; then
    # sox
    play "$AUDIO_FILE" 2>/dev/null
else
    echo "Error: No audio player found (paplay, aplay, afplay, or play)"
    echo "Audio file saved to: $AUDIO_FILE"
    trap - EXIT  # クリーンアップを無効化
    exit 1
fi

echo "Done!"
