import json
import pandas as pd
from pathlib import Path

DATA_DIR = Path('public/data')
OUT_DIR = DATA_DIR / 'csv'
OUT_DIR.mkdir(exist_ok=True)

def flatten_responses(json_path: Path, id_field: str = 'id', user_field: str = 'user_id', lang_field: str = 'language'):
    items = json.loads(json_path.read_text())
    rows = []
    for item in items:
        base = {
            id_field: item.get(id_field),
            user_field: item.get(user_field),
            lang_field: item.get(lang_field),
            'created_at': item.get('created_at'),
        }
        resp_str = item.get('responses') or '{}'
        try:
            resp = json.loads(resp_str)
        except json.JSONDecodeError:
            resp = {}
        base.update(resp)
        rows.append(base)
    return pd.DataFrame(rows)

# Pre-test
pre_df = flatten_responses(DATA_DIR / 'pretest_responses_rows.json')
pre_out = OUT_DIR / 'pretest_responses.csv'
pre_df.to_csv(pre_out, index=False)
print(f'Wrote {pre_out} ({len(pre_df)} rows)')

# Post-test
post_df = flatten_responses(DATA_DIR / 'posttest_responses_rows.json')
post_out = OUT_DIR / 'posttest_responses.csv'
post_df.to_csv(post_out, index=False)
print(f'Wrote {post_out} ({len(post_df)} rows)')

# Conversation logs -> flatten turns and feedback
conv_items = json.loads((DATA_DIR / 'conversation_logs_rows.json').read_text())
turn_rows = []
feedback_rows = []
for item in conv_items:
    raw_payload = item.get('payload')
    if isinstance(raw_payload, str):
        try:
            payload = json.loads(raw_payload, strict=False)
        except json.JSONDecodeError:
            # try to unescape common issues
            payload = json.loads(raw_payload.replace('\\n', '\n'), strict=False)
    else:
        payload = raw_payload or {}

    session_id = item.get('id')
    user_id = item.get('user_id')
    for turn in payload.get('testHistory', []):
        turn_rows.append({
            'session_id': session_id,
            'user_id': user_id,
            'role': turn.get('role'),
            'type': turn.get('type'),
            'speaker': turn.get('speaker'),
            'timestamp': turn.get('timestamp'),
            'content': turn.get('content'),
        })
    for fb in payload.get('feedbackHistory', []):
        feedback_rows.append({
            'session_id': session_id,
            'user_id': user_id,
            'taskName': fb.get('taskName'),
            'taskLevel': fb.get('taskLevel'),
            'score': fb.get('score'),
            'summary': fb.get('summary'),
            'timestamp': fb.get('timestamp'),
            'averageRawScore': fb.get('averageRawScore'),
        })

turn_df = pd.DataFrame(turn_rows)
feedback_df = pd.DataFrame(feedback_rows)
turn_out = OUT_DIR / 'conversation_turns.csv'
fb_out = OUT_DIR / 'feedback_history.csv'
turn_df.to_csv(turn_out, index=False)
feedback_df.to_csv(fb_out, index=False)
print(f'Wrote {turn_out} ({len(turn_df)} rows)')
print(f'Wrote {fb_out} ({len(feedback_df)} rows)')
